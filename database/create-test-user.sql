-- Create comprehensive test user for ESP32 Smart Toll System
-- Email: test@smarttoll.com, Password: password123

-- Step 1: Create test user (delete existing first to avoid conflicts)
DELETE FROM users WHERE email = 'test@smarttoll.com';

INSERT INTO users (name, email, phone, password, is_verified) VALUES
('Smart Toll Test User', 'test@smarttoll.com', '9842730737', '$2b$10$Oo7.I5qwu6f1UTST8mZzI.cvXuGq/dmaDSm6uZVhKDQP2YNpG9kr.', true);

-- Get the user ID for subsequent inserts
DO $$
DECLARE
    test_user_id INTEGER;
    wallet_id INTEGER;
    vehicle1_id INTEGER;
    vehicle2_id INTEGER;
    recharge1_id INTEGER;
    recharge2_id INTEGER;
BEGIN
    -- Get user ID
    SELECT id INTO test_user_id FROM users WHERE email = 'test@smarttoll.com';
    
    -- Step 2: Create wallet with initial balance (delete existing first)
    DELETE FROM wallets WHERE user_id = test_user_id;
    INSERT INTO wallets (user_id, balance) VALUES (test_user_id, 2500.00)
    RETURNING id INTO wallet_id;
    
    -- Step 3: Create multiple vehicles with ESP32 device IDs (delete existing vehicle numbers first)
    DELETE FROM vehicles WHERE vehicle_number IN ('TN01AB1234', 'TN02CD5678', 'TN03EF9012');
    DELETE FROM vehicles WHERE device_id IN ('ESP32_CAR_001', 'ESP32_BIKE_002', 'ESP32_BUS_003');
    INSERT INTO vehicles (user_id, vehicle_number, vehicle_type, device_id, is_active) VALUES
    (test_user_id, 'TN01AB1234', 'Car', 'ESP32_CAR_001', true),
    (test_user_id, 'TN02CD5678', 'Bike', 'ESP32_BIKE_002', true),
    (test_user_id, 'TN03EF9012', 'Bus', 'ESP32_BUS_003', false);
    
    -- Get vehicle IDs for transactions
    SELECT id INTO vehicle1_id FROM vehicles WHERE vehicle_number = 'TN01AB1234';
    SELECT id INTO vehicle2_id FROM vehicles WHERE vehicle_number = 'TN02CD5678';
    
    -- Step 4: Create recharge history (delete existing order IDs first)
    DELETE FROM recharges WHERE razorpay_order_id IN ('order_test001', 'order_test002', 'order_test003');
    INSERT INTO recharges (user_id, razorpay_order_id, razorpay_payment_id, amount, status) VALUES
    (test_user_id, 'order_test001', 'pay_test001', 1000.00, 'paid'),
    (test_user_id, 'order_test002', 'pay_test002', 1500.00, 'paid'),
    (test_user_id, 'order_test003', NULL, 500.00, 'failed');
    
    -- Step 5: Create sample ESP32 toll transactions (delete existing device transactions first)
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
    
    -- One failed transaction due to insufficient balance (simulated)
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

-- Display summary of created data
SELECT 
    'USER' as data_type,
    u.name,
    u.email,
    u.phone,
    CASE WHEN u.is_verified THEN 'Verified' ELSE 'Not Verified' END as status
FROM users u WHERE u.email = 'test@smarttoll.com'

UNION ALL

SELECT 
    'WALLET' as data_type,
    'Balance: ₹' || w.balance,
    'Created: ' || w.created_at::date,
    'Updated: ' || w.updated_at::date,
    'Active' as status
FROM wallets w 
JOIN users u ON w.user_id = u.id 
WHERE u.email = 'test@smarttoll.com'

UNION ALL

SELECT 
    'VEHICLES' as data_type,
    v.vehicle_number,
    v.vehicle_type,
    'Device: ' || COALESCE(v.device_id, 'None'),
    CASE WHEN v.is_active THEN 'Active' ELSE 'Inactive' END as status
FROM vehicles v 
JOIN users u ON v.user_id = u.id 
WHERE u.email = 'test@smarttoll.com'

UNION ALL

SELECT 
    'RECHARGES' as data_type,
    'Amount: ₹' || r.amount,
    'Order: ' || r.razorpay_order_id,
    'Payment: ' || COALESCE(r.razorpay_payment_id, 'None'),
    UPPER(r.status) as status
FROM recharges r 
JOIN users u ON r.user_id = u.id 
WHERE u.email = 'test@smarttoll.com'

UNION ALL

SELECT 
    'ESP32_TRANSACTIONS' as data_type,
    'Device: ' || ett.device_id,
    'Distance: ' || ett.total_distance_km || 'km',
    'Toll: ₹' || ett.toll_amount,
    UPPER(ett.status) as status
FROM esp32_toll_transactions ett 
JOIN users u ON ett.user_id = u.id 
WHERE u.email = 'test@smarttoll.com'
ORDER BY data_type, name;