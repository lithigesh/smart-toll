// #include <SoftwareSerial.h>
// #include <TinyGPSPlus.h>

// // ===================== ZIGBEE =====================
// SoftwareSerial XBee(4, 5);   // RX, TX

// // ===================== GPS =====================
// TinyGPSPlus gps;

// // ===================== DEVICE INFO =====================
// const char MAC_ID[] = "A4:C3:F0:1B:9E:7D";

// // ===================== DISTANCE VARIABLES =====================
// double prevLat = 0.0, prevLon = 0.0;
// double startLat = 0.0, startLon = 0.0;
// double totalDistanceMeters = 0.0;

// bool hasPrevFix = false;
// bool startFixSet = false;

// // ===================== SETUP =====================
// void setup() {
//   Serial.begin(9600);
//   XBee.begin(9600);

//   // GPS UART
//   Serial2.begin(9600, SERIAL_8N1, 16, 17);

//   Serial.println("GPS + ZigBee Transmitter Started");
//   Serial.println("Type a message and press ENTER");
// }

// // ===================== LOOP =====================
// void loop() {

//   // ---------- Read GPS ----------
//   while (Serial2.available() > 0) {
//     gps.encode(Serial2.read());
//   }

//   // ---------- GPS Update ----------
//   if (gps.location.isUpdated()) {

//     double currLat = gps.location.lat();
//     double currLon = gps.location.lng();

//     // Save starting position ONCE
//     if (!startFixSet) {
//       startLat = currLat;
//       startLon = currLon;
//       startFixSet = true;
//     }

//     // Distance calculation
//     if (hasPrevFix) {
//       double delta = haversine(prevLat, prevLon, currLat, currLon);

//       // GPS noise filtering
//       if (delta > 0.5 && delta < 50.0) {
//         totalDistanceMeters += delta;
//       }
//     }

//     prevLat = currLat;
//     prevLon = currLon;
//     hasPrevFix = true;
//   }

//   // ---------- Send ZigBee Packet ----------
//   if (Serial.available()) {

//     String message = Serial.readStringUntil('\n');
//     message.trim();

//     // Ensure GPS lock
//     if (!startFixSet || !gps.time.isValid()) {
//       Serial.println("Waiting for valid GPS fix...");
//       return;
//     }

//     // ---------- Packet Fields ----------
//     String start_lat  = String(startLat, 6);
//     String start_long = String(startLon, 6);
//     String distance   = String(totalDistanceMeters, 2);

//     String gps_time = String(gps.time.hour())   + ":" +
//                       String(gps.time.minute()) + ":" +
//                       String(gps.time.second());

//     // ---------- Frame Format ----------
//     // <MAC|LAT|LON|DIST|TIME|MSG>
//     XBee.print('<');
//     XBee.print(MAC_ID);       XBee.print('|');
//     XBee.print(start_lat);    XBee.print('|');
//     XBee.print(start_long);   XBee.print('|');
//     XBee.print(distance);     XBee.print('|');
//     XBee.print(gps_time);     XBee.print('|');
//     XBee.print(message);
//     XBee.println('>');

//     // ---------- Debug ----------
//     Serial.print("Sent packet: <");
//     Serial.print(MAC_ID); Serial.print('|');
//     Serial.print(start_lat); Serial.print('|');
//     Serial.print(start_long); Serial.print('|');
//     Serial.print(distance); Serial.print('|');
//     Serial.print(gps_time); Serial.print('|');
//     Serial.print(message);
//     Serial.println('>');
//   }
// }

// // ===================== HAVERSINE =====================
// double haversine(double lat1, double lon1, double lat2, double lon2) {
//   const double R = 6371000.0;   // Earth radius (meters)

//   double dLat = radians(lat2 - lat1);
//   double dLon = radians(lon2 - lon1);

//   lat1 = radians(lat1);
//   lat2 = radians(lat2);

