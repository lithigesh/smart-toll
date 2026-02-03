//
//
// NodeMCU ESP32S
// Zigbee - API Mode - Payload Tx
//
// GPS: Tx - 16, Rx - 17, 3V3
// XBee: DOUT - 21, DIN - 22, 3V3
// SD Module: CS - 5, SCK - 18, MISO - 19, MOSI - 23
//
//

#include <TinyGPSPlus.h>
#include <HardwareSerial.h>
#include <SPI.h>
#include <SD.h>
#include <XBee.h>

/* ================= CONFIG ================= */

// GPS (UART2)
#define GPS_RX 16
#define GPS_TX 17

// XBee UART1
#define XBEE_RX 21
#define XBEE_TX 22

// SD Card
#define SD_CS 5

// Geofence & movement
#define MAX_POINTS 300
#define GEOFENCE_THRESHOLD_METERS 30.0
#define MIN_VALID_MOVE_METERS 0.5
#define MAX_GLITCH_METERS 50.0

// Toll pole detection
#define TOLL_POLE_RADIUS_METERS 20.0

const char MAC_ID[] = "A4:C3:F0:1B:9E:7D";

/* ========================================== */

/* GPS */
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);

/* XBee (API mode) */
HardwareSerial XBeeSerial(1);
XBee xbee;
XBeeAddress64 destAddr(0x00000000, 0x0000FFFF);

/* Geofence storage */
double fenceLat[MAX_POINTS];
double fenceLon[MAX_POINTS];
bool   fenceTxEnable[MAX_POINTS];
int    fenceCount = 0;

/* Trip state */
bool insideGeofence = false;
bool tripActive     = false;

double prevLat = 0.0, prevLon = 0.0;
double startLat = 0.0, startLon = 0.0;
double totalDistance = 0.0;

bool txAlreadySent = false;
unsigned long tripStartTime = 0;

/* ================= UTILITIES ================= */

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

  for (int i = 0; i < fenceCount - 1; i++) {
    double d1 = haversine(lat, lon, fenceLat[i], fenceLon[i]);
    double d2 = haversine(lat, lon, fenceLat[i + 1], fenceLon[i + 1]);
    double seg = haversine(
      fenceLat[i], fenceLon[i],
      fenceLat[i + 1], fenceLon[i + 1]
    );

    double dist = fabs((d1 + d2) - seg);
    if (dist < minDist) minDist = dist;
  }
  return minDist;
}

/* ================= SETUP ================= */

void setup() {
  Serial.begin(115200);

  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);

  XBeeSerial.begin(9600, SERIAL_8N1, XBEE_RX, XBEE_TX);
  xbee.setSerial(XBeeSerial);

  if (!SD.begin(SD_CS)) {
    Serial.println("SD Card FAILED");
    while (true);
  }

  File f = SD.open("/geofence.csv");
  if (!f) {
    Serial.println("geofence.csv missing");
    while (true);
  }

  while (f.available() && fenceCount < MAX_POINTS) {
    String line = f.readStringUntil('\n');
    line.trim();

    int c1 = line.indexOf(',');
    int c2 = line.indexOf(',', c1 + 1);

    if (c1 > 0 && c2 > c1) {
      fenceLon[fenceCount] = line.substring(0, c1).toDouble();
      fenceLat[fenceCount] = line.substring(c1 + 1, c2).toDouble();

      String flag = line.substring(c2 + 1);
      flag.trim();
      flag.toLowerCase();

      fenceTxEnable[fenceCount] = (flag == "true");
      fenceCount++;
    }
  }
  f.close();

  Serial.print("Geofence points loaded: ");
  Serial.println(fenceCount);
}

/* ================= LOOP ================= */

void loop() {
  while (gpsSerial.available()) {
    if (gps.encode(gpsSerial.read())) {
      processGPS();
    }
  }
}

/* ================= GPS PROCESS ================= */

void processGPS() {

  if (!gps.location.isValid()) return;

  double lat = gps.location.lat();
  double lon = gps.location.lng();

  double geoDist = distanceToPolyline(lat, lon);
  bool nowInside = (geoDist <= GEOFENCE_THRESHOLD_METERS);

  /* ---- ENTER GEOFENCE ---- */
  if (nowInside && !insideGeofence) {
    insideGeofence = true;
    tripActive = true;

    startLat = lat;
    startLon = lon;
    prevLat  = lat;
    prevLon  = lon;
    totalDistance = 0.0;
    txAlreadySent = false;
    tripStartTime = millis();

    Serial.println(">>> ENTERED GEOFENCE");
  }

  /* ---- INSIDE GEOFENCE ---- */
  if (tripActive && nowInside) {

    // Distance accumulation
    double d = haversine(prevLat, prevLon, lat, lon);
    if (d >= MIN_VALID_MOVE_METERS && d <= MAX_GLITCH_METERS) {
      totalDistance += d;
      prevLat = lat;
      prevLon = lon;
    }

    // Toll pole detection
    for (int i = 0; i < fenceCount; i++) {
      if (fenceTxEnable[i]) {
        double poleDist = haversine(lat, lon, fenceLat[i], fenceLon[i]);

        if (poleDist <= TOLL_POLE_RADIUS_METERS && !txAlreadySent) {
          sendZigBeePayload();
          totalDistance = 0.0;      // reset ONLY after TX
          txAlreadySent = true;
          break;
        }
      }
    }
  }

  /* ---- EXIT GEOFENCE ---- */
  if (!nowInside && insideGeofence) {
    insideGeofence = false;
    tripActive = false;
    Serial.println("<<< EXITED GEOFENCE");
  }
}

/* ================= ZIGBEE API TX ================= */

void sendZigBeePayload() {

  unsigned long durationSec = (millis() - tripStartTime) / 1000;

  char payload[120];

  snprintf(
    payload,
    sizeof(payload),
    "<%s|%.6f|%.6f|%.2f|%lu|OK>",
    MAC_ID,
    startLat,
    startLon,
    totalDistance,
    durationSec
  );

  ZBTxRequest tx(destAddr, (uint8_t*)payload, strlen(payload));
  xbee.send(tx);

  Serial.print("TX @ Toll Pole → ");
  Serial.println(payload);
}