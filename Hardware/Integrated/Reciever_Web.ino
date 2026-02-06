#include <XBee.h>
#include <SoftwareSerial.h>
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <time.h>

/* ================== XBee UART ================== */
SoftwareSerial xbeeSerial(15, 16);   // RX, TX
XBee xbee = XBee();
ZBRxResponse rx = ZBRxResponse();

char rxBuffer[150];   // payload buffer

/* ================== WIFI + API CONFIG ================== */
// NOTE: Replace these before flashing.
// For production, avoid hardcoding credentials in the sketch.
#define WIFI_SSID "GT6"
#define WIFI_PASS "123456781"

// Your API endpoint (HTTPS supported). Example: https://smart-toll-api.vercel.app/api/esp32-toll/process
static const char* API_URL = "https://smart-toll-api.vercel.app/api/esp32-toll/process";

// NTP time sync (used if incoming payload doesn't include a timestamp)
static const char* NTP_SERVER_1 = "pool.ntp.org";
static const char* NTP_SERVER_2 = "time.nist.gov";
static const long GMT_OFFSET_SEC = 0;
static const int DAYLIGHT_OFFSET_SEC = 0;

// Basic debounce to avoid multiple posts for the same packet burst
static unsigned long lastPostMs = 0;
static const unsigned long MIN_POST_INTERVAL_MS = 1500;

bool ensureWiFiConnected(unsigned long timeoutMs = 8000) {
  if (WiFi.status() == WL_CONNECTED) return true;

  Serial.println("WiFi disconnected, reconnecting...");
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  unsigned long startMs = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - startMs) < timeoutMs) {
    delay(250);
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi reconnected. IP: ");
    Serial.println(WiFi.localIP());
    return true;
  }

  Serial.println("WiFi reconnect FAILED");
  return false;
}


/* ================== OLED CONFIG ================== */
// ESP32-S3 SPI Pins
#define OLED_SCK    18
#define OLED_MOSI   11
#define OLED_CS     5
#define OLED_DC     4
#define OLED_RESET  2

Adafruit_SSD1306 display(
  128,
  64,
  &SPI,
  OLED_DC,
  OLED_RESET,
  OLED_CS
);


/* ================== OLED PRINT FUNCTION ================== */
void showOnOLED(String line1, String line2 = "", String line3 = "") {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  display.setCursor(0, 0);
  display.println(line1);

  display.setCursor(0, 20);
  display.println(line2);

  display.setCursor(0, 40);
  display.println(line3);

  display.display();
}

/* ================== TIME HELPERS ================== */
String getIsoTimestampUtc() {
  struct tm timeInfo;
  if (!getLocalTime(&timeInfo, 200)) {
    // fallback if NTP hasn't synced yet
    return String("1970-01-01T00:00:00Z");
  }

  char buffer[25];
  // yyyy-mm-ddThh:mm:ssZ
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &timeInfo);
  return String(buffer);
}

