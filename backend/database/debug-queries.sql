-- SMART TOLL SYSTEM - DEBUG AND TESTING UTILITIES
-- Comprehensive queries for debugging, testing, and monitoring the toll system
-- Use these queries to verify system operation and troubleshoot issues

-- =============================================
-- SYSTEM STATUS QUERIES
-- =============================================

-- Check overall system health
SELECT 
    'Users' as table_name, COUNT(*) as record_count 
FROM users
UNION ALL
SELECT 'Vehicles', COUNT(*) FROM vehicles
UNION ALL
SELECT 'Wallets', COUNT(*) FROM wallets
UNION ALL
SELECT 'Toll Zones', COUNT(*) FROM toll_road_zones WHERE is_active = true
UNION ALL
SELECT 'Toll Roads', COUNT(*) FROM toll_roads WHERE is_active = true
UNION ALL
SELECT 'Vehicle Type Rates', COUNT(*) FROM vehicle_type_rates
UNION ALL
SELECT 'GPS Logs', COUNT(*) FROM gps_logs
UNION ALL
SELECT 'Active Journeys', COUNT(*) FROM journeys WHERE status = 'active'
UNION ALL
SELECT 'Completed Journeys', COUNT(*) FROM journeys WHERE status = 'completed'
UNION ALL
SELECT 'Transactions', COUNT(*) FROM transactions
UNION ALL
SELECT 'Notifications', COUNT(*) FROM notifications;

-- Check PostGIS extension and spatial capabilities
SELECT 
    'PostGIS Version' as info_type,
    postgis_version() as value
UNION ALL
SELECT 
    'Spatial Reference System',
    'EPSG:4326 (WGS84)' as value;

-- =============================================
-- USER AND VEHICLE DEBUG QUERIES
-- =============================================

-- Get detailed user information including wallet and vehicles
CREATE OR REPLACE VIEW user_summary AS
SELECT 
    u.id as user_id,
    u.name,
    u.email,
    u.phone,
    u.role,
    w.balance as wallet_balance,
    COUNT(v.id) as vehicle_count,
    u.created_at,
    u.updated_at
FROM users u
LEFT JOIN wallets w ON u.id = w.user_id
LEFT JOIN vehicles v ON u.id = v.user_id AND v.is_active = true
GROUP BY u.id, u.name, u.email, u.phone, u.role, w.balance, u.created_at, u.updated_at;

-- Query: View all user summaries
-- SELECT * FROM user_summary ORDER BY created_at DESC;

-- Get vehicle details with owner information
CREATE OR REPLACE VIEW vehicle_details AS
SELECT 
    v.id as vehicle_id,
    v.plate_number,
    v.vehicle_type,
    v.model,
    v.is_active,
    u.name as owner_name,
    u.email as owner_email,
    w.balance as owner_wallet_balance,
    v.registered_at
FROM vehicles v
JOIN users u ON v.user_id = u.id
LEFT JOIN wallets w ON u.id = w.user_id
ORDER BY v.registered_at DESC;

-- Query: View all vehicle details
-- SELECT * FROM vehicle_details WHERE is_active = true;

-- =============================================
-- GPS AND LOCATION DEBUG QUERIES
-- =============================================

-- Get latest GPS logs for each vehicle
CREATE OR REPLACE VIEW latest_vehicle_positions AS
WITH latest_logs AS (
    SELECT 
        vehicle_id,
        MAX(logged_at) as last_logged_at
    FROM gps_logs
    GROUP BY vehicle_id
)
SELECT 
    v.plate_number,
    v.vehicle_type,
    gl.latitude,
    gl.longitude,
    ST_AsText(gl.location) as location_wkt,
    gl.speed,
    gl.heading,
    gl.logged_at,
    u.name as owner_name
FROM latest_logs ll
JOIN gps_logs gl ON ll.vehicle_id = gl.vehicle_id AND ll.last_logged_at = gl.logged_at
JOIN vehicles v ON gl.vehicle_id = v.id
JOIN users u ON v.user_id = u.id
ORDER BY gl.logged_at DESC;

-- Query: Check latest positions
-- SELECT * FROM latest_vehicle_positions;

