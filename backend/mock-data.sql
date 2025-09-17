-- Smart Toll System - Comprehensive Mock Data Population
-- Run this script in Supabase SQL Editor AFTER running the main schema
-- Dashboard: https://supabase.com/dashboard/project/ftrtjmovhndrntmpaxih/sql

-- Clear existing sample data (except toll gates which are essential)
DELETE FROM transactions;
DELETE FROM recharges;
DELETE FROM vehicles;
DELETE FROM wallets;
DELETE FROM users WHERE email != 'admin@smarttoll.com';

-- 1. Insert comprehensive user data
INSERT INTO users (id, email, password_hash, name, phone, role, created_at) VALUES
-- Admin user (already exists, but let's ensure it's there)
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin@smarttoll.com', '$2b$12$LQv3c1yqBo7ByQv5s8g7/.PSRQH5LHlqPQjM5Q7x8O6rP3i8F9E1e', 'Smart Toll Admin', '+91-9999999999', 'admin', NOW() - INTERVAL '365 days'),

-- Regular users with diverse profiles
('b1ffcc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'john.doe@example.com', '$2b$12$8XvL5Z7gY6fN1mR5a8p2G.HT3jK9sA0VKLM6nO8qP7bC4vW9eL2xD', 'John Doe', '+91-9876543210', 'user', NOW() - INTERVAL '180 days'),
('c2ddaa99-9c0b-4ef8-bb6d-6bb9bd380a33', 'jane.smith@gmail.com', '$2b$12$LQv3c1yqBo7ByQv5s8g7/.PSRQH5LHlqPQjM5Q7x8O6rP3i8F9E1e', 'Jane Smith', '+91-9876543211', 'user', NOW() - INTERVAL '150 days'),
('d3eebb99-9c0b-4ef8-bb6d-6bb9bd380a44', 'rajesh.kumar@company.com', '$2b$12$8XvL5Z7gY6fN1mR5a8p2G.HT3jK9sA0VKLM6nO8qP7bC4vW9eL2xD', 'Rajesh Kumar', '+91-9876543212', 'user', NOW() - INTERVAL '120 days'),
('e4ffcc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'priya.sharma@email.com', '$2b$12$LQv3c1yqBo7ByQv5s8g7/.PSRQH5LHlqPQjM5Q7x8O6rP3i8F9E1e', 'Priya Sharma', '+91-9876543213', 'user', NOW() - INTERVAL '100 days'),
('f5aabb99-9c0b-4ef8-bb6d-6bb9bd380a66', 'amit.patel@startup.in', '$2b$12$8XvL5Z7gY6fN1mR5a8p2G.HT3jK9sA0VKLM6nO8qP7bC4vW9eL2xD', 'Amit Patel', '+91-9876543214', 'user', NOW() - INTERVAL '90 days'),
('g6bbcc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'neha.gupta@tech.com', '$2b$12$LQv3c1yqBo7ByQv5s8g7/.PSRQH5LHlqPQjM5Q7x8O6rP3i8F9E1e', 'Neha Gupta', '+91-9876543215', 'user', NOW() - INTERVAL '75 days'),
('h7ccdd99-9c0b-4ef8-bb6d-6bb9bd380a88', 'vikram.singh@business.co', '$2b$12$8XvL5Z7gY6fN1mR5a8p2G.HT3jK9sA0VKLM6nO8qP7bC4vW9eL2xD', 'Vikram Singh', '+91-9876543216', 'user', NOW() - INTERVAL '60 days'),
('i8ddee99-9c0b-4ef8-bb6d-6bb9bd380a99', 'anita.joshi@university.edu', '$2b$12$LQv3c1yqBo7ByQv5s8g7/.PSRQH5LHlqPQjM5Q7x8O6rP3i8F9E1e', 'Anita Joshi', '+91-9876543217', 'user', NOW() - INTERVAL '45 days'),
('j9eeff99-9c0b-4ef8-bb6d-6bb9bd380a00', 'suresh.reddy@hospital.org', '$2b$12$8XvL5Z7gY6fN1mR5a8p2G.HT3jK9sA0VKLM6nO8qP7bC4vW9eL2xD', 'Suresh Reddy', '+91-9876543218', 'user', NOW() - INTERVAL '30 days')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  role = EXCLUDED.role;

-- 2. Create wallets for all users with varying balances
INSERT INTO wallets (id, user_id, balance, created_at, updated_at) VALUES
('w1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 10000.00, NOW() - INTERVAL '365 days', NOW() - INTERVAL '1 day'),
('w2ffcc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'b1ffcc99-9c0b-4ef8-bb6d-6bb9bd380a22', 1250.75, NOW() - INTERVAL '180 days', NOW() - INTERVAL '2 days'),
('w3ddaa99-9c0b-4ef8-bb6d-6bb9bd380a33', 'c2ddaa99-9c0b-4ef8-bb6d-6bb9bd380a33', 856.50, NOW() - INTERVAL '150 days', NOW() - INTERVAL '1 day'),
('w4eebb99-9c0b-4ef8-bb6d-6bb9bd380a44', 'd3eebb99-9c0b-4ef8-bb6d-6bb9bd380a44', 2100.25, NOW() - INTERVAL '120 days', NOW() - INTERVAL '3 hours'),
('w5ffcc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'e4ffcc99-9c0b-4ef8-bb6d-6bb9bd380a55', 675.00, NOW() - INTERVAL '100 days', NOW() - INTERVAL '5 hours'),
('w6aabb99-9c0b-4ef8-bb6d-6bb9bd380a66', 'f5aabb99-9c0b-4ef8-bb6d-6bb9bd380a66', 1890.80, NOW() - INTERVAL '90 days', NOW() - INTERVAL '1 day'),
('w7bbcc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'g6bbcc99-9c0b-4ef8-bb6d-6bb9bd380a77', 320.25, NOW() - INTERVAL '75 days', NOW() - INTERVAL '2 hours'),
('w8ccdd99-9c0b-4ef8-bb6d-6bb9bd380a88', 'h7ccdd99-9c0b-4ef8-bb6d-6bb9bd380a88', 3456.90, NOW() - INTERVAL '60 days', NOW() - INTERVAL '6 hours'),
('w9ddee99-9c0b-4ef8-bb6d-6bb9bd380a99', 'i8ddee99-9c0b-4ef8-bb6d-6bb9bd380a99', 987.65, NOW() - INTERVAL '45 days', NOW() - INTERVAL '4 hours'),
('w0eeff99-9c0b-4ef8-bb6d-6bb9bd380a00', 'j9eeff99-9c0b-4ef8-bb6d-6bb9bd380a00', 1543.20, NOW() - INTERVAL '30 days', NOW() - INTERVAL '8 hours')
ON CONFLICT (user_id) DO UPDATE SET
  balance = EXCLUDED.balance,
  updated_at = EXCLUDED.updated_at;

-- 3. Insert more toll gates for comprehensive coverage
INSERT INTO toll_gates (id, name, location, toll_amount, is_active, created_at) VALUES
-- Existing toll gates will be preserved, adding new ones
('t1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Delhi-Gurgaon Expressway', 'Gurgaon Entry', 65.00, true, NOW() - INTERVAL '200 days'),
('t2ffcc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Yamuna Expressway', 'Greater Noida Plaza', 85.00, true, NOW() - INTERVAL '180 days'),
('t3ddaa99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Bangalore Electronic City', 'Electronic City Toll', 40.00, true, NOW() - INTERVAL '160 days'),
('t4eebb99-9c0b-4ef8-bb6d-6bb9bd380a44', 'Chennai OMR Toll', 'Old Mahabalipuram Road', 55.00, true, NOW() - INTERVAL '140 days'),
('t5ffcc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'Hyderabad Outer Ring Road', 'ORR Shamshabad', 70.00, true, NOW() - INTERVAL '120 days'),
('t6aabb99-9c0b-4ef8-bb6d-6bb9bd380a66', 'Pune-Mumbai Bypass', 'Lonavala Toll Plaza', 90.00, true, NOW() - INTERVAL '100 days'),
('t7bbcc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'Ahmedabad-Vadodara Highway', 'Anand Toll Gate', 50.00, true, NOW() - INTERVAL '80 days'),
('t8ccdd99-9c0b-4ef8-bb6d-6bb9bd380a88', 'Kolkata-Durgapur Expressway', 'Dankuni Toll Plaza', 60.00, true, NOW() - INTERVAL '70 days'),
('t9ddee99-9c0b-4ef8-bb6d-6bb9bd380a99', 'Jaipur-Delhi Highway', 'Bhiwadi Toll Gate', 45.00, true, NOW() - INTERVAL '50 days'),
('t0eeff99-9c0b-4ef8-bb6d-6bb9bd380a00', 'Coimbatore-Salem Highway', 'Karur Toll Plaza', 35.00, true, NOW() - INTERVAL '30 days')
ON CONFLICT (id) DO NOTHING;

-- 4. Insert diverse vehicle data
INSERT INTO vehicles (id, user_id, license_plate, vehicle_type, make, model, year, is_active, created_at) VALUES
-- Admin vehicles
('v1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'MH12EF9999', 'suv', 'Toyota', 'Fortuner', 2022, true, NOW() - INTERVAL '300 days'),
('v2ffcc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'DL01AA0001', 'sedan', 'BMW', 'X5', 2023, true, NOW() - INTERVAL '200 days'),

-- John Doe vehicles
('v3ddaa99-9c0b-4ef8-bb6d-6bb9bd380a33', 'b1ffcc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'MH01AB1234', 'hatchback', 'Maruti', 'Swift', 2020, true, NOW() - INTERVAL '180 days'),
('v4eebb99-9c0b-4ef8-bb6d-6bb9bd380a44', 'b1ffcc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'MH02CD5678', 'sedan', 'Honda', 'City', 2021, true, NOW() - INTERVAL '150 days'),

-- Jane Smith vehicles
('v5ffcc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'c2ddaa99-9c0b-4ef8-bb6d-6bb9bd380a33', 'MH03EF9012', 'suv', 'Hyundai', 'Creta', 2022, true, NOW() - INTERVAL '140 days'),

-- Rajesh Kumar vehicles
('v6aabb99-9c0b-4ef8-bb6d-6bb9bd380a66', 'd3eebb99-9c0b-4ef8-bb6d-6bb9bd380a44', 'KA01GH3456', 'sedan', 'Toyota', 'Camry', 2021, true, NOW() - INTERVAL '110 days'),
('v7bbcc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'd3eebb99-9c0b-4ef8-bb6d-6bb9bd380a44', 'KA02IJ7890', 'hatchback', 'Tata', 'Altroz', 2020, true, NOW() - INTERVAL '100 days'),

-- Priya Sharma vehicles  
('v8ccdd99-9c0b-4ef8-bb6d-6bb9bd380a88', 'e4ffcc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'TN01KL2345', 'hatchback', 'Nissan', 'Micra', 2019, true, NOW() - INTERVAL '90 days'),

-- Amit Patel vehicles
('v9ddee99-9c0b-4ef8-bb6d-6bb9bd380a99', 'f5aabb99-9c0b-4ef8-bb6d-6bb9bd380a66', 'GJ01MN6789', 'suv', 'Mahindra', 'Scorpio', 2021, true, NOW() - INTERVAL '80 days'),
('v0eeff99-9c0b-4ef8-bb6d-6bb9bd380a00', 'f5aabb99-9c0b-4ef8-bb6d-6bb9bd380a66', 'GJ02OP0123', 'sedan', 'Skoda', 'Rapid', 2020, true, NOW() - INTERVAL '70 days'),

-- Neha Gupta vehicles
('va1ffc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'g6bbcc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'HR01QR4567', 'hatchback', 'Maruti', 'Baleno', 2021, true, NOW() - INTERVAL '60 days'),

-- Vikram Singh vehicles
('vb2ddc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'h7ccdd99-9c0b-4ef8-bb6d-6bb9bd380a88', 'PB01ST8901', 'suv', 'Ford', 'EcoSport', 2020, true, NOW() - INTERVAL '50 days'),
('vc3eec99-9c0b-4ef8-bb6d-6bb9bd380a33', 'h7ccdd99-9c0b-4ef8-bb6d-6bb9bd380a88', 'PB02UV2345', 'sedan', 'Volkswagen', 'Vento', 2019, false, NOW() - INTERVAL '45 days'),

-- Anita Joshi vehicles
('vd4ffc99-9c0b-4ef8-bb6d-6bb9bd380a44', 'i8ddee99-9c0b-4ef8-bb6d-6bb9bd380a99', 'MP01WX6789', 'hatchback', 'Honda', 'Jazz', 2020, true, NOW() - INTERVAL '40 days'),

-- Suresh Reddy vehicles
('ve5aac99-9c0b-4ef8-bb6d-6bb9bd380a55', 'j9eeff99-9c0b-4ef8-bb6d-6bb9bd380a00', 'AP01YZ0123', 'sedan', 'Renault', 'Logan', 2018, true, NOW() - INTERVAL '25 days')
ON CONFLICT (license_plate) DO UPDATE SET
  vehicle_type = EXCLUDED.vehicle_type,
  make = EXCLUDED.make,
  model = EXCLUDED.model,
  year = EXCLUDED.year,
  is_active = EXCLUDED.is_active;

-- 5. Insert comprehensive recharge data
INSERT INTO recharges (id, user_id, payment_id, order_id, amount, status, payment_method, gateway_response, created_at, updated_at) VALUES
-- Successful recharges
('r1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1ffcc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'pay_J1K2L3M4N5O6P7Q8', 'order_A1B2C3D4E5F6G7H8', 1500.00, 'completed', 'razorpay', '{"razorpay_payment_id": "pay_J1K2L3M4N5O6P7Q8", "razorpay_order_id": "order_A1B2C3D4E5F6G7H8", "razorpay_signature": "abc123def456"}', NOW() - INTERVAL '170 days', NOW() - INTERVAL '170 days'),
('r2ffcc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'c2ddaa99-9c0b-4ef8-bb6d-6bb9bd380a33', 'pay_K9L8M7N6O5P4Q3R2', 'order_B9C8D7E6F5G4H3I2', 1000.00, 'completed', 'razorpay', '{"razorpay_payment_id": "pay_K9L8M7N6O5P4Q3R2", "razorpay_order_id": "order_B9C8D7E6F5G4H3I2", "razorpay_signature": "def456ghi789"}', NOW() - INTERVAL '140 days', NOW() - INTERVAL '140 days'),
('r3ddaa99-9c0b-4ef8-bb6d-6bb9bd380a33', 'd3eebb99-9c0b-4ef8-bb6d-6bb9bd380a44', 'pay_L7M6N5O4P3Q2R1S0', 'order_C7D6E5F4G3H2I1J0', 2500.00, 'completed', 'razorpay', '{"razorpay_payment_id": "pay_L7M6N5O4P3Q2R1S0", "razorpay_order_id": "order_C7D6E5F4G3H2I1J0", "razorpay_signature": "ghi789jkl012"}', NOW() - INTERVAL '110 days', NOW() - INTERVAL '110 days'),
('r4eebb99-9c0b-4ef8-bb6d-6bb9bd380a44', 'e4ffcc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'pay_M5N4O3P2Q1R0S9T8', 'order_D5E4F3G2H1I0J9K8', 800.00, 'completed', 'razorpay', '{"razorpay_payment_id": "pay_M5N4O3P2Q1R0S9T8", "razorpay_order_id": "order_D5E4F3G2H1I0J9K8", "razorpay_signature": "jkl012mno345"}', NOW() - INTERVAL '85 days', NOW() - INTERVAL '85 days'),
('r5ffcc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'f5aabb99-9c0b-4ef8-bb6d-6bb9bd380a66', 'pay_N3O2P1Q0R9S8T7U6', 'order_E3F2G1H0I9J8K7L6', 2000.00, 'completed', 'razorpay', '{"razorpay_payment_id": "pay_N3O2P1Q0R9S8T7U6", "razorpay_order_id": "order_E3F2G1H0I9J8K7L6", "razorpay_signature": "mno345pqr678"}', NOW() - INTERVAL '75 days', NOW() - INTERVAL '75 days'),
('r6aabb99-9c0b-4ef8-bb6d-6bb9bd380a66', 'g6bbcc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'pay_O1P0Q9R8S7T6U5V4', 'order_F1G0H9I8J7K6L5M4', 500.00, 'completed', 'razorpay', '{"razorpay_payment_id": "pay_O1P0Q9R8S7T6U5V4", "razorpay_order_id": "order_F1G0H9I8J7K6L5M4", "razorpay_signature": "pqr678stu901"}', NOW() - INTERVAL '65 days', NOW() - INTERVAL '65 days'),
('r7bbcc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'h7ccdd99-9c0b-4ef8-bb6d-6bb9bd380a88', 'pay_P9Q8R7S6T5U4V3W2', 'order_G9H8I7J6K5L4M3N2', 3500.00, 'completed', 'razorpay', '{"razorpay_payment_id": "pay_P9Q8R7S6T5U4V3W2", "razorpay_order_id": "order_G9H8I7J6K5L4M3N2", "razorpay_signature": "stu901vwx234"}', NOW() - INTERVAL '55 days', NOW() - INTERVAL '55 days'),
('r8ccdd99-9c0b-4ef8-bb6d-6bb9bd380a88', 'i8ddee99-9c0b-4ef8-bb6d-6bb9bd380a99', 'pay_Q7R6S5T4U3V2W1X0', 'order_H7I6J5K4L3M2N1O0', 1200.00, 'completed', 'razorpay', '{"razorpay_payment_id": "pay_Q7R6S5T4U3V2W1X0", "razorpay_order_id": "order_H7I6J5K4L3M2N1O0", "razorpay_signature": "vwx234yz567"}', NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days'),
('r9ddee99-9c0b-4ef8-bb6d-6bb9bd380a99', 'j9eeff99-9c0b-4ef8-bb6d-6bb9bd380a00', 'pay_R5S4T3U2V1W0X9Y8', 'order_I5J4K3L2M1N0O9P8', 1800.00, 'completed', 'razorpay', '{"razorpay_payment_id": "pay_R5S4T3U2V1W0X9Y8", "razorpay_order_id": "order_I5J4K3L2M1N0O9P8", "razorpay_signature": "yz567abc890"}', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),

-- Some failed/pending recharges for realism
('ra1ebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1ffcc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'pay_S3T2U1V0W9X8Y7Z6', 'order_J3K2L1M0N9O8P7Q6', 750.00, 'failed', 'razorpay', '{"error": "payment_failed", "description": "Card declined by bank"}', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
('rb2fcc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'c2ddaa99-9c0b-4ef8-bb6d-6bb9bd380a33', 'pay_T1U0V9W8X7Y6Z5A4', 'order_K1L0M9N8O7P6Q5R4', 600.00, 'pending', 'razorpay', '{"status": "created", "order_id": "order_K1L0M9N8O7P6Q5R4"}', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours')
ON CONFLICT (payment_id) DO UPDATE SET
  amount = EXCLUDED.amount,
  status = EXCLUDED.status,
  gateway_response = EXCLUDED.gateway_response,
  updated_at = EXCLUDED.updated_at;

-- 6. Insert comprehensive transaction data (toll deductions)
INSERT INTO transactions (id, user_id, vehicle_id, toll_gate_id, amount, status, transaction_type, created_at) VALUES
-- Recent transactions (last 30 days)
('tx1ebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1ffcc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'v3ddaa99-9c0b-4ef8-bb6d-6bb9bd380a33', 't1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 65.00, 'completed', 'toll_deduction', NOW() - INTERVAL '5 hours'),
('tx2fcc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'c2ddaa99-9c0b-4ef8-bb6d-6bb9bd380a33', 'v5ffcc99-9c0b-4ef8-bb6d-6bb9bd380a55', 't2ffcc99-9c0b-4ef8-bb6d-6bb9bd380a22', 85.00, 'completed', 'toll_deduction', NOW() - INTERVAL '8 hours'),
('tx3daa99-9c0b-4ef8-bb6d-6bb9bd380a33', 'd3eebb99-9c0b-4ef8-bb6d-6bb9bd380a44', 'v6aabb99-9c0b-4ef8-bb6d-6bb9bd380a66', 't3ddaa99-9c0b-4ef8-bb6d-6bb9bd380a33', 40.00, 'completed', 'toll_deduction', NOW() - INTERVAL '12 hours'),
('tx4ebb99-9c0b-4ef8-bb6d-6bb9bd380a44', 'e4ffcc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'v8ccdd99-9c0b-4ef8-bb6d-6bb9bd380a88', 't4eebb99-9c0b-4ef8-bb6d-6bb9bd380a44', 55.00, 'completed', 'toll_deduction', NOW() - INTERVAL '1 day'),
('tx5fcc99-9c0b-4ef8-bb6d-6bb9bd380a55', 'f5aabb99-9c0b-4ef8-bb6d-6bb9bd380a66', 'v9ddee99-9c0b-4ef8-bb6d-6bb9bd380a99', 't5ffcc99-9c0b-4ef8-bb6d-6bb9bd380a55', 70.00, 'completed', 'toll_deduction', NOW() - INTERVAL '2 days'),

-- More transactions spread over time
('tx6abb99-9c0b-4ef8-bb6d-6bb9bd380a66', 'g6bbcc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'va1ffc99-9c0b-4ef8-bb6d-6bb9bd380a11', 't6aabb99-9c0b-4ef8-bb6d-6bb9bd380a66', 90.00, 'completed', 'toll_deduction', NOW() - INTERVAL '3 days'),
('tx7bcc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'h7ccdd99-9c0b-4ef8-bb6d-6bb9bd380a88', 'vb2ddc99-9c0b-4ef8-bb6d-6bb9bd380a22', 't7bbcc99-9c0b-4ef8-bb6d-6bb9bd380a77', 50.00, 'completed', 'toll_deduction', NOW() - INTERVAL '5 days'),
('tx8cdd99-9c0b-4ef8-bb6d-6bb9bd380a88', 'i8ddee99-9c0b-4ef8-bb6d-6bb9bd380a99', 'vd4ffc99-9c0b-4ef8-bb6d-6bb9bd380a44', 't8ccdd99-9c0b-4ef8-bb6d-6bb9bd380a88', 60.00, 'completed', 'toll_deduction', NOW() - INTERVAL '7 days'),
('tx9dee99-9c0b-4ef8-bb6d-6bb9bd380a99', 'j9eeff99-9c0b-4ef8-bb6d-6bb9bd380a00', 've5aac99-9c0b-4ef8-bb6d-6bb9bd380a55', 't9ddee99-9c0b-4ef8-bb6d-6bb9bd380a99', 45.00, 'completed', 'toll_deduction', NOW() - INTERVAL '10 days'),
('tx0eff99-9c0b-4ef8-bb6d-6bb9bd380a00', 'b1ffcc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'v4eebb99-9c0b-4ef8-bb6d-6bb9bd380a44', 't0eeff99-9c0b-4ef8-bb6d-6bb9bd380a00', 35.00, 'completed', 'toll_deduction', NOW() - INTERVAL '12 days'),

-- Historical transactions
('txa1bc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c2ddaa99-9c0b-4ef8-bb6d-6bb9bd380a33', 'v5ffcc99-9c0b-4ef8-bb6d-6bb9bd380a55', 't1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 65.00, 'completed', 'toll_deduction', NOW() - INTERVAL '20 days'),
('txb2cc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'd3eebb99-9c0b-4ef8-bb6d-6bb9bd380a44', 'v7bbcc99-9c0b-4ef8-bb6d-6bb9bd380a77', 't2ffcc99-9c0b-4ef8-bb6d-6bb9bd380a22', 85.00, 'completed', 'toll_deduction', NOW() - INTERVAL '25 days'),
('txc3dd99-9c0b-4ef8-bb6d-6bb9bd380a33', 'f5aabb99-9c0b-4ef8-bb6d-6bb9bd380a66', 'v0eeff99-9c0b-4ef8-bb6d-6bb9bd380a00', 't3ddaa99-9c0b-4ef8-bb6d-6bb9bd380a33', 40.00, 'completed', 'toll_deduction', NOW() - INTERVAL '30 days'),
('txd4ee99-9c0b-4ef8-bb6d-6bb9bd380a44', 'h7ccdd99-9c0b-4ef8-bb6d-6bb9bd380a88', 'vc3eec99-9c0b-4ef8-bb6d-6bb9bd380a33', 't4eebb99-9c0b-4ef8-bb6d-6bb9bd380a44', 55.00, 'completed', 'toll_deduction', NOW() - INTERVAL '35 days'),
('txe5ff99-9c0b-4ef8-bb6d-6bb9bd380a55', 'b1ffcc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'v3ddaa99-9c0b-4ef8-bb6d-6bb9bd380a33', 't5ffcc99-9c0b-4ef8-bb6d-6bb9bd380a55', 70.00, 'completed', 'toll_deduction', NOW() - INTERVAL '40 days'),

-- Failed transactions (insufficient balance scenarios)
('txf6aa99-9c0b-4ef8-bb6d-6bb9bd380a66', 'g6bbcc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'va1ffc99-9c0b-4ef8-bb6d-6bb9bd380a11', 't6aabb99-9c0b-4ef8-bb6d-6bb9bd380a66', 90.00, 'failed', 'toll_deduction', NOW() - INTERVAL '8 days'),
('txg7bb99-9c0b-4ef8-bb6d-6bb9bd380a77', 'g6bbcc99-9c0b-4ef8-bb6d-6bb9bd380a77', 'va1ffc99-9c0b-4ef8-bb6d-6bb9bd380a11', 't7bbcc99-9c0b-4ef8-bb6d-6bb9bd380a77', 50.00, 'failed', 'toll_deduction', NOW() - INTERVAL '6 days')
ON CONFLICT (id) DO UPDATE SET
  amount = EXCLUDED.amount,
  status = EXCLUDED.status,
  created_at = EXCLUDED.created_at;

-- 7. Update statistics summary
SELECT 
    'Mock Data Population Complete!' as message,
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM wallets) as total_wallets,
    (SELECT COUNT(*) FROM vehicles) as total_vehicles,
    (SELECT COUNT(*) FROM toll_gates) as total_toll_gates,
    (SELECT COUNT(*) FROM transactions) as total_transactions,
    (SELECT COUNT(*) FROM recharges) as total_recharges,
    (SELECT SUM(balance) FROM wallets) as total_wallet_balance,
    (SELECT SUM(amount) FROM transactions WHERE status = 'completed') as total_toll_revenue,
    (SELECT SUM(amount) FROM recharges WHERE status = 'completed') as total_recharges_value;

-- 8. Show sample data for verification
SELECT 'USERS SAMPLE' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'WALLETS SAMPLE', COUNT(*) FROM wallets
UNION ALL
SELECT 'VEHICLES SAMPLE', COUNT(*) FROM vehicles
UNION ALL
SELECT 'TOLL_GATES SAMPLE', COUNT(*) FROM toll_gates  
UNION ALL
SELECT 'TRANSACTIONS SAMPLE', COUNT(*) FROM transactions
UNION ALL
SELECT 'RECHARGES SAMPLE', COUNT(*) FROM recharges;

-- 9. Sample transaction summary for quick verification
SELECT 
    u.name as user_name,
    v.license_plate,
    tg.name as toll_gate,
    t.amount,
    t.status,
    t.created_at
FROM transactions t
JOIN users u ON t.user_id = u.id  
JOIN vehicles v ON t.vehicle_id = v.id
JOIN toll_gates tg ON t.toll_gate_id = tg.id
ORDER BY t.created_at DESC
LIMIT 10;