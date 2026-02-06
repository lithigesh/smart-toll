#include <XBee.h>
#include "BluetoothSerial.h"

/* ================= XBee ================= */
HardwareSerial XBeeSerial(1);
XBee xbee = XBee();
XBeeAddress64 destAddr = XBeeAddress64(0x00000000, 0x0000FFFF);

const char MAC_ID[] = "A4:C3:F0:1B:9E:7D";

double startLat = 13.082680;
double startLon = 80.270700;
double totalDistance = 124.50;

unsigned long tripStartTime;

#define TX_INTERVAL_MS 5000

/* ================= Bluetooth ================= */
BluetoothSerial SerialBT;

/* ================= Motor Pins ================= */
#define IN1 25
#define IN2 26
#define IN3 32
#define IN4 33
#define ENA 27
#define ENB 14


/* ================= FUNCTION PROTOTYPES ================= */
void carControlTask(void *parameter);
void xbeeTxTask(void *parameter);
void sendZigBeePayload();


/* ================= SETUP ================= */
void setup() {
  Serial.begin(115200);

  /* Bluetooth */
  SerialBT.begin("bt_Car");

  /* Motor Pins */
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  pinMode(ENA, OUTPUT);
  pinMode(ENB, OUTPUT);

  analogWrite(ENA, 200);
  analogWrite(ENB, 200);

  /* XBee */
  XBeeSerial.begin(9600, SERIAL_8N1, 21, 22);
  xbee.setSerial(XBeeSerial);

  tripStartTime = millis();

  /* ================= CREATE TASKS ================= */

  // HIGH priority task → Car control (real-time)
  xTaskCreatePinnedToCore(
    carControlTask,
    "CarControl",
    4096,
    NULL,
    2,
    NULL,
    1
  );

  // LOWER priority task → XBee transmission
  xTaskCreatePinnedToCore(
    xbeeTxTask,
    "XBeeTX",
    4096,
    NULL,
    1,
    NULL,
    0
  );

  Serial.println("ESP32 Multitasking Started");
}


/* ================= LOOP ================= */
void loop() {
  // FreeRTOS handles everything
}


/* ================= TASK: CAR CONTROL ================= */
void carControlTask(void *parameter) {
  while (true) {

    if (SerialBT.available()) {
      char cmd = SerialBT.read();

      switch (cmd) {
        case 'B':   // Forward
          digitalWrite(IN1, HIGH);
          digitalWrite(IN2, LOW);
          digitalWrite(IN3, HIGH);
          digitalWrite(IN4, LOW);
          break;

        case 'F':   // Backward
          digitalWrite(IN1, LOW);
          digitalWrite(IN2, HIGH);
          digitalWrite(IN3, LOW);
          digitalWrite(IN4, HIGH);
          break;

        case 'R':   // Left
          digitalWrite(IN1, LOW);
          digitalWrite(IN2, HIGH);
          digitalWrite(IN3, HIGH);
          digitalWrite(IN4, LOW);
          break;

        case 'L':   // Right
          digitalWrite(IN1, HIGH);
          digitalWrite(IN2, LOW);
          digitalWrite(IN3, LOW);
          digitalWrite(IN4, HIGH);
          break;

        case 'S':   // Stop
          digitalWrite(IN1, LOW);
          digitalWrite(IN2, LOW);
          digitalWrite(IN3, LOW);
          digitalWrite(IN4, LOW);
          break;
      }
    }

    vTaskDelay(10 / portTICK_PERIOD_MS);  // Yield CPU
  }
}


/* ================= TASK: XBEE TX ================= */
void xbeeTxTask(void *parameter) {

  unsigned long lastTxTime = 0;

  while (true) {

    if (millis() - lastTxTime >= TX_INTERVAL_MS) {
      lastTxTime = millis();
      sendZigBeePayload();
    }

    vTaskDelay(50 / portTICK_PERIOD_MS);
  }
}


/* ================= ZIGBEE PAYLOAD TX ================= */
void sendZigBeePayload() {

  unsigned long durationSec = (millis() - tripStartTime) / 1000;
  char payload[120];

  snprintf(
    payload,
    sizeof(payload),
    "<%s|%.6f|%.6f|%.2f|%lu|OK>",
    MAC_ID,
    startLat,
    startLon,
    totalDistance,
    durationSec
  );

  ZBTxRequest txRequest(destAddr, (uint8_t*)payload, strlen(payload));
  xbee.send(txRequest);

  Serial.print("TX :: ");
  Serial.println(payload);
}
