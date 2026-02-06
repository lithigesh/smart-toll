#include <XBee.h>
#include <SoftwareSerial.h>
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

/* ================== XBee UART ================== */
SoftwareSerial xbeeSerial(15, 16);   // RX, TX
XBee xbee = XBee();
ZBRxResponse rx = ZBRxResponse();

char rxBuffer[150];   // payload buffer


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

        /* ---------- OLED OUTPUT ---------- */
        showOnOLED(
          "Packet Received:",
          String(rxBuffer)
        );
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
