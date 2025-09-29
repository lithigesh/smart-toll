# Smart Toll System Backend

A comprehensive backend system for automated toll collection using GPS-based geofencing technology. The system provides seamless toll payment processing through digital wallets with real-time vehicle tracking and journey management.

## 🎯 Project Overview

The Smart Toll System revolutionizes traditional toll collection by implementing an automated, GPS-based approach that eliminates the need for physical toll booths. Vehicles are tracked through geofenced toll zones, and payments are processed automatically based on distance traveled and vehicle type.

### Key Features

- **Automated Toll Collection**: GPS-based zone entry/exit detection
- **Digital Wallet Integration**: Seamless payment processing
- **Multi-Vehicle Support**: Support for different vehicle types with varying toll rates
- **Real-time Journey Tracking**: Complete GPS log and route monitoring
- **Pending Balance Management**: Smart handling of incomplete journeys
- **Transaction History**: Comprehensive audit trail for all payments
- **Geofencing Technology**: Accurate zone boundary detection
- **RESTful API**: Complete API for frontend integration

### Objectives

1. **Eliminate Traffic Congestion**: Remove physical toll booth delays
2. **Reduce Operational Costs**: Minimize manual toll collection infrastructure
3. **Improve User Experience**: Seamless, contactless payment process
4. **Increase Revenue Efficiency**: Accurate distance-based toll calculation
5. **Environmental Benefits**: Reduced vehicle emissions from toll queue delays

## 🔄 System Logic & Workflow

### Complete Journey Flow

```
1. Authentication → 2. Vehicle Verification → 3. GPS Entry Detection → 
4. Route Simulation → 5. Toll Encounter → 6. Post-Toll Route → 
7. GPS Exit Detection → 8. Payment Verification
```

### Detailed Step-by-Step Process

#### 1. **Authentication**
- User logs in with email/password credentials
- JWT token generated for session management
- User profile and wallet information retrieved

#### 2. **Vehicle Verification**
- System validates registered vehicles for the user
- Vehicle type and specifications loaded (affects toll rates)
- Hardware device mapping (if applicable)

#### 3. **GPS Entry Detection (Geofencing)**
- Continuous GPS position monitoring
- Real-time geofence boundary checking against toll zones
- **Zone Entry Triggered**: New journey created in database
- Entry timestamp and coordinates recorded

#### 4. **Route Simulation & GPS Logging**
- Continuous GPS position updates within toll zones
- Path distance calculation using GPS coordinates
- Journey progress tracking and logging

#### 5. **Toll Encounter (Payment Processing)**
- **Distance Calculation**: Traveled distance to toll gate
- **Rate Application**: `Amount = Distance × Rate_per_km × Vehicle_factor`
- **Pending Balance Processing**: Previous pending amounts cleared
- **Wallet Deduction**: Total amount deducted from user wallet
- **Transaction Recording**: Payment transaction created

#### 6. **Post-Toll Route Continuation**
- Journey continues after toll gate
- Additional GPS logging for remaining route
- Distance accumulation for exit processing

#### 7. **GPS Exit Detection**
- **Zone Exit Triggered**: Vehicle leaves toll zone boundaries
- **Total Journey Calculation**: Complete route distance computed
- **Pending Balance Creation**: 
  - `Remaining_Distance = Total_Distance - Toll_Gate_Distance`
  - `Pending_Amount = Remaining_Distance × Rate × Vehicle_factor`
- **Journey Completion**: Exit timestamp and final calculations

#### 8. **Payment Verification**
- Final wallet balance confirmation
- Transaction history validation
- Pending transaction creation for next toll encounter

### Geofencing Logic

