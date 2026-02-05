//
// ESP32S3
// OLED -> VCC → 3.3V, SCK → 18, MOSI → 23, CS → 5, DC → 4, RST → 2
//

#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

/* ===== OLED PIN CONFIG (ESP32-S3) ===== */
#define OLED_SCK    18
#define OLED_MOSI   23
#define OLED_CS     5
#define OLED_DC     4
#define OLED_RESET  2

/* ===== OLED OBJECT ===== */
Adafruit_SSD1306 display(
  128,
  64,
  &SPI,
  OLED_DC,
  OLED_RESET,
  OLED_CS
);

/* ===== MESSAGE ===== */
const char *message =
  "GPS ACTIVE | SPEED: 0.0 km/h | DISTANCE: 12.45 km | SYSTEM OK";

int16_t xPos;
int16_t textWidth;

void setup() {
  Serial.begin(115200);

  /* ===== SPI INIT (CRITICAL FOR ESP32-S3) ===== */
  SPI.begin(OLED_SCK, -1, OLED_MOSI, OLED_CS);

  /* ===== OLED INIT ===== */
  if (!display.begin(SSD1306_SWITCHCAPVCC)) {
    Serial.println("OLED init failed");
    while (true);
  }

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  /* Measure text width for smooth scrolling */
  int16_t x1, y1;
  uint16_t w, h;
  display.getTextBounds(message, 0, 0, &x1, &y1, &w, &h);
  textWidth = w;

  xPos = display.width();  // start off-screen right
}

void loop() {
  display.clearDisplay();

  display.setCursor(xPos, 28);  // vertically centered
  display.print(message);

  display.display();

  xPos--;   // scroll left

  if (xPos < -textWidth) {
    xPos = display.width();  // reset scroll
  }

  delay(30);  // scroll speed control
}
