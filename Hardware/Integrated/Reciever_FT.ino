
// Receiver (fault-tolerant)
// Supports payload v1:
//   <MAC|start_lat|start_long|distance_km|time_sec|payload>
// Supports payload v2 (recommended):
//   <MAC|start_lat|start_long|distance_km|time_sec|payload|seq|CRC16>
//   CRC16 is computed over the substring up to (but excluding) the last '|CRC16' part.

#include <string.h>
#include <stdlib.h>

#if defined(ESP32)
  #include <HardwareSerial.h>
  #include <WiFi.h>
  #include <WiFiClientSecure.h>
  #include <HTTPClient.h>
  static constexpr int XBEE_UART_NUM = 1;
  static constexpr int XBEE_RX_PIN = 18;
  static constexpr int XBEE_TX_PIN = 19;
  HardwareSerial XBee(XBEE_UART_NUM);
#else
  #include <SoftwareSerial.h>
  SoftwareSerial XBee(18, 19);   // RX, TX
#endif

#if defined(ESP32)
// -------- WiFi/API CONFIG --------
// Set these before flashing.
static const char *WIFI_SSID = "GT6";
static const char *WIFI_PASS = "123456781";
static const char *API_URL   = "https://smart-toll-api.vercel.app/api/esp32-toll/process";

static constexpr uint32_t WIFI_RETRY_MS = 5000;
static uint32_t nextWifiAttemptMs = 0;

