# Smart Toll Backend API Documentation

A comprehensive toll management system with ESP32 integration for automated toll collection.

## Table of Contents

- [Overview](#overview)
- [Setup](#setup)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
  - [Authentication Routes](#authentication-routes)
  - [Vehicle Management Routes](#vehicle-management-routes)
  - [Wallet Management Routes](#wallet-management-routes)
  - [Payment Routes](#payment-routes)
  - [ESP32 Toll Processing Routes](#esp32-toll-processing-routes)
- [Response Format](#response-format)
- [Error Handling](#error-handling)

## Overview

The Smart Toll Backend provides RESTful APIs for:
- User authentication and profile management
- Vehicle registration and management
- Wallet and payment processing with Razorpay integration
- ESP32 device toll transaction processing
- Real-time toll collection and balance management

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set environment variables:
```env
PORT=3001
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

3. Start the server:
```bash
npm start
# or for development
npm run dev
```

## Authentication

Most API endpoints require Bearer token authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## API Endpoints

### Authentication Routes
**Base URL:** `/api/auth`

#### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "confirmPassword": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  },
  "tokens": {
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token"
  }
}
```

#### POST /api/auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  },
  "tokens": {
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token"
  }
}
```

#### POST /api/auth/refresh
Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "jwt_refresh_token"
}
```

#### GET /api/auth/me
Get current user profile. **Requires Authentication**

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "created_at": "2025-10-10T10:00:00Z"
  }
}
```

#### PUT /api/auth/profile
Update user profile. **Requires Authentication**

**Request Body:**
```json
{
  "name": "John Smith",
  "email": "johnsmith@example.com"
}
```

#### PUT /api/auth/password
Change user password. **Requires Authentication**

**Request Body:**
```json
{
  "currentPassword": "OldPass123",
  "newPassword": "NewPass123",
  "confirmPassword": "NewPass123"
}
```

#### POST /api/auth/logout
Logout user. **Requires Authentication**

#### POST /api/auth/forgot-password
Request password reset.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

#### POST /api/auth/verify-email
Verify email with token.

**Request Body:**
```json
{
  "token": "verification_token"
}
```

---

### Vehicle Management Routes
**Base URL:** `/api/vehicles`

#### GET /api/vehicles/user
Get all vehicles for the authenticated user. **Requires Authentication**

**Response:**
```json
{
  "success": true,
  "vehicles": [
    {
      "id": 1,
      "vehicle_number": "TN01AB1234",
      "vehicle_type": "car",
      "model": "Honda Civic",
      "device_id": "QR-E02RMN8R6Z",
      "is_active": true,
      "created_at": "2025-10-10T10:00:00Z"
    }
  ]
}
```

#### GET /api/vehicles/:id
Get vehicle details by ID. **Requires Authentication**

**Response:**
```json
{
  "success": true,
  "vehicle": {
    "id": 1,
    "vehicle_number": "TN01AB1234",
    "vehicle_type": "car",
    "model": "Honda Civic",
    "device_id": "QR-E02RMN8R6Z",
    "user_id": 1,
    "is_active": true,
    "created_at": "2025-10-10T10:00:00Z"
  }
}
```

#### POST /api/vehicles
Add a new vehicle. **Requires Authentication**

**Request Body:**
```json
{
  "license_plate": "TN01AB1234",
  "vehicle_type": "car",
  "make": "Honda",
  "model": "Civic",
  "year": 2020,
  "color": "Blue",
  "device_id": "QR-E02RMN8R6Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Vehicle added successfully",
  "vehicle": {
    "id": 1,
    "vehicle_number": "TN01AB1234",
    "vehicle_type": "car",
    "model": "Honda Civic",
    "device_id": "QR-E02RMN8R6Z",
    "user_id": 1,
    "is_active": true,
    "created_at": "2025-10-10T10:00:00Z"
  }
}
```

#### PUT /api/vehicles/:id
Update vehicle details. **Requires Authentication**

**Request Body:**
```json
{
  "license_plate": "TN01AB5678",
  "vehicle_type": "car",
  "make": "Honda",
  "model": "City",
  "device_id": "QR-NEW123456"
}
```

#### DELETE /api/vehicles/:id
Delete (deactivate) a vehicle. **Requires Authentication**

**Response:**
```json
{
  "success": true,
  "message": "Vehicle deleted successfully"
}
```

---

### Wallet Management Routes
**Base URL:** `/api/wallet`

#### GET /api/wallet/balance
Get wallet balance for authenticated user. **Requires Authentication**

**Response:**
```json
{
  "success": true,
  "balance": 1500.00,
  "currency": "INR",
  "last_updated": "2025-10-10T10:00:00Z"
}
```

#### GET /api/wallet/transactions
Get transaction history. **Requires Authentication**

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `type` (optional): Transaction type (toll_payment, wallet_recharge)
- `start_date` (optional): Start date filter
- `end_date` (optional): End date filter

**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "id": 1,
      "type": "toll_payment",
      "amount": -25.00,
      "description": "Toll payment for TN01AB1234",
      "balance_after": 1475.00,
      "created_at": "2025-10-10T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

#### GET /api/wallet/stats
Get wallet statistics. **Requires Authentication**

**Query Parameters:**
- `days` (optional): Number of days for stats (default: 30, max: 365)

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_spent": 250.00,
    "total_recharged": 2000.00,
    "transaction_count": 15,
    "average_transaction": 16.67,
    "period_days": 30
  }
}
```

#### GET /api/wallet/low-balance-alert
Check low balance alert status. **Requires Authentication**

**Query Parameters:**
- `threshold` (optional): Balance threshold (default: 100)

**Response:**
```json
{
  "success": true,
  "alert": {
    "is_low_balance": false,
    "current_balance": 1500.00,
    "threshold": 100.00,
    "recommendation": "Your balance is sufficient for toll operations"
  }
}
```

---

### Payment Routes
**Base URL:** `/api/payment`

#### POST /api/payment/create-order
Create Razorpay payment order for wallet recharge. **Requires Authentication**

**Request Body:**
```json
{
  "amount": 500,
  "currency": "INR"
}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "order_razorpay_id",
    "amount": 50000,
    "currency": "INR",
    "receipt": "receipt_unique_id"
  },
  "razorpay_key": "rzp_test_key"
}
```

#### POST /api/payment/verify
Verify payment and update wallet balance. **Requires Authentication**

**Request Body:**
```json
{
  "razorpay_order_id": "order_razorpay_id",
  "razorpay_payment_id": "pay_razorpay_id",
  "razorpay_signature": "signature_hash"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verified and wallet updated",
  "data": {
    "payment_id": "pay_razorpay_id",
    "amount": 500.00,
    "new_balance": 2000.00,
    "transaction_id": 123
  }
}
```

#### GET /api/payment/history
Get payment history. **Requires Authentication**

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `status` (optional): Payment status filter

**Response:**
```json
{
  "success": true,
  "recharges": [
    {
      "id": 1,
      "order_id": "order_razorpay_id",
      "payment_id": "pay_razorpay_id",
      "amount": 500.00,
      "status": "paid",
      "created_at": "2025-10-10T10:00:00Z"
    }
  ]
}
```

#### GET /api/payment/:paymentId
Get payment details by ID. **Requires Authentication**

**Response:**
```json
{
  "success": true,
  "payment": {
    "id": "pay_razorpay_id",
    "order_id": "order_razorpay_id",
    "amount": 500.00,
    "status": "paid",
    "method": "card",
    "created_at": "2025-10-10T10:00:00Z"
  }
}
```

#### POST /api/payment/webhook
Handle Razorpay webhooks. **Public Endpoint**

**Note:** This endpoint processes webhook events from Razorpay for payment status updates.

---

### ESP32 Toll Processing Routes
**Base URL:** `/api/esp32-toll`

#### GET /api/esp32-toll/transactions
Get ESP32 toll transactions for authenticated user. **Requires Authentication**

**Query Parameters:**
- `limit` (optional): Number of transactions (default: 50)
- `offset` (optional): Offset for pagination (default: 0)

**Response:**
```json
{
  "success": true,
  "transactions": [
    {
      "id": 1,
      "device_id": "ESP32_DEVICE_001",
      "start_lat": 11.0168,
      "start_lon": 76.9558,
      "distance_km": 15.5,
      "toll_amount": 25.00,
      "status": "completed",
      "vehicle_number": "TN01AB1234",
      "vehicle_type": "car",
      "created_at": "2025-10-10T10:30:00Z",
      "timestamp": "2025-10-10T10:30:00Z"
    }
  ],
  "total": 1
}
```

#### POST /api/esp32-toll/process
Process toll transaction from ESP32 device. **Public Endpoint**

**Request Body:**
```json
{
  "device_id": "ESP32_DEVICE_001",
  "start_lat": 11.0168,
  "start_lon": 76.9558,
  "total_distance_km": 15.5,
  "timestamp": "2025-10-10T10:30:00Z"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Toll transaction processed successfully",
  "data": {
    "transaction_id": 1,
    "toll_amount": 25.00,
    "new_wallet_balance": 1475.00,
    "vehicle_id": 1,
    "user_id": 1
  }
}
```

**Failure Response (Insufficient Balance):**
```json
{
  "success": false,
  "message": "Insufficient wallet balance for toll payment",
  "data": {
    "transaction_id": 1,
    "toll_amount": 25.00,
    "current_wallet_balance": 10.00,
    "vehicle_id": 1,
    "user_id": 1
  }
}
```

---

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "message": "Optional success message",
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Specific error details",
  "timestamp": "2025-10-10T10:00:00Z"
}
```

## Error Handling

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `422` - Validation Error
- `500` - Internal Server Error

### Common Error Types
- **Validation Errors**: Invalid input data
- **Authentication Errors**: Missing or invalid tokens
- **Authorization Errors**: Insufficient permissions
- **Resource Not Found**: Requested resource doesn't exist
- **Conflict Errors**: Duplicate resources
- **Database Errors**: Internal database issues

### Example Error Response
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ],
  "timestamp": "2025-10-10T10:00:00Z"
}
```

---

## Health Check Endpoint

#### GET /health
Check API health status. **Public Endpoint**

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-10T12:00:00Z",
  "uptime": 3600,
  "database": {
    "status": "connected",
    "response_time": "2ms"
  },
  "services": {
    "esp32TollProcessing": "active",
    "paymentGateway": "active",
    "walletManagement": "active"
  }
}
```

---

## Rate Limiting

- Authentication endpoints: 5 requests per minute per IP
- Payment endpoints: 10 requests per minute per user
- ESP32 toll processing: 100 requests per minute per device
- Other endpoints: 100 requests per minute per user

---

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Database Migrations
```bash
npm run migrate
```

---

## Support

For technical support or questions about the API, please contact the development team or refer to the project documentation.