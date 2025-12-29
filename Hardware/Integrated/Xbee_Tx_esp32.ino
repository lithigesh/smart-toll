// Transmitter Xbee esp32 payload format

#include <SoftwareSerial.h>
#include <TinyGPSPlus.h>

// ===================== ZIGBEE =====================
SoftwareSerial XBee(4, 5);   // RX, TX

// ===================== GPS =====================
TinyGPSPlus gps;

// ===================== DEVICE INFO =====================
const char MAC_ID[] = "A4:C3:F0:1B:9E:7D";

// ===================== DISTANCE VARIABLES =====================
double prevLat = 0.0, prevLon = 0.0;
double startLat = 0.0, startLon = 0.0;
double totalDistanceMeters = 0.0;

bool hasPrevFix = false;
bool startFixSet = false;

// ===================== SETUP =====================
void setup() {
  Serial.begin(9600);
  XBee.begin(9600);

  // GPS UART
  Serial2.begin(9600, SERIAL_8N1, 16, 17);

  Serial.println("GPS + ZigBee Transmitter Started");
  Serial.println("Type a message and press ENTER");
}

// ===================== LOOP =====================
void loop() {

  // ---------- Read GPS ----------
  while (Serial2.available() > 0) {
    gps.encode(Serial2.read());
  }

  // ---------- GPS Update ----------
  if (gps.location.isUpdated()) {

    double currLat = gps.location.lat();
    double currLon = gps.location.lng();

    // Save starting position ONCE
    if (!startFixSet) {
      startLat = currLat;
      startLon = currLon;
      startFixSet = true;
    }

    // Distance calculation
    if (hasPrevFix) {
      double delta = haversine(prevLat, prevLon, currLat, currLon);

      // GPS noise filtering
      if (delta > 0.5 && delta < 50.0) {
        totalDistanceMeters += delta;
      }
    }

    prevLat = currLat;
    prevLon = currLon;
    hasPrevFix = true;
  }

  // ---------- Send ZigBee Packet ----------
  if (Serial.available()) {

    String message = Serial.readStringUntil('\n');
    message.trim();

    // Ensure GPS lock
    if (!startFixSet || !gps.time.isValid()) {
      Serial.println("Waiting for valid GPS fix...");
      return;
    }

    // ---------- Packet Fields ----------
    String start_lat  = String(startLat, 6);
    String start_long = String(startLon, 6);
    String distance   = String(totalDistanceMeters, 2);

    String gps_time = String(gps.time.hour())   + ":" +
                      String(gps.time.minute()) + ":" +
                      String(gps.time.second());

    // ---------- Frame Format ----------
    // <MAC|LAT|LON|DIST|TIME|MSG>
    XBee.print('<');
    XBee.print(MAC_ID);       XBee.print('|');
    XBee.print(start_lat);    XBee.print('|');
    XBee.print(start_long);   XBee.print('|');
    XBee.print(distance);     XBee.print('|');
    XBee.print(gps_time);     XBee.print('|');
    XBee.print(message);
    XBee.println('>');

    // ---------- Debug ----------
    Serial.print("Sent packet: <");
    Serial.print(MAC_ID); Serial.print('|');
    Serial.print(start_lat); Serial.print('|');
    Serial.print(start_long); Serial.print('|');
    Serial.print(distance); Serial.print('|');
    Serial.print(gps_time); Serial.print('|');
    Serial.print(message);
    Serial.println('>');
  }
}

// ===================== HAVERSINE =====================
double haversine(double lat1, double lon1, double lat2, double lon2) {
  const double R = 6371000.0;   // Earth radius (meters)

  double dLat = radians(lat2 - lat1);
  double dLon = radians(lon2 - lon1);

  lat1 = radians(lat1);
  lat2 = radians(lat2);

  double a = sin(dLat / 2) * sin(dLat / 2) +
             cos(lat1) * cos(lat2) *
             sin(dLon / 2) * sin(dLon / 2);

  double c = 2 * atan2(sqrt(a), sqrt(1 - a));
  return R * c;
}