// #include <SoftwareSerial.h>         // Include SoftwareSerial library
// SoftwareSerial XBee(18, 19);        // RX = 18, TX = 19

// bool started = false;               // True when '<' is detected
// bool ended = false;                 // True when '>' is detected
// char incomingByte;
// char msg[10];                       // Increased to support bigger numbers/strings
// byte msgIndex = 0;

// void setup() {
//   Serial.begin(9600);               // Debugging
//   XBee.begin(9600);                 // XBee communication
// }

// void loop() {
//   while (XBee.available() > 0) {
//     incomingByte = XBee.read();

//     if (incomingByte == '<') {      
//       started = true;
//       msgIndex = 0;
//       msg[msgIndex] = '\0';           // Clear buffer
//     }
//     else if (incomingByte == '>') {
//       ended = true;
//       break;                       // Stop reading
//     }
//     else if (started && msgIndex < 9) {
//       msg[msgIndex] = incomingByte;
//       msgIndex++;
//       msg[msgIndex] = '\0';
//     }
//   }

//   if (started && ended) {

//     // Check if the message is numeric
//     bool isNumber = true;
//     for (int i = 0; msg[i] != '\0'; i++) {
//       if (!isdigit(msg[i])) {
//         isNumber = false;
//         break;
//       }
//     }

//     if (isNumber) {
//       int value = atoi(msg);
//       Serial.print("Received number: ");
//       Serial.println(value);
//     } 
//     else {
//       Serial.print("Received character(s): ");
//       Serial.println(msg);
//     }

//     // Reset flags
//     started = false;
//     ended = false;
//   }
// }


// Receiver Xbee esp32 Payload format

#include <SoftwareSerial.h>

SoftwareSerial XBee(18, 19);   // RX, TX

const byte MSG_LEN = 120;
char msg[MSG_LEN];

bool receiving = false;
byte msgIndex = 0; 

void setup() {
  Serial.begin(9600);
  XBee.begin(9600);
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

  printField("MAC_ID     ", fields[0]);
  printField("Start Lat  ", fields[1]);
  printField("Start Long ", fields[2]);
  printField("Distance   ", fields[3]);
  printField("Time       ", fields[4]);
  printField("Message    ", fields[5]);

  Serial.println("-----------------------------");
}