//   double a = sin(dLat / 2) * sin(dLat / 2) +
//              cos(lat1) * cos(lat2) *
//              sin(dLon / 2) * sin(dLon / 2);

//   double c = 2 * atan2(sqrt(a), sqrt(1 - a));
//   return R * c;
// }



// #include <SPI.h>
// #include <SD.h>
// #include <SoftwareSerial.h>
// #include <TinyGPSPlus.h>

// // ===================== ZIGBEE =====================
// // SoftwareSerial XBee(4, 5);   // RX, TX
// SoftwareSerial XBee(14, 27);

// // ===================== GPS =====================
// TinyGPSPlus gps;

// // ===================== SD CARD =====================
// SPIClass spi(VSPI);
// File geoFile;
// const int SD_CS = 5;

// // ===================== DEVICE INFO =====================
// const char MAC_ID[] = "A4:C3:F0:1B:9E:7D";

// // ===================== GEOFENCE =====================
// double minLat, maxLat, minLon, maxLon;
// bool geofenceLoaded = false;

// // ===================== DISTANCE =====================
// double prevLat = 0.0, prevLon = 0.0;
// double startLat = 0.0, startLon = 0.0;
// double totalDistanceMeters = 0.0;

// bool hasPrevFix = false;
// bool startFixSet = false;

// // ===================== SETUP =====================
// void setup() {
//   Serial.begin(9600);
//   XBee.begin(9600);

//   Serial2.begin(9600, SERIAL_8N1, 16, 17);

//   // ---------- SD INIT ----------
//   pinMode(SD_CS, OUTPUT);
//   digitalWrite(SD_CS, HIGH);

//   if (!SD.begin(SD_CS, spi, 10000000)) {
//     Serial.println("SD init failed");
//     return;
//   }

//   Serial.println("SD init OK");

//   loadGeofence();

//   Serial.println("GPS + ZigBee Transmitter Ready");
// }

// // ===================== LOOP =====================
// void loop() {

//   // ---------- READ GPS ----------
//   while (Serial2.available()) {
//     gps.encode(Serial2.read());
//   }

//   if (gps.location.isUpdated() && geofenceLoaded) {

//     double currLat = gps.location.lat();
//     double currLon = gps.location.lng();

//     // Check geofence
//     bool inside = insideGeofence(currLat, currLon);

//     if (inside) {

//       if (!startFixSet) {
//         startLat = currLat;
//         startLon = currLon;
//         startFixSet = true;
//       }

//       if (hasPrevFix) {
//         double delta = haversine(prevLat, prevLon, currLat, currLon);

//         if (delta > 0.5 && delta < 50.0) {
//           totalDistanceMeters += delta;
//         }
//       }

//       prevLat = currLat;
//       prevLon = currLon;
//       hasPrevFix = true;
//     }
//   }

//   // ---------- ZIGBEE SEND ----------
//   if (Serial.available()) {

//     String msg = Serial.readStringUntil('\n');
//     msg.trim();

//     if (!startFixSet || !gps.time.isValid()) {
//       Serial.println("Waiting for GPS/geofence...");
//       return;
//     }

//     XBee.print('<');
//     XBee.print(MAC_ID); XBee.print('|');
//     XBee.print(startLat, 6); XBee.print('|');
//     XBee.print(startLon, 6); XBee.print('|');
//     XBee.print(totalDistanceMeters, 2); XBee.print('|');
//     XBee.print(gps.time.hour()); XBee.print(':');
//     XBee.print(gps.time.minute()); XBee.print(':');
//     XBee.print(gps.time.second()); XBee.print('|');
//     XBee.print(msg);
//     XBee.println('>');
//   }
// }

// // ===================== LOAD GEOFENCE =====================
// void loadGeofence() {

//   geoFile = SD.open("/geofence_check.csv");
//   if (!geoFile) {
//     Serial.println("Geofence file not found");
//     return;
//   }

//   geoFile.readStringUntil('\n');  // skip header

