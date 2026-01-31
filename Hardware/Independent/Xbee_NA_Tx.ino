// ESP32-S3 XBee Transmission (Network Adapter)

#include <XBee.h>

// Use ESP32-S3 Hardware UART
HardwareSerial XBeeSerial(1);   // UART1
XBee xbee = XBee();

uint8_t payload[1];

// Broadcast address
XBeeAddress64 destAddr = XBeeAddress64(0x00000000, 0x0000FFFF);

ZBTxRequest txRequest;
ZBTxStatusResponse txStatus;

void setup() {
  Serial.begin(9600);
  delay(1000);

  // UART1 pins for ESP32-S3
  // RX = GPIO15, TX = GPIO16 (safe default)
  XBeeSerial.begin(9600, SERIAL_8N1, 15, 16);

  xbee.setSerial(XBeeSerial);

  Serial.println("✅ ESP32-S3 XBee TX Ready");
}

void loop() {
  if (Serial.available()) {
    char c = Serial.read();

    payload[0] = c;

    txRequest = ZBTxRequest(destAddr, payload, sizeof(payload));
    xbee.send(txRequest);

    // Wait for TX status
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

/*
ESP32-S3 GPIO15 (RX)  ←  XBee DOUT
ESP32-S3 GPIO16 (TX)  →  XBee DIN
ESP32-S3 GND          ↔  XBee GND
XBee VCC              →  3.3V ONLY


*/