-- Check which vehicles are currently in toll zones
CREATE OR REPLACE VIEW vehicles_in_zones AS
SELECT DISTINCT
    v.plate_number,
    v.vehicle_type,
    tz.name as zone_name,
    tr.name as road_name,
    gl.latitude,
    gl.longitude,
    gl.logged_at as last_seen,
    u.name as owner_name
FROM gps_logs gl
JOIN vehicles v ON gl.vehicle_id = v.id
JOIN users u ON v.user_id = u.id
JOIN toll_road_zones tz ON ST_Within(gl.location, tz.zone_polygon)
JOIN toll_roads tr ON tz.id = tr.zone_id
WHERE gl.id IN (
    -- Only get the latest GPS log for each vehicle
    SELECT DISTINCT ON (vehicle_id) id
    FROM gps_logs
    ORDER BY vehicle_id, logged_at DESC
)
AND tz.is_active = true
ORDER BY gl.logged_at DESC;

-- Query: See which vehicles are currently in zones
-- SELECT * FROM vehicles_in_zones;

-- =============================================
-- JOURNEY AND TOLL DEBUG QUERIES
-- =============================================

-- Get comprehensive journey details
CREATE OR REPLACE VIEW journey_summary AS
SELECT 
    j.id as journey_id,
    v.plate_number,
    v.vehicle_type,
    u.name as owner_name,
    tz.name as zone_name,
    tr.name as road_name,
    ST_Y(j.entry_point) as entry_lat,
    ST_X(j.entry_point) as entry_lon,
    j.entry_time,
    CASE 
        WHEN j.exit_point IS NOT NULL THEN ST_Y(j.exit_point)
        ELSE NULL 
    END as exit_lat,
    CASE 
        WHEN j.exit_point IS NOT NULL THEN ST_X(j.exit_point)
        ELSE NULL 
    END as exit_lon,
    j.exit_time,
    j.total_distance_km,
    j.calculated_fare,
    j.status,
    CASE 
        WHEN j.status = 'active' THEN EXTRACT(EPOCH FROM (now() - j.entry_time))/60
        ELSE EXTRACT(EPOCH FROM (j.exit_time - j.entry_time))/60
    END as duration_minutes
FROM journeys j
JOIN vehicles v ON j.vehicle_id = v.id
JOIN users u ON v.user_id = u.id
LEFT JOIN toll_road_zones tz ON j.zone_id = tz.id
LEFT JOIN toll_roads tr ON j.toll_road_id = tr.id
ORDER BY j.entry_time DESC;

-- Query: View all journeys
-- SELECT * FROM journey_summary LIMIT 20;

-- Get active journeys (vehicles currently in toll zones)
-- SELECT * FROM journey_summary WHERE status = 'active';

-- Get recent completed journeys
-- SELECT * FROM journey_summary WHERE status = 'completed' AND entry_time > now() - INTERVAL '24 hours';

-- =============================================
-- FINANCIAL DEBUG QUERIES
-- =============================================

-- Transaction summary by type
SELECT 
    type,
    status,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount,
    AVG(amount) as average_amount,
    MIN(created_at) as earliest_transaction,
    MAX(created_at) as latest_transaction
FROM transactions
GROUP BY type, status
ORDER BY type, status;

-- User wallet activity (last 50 transactions)
CREATE OR REPLACE FUNCTION get_user_wallet_activity(user_email TEXT)
RETURNS TABLE(
    transaction_date TIMESTAMPTZ,
    transaction_type TEXT,
    amount NUMERIC,
    description TEXT,
    vehicle_plate TEXT,
    balance_after NUMERIC
) AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Get user ID
    SELECT id INTO target_user_id FROM users WHERE email = user_email;
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found: %', user_email;
    END IF;
    
    -- Return wallet activity with running balance calculation
    RETURN QUERY
    WITH wallet_transactions AS (
        SELECT 
            t.created_at,
            t.type,
            t.amount,
            t.description,
            v.plate_number,
            SUM(CASE WHEN t.type IN ('credit', 'recharge') THEN t.amount ELSE -t.amount END) 
                OVER (ORDER BY t.created_at ROWS UNBOUNDED PRECEDING) as running_balance
        FROM transactions t
        LEFT JOIN vehicles v ON t.vehicle_id = v.id
        WHERE t.user_id = target_user_id
        AND t.status = 'completed'
        ORDER BY t.created_at DESC
        LIMIT 50
    )
    SELECT 
        wt.created_at,
        wt.type,
        wt.amount,
        wt.description,
        wt.plate_number,
        wt.running_balance
    FROM wallet_transactions wt
    ORDER BY wt.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Query: Get wallet activity for test user