```javascript
// Zone Detection Algorithm
if (currentZone && !activeJourney) {
  // ENTRY: Vehicle entered toll zone
  action = 'zone_entry'
  createNewJourney()
} else if (!currentZone && activeJourney) {
  // EXIT: Vehicle left toll zone  
  action = 'zone_exit'
  completeJourney()
  calculatePendingBalance()
} else if (currentZone && activeJourney) {
  if (currentZone.id === activeJourney.zone_id) {
    // CONTINUING: Same zone
    action = 'continuing_in_zone'
  } else {
    // ZONE CHANGE: Different toll zone
    action = 'zone_change'
    handleZoneTransition()
  }
}
```

## 🗄️ Database Design

### Core Tables

#### **users**
```sql
- id (UUID, Primary Key)
- email (Unique)
- password_hash
- full_name
- phone_number
- created_at, updated_at
```
*Purpose: User authentication and profile management*

#### **vehicles**
```sql
- id (UUID, Primary Key)
- user_id (Foreign Key → users.id)
- registration_number (Unique)
- vehicle_type (car, truck, motorcycle, etc.)
- make, model, year
- device_id (Hardware mapping)
- status (active, inactive)
- created_at, updated_at
```
*Purpose: Vehicle registration and type classification*

#### **wallets**
```sql
- id (UUID, Primary Key) 
- user_id (Foreign Key → users.id)
- balance (Decimal)
- updated_at
```
*Purpose: Digital wallet balance management*

#### **toll_roads**
```sql
- id (UUID, Primary Key)
- name
- state
- rate_per_km (Base rate)
- status (active, inactive)
- created_at, updated_at
```
*Purpose: Toll road configuration and pricing*

#### **toll_road_zones**
```sql
- id (UUID, Primary Key)
- toll_road_id (Foreign Key → toll_roads.id)
- name
- zone_boundary (Polygon geometry)
- entry_coordinates, exit_coordinates
- created_at, updated_at
```
*Purpose: Geofenced zone definitions and boundaries*

#### **journeys**
```sql
- id (UUID, Primary Key)
- vehicle_id (Foreign Key → vehicles.id)
- toll_road_id (Foreign Key → toll_roads.id)
- zone_id (Foreign Key → toll_road_zones.id)
- entry_point (Point geometry)
- exit_point (Point geometry)
- entry_time, exit_time
- total_distance_km
- calculated_fare
- status (active, completed)
- created_at, updated_at
```
*Purpose: Complete journey tracking and fare calculation*

#### **transactions**
```sql
- id (UUID, Primary Key)
- user_id (Foreign Key → users.id)
- vehicle_id (Foreign Key → vehicles.id)
- journey_id (Foreign Key → journeys.id)
- amount (Decimal)
- type (toll, wallet_recharge, pending_toll)
- status (completed, pending, failed)
- description
- metadata (JSON)
- created_at, updated_at
```
*Purpose: All payment transactions and pending balances*

#### **gps_logs**
```sql
- id (UUID, Primary Key)
- vehicle_id (Foreign Key → vehicles.id)
- latitude, longitude
- accuracy, speed, heading
- logged_at
- created_at
```
*Purpose: GPS position history and route tracking*

#### **notifications**
```sql
- id (UUID, Primary Key)
- user_id (Foreign Key → users.id)
- type (entry, exit, payment, low_balance)
- title, message
- data (JSON)
- priority (low, medium, high)
- is_read
- created_at
```
*Purpose: User notifications and alerts*

### Database Relationships

```
users (1) ←→ (M) vehicles
users (1) ←→ (1) wallets  
users (1) ←→ (M) transactions
users (1) ←→ (M) notifications

vehicles (1) ←→ (M) journeys
vehicles (1) ←→ (M) gps_logs
vehicles (1) ←→ (M) transactions

toll_roads (1) ←→ (M) toll_road_zones
toll_roads (1) ←→ (M) journeys

journeys (1) ←→ (M) transactions
```

## 🛣️ Backend Routes (API Endpoints)

### Authentication Routes (`/api/auth`)

#### `POST /api/auth/login`
**Purpose**: User login and JWT token generation
```javascript
Request: {
  "email": "user@example.com",
  "password": "password123"
}

Response: {
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com", 
    "full_name": "John Doe"
  },
  "token": "jwt_token_here"
}
```

