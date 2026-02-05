#include <XBee.h>
#include <SoftwareSerial.h>

// XBee UART (ESP32 receiver board)
SoftwareSerial xbeeSerial(15, 16); // RX, TX

XBee xbee = XBee();
ZBRxResponse rx = ZBRxResponse();

// Buffer for received payload
char rxBuffer[150];   // enough for telemetry payload

void setup() {
  Serial.begin(9600);
  delay(1000);

  xbeeSerial.begin(9600);
  xbee.setSerial(xbeeSerial);

  Serial.println("ESP32 XBee API Receiver Ready");
}

void loop() {

  // Read full API frame (blocking up to 200 ms)
  xbee.readPacket(200);

  if (xbee.getResponse().isAvailable()) {

    // Check for ZigBee RX frame
    if (xbee.getResponse().getApiId() == ZB_RX_RESPONSE) {

      xbee.getResponse().getZBRxResponse(rx);

      int len = rx.getDataLength();

      // Sanity check length
      if (len > 0 && len < (int)sizeof(rxBuffer)) {

        // Copy payload bytes
        for (int i = 0; i < len; i++) {
          rxBuffer[i] = (char)rx.getData(i);
        }
        rxBuffer[len] = '\0';   // null terminate

        // Print full payload
        Serial.print("RX Payload: ");
        Serial.println(rxBuffer);

      } else {
        Serial.println("RX payload size invalid");
      }
    }
  }

  // Error handling
  if (xbee.getResponse().isError()) {
    Serial.print("XBee Error: ");
    Serial.println(xbee.getResponse().getErrorCode());
  }
}