-- SELECT * FROM get_user_wallet_activity('test@smarttoll.com');

-- =============================================
-- ZONE AND RATE TESTING QUERIES
-- =============================================

-- Test zone membership for specific coordinates
CREATE OR REPLACE FUNCTION test_zone_membership(test_lat NUMERIC, test_lon NUMERIC)
RETURNS TABLE(
    zone_name TEXT,
    road_name TEXT,
    vehicle_type TEXT,
    rate_per_km NUMERIC,
    minimum_fare NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tz.name as zone_name,
        tr.name as road_name,
        vtr.vehicle_type,
        vtr.rate_per_km,
        tr.minimum_fare
    FROM toll_road_zones tz
    JOIN toll_roads tr ON tz.id = tr.zone_id
    LEFT JOIN vehicle_type_rates vtr ON tr.id = vtr.toll_road_id
    WHERE ST_Within(
        ST_SetSRID(ST_MakePoint(test_lon, test_lat), 4326)::geometry,
        tz.zone_polygon
    )
    ORDER BY tz.name, vtr.vehicle_type;
END;
$$ LANGUAGE plpgsql;

-- Query: Test if coordinates are in any toll zone
-- SELECT * FROM test_zone_membership(11.0100, 76.9200);

-- View all zones with their rate structures
SELECT 
    tz.name as zone_name,
    tr.name as road_name,
    tr.rate_per_km as base_rate,
    tr.minimum_fare,
    COALESCE(
        STRING_AGG(
            vtr.vehicle_type || ':₹' || vtr.rate_per_km::TEXT, 
            ', ' ORDER BY vtr.vehicle_type
        ), 
        'No specific rates configured'
    ) as vehicle_rates
FROM toll_road_zones tz
JOIN toll_roads tr ON tz.id = tr.zone_id
LEFT JOIN vehicle_type_rates vtr ON tr.id = vtr.toll_road_id
WHERE tz.is_active = true
GROUP BY tz.name, tr.name, tr.rate_per_km, tr.minimum_fare
ORDER BY tz.name;

-- =============================================
-- PERFORMANCE AND MONITORING QUERIES
-- =============================================

-- Check GPS log frequency per vehicle (logs per hour)
SELECT 
    v.plate_number,
    COUNT(*) as total_logs,
    MIN(gl.logged_at) as first_log,
    MAX(gl.logged_at) as last_log,
    EXTRACT(EPOCH FROM (MAX(gl.logged_at) - MIN(gl.logged_at)))/3600 as duration_hours,
    ROUND(COUNT(*) / GREATEST(EXTRACT(EPOCH FROM (MAX(gl.logged_at) - MIN(gl.logged_at)))/3600, 1), 2) as logs_per_hour
FROM gps_logs gl
JOIN vehicles v ON gl.vehicle_id = v.id
WHERE gl.logged_at > now() - INTERVAL '24 hours'
GROUP BY v.id, v.plate_number
ORDER BY logs_per_hour DESC;

-- Check database table sizes
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation,
    most_common_vals
FROM pg_stats 
WHERE schemaname = 'public' 
AND tablename IN ('gps_logs', 'journeys', 'transactions', 'toll_road_zones')
ORDER BY tablename, attname;

-- =============================================
-- TESTING SIMULATION HELPERS
-- =============================================

-- Function to simulate GPS points for testing
CREATE OR REPLACE FUNCTION simulate_gps_journey(
    p_vehicle_id UUID,
    start_lat NUMERIC,
    start_lon NUMERIC,
    end_lat NUMERIC,
    end_lon NUMERIC,
    num_points INTEGER DEFAULT 10,
    speed_kmh NUMERIC DEFAULT 50
)
RETURNS INTEGER AS $$
DECLARE
    i INTEGER;
    current_lat NUMERIC;
    current_lon NUMERIC;
    lat_increment NUMERIC;
    lon_increment NUMERIC;
    time_increment INTERVAL;
    current_time TIMESTAMPTZ;
    inserted_count INTEGER := 0;
BEGIN
    -- Calculate increments
    lat_increment := (end_lat - start_lat) / (num_points - 1);
    lon_increment := (end_lon - start_lon) / (num_points - 1);
    
    -- Assume constant speed, calculate time between points
    time_increment := INTERVAL '1 minute' * (60.0 / speed_kmh);
    current_time := now();
    
    -- Insert GPS points
    FOR i IN 0..(num_points - 1) LOOP
        current_lat := start_lat + (lat_increment * i);
        current_lon := start_lon + (lon_increment * i);
        
        INSERT INTO gps_logs (vehicle_id, latitude, longitude, location, speed, logged_at)
        VALUES (
            p_vehicle_id,
            current_lat,
            current_lon,
            ST_SetSRID(ST_MakePoint(current_lon, current_lat), 4326),
            speed_kmh,
            current_time + (time_increment * i)
        );
        
        inserted_count := inserted_count + 1;
    END LOOP;
    
    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clear test data
CREATE OR REPLACE FUNCTION clear_test_data()
RETURNS TEXT AS $$
BEGIN
    DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE email = 'test@smarttoll.com');
    DELETE FROM transactions WHERE user_id IN (SELECT id FROM users WHERE email = 'test@smarttoll.com');
    DELETE FROM journeys WHERE vehicle_id IN (SELECT id FROM vehicles WHERE user_id IN (SELECT id FROM users WHERE email = 'test@smarttoll.com'));
    DELETE FROM gps_logs WHERE vehicle_id IN (SELECT id FROM vehicles WHERE user_id IN (SELECT id FROM users WHERE email = 'test@smarttoll.com'));
    
    -- Reset wallet balance
    UPDATE wallets SET balance = 1000.00, updated_at = now() 
    WHERE user_id IN (SELECT id FROM users WHERE email = 'test@smarttoll.com');
    
    RETURN 'Test data cleared and wallet reset to ₹1000';
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- EXAMPLE USAGE COMMANDS
-- =============================================