#### `POST /api/auth/register`
**Purpose**: New user registration
```javascript
Request: {
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "phone_number": "+1234567890"
}
```

#### `POST /api/auth/refresh`
**Purpose**: Refresh JWT token
```javascript
Request: {
  "refreshToken": "refresh_token_here"
}
```

#### `POST /api/auth/forgot-password`
**Purpose**: Send password reset email
```javascript
Request: {
  "email": "user@example.com"
}
```

#### `POST /api/auth/verify-email`
**Purpose**: Verify email with token
```javascript
Request: {
  "token": "verification_token"
}
```

#### `GET /api/auth/me`
**Purpose**: Get current user profile (requires authentication)

#### `PUT /api/auth/profile`
**Purpose**: Update user profile
```javascript
Request: {
  "name": "Updated Name",
  "email": "new@example.com"
}
```

#### `PUT /api/auth/password`
**Purpose**: Change user password
```javascript
Request: {
  "currentPassword": "current_password",
  "newPassword": "new_password",
  "confirmPassword": "new_password"
}
```

#### `POST /api/auth/logout`
**Purpose**: Logout user and invalidate token

### Vehicle Routes (`/api/vehicles`)

#### `GET /api/vehicles`
**Purpose**: Get all vehicles for authenticated user
```javascript
Response: {
  "success": true,
  "vehicles": [
    {
      "id": "uuid",
      "registration_number": "ABC123",
      "vehicle_type": "car",
      "make": "Toyota",
      "model": "Camry",
      "status": "active"
    }
  ]
}
```

#### `POST /api/vehicles`
**Purpose**: Register new vehicle
```javascript
Request: {
  "registration_number": "ABC123",
  "vehicle_type": "car",
  "make": "Toyota", 
  "model": "Camry",
  "year": 2022
}
```

### GPS Routes (`/api/gps`)

#### `POST /api/gps/log`
**Purpose**: Log GPS position and process geofencing
```javascript
Request: {
  "vehicle_id": "uuid",
  "latitude": 10.9750,
  "longitude": 76.9000,
  "speed": 60,
  "heading": 90,
  "accuracy": 5
}

Response: {
  "success": true,
  "geofencing": {
    "action": "zone_entry|zone_exit|continuing_in_zone|zone_change",
    "journey_entry": {...},  // if zone entry
    "journey_exit": {...}    // if zone exit
  }
}
```

#### `POST /api/gps/manual-position`
**Purpose**: Set manual GPS position (for testing)
```javascript
Request: {
  "vehicle_id": "uuid",
  "latitude": 10.9750,
  "longitude": 76.9000,
  "simulate_movement": true
}
```

#### `GET /api/gps/history/:vehicle_id`
**Purpose**: Get GPS history for a vehicle
```javascript
Query Parameters:
- start_date: Start date for history
- end_date: End date for history
- limit: Number of records

Response: {
  "success": true,
  "gps_logs": [
    {
      "latitude": 10.9750,
      "longitude": 76.9000,
      "speed": 60,
      "logged_at": "2025-09-28T10:30:00Z"
    }
  ]
}
```

#### `GET /api/gps/journey/:journey_id/path`
**Purpose**: Get complete GPS path for a journey
```javascript
Response: {
  "success": true,
  "path": {
    "journey_id": "uuid",
    "coordinates": [...],
    "total_distance": 85.5,
    "duration_minutes": 45
  }
}
```

#### `GET /api/gps/current-location/:vehicle_id`
**Purpose**: Get current location of a vehicle
```javascript
Response: {
  "success": true,
  "location": {
    "latitude": 10.9750,
    "longitude": 76.9000,
    "last_updated": "2025-09-28T10:30:00Z",
    "is_moving": true
  }
}
```

