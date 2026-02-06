// ---------------- LIBRARIES ----------------
#include <TinyGPSPlus.h>
#include <HardwareSerial.h>
#include <SPI.h>
#include <SD.h>
#include <XBee.h>
#include "BluetoothSerial.h"

#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"

// ---------------- PIN CONFIG ----------------

// GPS (UART2)
#define GPS_RX 16
#define GPS_TX 17

// XBee (UART1)
#define XBEE_RX 21
#define XBEE_TX 22

// SD Card
#define SD_CS 5

// Motors
#define IN1 25
#define IN2 26
#define IN3 32
#define IN4 33
#define ENA 27
#define ENB 14

// ---------------- CONSTANTS ----------------
#define MAX_POINTS 300
#define GEOFENCE_THRESHOLD_METERS 5.0
#define MIN_VALID_MOVE_METERS 0.5
#define MAX_GLITCH_METERS 50.0
#define TOLL_POLE_RADIUS_METERS 5.0

// Fault tolerance / safety
static const uint32_t GPS_STALE_TIMEOUT_MS = 5000;     // if no valid GPS updates, pause trip logic
static const uint32_t BT_CMD_TIMEOUT_MS = 800;         // if no BT command, stop motors
static const uint8_t  XBEE_TX_RETRIES = 3;
static const uint16_t XBEE_TX_STATUS_TIMEOUT_MS = 600; // wait for TX status per attempt

const char MAC_ID[] = "A4:C3:F0:1B:9E:7D";

// ---------------- OBJECTS ----------------
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);
HardwareSerial XBeeSerial(1);
BluetoothSerial SerialBT;

XBee xbee;
XBeeAddress64 destAddr(0x00000000, 0x0000FFFF);

// ---------------- STORAGE ----------------
double fenceLat[MAX_POINTS];
double fenceLon[MAX_POINTS];
bool   fenceTxEnable[MAX_POINTS];
int    fenceCount = 0;

// ---------------- STATE ----------------
bool insideGeofence = false;
bool tripActive = false;

double prevLat = 0, prevLon = 0;
double startLat = 0, startLon = 0;
double totalDistance = 0;

bool txAlreadySent = false;
unsigned long tripStartTime = 0;

static uint32_t txSequence = 0;
static uint32_t lastGpsFixMs = 0;
static uint32_t lastBtCmdMs = 0;

typedef struct {
  double startLat;
  double startLon;
  double distanceKm;
  uint32_t durationSec;
  uint32_t seq;
} TollEvent;

static QueueHandle_t tollEventQueue = nullptr;

static void motorsStop() {
  digitalWrite(IN1, LOW); digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW); digitalWrite(IN4, LOW);
}

// ---------------- UTILS ----------------
double haversine(double lat1, double lon1, double lat2, double lon2) {
  const double R = 6371000.0;
  double dLat = radians(lat2 - lat1);
  double dLon = radians(lon2 - lon1);

  lat1 = radians(lat1);
  lat2 = radians(lat2);

  double a = sin(dLat / 2) * sin(dLat / 2) +
             cos(lat1) * cos(lat2) *
             sin(dLon / 2) * sin(dLon / 2);

  return 2 * R * atan2(sqrt(a), sqrt(1 - a));
}

