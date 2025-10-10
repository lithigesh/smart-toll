-- ESP32 Smart Toll System - Complete Database Setup
-- This script creates a minimal database structure for processing ESP32 device payloads

-- Drop existing complex tables if they exist
DROP TABLE IF EXISTS gps_logs CASCADE;
DROP TABLE IF EXISTS vehicle_toll_history CASCADE;
DROP TABLE IF EXISTS toll_road_zones CASCADE;
DROP TABLE IF EXISTS toll_passages CASCADE;
DROP TABLE IF EXISTS toll_gates CASCADE;
DROP TABLE IF EXISTS journeys CASCADE;
DROP FUNCTION IF EXISTS calculate_distance_between_points;
DROP FUNCTION IF EXISTS process_gps_log;
DROP FUNCTION IF EXISTS calculate_toll_for_vehicle;

-- Ensure essential tables exist with correct structure
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
    device_id VARCHAR(100) UNIQUE, -- ESP32 device identifier
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

-- Create indexes for esp32_toll_transactions table
CREATE INDEX IF NOT EXISTS idx_esp32_toll_device_id ON esp32_toll_transactions(device_id);
CREATE INDEX IF NOT EXISTS idx_esp32_toll_vehicle_id ON esp32_toll_transactions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_esp32_toll_user_id ON esp32_toll_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_esp32_toll_processed_at ON esp32_toll_transactions(processed_at);

-- Create the main ESP32 toll processing function
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
        'Toll processed successfully. Amount: ₹' || v_calculated_toll,
        v_transaction_id,
        v_vehicle_id,
        v_user_id,
        v_calculated_toll,
        v_new_balance;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
        false,
        'Error processing toll: ' || SQLERRM,
        NULL::INTEGER,
        NULL::INTEGER,
        NULL::INTEGER,
        NULL::DECIMAL(10, 2),
        NULL::DECIMAL(10, 2);
END;
$$;

-- Create function to get toll transaction history
CREATE OR REPLACE FUNCTION get_user_toll_history(p_user_id INTEGER, p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
    transaction_id INTEGER,
    device_id VARCHAR(100),
    vehicle_number VARCHAR(20),
    vehicle_type VARCHAR(50),
    start_lat DECIMAL(10, 8),
    start_lon DECIMAL(11, 8),
    distance_km DECIMAL(10, 3),
    toll_amount DECIMAL(10, 2),
    status VARCHAR(20),
    device_timestamp TIMESTAMP,
    processed_at TIMESTAMP
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        ett.id,
        ett.device_id,
        v.vehicle_number,
        v.vehicle_type,
        ett.start_lat,
        ett.start_lon,
        ett.total_distance_km,
        ett.toll_amount,
        ett.status,
        ett.device_timestamp,
        ett.processed_at
    FROM esp32_toll_transactions ett
    JOIN vehicles v ON ett.vehicle_id = v.id
    WHERE ett.user_id = p_user_id
    ORDER BY ett.processed_at DESC
    LIMIT p_limit;
END;
$$;

-- Insert sample data for testing (optional)
-- Sample user
INSERT INTO users (name, email, phone, password, is_verified) VALUES
('Test User', 'test@example.com', '9876543210', '$2b$10$example', true)
ON CONFLICT (email) DO NOTHING;

-- Sample wallet
INSERT INTO wallets (user_id, balance) 
SELECT u.id, 1000.00 FROM users u WHERE u.email = 'test@example.com'
ON CONFLICT DO NOTHING;

-- Sample vehicle with device_id
INSERT INTO vehicles (user_id, vehicle_number, vehicle_type, device_id) 
SELECT u.id, 'TN01AB1234', 'Car', 'ESP32_DEVICE_001' 
FROM users u WHERE u.email = 'test@example.com'
ON CONFLICT (vehicle_number) DO NOTHING;

-- Grant necessary permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;

-- Display setup completion message
DO $$
BEGIN
    RAISE NOTICE 'ESP32 Smart Toll Database Setup Complete!';
    RAISE NOTICE 'Created tables: users, wallets, vehicle_types, vehicles, recharges, esp32_toll_transactions';
    RAISE NOTICE 'Created functions: process_esp32_toll(), get_user_toll_history()';
    RAISE NOTICE 'Sample data inserted for testing';
    RAISE NOTICE 'Ready to process ESP32 toll transactions!';
END $$;