#### `GET /api/gps/stats/:vehicle_id`
**Purpose**: Get GPS tracking statistics for a vehicle
```javascript
Query Parameters:
- days: Number of days for stats (1-90)

Response: {
  "success": true,
  "stats": {
    "total_distance": 1250.5,
    "total_trips": 25,
    "avg_speed": 45.2,
    "tracking_accuracy": 98.5
  }
}
```

### Wallet Routes (`/api/wallet`)

#### `GET /api/wallet/balance`
**Purpose**: Get current wallet balance
```javascript
Response: {
  "success": true,
  "balance": 1500.50,
  "last_updated": "2025-09-28T10:30:00Z"
}
```

#### `POST /api/wallet/recharge`
**Purpose**: Add money to wallet
```javascript
Request: {
  "amount": 500.00,
  "payment_method": "credit_card",
  "payment_reference": "txn_123456"
}
```

#### `POST /api/wallet/deduct`
**Purpose**: Deduct money from wallet (internal use)
```javascript
Request: {
  "amount": 75.50,
  "description": "Toll payment",
  "journey_id": "uuid"
}
```

#### `GET /api/wallet/transactions`
**Purpose**: Get wallet transaction history
```javascript
Query Parameters:
- page: Page number
- limit: Records per page
- type: Transaction type filter

Response: {
  "success": true,
  "transactions": [...],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_records": 125
  }
}
```

#### `GET /api/wallet/daily-summary`
**Purpose**: Get daily wallet activity summary
```javascript
Query Parameters:
- date: Specific date (YYYY-MM-DD)

Response: {
  "success": true,
  "summary": {
    "date": "2025-09-28",
    "opening_balance": 1000.00,
    "total_credits": 500.00,
    "total_debits": 200.00,
    "closing_balance": 1300.00
  }
}
```

#### `GET /api/wallet/stats`
**Purpose**: Get wallet statistics
```javascript
Query Parameters:
- period: 'week', 'month', 'year'

Response: {
  "success": true,
  "stats": {
    "avg_daily_spend": 75.50,
    "total_recharges": 5000.00,
    "total_toll_payments": 3250.00,
    "savings_this_month": 500.00
  }
}
```

#### `GET /api/wallet/low-balance-alert`
**Purpose**: Check if wallet balance is low
```javascript
Query Parameters:
- threshold: Custom threshold amount (default: 100)

Response: {
  "success": true,
  "low_balance": true,
  "current_balance": 45.50,
  "threshold": 100.00,
  "suggested_recharge": 500.00
}
```

### Transaction Routes (`/api/transactions`)

#### `GET /api/transactions/history`
**Purpose**: Get transaction history
```javascript
Query Parameters:
- limit: number of records
- offset: pagination offset
- type: filter by transaction type
- status: filter by status

Response: {
  "success": true,
  "transactions": [
    {
      "id": "uuid",
      "amount": 75.50,
      "type": "toll",
      "status": "completed",
      "description": "Toll payment",
      "created_at": "2025-09-28T10:30:00Z"
    }
  ]
}
```

#### `GET /api/transactions/pending`
**Purpose**: Get pending transactions
```javascript
Response: {
  "success": true,
  "pending_transactions": [...],
  "total_pending_amount": 150.75
}
```

### Toll Routes (`/api/toll`)

#### `POST /api/toll/payment`
**Purpose**: Process toll payment at toll gate
```javascript
Request: {
  "vehicle_id": "uuid",
  "journey_id": "uuid", 
  "distance_km": 8.5,
  "toll_gate_location": "NH544 Express Toll Plaza"
}
```

#### `GET /api/toll/rates`
**Purpose**: Get toll rates for different vehicle types

#### `POST /api/toll/process-pending`
**Purpose**: Process pending toll payments
```javascript
Request: {
  "user_id": "uuid",
  "vehicle_id": "uuid",
  "pending_transaction_ids": ["uuid1", "uuid2"]
}
```