double distanceToPolyline(double lat, double lon) {
  double minDist = 1e9;
  for (int i = 0; i < fenceCount; i++) {
    double d = haversine(lat, lon, fenceLat[i], fenceLon[i]);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

// ---------------- XBee TX (fault-tolerant) ----------------
static bool waitForTxStatus(uint16_t timeoutMs) {
  ZBTxStatusResponse txStatus = ZBTxStatusResponse();
  uint32_t startMs = millis();

  while ((millis() - startMs) < timeoutMs) {
    xbee.readPacket(50);
    if (xbee.getResponse().isAvailable()) {
      if (xbee.getResponse().getApiId() == ZB_TX_STATUS_RESPONSE) {
        xbee.getResponse().getZBTxStatusResponse(txStatus);

        // Delivery status 0x00 means success
        uint8_t delivery = txStatus.getDeliveryStatus();
        if (delivery == 0x00) return true;

        Serial.print("XBee TX status fail, delivery=0x");
        Serial.println(delivery, HEX);
        return false;
      }
    }
    vTaskDelay(10 / portTICK_PERIOD_MS);
  }

  Serial.println("XBee TX status timeout");
  // Some broadcast setups may not return status reliably; treat timeout as failure to be safe.
  return false;
}

static bool sendZigBeePayloadWithRetry(const TollEvent &ev) {
  char payload[140];
  snprintf(payload, sizeof(payload),
           "<%s|%.6f|%.6f|%.3f|%lu|OK|%lu>",
           MAC_ID,
           ev.startLat,
           ev.startLon,
           ev.distanceKm,
           (unsigned long)ev.durationSec,
           (unsigned long)ev.seq);

  for (uint8_t attempt = 1; attempt <= XBEE_TX_RETRIES; attempt++) {
    ZBTxRequest tx(destAddr, (uint8_t*)payload, strlen(payload));
    xbee.send(tx);

    Serial.print("TX attempt ");
    Serial.print(attempt);
    Serial.print("/");
    Serial.print(XBEE_TX_RETRIES);
    Serial.print(" → ");
    Serial.println(payload);

    if (waitForTxStatus(XBEE_TX_STATUS_TIMEOUT_MS)) {
      Serial.println("TX delivered OK");
      return true;
    }

    vTaskDelay(80 / portTICK_PERIOD_MS);
  }

  Serial.println("TX failed after retries");
  return false;
}

// ---------------- GPS PROCESS ----------------
void processGPS() {
  if (!gps.location.isValid()) return;

  lastGpsFixMs = millis();

  double lat = gps.location.lat();
  double lon = gps.location.lng();

  double geoDist = distanceToPolyline(lat, lon);
  bool nowInside = (geoDist <= GEOFENCE_THRESHOLD_METERS);

  // ENTER
  if (nowInside && !insideGeofence) {
    insideGeofence = true;
    tripActive = true;
    startLat = lat;
    startLon = lon;
    prevLat = lat;
    prevLon = lon;
    totalDistance = 0;
    txAlreadySent = false;
    tripStartTime = millis();
  }

  // INSIDE
  if (tripActive && nowInside) {

    double d = haversine(prevLat, prevLon, lat, lon);
    if (d >= MIN_VALID_MOVE_METERS && d <= MAX_GLITCH_METERS) {
      totalDistance += d;
      prevLat = lat;
      prevLon = lon;
    }

    for (int i = 0; i < fenceCount; i++) {
      if (fenceTxEnable[i] && !txAlreadySent) {
        double poleDist = haversine(lat, lon, fenceLat[i], fenceLon[i]);
        if (poleDist <= TOLL_POLE_RADIUS_METERS) {
          // Enqueue a TX event (non-blocking), so GPS parsing stays responsive
          if (tollEventQueue) {
            TollEvent ev;
            ev.startLat = startLat;
            ev.startLon = startLon;
            ev.distanceKm = totalDistance / 1000.0; // totalDistance tracked in meters
            ev.durationSec = (millis() - tripStartTime) / 1000;
            ev.seq = ++txSequence;

            BaseType_t ok = xQueueSend(tollEventQueue, &ev, 0);
            if (ok == pdPASS) {
              Serial.println("Toll event queued");
              txAlreadySent = true;
              totalDistance = 0;
            } else {
              Serial.println("Toll queue full - will retry on next loop");
            }
          }
          break;
        }
      }
    }
  }

  // EXIT
  if (!nowInside && insideGeofence) {
    insideGeofence = false;
    tripActive = false;
  }
}

// ---------------- TASK 1: GPS + XBee ----------------
void gpsXbeeTask(void *parameter) {
  while (true) {
    while (gpsSerial.available()) {
      if (gps.encode(gpsSerial.read())) {
        processGPS();
      }
    }

    // If GPS has gone stale, pause trip logic (prevents accumulating junk)
    if (tripActive && (millis() - lastGpsFixMs) > GPS_STALE_TIMEOUT_MS) {
      Serial.println("GPS stale - pausing trip");
      tripActive = false;
      insideGeofence = false;
      txAlreadySent = false;
      totalDistance = 0;
    }

    vTaskDelay(5 / portTICK_PERIOD_MS);
  }
}

// ---------------- TASK 3: XBee TX worker ----------------
void xbeeTxTask(void *parameter) {
  TollEvent ev;
  while (true) {
    if (tollEventQueue && xQueueReceive(tollEventQueue, &ev, portMAX_DELAY) == pdPASS) {
      bool ok = sendZigBeePayloadWithRetry(ev);
      if (!ok) {
        // Basic requeue once for fault tolerance
        // (If it fails again, we drop to avoid blocking future events.)
        vTaskDelay(150 / portTICK_PERIOD_MS);
        (void)xQueueSend(tollEventQueue, &ev, 0);
      }
    }
  }
}

// ---------------- TASK 2: CAR CONTROL ----------------
void carControlTask(void *parameter) {
  while (true) {

    if (SerialBT.available()) {
      char cmd = SerialBT.read();
      lastBtCmdMs = millis();

      switch (cmd) {
        case 'B':
          digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
          digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
          break;
        case 'F':
          digitalWrite(IN1, LOW); digitalWrite(IN2, HIGH);
          digitalWrite(IN3, LOW); digitalWrite(IN4, HIGH);
          break;
        case 'L':
          digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
          digitalWrite(IN3, LOW); digitalWrite(IN4, HIGH);
          break;
        case 'R':
          digitalWrite(IN1, LOW); digitalWrite(IN2, HIGH);
          digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
          break;
        case 'S':
          motorsStop();
          break;
      }
    }

    // Failsafe: stop motors if we stop receiving commands
    if ((millis() - lastBtCmdMs) > BT_CMD_TIMEOUT_MS) {
      motorsStop();
    }

    vTaskDelay(10 / portTICK_PERIOD_MS);
  }
}

// ---------------- SETUP ----------------
void setup() {
  Serial.begin(115200);

  lastBtCmdMs = millis();

  // UARTs
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);
  XBeeSerial.begin(9600, SERIAL_8N1, XBEE_RX, XBEE_TX);
  xbee.setSerial(XBeeSerial);

  // Bluetooth
  SerialBT.begin("bt_Car");

  // Motors
  pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
  pinMode(ENA, OUTPUT); pinMode(ENB, OUTPUT);
  analogWrite(ENA, 200);
  analogWrite(ENB, 200);

  // SD
  if (!SD.begin(SD_CS)) {
    Serial.println("SD init failed - continuing without geofence");
    fenceCount = 0;
  } else {
    File f = SD.open("/geofence.csv");
    if (!f) {
      Serial.println("geofence.csv not found - continuing without geofence");
      fenceCount = 0;
    } else {
      char line[96];
      while (f.available() && fenceCount < MAX_POINTS) {
        int len = f.readBytesUntil('\n', line, sizeof(line) - 1);
        if (len <= 0) continue;
        line[len] = '\0';

        char *p1 = strtok(line, ",");
        char *p2 = strtok(NULL, ",");
        char *p3 = strtok(NULL, ",");

        if (p1 && p2 && p3) {
          double lon = atof(p1);
          double lat = atof(p2);
          bool enabled = (strcasecmp(p3, "true") == 0);

          // Validate ranges
          if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            continue;
          }

          fenceLon[fenceCount] = lon;
          fenceLat[fenceCount] = lat;
          fenceTxEnable[fenceCount] = enabled;
          fenceCount++;
        }
      }
      f.close();
    }
  }

  Serial.print("Geofence points loaded: ");
  Serial.println(fenceCount);

  // Queue for toll events
  tollEventQueue = xQueueCreate(6, sizeof(TollEvent));
  if (!tollEventQueue) {
    Serial.println("Queue create FAILED (low memory)");
  }

  // TASKS
  xTaskCreatePinnedToCore(gpsXbeeTask, "GPS_XBEE", 8192, NULL, 1, NULL, 0);
  xTaskCreatePinnedToCore(carControlTask, "CAR", 4096, NULL, 2, NULL, 1);
  xTaskCreatePinnedToCore(xbeeTxTask, "XBEE_TX", 4096, NULL, 1, NULL, 1);
}

void loop() {
  // FreeRTOS owns execution
}
