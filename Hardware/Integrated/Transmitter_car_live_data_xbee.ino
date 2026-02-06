// ---------------- LIBRARIES ----------------
#include <TinyGPSPlus.h>
#include <HardwareSerial.h>
#include <SPI.h>
#include <SD.h>
#include <XBee.h>
#include "BluetoothSerial.h"

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

// ---------------- ZIGBEE TX ----------------
void sendZigBeePayload() {

  unsigned long durationSec = (millis() - tripStartTime) / 1000;
  char payload[120];

  snprintf(payload, sizeof(payload),
           "<%s|%.6f|%.6f|%.2f|%lu|OK>",
           MAC_ID, startLat, startLon, totalDistance, durationSec);

  ZBTxRequest tx(destAddr, (uint8_t*)payload, strlen(payload));
  xbee.send(tx);

  Serial.print("TX SENT → ");
  Serial.println(payload);
}

// ---------------- GPS PROCESS ----------------
void processGPS() {

  if (!gps.location.isValid()) return;

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
          sendZigBeePayload();
          txAlreadySent = true;
          totalDistance = 0;
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
    vTaskDelay(5 / portTICK_PERIOD_MS);
  }
}

// ---------------- TASK 2: CAR CONTROL ----------------
void carControlTask(void *parameter) {
  while (true) {

    if (SerialBT.available()) {
      char cmd = SerialBT.read();

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
          digitalWrite(IN1, LOW); digitalWrite(IN2, LOW);
          digitalWrite(IN3, LOW); digitalWrite(IN4, LOW);
          break;
      }
    }

    vTaskDelay(10 / portTICK_PERIOD_MS);
  }
}

// ---------------- SETUP ----------------
void setup() {
  Serial.begin(115200);

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
  if (!SD.begin(SD_CS)) while (true);

  File f = SD.open("/geofence.csv");
  char line[80];

  while (f.available() && fenceCount < MAX_POINTS) {
    int len = f.readBytesUntil('\n', line, sizeof(line) - 1);
    line[len] = '\0';

    char *p1 = strtok(line, ",");
    char *p2 = strtok(NULL, ",");
    char *p3 = strtok(NULL, ",");

    if (p1 && p2 && p3) {
      fenceLon[fenceCount] = atof(p1);
      fenceLat[fenceCount] = atof(p2);
      fenceTxEnable[fenceCount] = (strcasecmp(p3, "true") == 0);
      fenceCount++;
    }
  }
  f.close();

  // TASKS
  xTaskCreatePinnedToCore(gpsXbeeTask, "GPS_XBEE", 8192, NULL, 1, NULL, 0);
  xTaskCreatePinnedToCore(carControlTask, "CAR", 4096, NULL, 2, NULL, 1);
}

void loop() {
  // FreeRTOS owns execution
}