//   String line = geoFile.readStringUntil('\n');
//   sscanf(line.c_str(), "%lf,%lf,%lf,%lf",
//          &minLat, &maxLat, &minLon, &maxLon);

//   geoFile.close();
//   geofenceLoaded = true;

//   Serial.println("Geofence Loaded:");
//   Serial.println(line);
// }

// // ===================== GEOFENCE CHECK =====================
// bool insideGeofence(double lat, double lon) {
//   return (lat >= minLat && lat <= maxLat &&
//           lon >= minLon && lon <= maxLon);
// }

// // ===================== HAVERSINE =====================
// double haversine(double lat1, double lon1, double lat2, double lon2) {

//   const double R = 6371000.0;

//   double dLat = radians(lat2 - lat1);
//   double dLon = radians(lon2 - lon1);

//   lat1 = radians(lat1);
//   lat2 = radians(lat2);

//   double a = sin(dLat / 2) * sin(dLat / 2) +
//              cos(lat1) * cos(lat2) *
//              sin(dLon / 2) * sin(dLon / 2);

//   return 2 * R * atan2(sqrt(a), sqrt(1 - a));
// }




// #include <TinyGPSPlus.h>
// #include <HardwareSerial.h>
// #include <SoftwareSerial.h>
// #include <SPI.h>
// #include <SD.h>

// /* ================= CONFIG ================= */

// // GPS (UART2)
// #define GPS_RX 16
// #define GPS_TX 17

// // ZigBee
// #define ZB_RX 14
// #define ZB_TX 27

// // SD Card
// #define SD_CS 5

// // Limits
// #define MAX_POINTS 300
// #define GEOFENCE_THRESHOLD_METERS 30.0
// #define MIN_VALID_MOVE_METERS 0.5
// #define MAX_GLITCH_METERS 50.0

// const char MAC_ID[] = "A4:C3:F0:1B:9E:7D";

// /* ========================================== */

// /* GPS */
// TinyGPSPlus gps;
// #define gpsSerial Serial2

// /* ZigBee */
// SoftwareSerial XBee(ZB_RX, ZB_TX);

// /* Geofence storage
//    CSV FORMAT: longitude,latitude */
// double fenceLat[MAX_POINTS];
// double fenceLon[MAX_POINTS];
// int fenceCount = 0;

// /* Trip state */
// bool insideGeofence = false;
// bool tripActive     = false;

// double prevLat = 0.0, prevLon = 0.0;
// double startLat = 0.0, startLon = 0.0;
// double totalDistance = 0.0;

// unsigned long tripStartTime = 0;

// /* ================= UTILITIES ================= */

// double haversine(double lat1, double lon1, double lat2, double lon2) {
//   const double R = 6371000.0;

//   double dLat = radians(lat2 - lat1);
//   double dLon = radians(lon2 - lon1);

//   lat1 = radians(lat1);
//   lat2 = radians(lat2);

//   double a = sin(dLat / 2) * sin(dLat / 2) +
//              cos(lat1) * cos(lat2) *
//              sin(dLon / 2) * sin(dLon / 2);

//   return 2 * R * atan2(sqrt(a), sqrt(1 - a));
// }

// double distanceToPolyline(double lat, double lon) {
//   double minDist = 1e9;

//   for (int i = 0; i < fenceCount - 1; i++) {
//     double d1 = haversine(lat, lon, fenceLat[i], fenceLon[i]);
//     double d2 = haversine(lat, lon, fenceLat[i + 1], fenceLon[i + 1]);
//     double seg = haversine(
//       fenceLat[i], fenceLon[i],
//       fenceLat[i + 1], fenceLon[i + 1]
//     );

//     double dist = fabs((d1 + d2) - seg);
//     if (dist < minDist) minDist = dist;
//   }
//   return minDist;
// }

// /* ================= SETUP ================= */

// void setup() {
//   Serial.begin(115200);

//   gpsSerial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);
//   XBee.begin(9600);

//   Serial.println("Waiting for GPS fix and satellites...");

