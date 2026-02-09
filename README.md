# Smart Toll System

A comprehensive **smart toll collection system** integrating **ESP32-based vehicle units**, a **Node.js backend**, and a **React frontend** for automated, cashless toll processing with real-time validation.

This system is designed to reduce congestion, eliminate manual toll booths, and ensure accurate, auditable toll transactions.

---

## Project Deployment

- **Frontend**: [View Live Site](https://smart-toll.vercel.app/) – Deployed on **Vercel** for a responsive and user-friendly web interface.  
- **Backend API**: [View API](https://smart-toll-api.vercel.app/) – Hosted on **Vercel Serverless Functions**, providing secure endpoints for toll processing, wallet management, and transaction logging.

---

## Wokwi Simulations

- **Transmitter**: [Open Simulation](https://wokwi.com/projects/444441271760229377) – Simulates the **vehicle unit** for transmitting encoded data.  
- **Receiver**: [Open Simulation](https://wokwi.com/projects/444442750515809281) – Represents the **Toll Booth Unit** for decoding and verifying data.

---

## System Architecture Overview

ESP32 Vehicle Unit <br/>
├── GPS Module → Location Tracking <br/>
├── Geofence Logic → Toll Zone Detection <br/>
├── ZigBee/XBee → Short-range Communication <br/>
└── SD Card → Local Fault-Tolerant Storage <br/>
↓ <br/>
Toll Booth / Backend Gateway <br/>
↓ <br/>
Node.js API (Serverless) <br/>
↓ <br/>
PostgreSQL (Supabase) <br/>
↓ <br/>
React Web Dashboard <br/>

---

## Hardware Components

### Vehicle Unit (ESP32-Based)

- **Microcontroller**: ESP32  
- **GPS Module**: NEO-6M (UART communication)  
- **Wireless Communication**: ZigBee / XBee module (UART)  
- **Storage**: Micro SD Card module (SPI)  
- **Power**: External DC / Battery (vehicle-mounted)

### Hardware Responsibilities

- Real-time GPS location tracking  
- Geofence-based toll detection  
- Secure toll data transmission  
- Offline buffering of toll events  
- Retry and acknowledgment handling  

---


## Geofence Configuration

- Geofences are stored as **CSV files** on the SD card.
- Each entry includes:
  - Longitude
  - Latitude
  - Transmission enable flag (`true` / `false`)
- Enables **dynamic geofence updates** without reflashing firmware.

---

## Fault Tolerance & Reliability

- GPS validity and plausibility checks  
- Geofence entry debouncing & hysteresis  
- SD card–based offline buffering  
- Retry-based ZigBee transmission with acknowledgments  
- Idempotent toll event IDs to prevent duplicate charges  
- Fail-safe behavior: no charge on uncertainty  

---

## Key Features

- User authentication and wallet management  
- Vehicle registration with ESP32 device mapping  
- Automated toll calculation based on distance and vehicle type  
- Real-time toll processing from ESP32 devices  
- Razorpay payment integration  
- Transaction history and analytics dashboard  
- Admin panel for toll configuration and monitoring  

---

## Tech Stack

### Frontend
- React  
- Vite  
- Tailwind CSS  
- shadcn/ui  

### Backend
- Node.js  
- Express.js  
- Serverless Functions (Vercel)  

### Database
- PostgreSQL  
- Supabase  

### Payments
- Razorpay

---

## Use Cases

- Highway toll automation  
- Campus or industrial access control  
- Smart city vehicle tracking and billing  
- Fleet-based distance billing systems  

---

## Future Enhancements

- Encrypted ESP32 ↔ Toll Booth communication  
- Dynamic geofence OTA updates  
- ANPR (camera-based fallback verification)  
- ML-based anomaly detection for fraud prevention  
- Multi-lane toll booth scalability  

---

## Contributors
- Lithigesh P G
- Rajith S
- S P Darshan
## License

This project is developed for educational and research purposes.