#### `POST /api/toll/test-gate-detection`
**Purpose**: Test toll gate detection (testing only)
```javascript
Request: {
  "vehicle_id": "uuid",
  "latitude": 10.9750,
  "longitude": 76.9000,
  "expected_gate_id": "uuid"
}
```

#### `GET /api/toll/pending/:userId`
**Purpose**: Get pending toll transactions for a user
```javascript
Response: {
  "success": true,
  "pending_transactions": [
    {
      "id": "uuid",
      "amount": 150.75,
      "distance_km": 25.5,
      "journey_id": "uuid",
      "created_at": "2025-09-28T10:30:00Z"
    }
  ],
  "total_pending": 150.75
}
```


#### `GET /api/toll/stats`
**Purpose**: Get overall toll statistics
```javascript
Response: {
  "success": true,
  "stats": {
    "total_collections": 125000.50,
    "total_transactions": 5000,
    "avg_transaction_amount": 25.00,
    "peak_hours": "08:00-10:00"
  }
}
```

#### `GET /api/toll/stats/:userId`
**Purpose**: Get toll statistics for specific user
```javascript
Query Parameters:
- period: 'week', 'month', 'year'

Response: {
  "success": true,
  "user_stats": {
    "total_paid": 2500.50,
    "total_journeys": 100,
    "avg_journey_cost": 25.00,
    "most_used_route": "NH544"
  }
}
```

#### `GET /api/toll/active-journeys`
**Purpose**: Get currently active journeys
```javascript
Response: {
  "success": true,
  "active_journeys": [
    {
      "journey_id": "uuid",
      "vehicle_id": "uuid",
      "entry_time": "2025-09-28T10:30:00Z",
      "current_zone": "NH544 Zone 1"
    }
  ]
}
```

#### `POST /api/toll/cancel-journey`
**Purpose**: Cancel an active journey
```javascript
Request: {
  "journey_id": "uuid",
  "reason": "Vehicle breakdown"
}
```

#### `POST /api/toll/cancel-pending`
**Purpose**: Cancel pending toll transactions
```javascript
Request: {
  "transaction_ids": ["uuid1", "uuid2"],
  "reason": "System error"
}
```

### Distance Routes (`/api/distance`)

#### `POST /api/distance/calculate`
**Purpose**: Calculate distance between two points
```javascript
Request: {
  "start_lat": 10.9750,
  "start_lon": 76.9000,
  "end_lat": 11.0500,
  "end_lon": 77.0500,
  "method": "haversine" // or "path"
}

Response: {
  "success": true,
  "distance": {
    "kilometers": 25.5,
    "method": "haversine",
    "accuracy": "high"
  }
}
```

#### `GET /api/distance/vehicle/:vehicle_id`
**Purpose**: Get total distance traveled by vehicle
```javascript
Query Parameters:
- start_date: Start date for calculation
- end_date: End date for calculation

Response: {
  "success": true,
  "vehicle_distance": {
    "total_km": 1250.5,
    "period": "last_30_days",
    "journeys_count": 45
  }
}
```

#### `POST /api/distance/fare`
**Purpose**: Calculate fare based on distance and vehicle type
```javascript
Request: {
  "distance_km": 25.5,
  "vehicle_type": "car",
  "toll_road_id": "uuid"
}

Response: {
  "success": true,
  "fare": {
    "base_amount": 204.00,
    "vehicle_multiplier": 1.0,
    "service_fee": 2.55,
    "total_amount": 206.55
  }
}
```

#### `POST /api/distance/fleet-stats`
**Purpose**: Get distance statistics for multiple vehicles
```javascript
Request: {
  "vehicle_ids": ["uuid1", "uuid2"],
  "period": "month"
}
```

#### `POST /api/distance/eta`
**Purpose**: Calculate estimated time of arrival
```javascript
Request: {
  "start_lat": 10.9750,
  "start_lon": 76.9000,
  "end_lat": 11.0500,
  "end_lon": 77.0500,
  "avg_speed": 60
}
```

