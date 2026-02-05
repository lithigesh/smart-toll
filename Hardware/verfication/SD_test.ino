//
//
// NodeMCU ESP32S
//
//

// pin conf: CS - 5, SCK - 18, MOSI - 23 (21 Optional), MISO - 19
#include <SPI.h>
#include <SD.h>

SPIClass spi(VSPI);
File myFile;

const int CS = 5;

void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(CS, OUTPUT);
  digitalWrite(CS, HIGH);

  spi.begin(18, 19, 23, CS); // P21 also works

  if (!SD.begin(CS, spi, 10000000)) {
    Serial.println("SD init failed");
    return;
  }

  Serial.println("SD init OK");

  myFile = SD.open("/swami.txt", FILE_WRITE);
  if (myFile) {
    myFile.println("Darshan daa gommala");
    myFile.close();
  }

  myFile = SD.open("/swami.txt");
  if (myFile) {
    while (myFile.available())
      Serial.write(myFile.read());
    myFile.close();
  }
}

void loop() {}
