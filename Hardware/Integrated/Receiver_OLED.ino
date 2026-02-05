//
// Zigbee API mode Rx
// Rx → 18, Tx → 19
//
// OLED (I²C mode)
// VCC → 3V3, SDA → 21, SCL → 22
// 
//


#include <SoftwareSerial.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

/* ================= OLED CONFIG ================= */
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
#define OLED_ADDR     0x3C

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

/* ================= ZIGBEE CONFIG =============== */
SoftwareSerial XBee(18, 19);   // RX, TX

const byte MSG_LEN = 120;
char msg[MSG_LEN];

bool receiving = false;
byte msgIndex = 0;

/* =============================================== */

void setup() {
  Serial.begin(9600);
  XBee.begin(9600);

  /* OLED INIT */
  Wire.begin(21, 22);   // SDA, SCL

  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    Serial.println("OLED init failed");
    while (true);
  }

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("ZigBee Receiver");
  display.println("Waiting...");
  display.display();

  Serial.println("Receiver ready...");
}

void loop() {

  while (XBee.available() > 0) {
    char incomingByte = XBee.read();

    if (incomingByte == '<') {
      receiving = true;
      msgIndex = 0;
    }
    else if (incomingByte == '>' && receiving) {
      msg[msgIndex] = '\0';
      receiving = false;
      processMessage(msg);
    }
    else if (receiving && msgIndex < MSG_LEN - 1) {
      msg[msgIndex++] = incomingByte;
    }
  }
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

void processMessage(char *message) {

  // Expected:
  // MAC_ID|start_lat|start_long|distance|time|payload

  char *fields[6];
  byte fieldIndex = 0;

  fields[fieldIndex++] = message;

  for (byte i = 0; message[i] != '\0' && fieldIndex < 6; i++) {
    if (message[i] == '|') {
      message[i] = '\0';
      fields[fieldIndex++] = &message[i + 1];
    }
  }

  while (fieldIndex < 6) {
    fields[fieldIndex++] = (char *)"";
  }

  /* SERIAL OUTPUT */
  printField("MAC_ID     ", fields[0]);
  printField("Start Lat  ", fields[1]);
  printField("Start Long ", fields[2]);
  printField("Distance   ", fields[3]);
  printField("Time       ", fields[4]);
  printField("Message    ", fields[5]);
  Serial.println("-----------------------------");

  /* OLED OUTPUT */
  display.clearDisplay();
  display.setCursor(0, 0);

  display.print("MAC: ");
  display.println(fields[0]);

  display.print("Dist: ");
  display.println(fields[3]);

  display.print("Time: ");
  display.println(fields[4]);

  display.println("Msg:");
  display.println(fields[5]);

  display.display();
}