#### `GET /api/distance/validate/:latitude/:longitude`
**Purpose**: Validate GPS coordinates
```javascript
Response: {
  "success": true,
  "valid": true,
  "location_info": {
    "country": "India",
    "state": "Tamil Nadu",
    "within_service_area": true
  }
}
```

### Toll Processing Routes (`/api/toll-processing`)

#### `POST /api/toll-processing/process`
**Purpose**: Process toll payment for a journey
```javascript
Request: {
  "journey_id": "uuid",
  "vehicle_id": "uuid",
  "processing_type": "automatic"
}
```

#### `POST /api/toll-processing/retry-pending`
**Purpose**: Retry failed pending toll payments
```javascript
Request: {
  "user_id": "uuid",
  "max_retry_count": 3
}
```

#### `GET /api/toll-processing/pending`
**Purpose**: Get all pending toll processing tasks

#### `GET /api/toll-processing/pending/:user_id`
**Purpose**: Get pending toll processing for specific user

#### `GET /api/toll-processing/stats`
**Purpose**: Get toll processing statistics
```javascript
Response: {
  "success": true,
  "processing_stats": {
    "total_processed": 1000,
    "success_rate": 98.5,
    "avg_processing_time": 2.5,
    "pending_count": 15
  }
}
```

#### `POST /api/toll-processing/force-process`
**Purpose**: Force process stuck toll payments (admin only)
```javascript
Request: {
  "journey_ids": ["uuid1", "uuid2"],
  "force_reason": "System recovery"
}
```

#### `POST /api/toll-processing/calculate-fare`
**Purpose**: Calculate fare without processing payment
```javascript
Request: {
  "journey_id": "uuid",
  "distance_km": 45.5,
  "vehicle_type": "car"
}
```

#### `GET /api/toll-processing/user-transactions`
**Purpose**: Get toll processing transactions for user
```javascript
Query Parameters:
- status: Processing status filter
- limit: Number of records
- offset: Pagination offset
```

### Dashboard Routes (`/api/dashboard`)

#### `GET /api/dashboard/stats`
**Purpose**: Get user dashboard statistics
```javascript
Response: {
  "success": true,
  "stats": {
    "total_journeys": 25,
    "total_amount_paid": 1250.50,
    "current_balance": 750.25,
    "pending_amount": 100.00,
    "recent_journeys": [...]
  }
}
```

### Payment Routes (`/api/payment`)

#### `POST /api/payment/create-order`
**Purpose**: Create new payment order for wallet recharge
```javascript
Request: {
  "amount": 500.00,
  "currency": "INR",
  "payment_method": "razorpay"
}

Response: {
  "success": true,
  "order": {
    "id": "order_uuid",
    "amount": 500.00,
    "payment_gateway_order_id": "order_xyz123",
    "status": "created"
  }
}
```

#### `POST /api/payment/verify`
**Purpose**: Verify payment completion
```javascript
Request: {
  "order_id": "order_uuid",
  "payment_id": "payment_xyz123",
  "signature": "payment_signature"
}
```

#### `GET /api/payment/history`
**Purpose**: Get payment history
```javascript
Query Parameters:
- page: Page number
- limit: Records per page
- status: Payment status filter

Response: {
  "success": true,
  "payments": [
    {
      "id": "uuid",
      "amount": 500.00,
      "status": "completed",
      "payment_method": "razorpay",
      "created_at": "2025-09-28T10:30:00Z"
    }
  ]
}
```

#### `GET /api/payment/:paymentId`
**Purpose**: Get specific payment details
```javascript
Response: {
  "success": true,
  "payment": {
    "id": "uuid",
    "amount": 500.00,
    "status": "completed",
    "gateway_response": {...}
  }
}
```

#### `POST /api/payment/webhook`
**Purpose**: Handle payment gateway webhooks (no auth required)

### Notification Routes (`/api/notifications`)

#### `GET /api/notifications`
**Purpose**: Get user notifications

