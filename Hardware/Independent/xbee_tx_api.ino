// Transmission
#include <XBee.h>
#include <SoftwareSerial.h>

SoftwareSerial xbeeSerial(4, 5);  // RX, TX
XBee xbee = XBee();

uint8_t payload[1];

XBeeAddress64 destAddr = XBeeAddress64(0x00000000, 0x0000FFFF); // Broadcast

ZBTxRequest txRequest;
ZBTxStatusResponse txStatus;

void setup() {
  Serial.begin(9600);
  xbeeSerial.begin(9600);

  xbee.setSerial(xbeeSerial);
}

void loop() {
  if (Serial.available()) {
    char c = Serial.read();
    payload[0] = c;

    txRequest = ZBTxRequest(destAddr, payload, sizeof(payload));
    xbee.send(txRequest);

    if (xbee.readPacket(500)) {
      if (xbee.getResponse().getApiId() == ZB_TX_STATUS_RESPONSE) {
        xbee.getResponse().getZBTxStatusResponse(txStatus);
        if (txStatus.getDeliveryStatus() == SUCCESS) {
          Serial.println("Delivery SUCCESS");
        } else {
          Serial.println("Delivery FAILED");
        }
      }
    }

    Serial.print("Sent: ");
    Serial.println(c);
  }
}