-- SMART TOLL SYSTEM - DISTANCE CALCULATION & FARE PROCESSING
-- GPS-based entry/exit detection and automated fare computation
-- Contains all the core logic for distance-based toll billing

-- =============================================
-- ZONE ENTRY/EXIT DETECTION FUNCTIONS
-- =============================================

-- Function to detect if a GPS point is within any toll zone
CREATE OR REPLACE FUNCTION detect_zone_membership(
    input_lat NUMERIC,
    input_lon NUMERIC
) RETURNS TABLE(
    zone_id UUID,
    zone_name TEXT,
    toll_road_id UUID,
    road_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tz.id AS zone_id,
        tz.name AS zone_name,
        tr.id AS toll_road_id,
        tr.name AS road_name
    FROM toll_road_zones tz
    JOIN toll_roads tr ON tz.id = tr.zone_id
    WHERE ST_Within(
        ST_SetSRID(ST_MakePoint(input_lon, input_lat), 4326)::geometry,
        tz.zone_polygon
    )
    AND tz.is_active = true
    AND tr.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to check if vehicle has entered a new zone (was outside, now inside)
CREATE OR REPLACE FUNCTION check_zone_entry(
    p_vehicle_id UUID,
    p_lat NUMERIC,
    p_lon NUMERIC,
    p_logged_at TIMESTAMPTZ DEFAULT now()
) RETURNS TABLE(
    entered_zone_id UUID,
    entered_road_id UUID,
    zone_name TEXT,
    road_name TEXT
) AS $$
DECLARE
    current_zones UUID[];
    previous_zones UUID[];
    new_zones UUID[];
    zone_rec RECORD;
BEGIN
    -- Get current zones for this GPS point
    SELECT ARRAY_AGG(zone_id) INTO current_zones
    FROM detect_zone_membership(p_lat, p_lon);
    
    -- Get zones from the most recent GPS log (previous position)
    SELECT ARRAY_AGG(DISTINCT tz.id) INTO previous_zones
    FROM gps_logs gl
    JOIN toll_road_zones tz ON ST_Within(gl.location, tz.zone_polygon)
    WHERE gl.vehicle_id = p_vehicle_id
    AND gl.logged_at < p_logged_at
    ORDER BY gl.logged_at DESC
    LIMIT 1;
    
    -- Handle null cases
    current_zones := COALESCE(current_zones, ARRAY[]::UUID[]);
    previous_zones := COALESCE(previous_zones, ARRAY[]::UUID[]);
    
    -- Find zones that are in current but not in previous (new entries)
    SELECT ARRAY_AGG(zone) INTO new_zones
    FROM unnest(current_zones) AS zone
    WHERE zone NOT IN (SELECT unnest(previous_zones));
    
    -- Return details for each newly entered zone
    FOR zone_rec IN
        SELECT 
            tz.id AS zone_id,
            tr.id AS road_id,
            tz.name AS zone_name,
            tr.name AS road_name
        FROM unnest(COALESCE(new_zones, ARRAY[]::UUID[])) AS zid
        JOIN toll_road_zones tz ON tz.id = zid
        JOIN toll_roads tr ON tr.zone_id = tz.id
    LOOP
        entered_zone_id := zone_rec.zone_id;
        entered_road_id := zone_rec.road_id;
        zone_name := zone_rec.zone_name;
        road_name := zone_rec.road_name;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to check if vehicle has exited any zones (was inside, now outside)
CREATE OR REPLACE FUNCTION check_zone_exit(
    p_vehicle_id UUID,
    p_lat NUMERIC,
    p_lon NUMERIC,
    p_logged_at TIMESTAMPTZ DEFAULT now()
) RETURNS TABLE(
    exited_zone_id UUID,
    exited_road_id UUID,
    zone_name TEXT,
    road_name TEXT
) AS $$
DECLARE
    current_zones UUID[];
    previous_zones UUID[];
    exited_zones UUID[];
    zone_rec RECORD;
BEGIN
    -- Get current zones for this GPS point
    SELECT ARRAY_AGG(zone_id) INTO current_zones
    FROM detect_zone_membership(p_lat, p_lon);
    
    -- Get zones from the most recent GPS log (previous position)
    SELECT ARRAY_AGG(DISTINCT tz.id) INTO previous_zones
    FROM gps_logs gl
    JOIN toll_road_zones tz ON ST_Within(gl.location, tz.zone_polygon)
    WHERE gl.vehicle_id = p_vehicle_id
    AND gl.logged_at < p_logged_at
    ORDER BY gl.logged_at DESC
    LIMIT 1;
    
    -- Handle null cases
    current_zones := COALESCE(current_zones, ARRAY[]::UUID[]);
    previous_zones := COALESCE(previous_zones, ARRAY[]::UUID[]);
    
    -- Find zones that are in previous but not in current (exits)
    SELECT ARRAY_AGG(zone) INTO exited_zones
    FROM unnest(previous_zones) AS zone
    WHERE zone NOT IN (SELECT unnest(current_zones));
    
    -- Return details for each exited zone
    FOR zone_rec IN
        SELECT 
            tz.id AS zone_id,
            tr.id AS road_id,
            tz.name AS zone_name,
            tr.name AS road_name
        FROM unnest(COALESCE(exited_zones, ARRAY[]::UUID[])) AS zid
        JOIN toll_road_zones tz ON tz.id = zid
        JOIN toll_roads tr ON tr.zone_id = tz.id
    LOOP
        exited_zone_id := zone_rec.zone_id;
        exited_road_id := zone_rec.road_id;
        zone_name := zone_rec.zone_name;
        road_name := zone_rec.road_name;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- DISTANCE CALCULATION FUNCTIONS
-- =============================================

-- Calculate straight-line distance between two GPS points (simple method)
CREATE OR REPLACE FUNCTION calculate_straight_distance(
    entry_lat NUMERIC,
    entry_lon NUMERIC,
    exit_lat NUMERIC,
    exit_lon NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
    distance_meters NUMERIC;
    distance_km NUMERIC;
BEGIN
    distance_meters := ST_Distance(
        ST_SetSRID(ST_MakePoint(entry_lon, entry_lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(exit_lon, exit_lat), 4326)::geography
    );
    
    distance_km := ROUND(distance_meters / 1000.0, 3);
    RETURN distance_km;
END;
$$ LANGUAGE plpgsql;

-- Calculate path distance using GPS logs between entry and exit times (accurate method)
CREATE OR REPLACE FUNCTION calculate_path_distance(
    p_vehicle_id UUID,
    p_entry_time TIMESTAMPTZ,
    p_exit_time TIMESTAMPTZ
) RETURNS NUMERIC AS $$
DECLARE
    distance_km NUMERIC := 0;
BEGIN
    -- Sum distances between consecutive GPS points during the journey
    WITH points AS (
        SELECT 
            location,
            logged_at,
            LAG(location) OVER (ORDER BY logged_at) as prev_location
        FROM gps_logs
        WHERE vehicle_id = p_vehicle_id
        AND logged_at BETWEEN p_entry_time AND p_exit_time
        ORDER BY logged_at
    )
    SELECT 
        COALESCE(SUM(ST_Distance(prev_location::geography, location::geography)) / 1000.0, 0)
    INTO distance_km
    FROM points
    WHERE prev_location IS NOT NULL;
    
    RETURN ROUND(distance_km, 3);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FARE CALCULATION FUNCTIONS
-- =============================================

-- Get rate per km for a specific vehicle type and toll road
CREATE OR REPLACE FUNCTION get_vehicle_rate(
    p_toll_road_id UUID,
    p_vehicle_type TEXT
) RETURNS NUMERIC AS $$
DECLARE
    rate_per_km NUMERIC;
    fallback_rate NUMERIC;
BEGIN
    -- Try to get specific vehicle type rate
    SELECT vtr.rate_per_km INTO rate_per_km
    FROM vehicle_type_rates vtr
    WHERE vtr.toll_road_id = p_toll_road_id
    AND vtr.vehicle_type = p_vehicle_type;
    
    -- If no specific rate found, use the toll road's default rate
    IF rate_per_km IS NULL THEN
        SELECT tr.rate_per_km INTO fallback_rate
        FROM toll_roads tr
        WHERE tr.id = p_toll_road_id;
        
        rate_per_km := fallback_rate;
    END IF;
    
    RETURN COALESCE(rate_per_km, 5.00); -- Default fallback rate
END;
$$ LANGUAGE plpgsql;

-- Calculate total fare including minimum fare check
CREATE OR REPLACE FUNCTION calculate_fare(
    p_distance_km NUMERIC,
    p_toll_road_id UUID,
    p_vehicle_type TEXT
) RETURNS NUMERIC AS $$
DECLARE
    rate_per_km NUMERIC;
    calculated_fare NUMERIC;
    minimum_fare NUMERIC;
    final_fare NUMERIC;
BEGIN
    -- Get rate for this vehicle type
    rate_per_km := get_vehicle_rate(p_toll_road_id, p_vehicle_type);
    
    -- Calculate fare based on distance
    calculated_fare := p_distance_km * rate_per_km;
    
    -- Get minimum fare for this road
    SELECT tr.minimum_fare INTO minimum_fare
    FROM toll_roads tr
    WHERE tr.id = p_toll_road_id;
    
    minimum_fare := COALESCE(minimum_fare, 5.00);
    
    -- Apply minimum fare rule
    final_fare := GREATEST(calculated_fare, minimum_fare);
    
    RETURN ROUND(final_fare, 2);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- AUTOMATED JOURNEY PROCESSING
-- =============================================

-- Create journey record when vehicle enters a toll zone
CREATE OR REPLACE FUNCTION create_journey_entry(
    p_vehicle_id UUID,
    p_toll_road_id UUID,
    p_zone_id UUID,
    p_lat NUMERIC,
    p_lon NUMERIC,
    p_entry_time TIMESTAMPTZ DEFAULT now()
) RETURNS UUID AS $$
DECLARE
    journey_id UUID;
BEGIN
    INSERT INTO journeys (
        id,
        vehicle_id,
        toll_road_id,
        zone_id,
        entry_point,
        entry_time,
        status
    ) VALUES (
        gen_random_uuid(),
        p_vehicle_id,
        p_toll_road_id,
        p_zone_id,
        ST_SetSRID(ST_MakePoint(p_lon, p_lat), 4326),
        p_entry_time,
        'active'
    ) RETURNING id INTO journey_id;
    
    RETURN journey_id;
END;
$$ LANGUAGE plpgsql;

-- Complete journey and process toll payment
CREATE OR REPLACE FUNCTION complete_journey_exit(
    p_journey_id UUID,
    p_exit_lat NUMERIC,
    p_exit_lon NUMERIC,
    p_exit_time TIMESTAMPTZ DEFAULT now(),
    p_use_path_distance BOOLEAN DEFAULT false
) RETURNS RECORD AS $$
DECLARE
    journey_rec RECORD;
    vehicle_rec RECORD;
    user_rec RECORD;
    wallet_rec RECORD;
    distance_km NUMERIC;
    calculated_fare NUMERIC;
    result_record RECORD;
    transaction_id UUID;
    notification_id UUID;
BEGIN
    -- Get journey details
    SELECT * INTO journey_rec
    FROM journeys
    WHERE id = p_journey_id AND status = 'active';
    
    IF journey_rec IS NULL THEN
        RAISE EXCEPTION 'Journey not found or already completed: %', p_journey_id;
    END IF;
    
    -- Get vehicle and user details
    SELECT * INTO vehicle_rec FROM vehicles WHERE id = journey_rec.vehicle_id;
    SELECT * INTO user_rec FROM users WHERE id = vehicle_rec.user_id;
    SELECT * INTO wallet_rec FROM wallets WHERE user_id = user_rec.id;
    
    -- Calculate distance
    IF p_use_path_distance THEN
        distance_km := calculate_path_distance(
            journey_rec.vehicle_id,
            journey_rec.entry_time,
            p_exit_time
        );
    ELSE
        distance_km := calculate_straight_distance(
            ST_Y(journey_rec.entry_point),
            ST_X(journey_rec.entry_point),
            p_exit_lat,
            p_exit_lon
        );
    END IF;
    
    -- Calculate fare
    calculated_fare := calculate_fare(
        distance_km,
        journey_rec.toll_road_id,
        vehicle_rec.vehicle_type
    );
    
    -- Check wallet balance
    IF wallet_rec.balance < calculated_fare THEN
        -- Update journey with exit info but mark as incomplete due to insufficient balance
        UPDATE journeys
        SET 
            exit_point = ST_SetSRID(ST_MakePoint(p_exit_lon, p_exit_lat), 4326),
            exit_time = p_exit_time,
            total_distance_km = distance_km,
            calculated_fare = calculated_fare,
            status = 'completed',
            updated_at = now()
        WHERE id = p_journey_id;
        
        -- Create failed transaction
        INSERT INTO transactions (id, user_id, vehicle_id, journey_id, amount, type, status, description)
        VALUES (
            gen_random_uuid(),
            user_rec.id,
            vehicle_rec.id,
            p_journey_id,
            calculated_fare,
            'debit',
            'failed',
            format('Toll payment failed - Insufficient balance. Distance: %s km, Fare: ₹%s', distance_km, calculated_fare)
        ) RETURNING id INTO transaction_id;
        
        -- Create insufficient balance notification
        INSERT INTO notifications (id, user_id, type, title, message, priority)
        VALUES (
            gen_random_uuid(),
            user_rec.id,
            'insufficient_balance',
            'Toll Payment Failed',
            format('Insufficient wallet balance for toll payment. Required: ₹%s, Available: ₹%s', calculated_fare, wallet_rec.balance),
            'high'
        ) RETURNING id INTO notification_id;
        
        RAISE EXCEPTION 'Insufficient wallet balance. Required: ₹%, Available: ₹%', calculated_fare, wallet_rec.balance;
    END IF;
    
    -- Begin atomic transaction for successful payment
    BEGIN
        -- Update journey with exit information
        UPDATE journeys
        SET 
            exit_point = ST_SetSRID(ST_MakePoint(p_exit_lon, p_exit_lat), 4326),
            exit_time = p_exit_time,
            total_distance_km = distance_km,
            calculated_fare = calculated_fare,
            status = 'completed',
            updated_at = now()
        WHERE id = p_journey_id;
        
        -- Deduct from wallet
        UPDATE wallets
        SET 
            balance = balance - calculated_fare,
            updated_at = now()
        WHERE user_id = user_rec.id;
        
        -- Create transaction record
        INSERT INTO transactions (id, user_id, vehicle_id, journey_id, amount, type, status, description)
        VALUES (
            gen_random_uuid(),
            user_rec.id,
            vehicle_rec.id,
            p_journey_id,
            calculated_fare,
            'debit',
            'completed',
            format('Distance-based toll: %s km × ₹%s per km = ₹%s', 
                   distance_km, 
                   get_vehicle_rate(journey_rec.toll_road_id, vehicle_rec.vehicle_type),
                   calculated_fare)
        ) RETURNING id INTO transaction_id;
        
        -- Create success notification
        INSERT INTO notifications (id, user_id, type, title, message, priority)
        VALUES (
            gen_random_uuid(),
            user_rec.id,
            'toll_deducted',
            'Toll Payment Successful',
            format('₹%s deducted for %s km journey. Remaining balance: ₹%s', 
                   calculated_fare, 
                   distance_km, 
                   (wallet_rec.balance - calculated_fare)),
            'medium'
        ) RETURNING id INTO notification_id;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Transaction failed: %', SQLERRM;
    END;
    
    -- Prepare result
    SELECT 
        p_journey_id as journey_id,
        distance_km as distance_km,
        calculated_fare as fare_amount,
        transaction_id as transaction_id,
        notification_id as notification_id,
        'success' as status
    INTO result_record;
    
    RETURN result_record;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- AUTOMATED GPS PROCESSING TRIGGER
-- =============================================

-- Function to automatically process zone entry/exit on GPS insert
CREATE OR REPLACE FUNCTION process_gps_zone_events()
RETURNS TRIGGER AS $$
DECLARE
    entry_record RECORD;
    exit_record RECORD;
    journey_id UUID;
    exit_result RECORD;
BEGIN
    -- Check for zone entries
    FOR entry_record IN
        SELECT * FROM check_zone_entry(NEW.vehicle_id, NEW.latitude, NEW.longitude, NEW.logged_at)
    LOOP
        -- Create journey for entry
        journey_id := create_journey_entry(
            NEW.vehicle_id,
            entry_record.entered_road_id,
            entry_record.entered_zone_id,
            NEW.latitude,
            NEW.longitude,
            NEW.logged_at
        );
        
        -- Log entry event
        RAISE NOTICE 'Vehicle % entered zone % (journey %)', NEW.vehicle_id, entry_record.zone_name, journey_id;
    END LOOP;
    
    -- Check for zone exits
    FOR exit_record IN
        SELECT * FROM check_zone_exit(NEW.vehicle_id, NEW.latitude, NEW.longitude, NEW.logged_at)
    LOOP
        -- Find and complete active journey for this zone
        SELECT id INTO journey_id
        FROM journeys
        WHERE vehicle_id = NEW.vehicle_id
        AND zone_id = exit_record.exited_zone_id
        AND status = 'active'
        ORDER BY entry_time DESC
        LIMIT 1;
        
        IF journey_id IS NOT NULL THEN
            -- Complete the journey and process payment
            BEGIN
                SELECT * INTO exit_result
                FROM complete_journey_exit(
                    journey_id,
                    NEW.latitude,
                    NEW.longitude,
                    NEW.logged_at,
                    true -- Use path distance calculation
                );
                
                RAISE NOTICE 'Vehicle % exited zone %. Distance: % km, Fare: ₹%',
                    NEW.vehicle_id, 
                    exit_record.zone_name,
                    exit_result.distance_km,
                    exit_result.fare_amount;
                    
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Failed to complete journey %: %', journey_id, SQLERRM;
            END;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic processing (OPTIONAL - can be disabled for manual control)
-- Uncomment the lines below to enable automatic processing
/*
DROP TRIGGER IF EXISTS auto_process_gps_zones ON gps_logs;
CREATE TRIGGER auto_process_gps_zones
    AFTER INSERT ON gps_logs
    FOR EACH ROW
    EXECUTE FUNCTION process_gps_zone_events();
*/

-- =============================================
-- MANUAL PROCESSING QUERIES (for testing)
-- =============================================

-- Query 1: Check zone membership for a GPS point
/*
SELECT * FROM detect_zone_membership(11.0100, 76.9200);
*/

-- Query 2: Simulate vehicle entry
/*
SELECT create_journey_entry(
    '<vehicle-uuid>',
    '<toll-road-uuid>', 
    '<zone-uuid>',
    11.0100,
    76.9200
);
*/

-- Query 3: Complete journey and process payment
/*
SELECT * FROM complete_journey_exit(
    '<journey-uuid>',
    11.0300,
    76.9400,
    now(),
    false -- use straight-line distance
);
*/