#### `GET /api/notifications`
**Purpose**: Get user notifications
```javascript
Query Parameters:
- page: Page number
- limit: Records per page
- type: Notification type filter
- priority: Priority filter

Response: {
  "success": true,
  "notifications": [
    {
      "id": "uuid",
      "type": "toll_payment",
      "title": "Toll Payment Processed",
      "message": "₹75 deducted for toll payment",
      "priority": "medium",
      "is_read": false,
      "created_at": "2025-09-28T10:30:00Z"
    }
  ]
}
```

#### `GET /api/notifications/unread-count`
**Purpose**: Get count of unread notifications
```javascript
Response: {
  "success": true,
  "unread_count": 5
}
```

#### `PUT /api/notifications/:notification_id/read`
**Purpose**: Mark specific notification as read

#### `PUT /api/notifications/mark-all-read`
**Purpose**: Mark all notifications as read

### Dashboard Routes (`/api/dashboard`)

#### `GET /api/dashboard`
**Purpose**: Get complete dashboard data
```javascript
Response: {
  "success": true,
  "dashboard": {
    "user": {...},
    "vehicles": [...],
    "recent_journeys": [...],
    "wallet_balance": 1500.50
  }
}
```

#### `GET /api/dashboard/vehicles`
**Purpose**: Get user vehicles from dashboard

#### `POST /api/dashboard/vehicles`
**Purpose**: Add new vehicle via dashboard
```javascript
Request: {
  "vehicle_no": "TN01AB1234",
  "vehicle_type": "car",
  "model": "Honda Civic",
  "device_id": "optional_device_id"
}
```

#### `PUT /api/dashboard/vehicles/:vehicleId`
**Purpose**: Update vehicle information

#### `DELETE /api/dashboard/vehicles/:vehicleId`
**Purpose**: Delete/deactivate vehicle

#### `GET /api/dashboard/toll-gates`
**Purpose**: Get toll gates information for dashboard

#### `DELETE /api/notifications/:notification_id`
**Purpose**: Delete specific notification

#### `POST /api/notifications/test`
**Purpose**: Send test notification (testing only)
```javascript
Request: {
  "type": "test",
  "title": "Test Notification",
  "message": "This is a test message"
}
```

#### `GET /api/notifications/stats`
**Purpose**: Get notification statistics
```javascript
Response: {
  "success": true,
  "stats": {
    "total_notifications": 150,
    "unread_count": 5,
    "types_breakdown": {
      "toll_payment": 75,
      "low_balance": 25,
      "journey_complete": 50
    }
  }
}
```

#### `POST /api/notifications/send-toll-entry`
**Purpose**: Send toll zone entry notification
```javascript
Request: {
  "vehicle_id": "uuid",
  "zone_name": "NH544 Zone 1",
  "entry_time": "2025-09-28T10:30:00Z"
}
```

#### `POST /api/notifications/send-toll-exit`
**Purpose**: Send toll zone exit notification
```javascript
Request: {
  "journey_id": "uuid",
  "total_amount": 125.50,
  "distance_km": 45.2
}
```

#### `POST /api/notifications/send-low-balance`
**Purpose**: Send low balance alert notification
```javascript
Request: {
  "current_balance": 45.50,
  "threshold": 100.00
}
```

#### `POST /api/notifications/send-recharge`
**Purpose**: Send wallet recharge confirmation notification
```javascript
Request: {
  "amount": 500.00,
  "new_balance": 1045.50,
  "payment_method": "razorpay"
}
```

## 💰 Business Logic

### Toll Calculation Formula

```javascript
// Base Calculation
baseAmount = distance_km × toll_road.rate_per_km

// Vehicle Type Multiplier
vehicleMultipliers = {
  'motorcycle': 0.5,
  'car': 1.0,
  'suv': 1.2, 
  'van': 1.5,
  'truck': 2.0,
  'bus': 2.5,
  'trailer': 3.0
}

vehicleAdjustedAmount = baseAmount × vehicleMultipliers[vehicle_type]

// Service Fee (minimum ₹1)
serviceFee = Math.max(distance_km × 0.1, 1.0)

// Final Amount (minimum ₹10)
finalAmount = Math.max(vehicleAdjustedAmount + serviceFee, 10.0)
```