static bool ensureWifiConnected() {
  if (WiFi.status() == WL_CONNECTED) return true;
  uint32_t now = millis();
  if (now < nextWifiAttemptMs) return false;
  nextWifiAttemptMs = now + WIFI_RETRY_MS;

  Serial.print("[INFO] WiFi connecting to ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  return false;
}

static bool postToApi(const char *deviceId, double startLat, double startLon, double totalDistanceKm, const char *timestamp) {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure client;
  client.setInsecure(); // For quick setup on ESP32. For production, pin CA cert.

  HTTPClient http;
  if (!http.begin(client, API_URL)) {
    Serial.println("[WARN] http.begin failed");
    return false;
  }

  http.setTimeout(5000);
  http.addHeader("Content-Type", "application/json");

  // Build JSON payload (no external JSON library needed)
  String body;
  body.reserve(220);
  body += "{\"device_id\":\"";
  body += deviceId;
  body += "\",\"start_lat\":";
  body += String(startLat, 6);
  body += ",\"start_lon\":";
  body += String(startLon, 6);
  body += ",\"total_distance_km\":";
  body += String(totalDistanceKm, 3);
  body += ",\"timestamp\":\"";
  body += timestamp;
  body += "\"}";

  int code = http.POST(body);
  String resp = http.getString();
  http.end();

  Serial.print("[API] status=");
  Serial.println(code);
  if (resp.length()) {
    Serial.print("[API] body=");
    Serial.println(resp);
  }

  return (code >= 200 && code < 300);
}
#endif

static constexpr size_t MSG_LEN = 120;
static constexpr uint32_t FRAME_TIMEOUT_MS = 300; // reset if a frame stalls

char msg[MSG_LEN];

bool receiving = false;
bool overflowed = false;
size_t msgIndex = 0;
uint32_t lastByteAtMs = 0;

void setup() {
  Serial.begin(9600);

#if defined(ESP32)
  XBee.begin(9600, SERIAL_8N1, XBEE_RX_PIN, XBEE_TX_PIN);
#else
  XBee.begin(9600);
#endif

  Serial.println("Receiver ready...");

#if defined(ESP32)
  // Start WiFi in background; we will retry from loop.
  ensureWifiConnected();
#endif
}

void loop() {

#if defined(ESP32)
  ensureWifiConnected();
#endif

  if (receiving && (millis() - lastByteAtMs) > FRAME_TIMEOUT_MS) {
    receiving = false;
    overflowed = false;
    msgIndex = 0;
    Serial.println("[WARN] Frame timeout; resetting buffer");
  }

  while (XBee.available() > 0) {
    char incomingByte = XBee.read();

    lastByteAtMs = millis();

    if (incomingByte == '<') {
      receiving = true;
      overflowed = false;
      msgIndex = 0;
    }
    else if (incomingByte == '>' && receiving) {
      if (!overflowed) {
        msg[msgIndex] = '\0';
        processMessage(msg, msgIndex);
      } else {
        Serial.println("[WARN] Dropped oversized frame");
      }
      receiving = false;
      overflowed = false;
      msgIndex = 0;
    }
    else if (receiving) {
      if (msgIndex < MSG_LEN - 1) {
        msg[msgIndex++] = incomingByte;
      } else {
        overflowed = true;
      }
    }
  }
}

static uint16_t crc16_ccitt(const uint8_t *data, size_t len) {
  uint16_t crc = 0xFFFF;
  for (size_t i = 0; i < len; i++) {
    crc ^= (uint16_t)data[i] << 8;
    for (uint8_t b = 0; b < 8; b++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
    }
  }
  return crc;
}

static bool parseHexU16(const char *s, uint16_t &out) {
  if (!s || !*s) return false;
  char *end = nullptr;
  unsigned long v = strtoul(s, &end, 16);
  if (end == s || *end != '\0' || v > 0xFFFF) return false;
  out = (uint16_t)v;
  return true;
}

void printField(const char *label, const char *value) {
  Serial.print(label);
  Serial.print(": ");
  if (value[0] == '\0') {
    Serial.println("NULL");
  } else {
    Serial.println(value);
  }
}

static void processMessage(char *message, size_t messageLen) {

  // Expected (v1):
  // MAC_ID|start_lat|start_long|distance_km|time_sec|payload
  // v2 adds: |seq|CRC16

  // First: if it looks like v2, validate CRC before mutating the buffer.
  int pipeCount = 0;
  for (size_t i = 0; i < messageLen; i++) {
    if (message[i] == '|') pipeCount++;
  }

  bool isV2 = (pipeCount >= 7);
  if (isV2) {
    int lastPipe = -1;
    int prevPipe = -1;
    for (int i = (int)messageLen - 1; i >= 0; i--) {
      if (message[i] == '|') {
        if (lastPipe < 0) lastPipe = i;
        else { prevPipe = i; break; }
      }
    }

    if (lastPipe > 0) {
      // Extract CRC token
      char crcToken[8] = {0};
      size_t crcLen = messageLen - (size_t)lastPipe - 1;
      if (crcLen > 0 && crcLen < sizeof(crcToken)) {
        memcpy(crcToken, &message[lastPipe + 1], crcLen);
        crcToken[crcLen] = '\0';

        uint16_t expectedCrc = 0;
        if (parseHexU16(crcToken, expectedCrc)) {
          uint16_t actualCrc = crc16_ccitt((const uint8_t*)message, (size_t)lastPipe);
          if (actualCrc != expectedCrc) {
            Serial.print("[WARN] CRC mismatch. expected=0x");
            Serial.print(crcToken);
            Serial.print(" actual=0x");
            Serial.println(actualCrc, HEX);
            return;
          }
        } else {
          Serial.println("[WARN] Invalid CRC token; dropping frame");
          return;
        }

        // Optional: print seq if present
        if (prevPipe > 0 && prevPipe < lastPipe) {
          char seqToken[16] = {0};
          size_t seqLen = (size_t)lastPipe - (size_t)prevPipe - 1;
          if (seqLen > 0 && seqLen < sizeof(seqToken)) {
            memcpy(seqToken, &message[prevPipe + 1], seqLen);
            seqToken[seqLen] = '\0';
            Serial.print("Seq        : ");
            Serial.println(seqToken);
          }
        }
      }
    }
  }

  char *fields[8];
  byte fieldIndex = 0;

  fields[fieldIndex++] = message;

  for (size_t i = 0; message[i] != '\0' && fieldIndex < 8; i++) {
    if (message[i] == '|') {
      message[i] = '\0';
      fields[fieldIndex++] = &message[i + 1];
    }
  }

  while (fieldIndex < 8) {
    fields[fieldIndex++] = (char *)"";
  }

  printField("MAC_ID     ", fields[0]);
  printField("Start Lat  ", fields[1]);
  printField("Start Long ", fields[2]);
  printField("Distance   ", fields[3]);
  printField("Time       ", fields[4]);
  printField("Message    ", fields[5]);

#if defined(ESP32)
  // Forward to API if basic fields are present.
  if (fields[0][0] && fields[1][0] && fields[2][0] && fields[3][0] && fields[4][0]) {
    const char *deviceId = fields[0];
    double lat = atof(fields[1]);
    double lon = atof(fields[2]);
    double distKm = atof(fields[3]);
    const char *timestamp = fields[4];

    // Minimal validation before API call
    bool ok = true;
    if (lat < -90.0 || lat > 90.0 || lon < -180.0 || lon > 180.0) ok = false;
    if (distKm <= 0.0) ok = false;

    if (!ok) {
      Serial.println("[WARN] Not posting to API (invalid lat/lon/dist)");
    } else if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[WARN] WiFi not connected; cannot post to API");
    } else {
      Serial.println("[INFO] Posting to /api/esp32-toll/process");

      // Retry once if the first attempt fails (common with transient TLS/WiFi issues)
      bool posted = postToApi(deviceId, lat, lon, distKm, timestamp);
      if (!posted) {
        delay(250);
        posted = postToApi(deviceId, lat, lon, distKm, timestamp);
      }

      Serial.println(posted ? "[OK] API post success" : "[WARN] API post failed");
    }
  } else {
    Serial.println("[WARN] Missing required fields for API post");
  }
#endif

  // Basic sanity checks to surface bad payloads quickly.
  if (fields[1][0] && fields[2][0]) {
    double lat = atof(fields[1]);
    double lon = atof(fields[2]);
    if (lat < -90.0 || lat > 90.0 || lon < -180.0 || lon > 180.0) {
      Serial.println("[WARN] Lat/Lon out of range");
    }
  }

  if (fields[3][0]) {
    double distKm = atof(fields[3]);
    if (distKm < 0.0 || distKm > 2000.0) {
      Serial.println("[WARN] Distance looks wrong (km)");
    }
  }

  Serial.println("-----------------------------");
}