#include <XBee.h>
#include <SoftwareSerial.h>

// SoftwareSerial pins
SoftwareSerial xbeeSerial(16, 17); // RX, TX

XBee xbee = XBee();
ZBRxResponse rx = ZBRxResponse();

void setup() {
  Serial.begin(9600);
  delay(1000);

  xbeeSerial.begin(9600);
  xbee.setSerial(xbeeSerial);

  Serial.println("✅ ESP32 XBee API Receiver Ready");
}

void loop() {
  // IMPORTANT: give time for full API frame
  xbee.readPacket(200);   // wait up to 200 ms

  if (xbee.getResponse().isAvailable()) {

    if (xbee.getResponse().getApiId() == ZB_RX_RESPONSE) {

      xbee.getResponse().getZBRxResponse(rx);

      Serial.print("📩 Received Payload: ");

      // TX sends exactly 1 byte
      if (rx.getDataLength() > 0) {
        char c = (char)rx.getData(0);
        Serial.println(c);
      } else {
        Serial.println("No data");
      }
    }
  }

  if (xbee.getResponse().isError()) {
    Serial.print("❌ XBee Error: ");
    Serial.println(xbee.getResponse().getErrorCode());
  }
}




/*
ESP32 GPIO16 (RX)  ←  XBee DOUT
ESP32 GPIO17 (TX)  →  XBee DIN
ESP32 GND          ↔  XBee GND
XBee VCC           →  3.3V ONLY
*/