/* ================== PAYLOAD PARSING ================== */
// Supports:
// 1) JSON string: {"device_id":"...","start_lat":...}
// 2) CSV string: device_id,start_lat,start_lon,total_distance_km,timestamp
// 3) Pipe frame: <device_id|start_lat|start_lon|total_distance_km|...|...>
bool parseIncomingPayload(
  const char* raw,
  String &deviceId,
  float &startLat,
  float &startLon,
  float &totalDistanceKm,
  String &timestamp
) {
  deviceId = "";
  startLat = 0;
  startLon = 0;
  totalDistanceKm = 0;
  timestamp = "";

  if (!raw || raw[0] == '\0') return false;

  // Try JSON first
  if (raw[0] == '{') {
    StaticJsonDocument<512> doc;
    DeserializationError err = deserializeJson(doc, raw);
    if (!err) {
      if (doc["device_id"].is<const char*>()) deviceId = String((const char*)doc["device_id"]);
      if (doc["start_lat"].is<float>() || doc["start_lat"].is<double>()) startLat = doc["start_lat"].as<float>();
      if (doc["start_lon"].is<float>() || doc["start_lon"].is<double>()) startLon = doc["start_lon"].as<float>();
      if (doc["total_distance_km"].is<float>() || doc["total_distance_km"].is<double>()) totalDistanceKm = doc["total_distance_km"].as<float>();
      if (doc["timestamp"].is<const char*>()) timestamp = String((const char*)doc["timestamp"]);
      return (deviceId.length() > 0 && totalDistanceKm > 0);
    }
  }

  // Pipe-delimited format (common for XBee payload frames)
  // Example: <ESP32_...|13.082680|80.270700|124.50|34|OK>
  {
    String s = String(raw);
    s.trim();

    if (s.length() >= 2 && s[0] == '<' && s[s.length() - 1] == '>') {
      s = s.substring(1, s.length() - 1);
      s.trim();
    }

    if (s.indexOf('|') >= 0) {
      int p1 = s.indexOf('|');
      int p2 = s.indexOf('|', p1 + 1);
      int p3 = s.indexOf('|', p2 + 1);

      if (p1 > 0 && p2 > p1 && p3 > p2) {
        deviceId = s.substring(0, p1);
        deviceId.trim();

        startLat = s.substring(p1 + 1, p2).toFloat();
        startLon = s.substring(p2 + 1, p3).toFloat();

        // total distance is the next token; may have additional tokens after it
        int p4 = s.indexOf('|', p3 + 1);
        String distStr = (p4 > p3) ? s.substring(p3 + 1, p4) : s.substring(p3 + 1);
        distStr.trim();
        totalDistanceKm = distStr.toFloat();

        // Optional: if there's a timestamp token immediately after distance and it looks like a datetime, capture it.
        // Otherwise we keep timestamp empty and the caller will use NTP time.
        if (p4 > p3) {
          int p5 = s.indexOf('|', p4 + 1);
          String maybeTs = (p5 > p4) ? s.substring(p4 + 1, p5) : s.substring(p4 + 1);
          maybeTs.trim();
          if (maybeTs.indexOf('-') >= 0 || maybeTs.indexOf(':') >= 0) {
            timestamp = maybeTs;
          }
        }

        return (deviceId.length() > 0 && totalDistanceKm > 0);
      }
    }
  }

  // Fallback: CSV
  // Format: device_id,start_lat,start_lon,total_distance_km,timestamp
  String s = String(raw);
  s.trim();

  int p1 = s.indexOf(',');
  int p2 = s.indexOf(',', p1 + 1);
  int p3 = s.indexOf(',', p2 + 1);
  int p4 = s.indexOf(',', p3 + 1);

  if (p1 < 0 || p2 < 0 || p3 < 0 || p4 < 0) return false;

  deviceId = s.substring(0, p1);
  deviceId.trim();
  startLat = s.substring(p1 + 1, p2).toFloat();
  startLon = s.substring(p2 + 1, p3).toFloat();
  totalDistanceKm = s.substring(p3 + 1, p4).toFloat();
  timestamp = s.substring(p4 + 1);
  timestamp.trim();

  return (deviceId.length() > 0 && totalDistanceKm > 0);
}

