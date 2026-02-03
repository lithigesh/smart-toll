-- Smart Toll System - Complete Database Setup
-- This is the comprehensive database initialization file
-- Includes: schema creation, functions, constraints, and test data

-- ============================================
-- STEP 1: DROP EXISTING COMPLEX TABLES
-- ============================================
DROP TABLE IF EXISTS gps_logs CASCADE;
DROP TABLE IF EXISTS vehicle_toll_history CASCADE;
DROP TABLE IF EXISTS toll_road_zones CASCADE;
DROP TABLE IF EXISTS toll_passages CASCADE;
DROP TABLE IF EXISTS toll_gates CASCADE;
DROP TABLE IF EXISTS journeys CASCADE;
DROP FUNCTION IF EXISTS calculate_distance_between_points;
DROP FUNCTION IF EXISTS process_gps_log;
DROP FUNCTION IF EXISTS calculate_toll_for_vehicle;

-- ============================================
-- STEP 2: CREATE ESSENTIAL TABLES
-- ============================================

-- Users table (for authentication and wallet)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wallets table (for balance management)
CREATE TABLE IF NOT EXISTS wallets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vehicle types table
CREATE TABLE IF NOT EXISTS vehicle_types (
    id SERIAL PRIMARY KEY,
    type_name VARCHAR(50) UNIQUE NOT NULL,
    rate_per_km DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default vehicle types with rates
INSERT INTO vehicle_types (type_name, rate_per_km) VALUES
('Car', 2.00),
('Bus', 5.00),
('Truck', 8.00),
('Bike', 1.00)
ON CONFLICT (type_name) DO UPDATE SET 
rate_per_km = EXCLUDED.rate_per_km;

-- Vehicles table (with device_id for ESP32 mapping)
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    vehicle_number VARCHAR(20) UNIQUE NOT NULL,
    vehicle_type VARCHAR(50) REFERENCES vehicle_types(type_name),
    device_id VARCHAR(100) UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recharges table (for payment tracking)
CREATE TABLE IF NOT EXISTS recharges (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    razorpay_order_id VARCHAR(255) UNIQUE NOT NULL,
    razorpay_payment_id VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ESP32 Toll Transactions table (simplified toll processing)
CREATE TABLE IF NOT EXISTS esp32_toll_transactions (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(100) NOT NULL,
    vehicle_id INTEGER REFERENCES vehicles(id),
    user_id INTEGER REFERENCES users(id),
    start_lat DECIMAL(10, 8) NOT NULL,
    start_lon DECIMAL(11, 8) NOT NULL,
    total_distance_km DECIMAL(10, 3) NOT NULL,
    toll_amount DECIMAL(10, 2) NOT NULL,
    wallet_balance_before DECIMAL(10, 2) NOT NULL,
    wallet_balance_after DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'insufficient_balance', 'failed')),
    device_timestamp TIMESTAMP NOT NULL,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 3: CREATE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_esp32_toll_device_id ON esp32_toll_transactions(device_id);
CREATE INDEX IF NOT EXISTS idx_esp32_toll_vehicle_id ON esp32_toll_transactions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_esp32_toll_user_id ON esp32_toll_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_esp32_toll_processed_at ON esp32_toll_transactions(processed_at);

-- ============================================
-- STEP 4: ADD TIMESTAMP CONSTRAINT
-- ============================================
-- Fix timestamp constraint for ESP32 devices with significant clock drift
-- Drop the existing constraint if it exists
ALTER TABLE esp32_toll_transactions 
DROP CONSTRAINT IF EXISTS chk_processed_after_device;

-- Update any existing records that might have issues
UPDATE esp32_toll_transactions 
SET processed_at = GREATEST(processed_at, device_timestamp + INTERVAL '1 second')
WHERE processed_at < device_timestamp;

-- Add a lenient check constraint that allows for large clock differences
-- Allow processed_at to be up to 12 hours before device_timestamp (for major clock sync issues)
ALTER TABLE esp32_toll_transactions 
ADD CONSTRAINT chk_processed_after_device 
CHECK (processed_at >= (device_timestamp - INTERVAL '12 hours'));

-- Create a comment explaining the constraint
COMMENT ON CONSTRAINT chk_processed_after_device ON esp32_toll_transactions IS 
'Ensures that the server processing time is within 12 hours of the device timestamp to handle ESP32 clock synchronization issues while maintaining basic data integrity';

-- ============================================
-- STEP 5: CREATE ESP32 TOLL PROCESSING FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION process_esp32_toll(
    p_device_id VARCHAR(100),
    p_start_lat DECIMAL(10, 8),
    p_start_lon DECIMAL(11, 8),
    p_total_distance_km DECIMAL(10, 3),
    p_device_timestamp TIMESTAMP
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    transaction_id INTEGER,
    vehicle_id INTEGER,
    user_id INTEGER,
    toll_amount DECIMAL(10, 2),
    new_balance DECIMAL(10, 2)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_vehicle_id INTEGER;
    v_user_id INTEGER;
    v_vehicle_type VARCHAR(50);
    v_rate_per_km DECIMAL(10, 2);
    v_calculated_toll DECIMAL(10, 2);
    v_current_balance DECIMAL(10, 2);
    v_new_balance DECIMAL(10, 2);
    v_transaction_id INTEGER;
BEGIN
    -- Find vehicle by device_id
    SELECT v.id, v.user_id, v.vehicle_type 
    INTO v_vehicle_id, v_user_id, v_vehicle_type
    FROM vehicles v 
    WHERE v.device_id = p_device_id AND v.is_active = true;
    
    -- Check if vehicle exists
    IF v_vehicle_id IS NULL THEN
        RETURN QUERY SELECT 
            false,
            'Device not registered or inactive: ' || p_device_id,
            NULL::INTEGER,
            NULL::INTEGER,
            NULL::INTEGER,
            NULL::DECIMAL(10, 2),
            NULL::DECIMAL(10, 2);
        RETURN;
    END IF;
    
    -- Get rate per km for vehicle type
    SELECT vt.rate_per_km INTO v_rate_per_km
    FROM vehicle_types vt 
    WHERE vt.type_name = v_vehicle_type;
    
    -- Calculate toll amount
    v_calculated_toll := p_total_distance_km * v_rate_per_km;
    
    -- Get current wallet balance
    SELECT w.balance INTO v_current_balance
    FROM wallets w 
    WHERE w.user_id = v_user_id;
    
    -- Check if wallet exists
    IF v_current_balance IS NULL THEN
        -- Create wallet if it doesn't exist
        INSERT INTO wallets (user_id, balance) 
        VALUES (v_user_id, 0.00);
        v_current_balance := 0.00;
    END IF;
    
    -- Check sufficient balance
    IF v_current_balance < v_calculated_toll THEN
        -- Insert failed transaction
        INSERT INTO esp32_toll_transactions (
            device_id, vehicle_id, user_id, start_lat, start_lon, 
            total_distance_km, toll_amount, wallet_balance_before, 
            wallet_balance_after, status, device_timestamp
        ) VALUES (
            p_device_id, v_vehicle_id, v_user_id, p_start_lat, p_start_lon,
            p_total_distance_km, v_calculated_toll, v_current_balance,
            v_current_balance, 'insufficient_balance', p_device_timestamp
        ) RETURNING id INTO v_transaction_id;
        
        RETURN QUERY SELECT 
            false,
            'Insufficient wallet balance. Required: ₹' || v_calculated_toll || ', Available: ₹' || v_current_balance,
            v_transaction_id,
            v_vehicle_id,
            v_user_id,
            v_calculated_toll,
            v_current_balance;
        RETURN;
    END IF;
    
    -- Calculate new balance
    v_new_balance := v_current_balance - v_calculated_toll;
    
    -- Update wallet balance
    UPDATE wallets 
    SET balance = v_new_balance, updated_at = CURRENT_TIMESTAMP
    WHERE wallets.user_id = v_user_id;
    
    -- Insert successful transaction
    INSERT INTO esp32_toll_transactions (
        device_id, vehicle_id, user_id, start_lat, start_lon, 
        total_distance_km, toll_amount, wallet_balance_before, 
        wallet_balance_after, status, device_timestamp
    ) VALUES (
        p_device_id, v_vehicle_id, v_user_id, p_start_lat, p_start_lon,
        p_total_distance_km, v_calculated_toll, v_current_balance,
        v_new_balance, 'success', p_device_timestamp
    ) RETURNING id INTO v_transaction_id;
    
    RETURN QUERY SELECT 
        true,
        'Toll charged successfully: ₹' || v_calculated_toll,
        v_transaction_id,
        v_vehicle_id,
        v_user_id,
        v_calculated_toll,
        v_new_balance;
    
END $$;

-- ============================================
-- STEP 6: CREATE TEST USER AND DATA
-- ============================================
-- Create comprehensive test user for ESP32 Smart Toll System
-- Email: test@smarttoll.com, Password: password123

-- Delete existing test user to avoid conflicts
DELETE FROM users WHERE email = 'test@smarttoll.com';

INSERT INTO users (name, email, phone, password, is_verified) VALUES
('Smart Toll Test User', 'test@smarttoll.com', '9842730737', '$2b$10$Oo7.I5qwu6f1UTST8mZzI.cvXuGq/dmaDSm6uZVhKDQP2YNpG9kr.', true);

-- Setup test data using PL/pgSQL block
DO $$
DECLARE
    test_user_id INTEGER;
    wallet_id INTEGER;
    vehicle1_id INTEGER;
    vehicle2_id INTEGER;
BEGIN
    -- Get user ID
    SELECT id INTO test_user_id FROM users WHERE email = 'test@smarttoll.com';
    
    -- Create wallet with initial balance
    DELETE FROM wallets WHERE user_id = test_user_id;
    INSERT INTO wallets (user_id, balance) VALUES (test_user_id, 2500.00)
    RETURNING id INTO wallet_id;
    
    -- Create vehicles with ESP32 device IDs
    DELETE FROM vehicles WHERE vehicle_number IN ('TN01AB1234', 'TN02CD5678', 'TN03EF9012');
    DELETE FROM vehicles WHERE device_id IN ('ESP32_CAR_001', 'ESP32_BIKE_002', 'ESP32_BUS_003');
    INSERT INTO vehicles (user_id, vehicle_number, vehicle_type, device_id, is_active) VALUES
    (test_user_id, 'TN01AB1234', 'Car', 'ESP32_CAR_001', true),
    (test_user_id, 'TN02CD5678', 'Bike', 'ESP32_BIKE_002', true),
    (test_user_id, 'TN03EF9012', 'Bus', 'ESP32_BUS_003', false);
    
    -- Get vehicle IDs for transactions
    SELECT id INTO vehicle1_id FROM vehicles WHERE vehicle_number = 'TN01AB1234';
    SELECT id INTO vehicle2_id FROM vehicles WHERE vehicle_number = 'TN02CD5678';
    
    -- Create recharge history
    DELETE FROM recharges WHERE razorpay_order_id IN ('order_test001', 'order_test002', 'order_test003');
    INSERT INTO recharges (user_id, razorpay_order_id, razorpay_payment_id, amount, status) VALUES
    (test_user_id, 'order_test001', 'pay_test001', 1000.00, 'paid'),
    (test_user_id, 'order_test002', 'pay_test002', 1500.00, 'paid'),
    (test_user_id, 'order_test003', NULL, 500.00, 'failed');
    
    -- Create sample ESP32 toll transactions
    DELETE FROM esp32_toll_transactions WHERE device_id IN ('ESP32_CAR_001', 'ESP32_BIKE_002', 'ESP32_BUS_003');
    INSERT INTO esp32_toll_transactions (
        device_id, vehicle_id, user_id, start_lat, start_lon, 
        total_distance_km, toll_amount, wallet_balance_before, 
        wallet_balance_after, status, device_timestamp, processed_at
    ) VALUES
    -- Successful car transactions
    ('ESP32_CAR_001', vehicle1_id, test_user_id, 13.0827, 80.2707, 15.5, 31.00, 2500.00, 2469.00, 'success', 
     CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days'),
    ('ESP32_CAR_001', vehicle1_id, test_user_id, 12.9716, 77.5946, 25.2, 50.40, 2469.00, 2418.60, 'success', 
     CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days'),
    ('ESP32_CAR_001', vehicle1_id, test_user_id, 19.0760, 72.8777, 8.7, 17.40, 2418.60, 2401.20, 'success', 
     CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    -- Successful bike transactions
    ('ESP32_BIKE_002', vehicle2_id, test_user_id, 28.7041, 77.1025, 12.3, 12.30, 2401.20, 2388.90, 'success', 
     CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day'),
    ('ESP32_BIKE_002', vehicle2_id, test_user_id, 22.5726, 88.3639, 6.8, 6.80, 2388.90, 2382.10, 'success', 
     CURRENT_TIMESTAMP - INTERVAL '12 hours', CURRENT_TIMESTAMP - INTERVAL '12 hours'),
    -- Recent transactions
    ('ESP32_CAR_001', vehicle1_id, test_user_id, 11.0168, 76.9558, 18.4, 36.80, 2382.10, 2345.30, 'success', 
     CURRENT_TIMESTAMP - INTERVAL '6 hours', CURRENT_TIMESTAMP - INTERVAL '6 hours'),
    ('ESP32_BIKE_002', vehicle2_id, test_user_id, 26.9124, 75.7873, 9.2, 9.20, 2345.30, 2336.10, 'success', 
     CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
    -- One failed transaction due to insufficient balance
    ('ESP32_CAR_001', vehicle1_id, test_user_id, 17.3850, 78.4867, 45.0, 90.00, 50.00, 50.00, 'insufficient_balance', 
     CURRENT_TIMESTAMP - INTERVAL '30 minutes', CURRENT_TIMESTAMP - INTERVAL '30 minutes');
    
    -- Update final wallet balance
    UPDATE wallets SET balance = 2336.10 WHERE user_id = test_user_id;
    
    RAISE NOTICE '=== TEST USER CREATED SUCCESSFULLY ===';
    RAISE NOTICE 'Email: test@smarttoll.com';
    RAISE NOTICE 'Password: password123 (hashed)';
    RAISE NOTICE 'User ID: %', test_user_id;
    RAISE NOTICE 'Wallet Balance: ₹2,336.10';
    RAISE NOTICE 'Vehicles: 3 (2 active, 1 inactive)';
    RAISE NOTICE 'Recharge History: 3 records (2 paid, 1 failed)';
    RAISE NOTICE 'ESP32 Transactions: 8 records (7 successful, 1 failed)';
    RAISE NOTICE '========================================';
    
END $$;

-- ============================================
-- STEP 7: VERIFICATION
-- ============================================
-- Display summary of created data
SELECT 
    'USER' as data_type,
    u.name,
    u.email,
    u.phone,
    CASE WHEN u.is_verified THEN 'Verified' ELSE 'Not Verified' END as status
FROM users u WHERE u.email = 'test@smarttoll.com';

-- Show timestamp constraint details
SELECT 
    id,
    device_id,
    device_timestamp,
    processed_at,
    EXTRACT(EPOCH FROM (processed_at - device_timestamp))/3600 as time_diff_hours,
    status
FROM esp32_toll_transactions 
ORDER BY device_timestamp DESC
LIMIT 10;

-- Display confirmation
DO $$
BEGIN
    RAISE NOTICE '✓ Database setup completed successfully';
    RAISE NOTICE '✓ All tables created';
    RAISE NOTICE '✓ Timestamp constraint with 12-hour tolerance applied';
    RAISE NOTICE '✓ ESP32 toll processing function installed';
    RAISE NOTICE '✓ Test data created';
END $$;
