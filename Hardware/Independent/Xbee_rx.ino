#include <SoftwareSerial.h>         // Include SoftwareSerial library
SoftwareSerial XBee(18, 19);        // RX = 18, TX = 19

bool started = false;               // True when '<' is detected
bool ended = false;                 // True when '>' is detected
char incomingByte;
char msg[10];                       // Increased to support bigger numbers/strings
byte msgIndex = 0;

void setup() {
  Serial.begin(9600);               // Debugging
  XBee.begin(9600);                 // XBee communication
}

void loop() {
  while (XBee.available() > 0) {
    incomingByte = XBee.read();

    if (incomingByte == '<') {      
      started = true;
      msgIndex = 0;
      msg[msgIndex] = '\0';           // Clear buffer
    }
    else if (incomingByte == '>') {
      ended = true;
      break;                       // Stop reading
    }
    else if (started && msgIndex < 9) {
      msg[msgIndex] = incomingByte;
      msgIndex++;
      msg[msgIndex] = '\0';
    }
  }

  if (started && ended) {

    // Check if the message is numeric
    bool isNumber = true;
    for (int i = 0; msg[i] != '\0'; i++) {
      if (!isdigit(msg[i])) {
        isNumber = false;
        break;
      }
    }

    if (isNumber) {
      int value = atoi(msg);
      Serial.print("Received number: ");
      Serial.println(value);
    } 
    else {
      Serial.print("Received character(s): ");
      Serial.println(msg);
    }

    // Reset flags
    started = false;
    ended = false;
  }
}