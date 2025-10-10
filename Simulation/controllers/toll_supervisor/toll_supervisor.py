# signs_trigger_supervisor.py
from controller import Supervisor
import json
import random

# ---------------- CONFIG ----------------
TIMER_STEP = 50               # ms
TRIGGER_DISTANCE = 2.0        # meters, distance to SIGNS to trigger payload

# Car info (replace with your device ID etc.)
DEVICE_ID = "ESP32_4A:7F:2C:9D:1B:6E"
BASE_LAT = 12.9715987
BASE_LON = 77.594566
BASE_DISTANCE_KM = 28

# Apply small random variations
START_LAT = BASE_LAT + random.uniform(-0.0005, 0.0005)
START_LON = BASE_LON + random.uniform(-0.0005, 0.0005)
TOTAL_DISTANCE_KM = BASE_DISTANCE_KM + random.uniform(-0.5, 0.5)

# ---------------- SUPERVISOR SETUP ----------------
supervisor = Supervisor()
timestep = int(supervisor.getBasicTimeStep())

# Get car and sign nodes by DEF
car_node = supervisor.getFromDef("WEBOTS_VEHICLE0")       # your car DEF
sign_node = supervisor.getFromDef("SIGNS")    # your sign DEF

if not car_node or not sign_node:
    print("ERROR: Cannot find CAR or SIGNS nodes. Make sure your .wbt has DEF CAR and DEF SIGNS.")
    exit(1)

# ---------------- HELPERS ----------------
def get_position(node):
    """Return world position of a node as [x,y,z]"""
    return list(node.getField("translation").getSFVec3f())

def distance(a, b):
    """Euclidean distance in XZ plane"""
    dx = a[0] - b[0]
    dz = a[2] - b[2]
    return (dx**2 + dz**2)**0.5

# Small debounce to avoid multiple triggers in a row
triggered = False
lock_timer = 0.0
LOCK_DELAY = 1.0   # seconds

# ---------------- MAIN LOOP ----------------
while supervisor.step(timestep) != -1:
    # decrement lock timer
    if triggered:
        lock_timer -= timestep / 1000.0
        if lock_timer <= 0:
            triggered = False

    car_pos = get_position(car_node)
    sign_pos = get_position(sign_node)

    if not triggered and distance(car_pos, sign_pos) < TRIGGER_DISTANCE:
        # Create payload
        payload = {
            "device_id": DEVICE_ID,
            "current_lat": START_LAT,
            "current_lon": START_LON,
            "total_distance_km": TOTAL_DISTANCE_KM,
            "car_pos": car_pos,
            "sign_pos": sign_pos
        }
        print("SIGN TRIGGER PAYLOAD:", json.dumps(payload))

        # lock further triggers for LOCK_DELAY seconds
        triggered = True
        lock_timer = LOCK_DELAY