/* ================== API POST ================== */
bool postTollTransaction(
  const String &deviceId,
  float startLat,
  float startLon,
  float totalDistanceKm,
  const String &timestamp,
  String &responseBody,
  int &httpCode
) {
  responseBody = "";
  httpCode = 0;

  if (!ensureWiFiConnected()) {
    Serial.println("WiFi not connected (post aborted)");
    return false;
  }

  StaticJsonDocument<256> payload;
  payload["device_id"] = deviceId;
  payload["start_lat"] = startLat;
  payload["start_lon"] = startLon;
  payload["total_distance_km"] = totalDistanceKm;
  payload["timestamp"] = timestamp;

  String json;
  serializeJson(payload, json);

  Serial.print("POST -> ");
  Serial.println(API_URL);
  Serial.print("Payload: ");
  Serial.println(json);

  HTTPClient http;

  String url = String(API_URL);
  bool isHttps = url.startsWith("https://");

  bool beginOk = false;
  WiFiClient plainClient;
  WiFiClientSecure secureClient;

  if (isHttps) {
    // HTTPS: easiest path is using an insecure client. For production, set the server root CA instead.
    secureClient.setInsecure();
    beginOk = http.begin(secureClient, API_URL);
  } else {
    beginOk = http.begin(plainClient, API_URL);
  }

  if (!beginOk) {
    Serial.println("HTTP begin failed");
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  httpCode = http.POST((uint8_t*)json.c_str(), json.length());
  responseBody = http.getString();
  http.end();

  Serial.print("HTTP ");
  Serial.println(httpCode);
  Serial.println(responseBody);

  return (httpCode > 0);
}


/* ================== SETUP ================== */
void setup() {

  Serial.begin(9600);
  delay(1000);

  /* ---------- OLED INIT ---------- */
  SPI.begin(OLED_SCK, -1, OLED_MOSI, OLED_CS);

  if (!display.begin(SSD1306_SWITCHCAPVCC)) {
    Serial.println("OLED init failed");
    while (true);
  }

  showOnOLED("XBee Receiver", "RX Started...");
  delay(2000);

  /* ---------- WIFI INIT ---------- */
  showOnOLED("WiFi", "Connecting...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  unsigned long wifiStart = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - wifiStart) < 20000) {
    delay(250);
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("WiFi connected. IP: ");
    Serial.println(WiFi.localIP());
    showOnOLED("WiFi Connected", WiFi.localIP().toString());
  } else {
    Serial.println("WiFi connect FAILED");
    showOnOLED("WiFi Failed", "Check SSID/PASS");
  }

  /* ---------- NTP TIME ---------- */
  configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER_1, NTP_SERVER_2);
  delay(250);

  /* ---------- XBEE INIT ---------- */
  xbeeSerial.begin(9600);
  xbee.setSerial(xbeeSerial);

  Serial.println("ESP32 XBee API Receiver Ready");
}


/* ================== LOOP ================== */
void loop() {

  xbee.readPacket(200);

  if (xbee.getResponse().isAvailable()) {

    if (xbee.getResponse().getApiId() == ZB_RX_RESPONSE) {

      xbee.getResponse().getZBRxResponse(rx);

      int len = rx.getDataLength();

      if (len > 0 && len < (int)sizeof(rxBuffer)) {

        for (int i = 0; i < len; i++) {
          rxBuffer[i] = (char)rx.getData(i);
        }
        rxBuffer[len] = '\0';

        /* ---------- SERIAL OUTPUT ---------- */
        Serial.print("RX Payload: ");
        Serial.println(rxBuffer);

        // Debounce API posts
        if (millis() - lastPostMs < MIN_POST_INTERVAL_MS) {
          showOnOLED("Packet Received:", String(rxBuffer), "(debounced)");
          return;
        }

        String deviceId;
        float startLat;
        float startLon;
        float totalDistanceKm;
        String timestamp;

        bool parsedOk = parseIncomingPayload(rxBuffer, deviceId, startLat, startLon, totalDistanceKm, timestamp);
        if (!parsedOk) {
          Serial.println("Payload parse failed (expected JSON or CSV)");
          showOnOLED("RX Error", "Parse failed", "Send JSON/CSV");
          return;
        }

        if (timestamp.length() == 0) {
          timestamp = getIsoTimestampUtc();
        }

        String apiResp;
        int httpCode;
        bool posted = postTollTransaction(deviceId, startLat, startLon, totalDistanceKm, timestamp, apiResp, httpCode);
        lastPostMs = millis();

        if (posted) {
          // Try to extract a quick message from response
          String msg = "";
          StaticJsonDocument<768> respDoc;
          if (deserializeJson(respDoc, apiResp) == DeserializationError::Ok) {
            if (respDoc["message"].is<const char*>()) msg = String((const char*)respDoc["message"]);
          }
          if (msg.length() == 0) msg = "Posted";

          showOnOLED("API POST OK", String("HTTP ") + httpCode, msg);
        } else {
          showOnOLED("API POST FAIL", String("HTTP ") + httpCode);
        }

        /* ---------- OLED OUTPUT ---------- */
        // NOTE: OLED already updated above with API status.
      } 
      else {
        Serial.println("RX payload size invalid");
        showOnOLED("RX Error", "Invalid payload");
      }
    }
  }

  if (xbee.getResponse().isError()) {
    Serial.print("XBee Error: ");
    Serial.println(xbee.getResponse().getErrorCode());

    showOnOLED("XBee Error", String(xbee.getResponse().getErrorCode()));
  }
}
