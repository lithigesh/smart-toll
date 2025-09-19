-- SMART TOLL SYSTEM - SAMPLE DATA POPULATION
-- Run this AFTER schema.sql to populate the database with test data
-- This provides realistic data for testing the GPS toll system

-- =============================================
-- SAMPLE USERS
-- =============================================

INSERT INTO users (id, name, email, password_hash, phone, role) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'John Doe', 'john.doe@example.com', '$2b$10$hashedpassword1', '+1234567890', 'user'),
('550e8400-e29b-41d4-a716-446655440002', 'Jane Smith', 'jane.smith@example.com', '$2b$10$hashedpassword2', '+1234567891', 'user'),
('550e8400-e29b-41d4-a716-446655440003', 'Admin User', 'admin@smarttoll.com', '$2b$10$hashedpassword3', '+1234567892', 'admin'),
('550e8400-e29b-41d4-a716-446655440004', 'Bob Johnson', 'bob.johnson@example.com', '$2b$10$hashedpassword4', '+1234567893', 'user'),
('550e8400-e29b-41d4-a716-446655440005', 'Alice Brown', 'alice.brown@example.com', '$2b$10$hashedpassword5', '+1234567894', 'user');

-- =============================================
-- SAMPLE WALLETS
-- =============================================

INSERT INTO wallets (id, user_id, balance) VALUES 
('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 150.75),
('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 89.25),
('650e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 500.00),
('650e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', 25.50),
('650e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', 200.00);

-- =============================================
-- SAMPLE VEHICLES
-- =============================================

INSERT INTO vehicles (id, user_id, license_plate, vehicle_type, model) VALUES 
('750e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'ABC123', 'car', 'Honda Civic'),
('750e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'XYZ789', 'truck', 'Ford F-150'),
('750e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'ADM001', 'car', 'Tesla Model S'),
('750e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', 'DEF456', 'motorcycle', 'Yamaha R1'),
('750e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440005', 'GHI789', 'car', 'Toyota Camry');

-- =============================================
-- SAMPLE TOLL ROAD ZONES (Using realistic coordinates)
-- =============================================

-- Highway Toll Zone (Rectangle around major highway)
INSERT INTO toll_road_zones (id, name, description, zone_polygon, rate_per_km, minimum_fare, tax_percentage, is_active) VALUES 
(
    '850e8400-e29b-41d4-a716-446655440001',
    'Highway 101 Toll Zone',
    'Main highway toll zone covering downtown to airport route',
    ST_GeomFromText('POLYGON((-122.4194 37.7749, -122.4094 37.7749, -122.4094 37.7849, -122.4194 37.7849, -122.4194 37.7749))', 4326),
    2.50,
    5.00,
    8.50,
    true
);

-- City Center Toll Zone (Smaller downtown area)
INSERT INTO toll_road_zones (id, name, description, zone_polygon, rate_per_km, minimum_fare, tax_percentage, is_active) VALUES 
(
    '850e8400-e29b-41d4-a716-446655440002',
    'Downtown Financial District',
    'High-traffic downtown business district with premium pricing',
    ST_GeomFromText('POLYGON((-122.4094 37.7849, -122.3994 37.7849, -122.3994 37.7949, -122.4094 37.7949, -122.4094 37.7849))', 4326),
    4.00,
    8.00,
    12.00,
    true
);

-- Airport Express Zone
INSERT INTO toll_road_zones (id, name, description, zone_polygon, rate_per_km, minimum_fare, tax_percentage, is_active) VALUES 
(
    '850e8400-e29b-41d4-a716-446655440003',
    'Airport Express Lane',
    'Fast lane to airport with express pricing',
    ST_GeomFromText('POLYGON((-122.3994 37.7949, -122.3894 37.7949, -122.3894 37.8049, -122.3994 37.8049, -122.3994 37.7949))', 4326),
    3.25,
    6.50,
    10.00,
    true
);

-- =============================================
-- SAMPLE GPS LOGS (Realistic movement patterns)
-- =============================================

-- Vehicle 1 (ABC123) movement through Highway 101
INSERT INTO gps_logs (vehicle_id, latitude, longitude, location, speed, heading, accuracy, logged_at) VALUES 
('750e8400-e29b-41d4-a716-446655440001', 37.7749, -122.4194, ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326), 65.5, 45.0, 3.2, NOW() - INTERVAL '2 hours'),
('750e8400-e29b-41d4-a716-446655440001', 37.7759, -122.4184, ST_SetSRID(ST_MakePoint(-122.4184, 37.7759), 4326), 68.2, 46.5, 2.8, NOW() - INTERVAL '1 hour 58 minutes'),
('750e8400-e29b-41d4-a716-446655440001', 37.7769, -122.4174, ST_SetSRID(ST_MakePoint(-122.4174, 37.7769), 4326), 70.1, 47.0, 2.5, NOW() - INTERVAL '1 hour 56 minutes'),
('750e8400-e29b-41d4-a716-446655440001', 37.7779, -122.4164, ST_SetSRID(ST_MakePoint(-122.4164, 37.7779), 4326), 72.0, 47.5, 3.0, NOW() - INTERVAL '1 hour 54 minutes'),
('750e8400-e29b-41d4-a716-446655440001', 37.7789, -122.4154, ST_SetSRID(ST_MakePoint(-122.4154, 37.7789), 4326), 69.8, 48.0, 2.9, NOW() - INTERVAL '1 hour 52 minutes');

-- Vehicle 2 (XYZ789) movement through Downtown
INSERT INTO gps_logs (vehicle_id, latitude, longitude, location, speed, heading, accuracy, logged_at) VALUES 
('750e8400-e29b-41d4-a716-446655440002', 37.7849, -122.4094, ST_SetSRID(ST_MakePoint(-122.4094, 37.7849), 4326), 25.3, 90.0, 4.1, NOW() - INTERVAL '1 hour 30 minutes'),
('750e8400-e29b-41d4-a716-446655440002', 37.7859, -122.4084, ST_SetSRID(ST_MakePoint(-122.4084, 37.7859), 4326), 22.1, 92.5, 3.8, NOW() - INTERVAL '1 hour 28 minutes'),
('750e8400-e29b-41d4-a716-446655440002', 37.7869, -122.4074, ST_SetSRID(ST_MakePoint(-122.4074, 37.7869), 4326), 28.7, 95.0, 3.5, NOW() - INTERVAL '1 hour 26 minutes'),
('750e8400-e29b-41d4-a716-446655440002', 37.7879, -122.4064, ST_SetSRID(ST_MakePoint(-122.4064, 37.7879), 4326), 31.2, 96.5, 4.0, NOW() - INTERVAL '1 hour 24 minutes'),
('750e8400-e29b-41d4-a716-446655440002', 37.7889, -122.4054, ST_SetSRID(ST_MakePoint(-122.4054, 37.7889), 4326), 26.8, 98.0, 3.7, NOW() - INTERVAL '1 hour 22 minutes');

-- =============================================
-- SAMPLE VEHICLE TOLL HISTORY (Active and completed trips)
-- =============================================

-- Completed toll trip for Vehicle 1
INSERT INTO vehicle_toll_history (id, vehicle_id, toll_road_zone_id, entry_lat, entry_lon, exit_lat, exit_lon, distance_km, fare_amount, status, entry_time, exit_time, notes) VALUES 
(
    '950e8400-e29b-41d4-a716-446655440001',
    '750e8400-e29b-41d4-a716-446655440001',
    '850e8400-e29b-41d4-a716-446655440001',
    37.7749, -122.4194,
    37.7789, -122.4154,
    5.2,
    13.00,
    'completed',
    NOW() - INTERVAL '2 hours',
    NOW() - INTERVAL '1 hour 50 minutes',
    'Regular highway usage'
);

-- Active toll trip for Vehicle 2 (currently in zone)
INSERT INTO vehicle_toll_history (id, vehicle_id, toll_road_zone_id, entry_lat, entry_lon, exit_lat, exit_lon, distance_km, fare_amount, status, entry_time, exit_time, notes) VALUES 
(
    '950e8400-e29b-41d4-a716-446655440002',
    '750e8400-e29b-41d4-a716-446655440002',
    '850e8400-e29b-41d4-a716-446655440002',
    37.7849, -122.4094,
    NULL, NULL,
    NULL,
    NULL,
    'active',
    NOW() - INTERVAL '30 minutes',
    NULL,
    'Currently in downtown zone'
);

-- =============================================
-- SAMPLE TRANSACTIONS
-- =============================================

-- Wallet recharge transactions
INSERT INTO transactions (id, user_id, vehicle_id, amount, type, status, reference_id, description, metadata) VALUES 
('a50e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', NULL, 100.00, 'recharge', 'completed', 'rzp_test_1234567890', 'Wallet recharge via Razorpay', '{"payment_method": "card", "razorpay_order_id": "order_test123"}'::jsonb),
('a50e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', NULL, 50.00, 'recharge', 'completed', 'rzp_test_1234567891', 'Wallet recharge via Razorpay', '{"payment_method": "upi", "razorpay_order_id": "order_test124"}'::jsonb);

-- Toll charge transactions
INSERT INTO transactions (id, user_id, vehicle_id, amount, type, status, reference_id, description, metadata) VALUES 
('a50e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', 13.00, 'toll_charge', 'completed', '950e8400-e29b-41d4-a716-446655440001', 'Highway 101 toll charge', '{"distance_km": 5.2, "rate_per_km": 2.50, "zone_name": "Highway 101 Toll Zone"}'::jsonb),
('a50e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440002', 8.00, 'toll_charge_pending', 'pending', '950e8400-e29b-41d4-a716-446655440002', 'Downtown toll charge (pending exit)', 
 jsonb_build_object(
   'zone_name', 'Downtown Financial District',
   'entry_time', (NOW() - INTERVAL '30 minutes')::text
 ));

-- =============================================
-- SAMPLE NOTIFICATIONS
-- =============================================

INSERT INTO notifications (id, user_id, type, title, message, data, priority, is_read) VALUES 
('b50e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'toll_entry', 'Entered Toll Zone', 'You have entered Highway 101 Toll Zone. Toll charges will apply based on distance traveled.', '{"zone_name": "Highway 101 Toll Zone", "vehicle": "ABC123", "rate_per_km": 2.50}'::jsonb, 'medium', true),
('b50e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'toll_exit', 'Exited Toll Zone', 'You have exited Highway 101 Toll Zone. Total charge: $13.00 for 5.2 km traveled.', '{"zone_name": "Highway 101 Toll Zone", "vehicle": "ABC123", "amount": 13.00, "distance": 5.2}'::jsonb, 'medium', false),
('b50e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'toll_entry', 'Entered Toll Zone', 'You have entered Downtown Financial District. Premium rates apply in this zone.', '{"zone_name": "Downtown Financial District", "vehicle": "XYZ789", "rate_per_km": 4.00}'::jsonb, 'medium', false),
('b50e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'wallet_recharge', 'Wallet Recharged', 'Your wallet has been successfully recharged with $100.00. New balance: $150.75', '{"amount": 100.00, "new_balance": 150.75, "payment_method": "card"}'::jsonb, 'low', true),
('b50e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440004', 'low_balance', 'Low Wallet Balance', 'Your wallet balance is running low ($25.50). Please recharge to avoid service interruption.', '{"current_balance": 25.50, "recommended_recharge": 100.00}'::jsonb, 'high', false);

-- =============================================
-- SAMPLE RECHARGES (Razorpay transactions)
-- =============================================

INSERT INTO recharges (id, user_id, amount, razorpay_order_id, razorpay_payment_id, razorpay_signature, status) VALUES 
('c50e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 100.00, 'order_test123', 'pay_test456', 'signature_test789', 'paid'),
('c50e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 50.00, 'order_test124', 'pay_test457', 'signature_test790', 'paid'),
('c50e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 500.00, 'order_test125', 'pay_test458', 'signature_test791', 'paid'),
('c50e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440005', 200.00, 'order_test126', 'pay_test459', 'signature_test792', 'paid');

-- =============================================
-- DATA VALIDATION QUERIES
-- =============================================

-- Check data insertion
DO $$
BEGIN
    RAISE NOTICE 'Sample data population completed!';
    RAISE NOTICE 'Users created: %', (SELECT COUNT(*) FROM users);
    RAISE NOTICE 'Wallets created: %', (SELECT COUNT(*) FROM wallets);
    RAISE NOTICE 'Vehicles created: %', (SELECT COUNT(*) FROM vehicles);
    RAISE NOTICE 'Toll zones created: %', (SELECT COUNT(*) FROM toll_road_zones);
    RAISE NOTICE 'GPS logs created: %', (SELECT COUNT(*) FROM gps_logs);
    RAISE NOTICE 'Toll history records: %', (SELECT COUNT(*) FROM vehicle_toll_history);
    RAISE NOTICE 'Transactions created: %', (SELECT COUNT(*) FROM transactions);
    RAISE NOTICE 'Notifications created: %', (SELECT COUNT(*) FROM notifications);
    RAISE NOTICE 'Recharges created: %', (SELECT COUNT(*) FROM recharges);
END $$;

-- =============================================
-- TEST QUERIES TO VERIFY FUNCTIONALITY
-- =============================================

-- Test GPS position logging
SELECT * FROM log_gps_position(
    '750e8400-e29b-41d4-a716-446655440001',
    37.7800,
    -122.4150,
    45.5,
    180.0,
    2.5
);

-- Test distance calculation
SELECT calculate_point_distance(37.7749, -122.4194, 37.7789, -122.4154) as distance_km;

-- Test zone detection
SELECT * FROM find_zones_containing_point(37.7799, -122.4170);

-- Test vehicle distance calculation
SELECT calculate_vehicle_distance(
    '750e8400-e29b-41d4-a716-446655440001',
    NOW() - INTERVAL '3 hours',
    NOW()
) as total_distance_km;

-- Test toll charge processing
SELECT * FROM process_toll_charge(
    '950e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440001',
    15.50
);

RAISE NOTICE 'All test queries executed successfully! Your Smart Toll System is ready for use.';