//   if (!SD.begin(SD_CS)) {
//     Serial.println("SD Card FAILED");
//     while (true);
//   }

//   File f = SD.open("/geofence.csv");
//   if (!f) {
//     Serial.println("Geofence file missing");
//     while (true);
//   }

//   /* CSV FORMAT: longitude,latitude */
//   while (f.available() && fenceCount < MAX_POINTS) {
//     String line = f.readStringUntil('\n');
//     line.trim();

//     int comma = line.indexOf(',');
//     if (comma > 0) {
//       fenceLon[fenceCount] = line.substring(0, comma).toDouble();   // longitude
//       fenceLat[fenceCount] = line.substring(comma + 1).toDouble(); // latitude
//       fenceCount++;
//     }
//   }
//   f.close();

//   Serial.print("Geofence points loaded: ");
//   Serial.println(fenceCount);
// }

// /* ================= LOOP ================= */

// void loop() {

//   while (gpsSerial.available() > 0) {
//     if (gps.encode(gpsSerial.read())) {
//       processGPS();
//     }
//   }

//   if (millis() > 5000 && gps.charsProcessed() < 10) {
//     Serial.println("No GPS detected: check wiring.");
//     while (true);
//   }
// }

// /* ================= GPS PROCESS ================= */

// void processGPS() {

//   if (!gps.location.isValid()) return;

//   double lat = gps.location.lat();   // latitude
//   double lon = gps.location.lng();   // longitude

//   Serial.println("-------------------------------------");
//   Serial.print("Lat: "); Serial.println(lat, 6);
//   Serial.print("Lon: "); Serial.println(lon, 6);
//   Serial.print("Satellites: ");
//   Serial.println(gps.satellites.value());

//   double geoDist = distanceToPolyline(lat, lon);
//   bool nowInside = (geoDist <= GEOFENCE_THRESHOLD_METERS);

//   /* ---- ENTER GEOFENCE ---- */
//   if (nowInside && !insideGeofence) {
//     insideGeofence = true;
//     tripActive = true;

//     startLat = lat;
//     startLon = lon;
//     prevLat  = lat;
//     prevLon  = lon;
//     totalDistance = 0.0;
//     tripStartTime = millis();

//     Serial.println(">>> ENTERED GEOFENCE");
//   }

//   /* ---- INSIDE GEOFENCE ---- */
//   if (tripActive && nowInside) {
//     double d = haversine(prevLat, prevLon, lat, lon);

//     if (d >= MIN_VALID_MOVE_METERS && d <= MAX_GLITCH_METERS) {
//       totalDistance += d;
//       prevLat = lat;
//       prevLon = lon;
//     }
//   }

//   /* ---- EXIT GEOFENCE ---- */
//   if (!nowInside && insideGeofence) {
//     insideGeofence = false;
//     tripActive = false;

//     Serial.println("<<< EXITED GEOFENCE");
//     sendZigBeePayload();
//   }
// }

// /* ================= ZIGBEE TX ================= */

// void sendZigBeePayload() {

//   unsigned long durationSec = (millis() - tripStartTime) / 1000;

//   XBee.print('<');
//   XBee.print(MAC_ID);           XBee.print('|');
//   XBee.print(startLat, 6);      XBee.print('|');
//   XBee.print(startLon, 6);      XBee.print('|');
//   XBee.print(totalDistance, 2); XBee.print('|');
//   XBee.print(durationSec);      XBee.print('|');
//   XBee.print("OK");
//   XBee.println('>');

//   Serial.print('<');
//   Serial.print(MAC_ID);           Serial.print('|');
//   Serial.print(startLat, 6);      Serial.print('|');
//   Serial.print(startLon, 6);      Serial.print('|');
//   Serial.print(totalDistance, 2); Serial.print('|');
//   Serial.print(durationSec);      Serial.print('|');
//   Serial.print("OK");
//   Serial.println('>');

//   Serial.println("ZigBee payload sent");
// }





//
//
// API Mode Tx
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