/*
-- 1. Check system status
SELECT * FROM user_summary;
SELECT * FROM vehicle_details;
SELECT * FROM latest_vehicle_positions;

-- 2. Test zone membership
SELECT * FROM test_zone_membership(11.0100, 76.9200);

-- 3. Simulate a test journey (replace with actual vehicle UUID)
SELECT simulate_gps_journey(
    (SELECT id FROM vehicles WHERE plate_number = 'TN37AB1234'),
    10.9950, 76.8900,  -- Start coordinates (outside zone)
    11.0150, 76.9100,  -- End coordinates (inside then outside zone)
    20,                -- 20 GPS points
    40                 -- 40 km/h speed
);

-- 4. Check journey results
SELECT * FROM journey_summary WHERE entry_time > now() - INTERVAL '1 hour';

-- 5. Check wallet activity
SELECT * FROM get_user_wallet_activity('test@smarttoll.com');

-- 6. Clear test data when needed
SELECT clear_test_data();
*/

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '=== DEBUG UTILITIES SETUP COMPLETE ===';
    RAISE NOTICE 'Available Views:';
    RAISE NOTICE '  - user_summary: User details with wallet and vehicle counts';
    RAISE NOTICE '  - vehicle_details: Vehicle information with owner details';  
    RAISE NOTICE '  - latest_vehicle_positions: Current GPS positions';
    RAISE NOTICE '  - vehicles_in_zones: Vehicles currently in toll zones';
    RAISE NOTICE '  - journey_summary: Detailed journey information';
    RAISE NOTICE '';
    RAISE NOTICE 'Available Functions:';
    RAISE NOTICE '  - test_zone_membership(lat, lon): Test coordinates against zones';
    RAISE NOTICE '  - get_user_wallet_activity(email): Get user transaction history';
    RAISE NOTICE '  - simulate_gps_journey(...): Generate test GPS data';
    RAISE NOTICE '  - clear_test_data(): Reset test user data';
    RAISE NOTICE '';
    RAISE NOTICE 'Use the commented queries at the bottom of this file for testing!';
    RAISE NOTICE '=========================================';
END $$;