### Pending Balance Logic

#### **At Toll Exit:**
```javascript
// Calculate remaining distance after toll gate
tollGateDistance = 8.5  // km from entry point
remainingDistance = totalJourneyDistance - tollGateDistance

if (remainingDistance > 0) {
  // Create pending transaction for remaining distance
  pendingAmount = calculateTollAmount(remainingDistance, vehicleType)
  createPendingTransaction(pendingAmount, journeyId)
}
```

#### **At Next Toll Encounter:**
```javascript
// Retrieve and clear pending balances
pendingTransactions = getPendingTransactions(userId)
pendingTotal = sum(pendingTransactions.amount)

// Total deduction = current toll + pending amounts
totalDeduction = currentTollAmount + pendingTotal

// Process payment and mark pending transactions as completed
deductFromWallet(totalDeduction)
markPendingAsCompleted(pendingTransactions)
```

### Wallet Operations

#### **Deduction Process:**
1. Check sufficient balance
2. Create transaction record
3. Update wallet balance
4. Send notification

#### **Recharge Process:**
1. Validate payment method
2. Process external payment
3. Add amount to wallet
4. Create recharge transaction
5. Send confirmation notification

## 🎮 Simulation Flow

The system includes a comprehensive simulation that demonstrates the complete 8-phase workflow:

### Phase-by-Phase Breakdown

```javascript
// Phase 1: Authentication
await authenticateUser("test@smarttoll.com", "password")

// Phase 2: Vehicle Verification  
vehicles = await fetchUserVehicles()
selectedVehicle = selectVehicle("TN37AB1234")

// Phase 3: GPS Entry Detection
await resetToOutsidePosition(11.3, 77.3)  // Outside all zones
await moveToEntryPoint(10.975, 76.9)      // Enter toll zone
// → Triggers: zone_entry, creates new journey

// Phase 4: Route Simulation (Pre-Toll)
await simulateRoute([
  {lat: 11.1, lon: 77.1},      // Highway Point 1
  {lat: 11.05, lon: 77.05},    // Highway Point 2  
  {lat: 10.99, lon: 76.93}     // Toll Gate Location
])

// Phase 5: Toll Encounter
distanceTraveled = 8.5  // km to toll gate
tollAmount = calculateToll(8.5, "car")  // ₹68
await processPayment(tollAmount + pendingBalance)
// → Wallet deduction, transaction created

// Phase 6: Route Simulation (Post-Toll)
await simulateRoute([
  {lat: 10.95, lon: 76.9},     // Highway Point 3
  {lat: 10.92, lon: 76.87}     // Highway Point 4
])

// Phase 7: GPS Exit Detection  
await moveToExitPoint(11.3, 77.3)  // Exit toll zone
// → Triggers: zone_exit, completes journey
// → Creates pending transaction for remaining distance

// Phase 8: Payment Verification
await verifyFinalPayments()
await checkPendingTransactions()
```

### Simulation Results

```
🚗 Vehicle: TN37AB1234 (car)
📊 Journey ID: uuid
🧾 Transaction ID: uuid  
📏 Total Distance: 95.82 km
💰 Initial Balance: ₹60,467.25
💰 Final Balance: ₹57,298.09
💸 Total Deducted: ₹775.29
  • Distance Charges: ₹68
  • Pending Balance Paid: ₹707.29
📋 New Pending Transactions: 1 (₹707.29)
🏆 Overall Success Rate: 100%
```

## ⚙️ Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database  
- Supabase account (for database hosting)
- Git

### Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd smart-toll/backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Environment Setup:**

Create a `.env` file in the backend directory:

```env
# Database Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key  
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRY=24h

# Payment Gateway (if applicable)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```