#include <SoftwareSerial.h>          // Include SoftwareSerial library for communication

SoftwareSerial XBee(4, 5);         // Define SoftwareSerial pins: RX = 4, TX = 5

void setup() {
  Serial.begin(9600);                // Start communication with the PC for debugging
  XBee.begin(9600);                  // Start communication with the XBee module
}

void loop() {

  // Check if user typed something in Serial Monitor
  if (Serial.available() > 0) {
    
    char c = Serial.read();          // Read one character
    
    // Send to XBee wrapped in < >
    XBee.print('<');
    XBee.print(c);
    XBee.println('>');

    // Debug print
    Serial.print("Sent character: ");
    Serial.println(c);
  }
}