// Receiver 
#include <XBee.h>
#include <SoftwareSerial.h>

SoftwareSerial xbeeSerial(18, 19);   // RX, TX
XBee xbee = XBee();

ZBRxResponse rx = ZBRxResponse();

void setup() {
  Serial.begin(9600);
  xbeeSerial.begin(9600);

  xbee.setSerial(xbeeSerial);

  Serial.println("XBee API Receiver Ready");
}

void loop() {
  xbee.readPacket();

  if (xbee.getResponse().isAvailable()) {

    // Check if this is a ZigBee RX packet
    if (xbee.getResponse().getApiId() == ZB_RX_RESPONSE) {

      xbee.getResponse().getZBRxResponse(rx);

      Serial.print("Received Data: ");

      // Read payload
      for (int i = 0; i < rx.getDataLength(); i++) {
        char c = (char)rx.getData(i);
        Serial.print(c);
      }

      Serial.println();

      // Optional: sender address
      Serial.print("From: ");
      Serial.print(rx.getRemoteAddress64().getMsb(), HEX);
      Serial.print(rx.getRemoteAddress64().getLsb(), HEX);
      Serial.println();
    }
  }
}