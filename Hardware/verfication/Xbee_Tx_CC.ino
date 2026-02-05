#include <XBee.h>

// XBee on Hardware UART1
HardwareSerial XBeeSerial(1);
XBee xbee = XBee();

// Broadcast address
XBeeAddress64 destAddr = XBeeAddress64(0x00000000, 0x0000FFFF);

// Example telemetry values (replace with real ones)
const char MAC_ID[] = "A4:C3:F0:1B:9E:7D";

double startLat       = 13.082680;
double startLon       = 80.270700;
double totalDistance  = 124.50;

unsigned long tripStartTime;
unsigned long lastTxTime = 0;

#define TX_INTERVAL_MS 5000

void setup() {
  Serial.begin(9600);
  delay(1000);

  // XBee UART (RX, TX)
  XBeeSerial.begin(9600, SERIAL_8N1, 21, 22);
  xbee.setSerial(XBeeSerial);

  tripStartTime = millis();

  Serial.println("ESP32 XBee TX Ready");
}

void loop() {

  // Send payload periodically
  if (millis() - lastTxTime >= TX_INTERVAL_MS) {
    lastTxTime = millis();
    sendZigBeePayload();
  }
}

/* ================= ZIGBEE PAYLOAD TX ================= */

void sendZigBeePayload() {

  unsigned long durationSec = (millis() - tripStartTime) / 1000;

  char payload[120];

  // Build payload string (this replaces XBee.print calls)
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

  // Create API TX request
  ZBTxRequest txRequest(
    destAddr,
    (uint8_t*)payload,
    strlen(payload)
  );

  xbee.send(txRequest);

  // Optional: wait for TX status
  if (xbee.readPacket(500)) {
    if (xbee.getResponse().getApiId() == ZB_TX_STATUS_RESPONSE) {

      ZBTxStatusResponse txStatus;
      xbee.getResponse().getZBTxStatusResponse(txStatus);

      if (txStatus.getDeliveryStatus() == SUCCESS) {
        Serial.println("ZigBee Delivery SUCCESS");
      } else {
        Serial.println("ZigBee Delivery FAILED");
      }
    }
  }

  // Debug print
  Serial.print("TX :: ");
  Serial.println(payload);
}