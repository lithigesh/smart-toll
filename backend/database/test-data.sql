-- SMART TOLL SYSTEM - TEST USER AND VEHICLE DATA
-- Creates test@smarttoll.com user with TN vehicles and wallet
-- Run this after complete-setup.sql

-- =============================================
-- TEST USER CREATION
-- =============================================

-- Create test user with hashed password
INSERT INTO users (id, name, email, phone, password_hash, created_at)
VALUES (
    gen_random_uuid(), 
    'Test SmartToll User', 
    'test@smarttoll.com', 
    '+91-9999999999',
    crypt('password123', gen_salt('bf')),
    now()
) ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    password_hash = EXCLUDED.password_hash,
    updated_at = now();

-- =============================================
-- WALLET CREATION
-- =============================================

-- Create wallet with initial balance of ₹1000
INSERT INTO wallets (id, user_id, balance, updated_at)
SELECT 
    gen_random_uuid(), 
    id, 
    1000.00, 
    now() 
FROM users 
WHERE email = 'test@smarttoll.com'
ON CONFLICT (user_id) DO UPDATE SET
    balance = EXCLUDED.balance,
    updated_at = now();

-- =============================================
-- TN SAMPLE VEHICLES
-- =============================================

-- Sample TN vehicles with Coimbatore RTO codes (TN-37, TN-38, TN-41)
-- Different vehicle types for testing different rates

-- Car - Maruti Swift (TN-37)
INSERT INTO vehicles (id, user_id, plate_number, vehicle_type, model, registered_at)
SELECT 
    gen_random_uuid(), 
    id, 
    'TN37AB1234', 
    'car', 
    'Maruti Swift DZire', 
    now()
FROM users 
WHERE email = 'test@smarttoll.com'
ON CONFLICT (plate_number) DO UPDATE SET
    model = EXCLUDED.model,
    updated_at = now();

-- Truck - Tata Ace (TN-38)
INSERT INTO vehicles (id, user_id, plate_number, vehicle_type, model, registered_at)
SELECT 
    gen_random_uuid(), 
    id, 
    'TN38CD5678', 
    'truck', 
    'Tata Ace Gold Petrol', 
    now()
FROM users 
WHERE email = 'test@smarttoll.com'
ON CONFLICT (plate_number) DO UPDATE SET
    model = EXCLUDED.model,
    updated_at = now();

-- Bus - Ashok Leyland (TN-41)
INSERT INTO vehicles (id, user_id, plate_number, vehicle_type, model, registered_at)
SELECT 
    gen_random_uuid(), 
    id, 
    'TN41EF9012', 
    'bus', 
    'Ashok Leyland Stile', 
    now()
FROM users 
WHERE email = 'test@smarttoll.com'
ON CONFLICT (plate_number) DO UPDATE SET
    model = EXCLUDED.model,
    updated_at = now();

-- Bike - Royal Enfield (TN-37)
INSERT INTO vehicles (id, user_id, plate_number, vehicle_type, model, registered_at)
SELECT 
    gen_random_uuid(), 
    id, 
    'TN37GH3456', 
    'bike', 
    'Royal Enfield Classic 350', 
    now()
FROM users 
WHERE email = 'test@smarttoll.com'
ON CONFLICT (plate_number) DO UPDATE SET
    model = EXCLUDED.model,
    updated_at = now();

-- Car - Honda City (TN-38)
INSERT INTO vehicles (id, user_id, plate_number, vehicle_type, model, registered_at)
SELECT 
    gen_random_uuid(), 
    id, 
    'TN38IJ7890', 
    'car', 
    'Honda City VX CVT', 
    now()
FROM users 
WHERE email = 'test@smarttoll.com'
ON CONFLICT (plate_number) DO UPDATE SET
    model = EXCLUDED.model,
    updated_at = now();

-- =============================================
-- SAMPLE TRANSACTION HISTORY
-- =============================================

-- Add some sample recharge transaction
INSERT INTO transactions (id, user_id, amount, type, status, description, created_at)
SELECT 
    gen_random_uuid(),
    id,
    1000.00,
    'recharge',
    'completed',
    'Initial wallet recharge for testing',
    now()
FROM users 
WHERE email = 'test@smarttoll.com';

-- =============================================
-- SAMPLE NOTIFICATIONS
-- =============================================

-- Welcome notification
INSERT INTO notifications (id, user_id, type, title, message, priority, created_at)
SELECT 
    gen_random_uuid(),
    id,
    'system',
    'Welcome to Smart Toll!',
    'Your account has been created successfully. You have ₹1000 in your wallet to start using toll roads.',
    'medium',
    now()
FROM users 
WHERE email = 'test@smarttoll.com';

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

DO $$
DECLARE
    user_record RECORD;
    vehicle_count INTEGER;
    wallet_balance NUMERIC;
BEGIN
    -- Get user details
    SELECT * INTO user_record FROM users WHERE email = 'test@smarttoll.com';
    
    -- Get vehicle count
    SELECT COUNT(*) INTO vehicle_count FROM vehicles WHERE user_id = user_record.id;
    
    -- Get wallet balance
    SELECT balance INTO wallet_balance FROM wallets WHERE user_id = user_record.id;
    
    -- Display results
    RAISE NOTICE '=== TEST DATA CREATION SUMMARY ===';
    RAISE NOTICE 'User created: % (ID: %)', user_record.name, user_record.id;
    RAISE NOTICE 'Email: %', user_record.email;
    RAISE NOTICE 'Phone: %', user_record.phone;
    RAISE NOTICE 'Vehicles registered: %', vehicle_count;
    RAISE NOTICE 'Wallet balance: ₹%', wallet_balance;
    RAISE NOTICE '===================================';
END $$;

-- Display all created vehicles
SELECT 
    v.plate_number,
    v.vehicle_type,
    v.model,
    v.is_active,
    v.registered_at
FROM vehicles v
JOIN users u ON v.user_id = u.id
WHERE u.email = 'test@smarttoll.com'
ORDER BY v.vehicle_type, v.plate_number;