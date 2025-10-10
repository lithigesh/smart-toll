from controller import Robot, Keyboard
from vehicle import Driver
import json
import random  # for small random variations
from datetime import datetime, timezone
import threading
import requests

# ---------------- CONFIG ----------------
TIME_STEP = 50
FORWARD_SPEED = 70.0
TURN_SPEED = 0.0
TURN_ANGLE = 0.3

# Device info
DEVICE_ID = "ESP32_4A:7F:2C:9D:1B:6E"
BASE_LAT = 12.9715987
BASE_LON = 77.594566
BASE_DISTANCE_KM = 28

# Random variation
START_LAT = BASE_LAT + random.uniform(-0.0005, 0.0005)
START_LON = BASE_LON + random.uniform(-0.0005, 0.0005)
TOTAL_DISTANCE_KM = BASE_DISTANCE_KM + random.uniform(-0.5, 0.5)

# ---------------- DRIVER SETUP ----------------
driver = Driver()
keyboard = Keyboard()
keyboard.enable(TIME_STEP)

print("Manual Car Control (Low Speed)")
print("↑ Forward  |  ↓ Backward  |  ← Turn Left  |  → Turn Right")

# Target sign position (X coordinate)
SIGN_X = 115.92
TRIGGER_THRESHOLD = 0.1  # meters

payload_triggered = False
API_URL = "https://smart-toll-api.vercel.app/api/esp32-toll/process"

def payload_send(payload):
    try:
        print("Sending data to API...")
        response = requests.post(API_URL, json=payload, timeout=5)
        print("API Response:", response.status_code, response.text)
    except Exception as e:
        print("Failed to send data:", e)

# ---------------- MAIN LOOP ----------------
while driver.step() != -1:
    key = keyboard.getKey()
    speed = 0.0
    steering = 0.0

    while key != -1:
        if key == Keyboard.UP:
            speed = FORWARD_SPEED
            steering = 0.0
        elif key == Keyboard.DOWN:
            speed = -FORWARD_SPEED
            steering = 0.0
        elif key == Keyboard.LEFT:
            speed = TURN_SPEED
            steering = -TURN_ANGLE
        elif key == Keyboard.RIGHT:
            speed = TURN_SPEED
            steering = TURN_ANGLE
        key = keyboard.getKey()

    driver.setCruisingSpeed(speed)
    driver.setSteeringAngle(steering)

    # ---------------- SIGN TRIGGER ----------------
    car_pos = driver.getSelf().getPosition()  # returns [x, y, z]

    if not payload_triggered and abs(car_pos[0] - SIGN_X) <= TRIGGER_THRESHOLD:
        now = datetime.now()
        formatted_timestamp = now.strftime("%Y:%m:%d %H:%M:%S")

        payload = {
            "device_id": DEVICE_ID,
            "start_lat": START_LAT,
            "start_lon": START_LON,
            "total_distance_km": TOTAL_DISTANCE_KM,
            "timestamp": formatted_timestamp
        }
        print("SIGN PAYLOAD:", json.dumps(payload))
        payload_triggered = True
        
        thread = threading.Thread(target=payload_send, args=(payload,))
        thread.start()
        