-- SMART TOLL SYSTEM - DATABASE SCHEMA
-- Run this in Supabase SQL Editor to create all tables and functions
-- This schema supports GPS-based distance toll calculation with PostGIS

-- Enable PostGIS extension for spatial operations
CREATE EXTENSION IF NOT EXISTS postgis;

-- =============================================
-- TABLE DEFINITIONS
-- =============================================

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- WALLETS TABLE
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    balance NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- VEHICLES TABLE
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    license_plate TEXT UNIQUE NOT NULL,
    vehicle_type TEXT DEFAULT 'car',
    model TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- TOLL ROAD ZONES TABLE (PostGIS polygon-based zones with integrated pricing)
CREATE TABLE IF NOT EXISTS toll_road_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    zone_polygon GEOMETRY(POLYGON, 4326) NOT NULL,
    rate_per_km NUMERIC(6,2) NOT NULL,
    minimum_fare NUMERIC(6,2) DEFAULT 5.00,
    tax_percentage NUMERIC(4,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- VEHICLE TOLL HISTORY TABLE (GPS-based entry/exit tracking)
CREATE TABLE IF NOT EXISTS vehicle_toll_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    toll_road_zone_id UUID REFERENCES toll_road_zones(id),
    entry_lat NUMERIC(10, 7) NOT NULL,
    entry_lon NUMERIC(10, 7) NOT NULL,
    exit_lat NUMERIC(10, 7),
    exit_lon NUMERIC(10, 7),
    distance_km NUMERIC(8,3),
    fare_amount NUMERIC(8,2),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    entry_time TIMESTAMPTZ DEFAULT now(),
    exit_time TIMESTAMPTZ,
    notes TEXT
);

-- TRANSACTIONS TABLE (Enhanced with comprehensive tracking)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    amount NUMERIC(10,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('recharge', 'toll_charge', 'toll_charge_pending', 'refund')),
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    reference_id TEXT,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- GPS LOGS TABLE (PostGIS point storage with separate lat/lon for compatibility)
CREATE TABLE IF NOT EXISTS gps_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    location GEOMETRY(POINT, 4326) NOT NULL,
    speed NUMERIC(6,2),
    heading NUMERIC(5,2),
    accuracy NUMERIC(6,2),
    logged_at TIMESTAMPTZ DEFAULT now()
);

-- NOTIFICATIONS TABLE (Comprehensive notification system)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('toll_entry', 'toll_exit', 'low_balance', 'insufficient_balance', 'wallet_recharge', 'payment_failed', 'toll_processing_error', 'test')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RECHARGES TABLE (Razorpay payment tracking)
CREATE TABLE IF NOT EXISTS recharges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    razorpay_order_id TEXT UNIQUE NOT NULL,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    status TEXT DEFAULT 'created' CHECK (status IN ('created', 'paid', 'failed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_gps_logs_vehicle_time ON gps_logs(vehicle_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_gps_logs_location ON gps_logs USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_gps_logs_time ON gps_logs(logged_at);
CREATE INDEX IF NOT EXISTS idx_toll_zones_polygon ON toll_road_zones USING GIST(zone_polygon);
CREATE INDEX IF NOT EXISTS idx_toll_history_vehicle ON vehicle_toll_history(vehicle_id, status);
CREATE INDEX IF NOT EXISTS idx_toll_history_zone_time ON vehicle_toll_history(toll_road_zone_id, entry_time);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON transactions(user_id, type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status, created_at);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_user ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(license_plate);

-- =============================================
-- CONSTRAINTS
-- =============================================

-- Vehicle toll history constraints
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_entry_coordinates') THEN
        ALTER TABLE vehicle_toll_history ADD CONSTRAINT check_entry_coordinates 
            CHECK (entry_lat BETWEEN -90 AND 90 AND entry_lon BETWEEN -180 AND 180);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_exit_coordinates') THEN
        ALTER TABLE vehicle_toll_history ADD CONSTRAINT check_exit_coordinates 
            CHECK (exit_lat IS NULL OR (exit_lat BETWEEN -90 AND 90 AND exit_lon BETWEEN -180 AND 180));
    END IF;
END $$;

-- GPS logs constraints
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_gps_coordinates') THEN
        ALTER TABLE gps_logs ADD CONSTRAINT check_gps_coordinates 
            CHECK (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_speed_positive') THEN
        ALTER TABLE gps_logs ADD CONSTRAINT check_speed_positive 
            CHECK (speed IS NULL OR speed >= 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_heading_range') THEN
        ALTER TABLE gps_logs ADD CONSTRAINT check_heading_range 
            CHECK (heading IS NULL OR (heading >= 0 AND heading < 360));
    END IF;
END $$;

-- Toll zones constraints
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_rate_positive') THEN
        ALTER TABLE toll_road_zones ADD CONSTRAINT check_rate_positive 
            CHECK (rate_per_km > 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_minimum_fare_positive') THEN
        ALTER TABLE toll_road_zones ADD CONSTRAINT check_minimum_fare_positive 
            CHECK (minimum_fare >= 0);
    END IF;
END $$;

-- =============================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- =============================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for each table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at 
            BEFORE UPDATE ON users 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_wallets_updated_at') THEN
        CREATE TRIGGER update_wallets_updated_at 
            BEFORE UPDATE ON wallets 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_vehicles_updated_at') THEN
        CREATE TRIGGER update_vehicles_updated_at 
            BEFORE UPDATE ON vehicles 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_toll_zones_updated_at') THEN
        CREATE TRIGGER update_toll_zones_updated_at 
            BEFORE UPDATE ON toll_road_zones 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_transactions_updated_at') THEN
        CREATE TRIGGER update_transactions_updated_at 
            BEFORE UPDATE ON transactions 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_recharges_updated_at') THEN
        CREATE TRIGGER update_recharges_updated_at 
            BEFORE UPDATE ON recharges 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- =============================================
-- POSTGIS FUNCTIONS FOR GPS TRACKING
-- =============================================

-- Function to log GPS position with PostGIS point geometry
CREATE OR REPLACE FUNCTION log_gps_position(
    p_vehicle_id UUID,
    p_latitude NUMERIC,
    p_longitude NUMERIC,
    p_speed NUMERIC DEFAULT NULL,
    p_heading NUMERIC DEFAULT NULL,
    p_accuracy NUMERIC DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    vehicle_id UUID,
    latitude NUMERIC,
    longitude NUMERIC,
    speed NUMERIC,
    heading NUMERIC,
    accuracy NUMERIC,
    logged_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
AS $$
DECLARE
    new_log_id UUID;
BEGIN
    INSERT INTO gps_logs (
        vehicle_id,
        latitude,
        longitude,
        location,
        speed,
        heading,
        accuracy,
        logged_at
    ) VALUES (
        p_vehicle_id,
        p_latitude,
        p_longitude,
        ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326),
        p_speed,
        p_heading,
        p_accuracy,
        NOW()
    )
    RETURNING gps_logs.id INTO new_log_id;
    
    RETURN QUERY
    SELECT 
        g.id,
        g.vehicle_id,
        g.latitude,
        g.longitude,
        g.speed,
        g.heading,
        g.accuracy,
        g.logged_at
    FROM gps_logs g
    WHERE g.id = new_log_id;
END;
$$;

-- Function to calculate distance between two GPS points
CREATE OR REPLACE FUNCTION calculate_point_distance(
    lat1 NUMERIC,
    lon1 NUMERIC,
    lat2 NUMERIC,
    lon2 NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN ST_Distance(
        ST_SetSRID(ST_MakePoint(lon1, lat1), 4326)::geography,
        ST_SetSRID(ST_MakePoint(lon2, lat2), 4326)::geography
    ) / 1000.0;
END;
$$;

-- Function to calculate distance traveled by a vehicle
CREATE OR REPLACE FUNCTION calculate_vehicle_distance(
    p_vehicle_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
    total_distance NUMERIC := 0;
    prev_point GEOMETRY;
    curr_point GEOMETRY;
    point_distance NUMERIC;
BEGIN
    FOR curr_point IN
        SELECT location
        FROM gps_logs
        WHERE vehicle_id = p_vehicle_id
        AND logged_at BETWEEN p_start_time AND p_end_time
        AND location IS NOT NULL
        ORDER BY logged_at
    LOOP
        IF prev_point IS NOT NULL THEN
            point_distance := ST_Distance(prev_point::geography, curr_point::geography) / 1000.0;
            
            IF point_distance < 5.0 THEN
                total_distance := total_distance + point_distance;
            END IF;
        END IF;
        
        prev_point := curr_point;
    END LOOP;
    
    RETURN ROUND(total_distance, 2);
END;
$$;

-- Function to find toll zones containing a point
CREATE OR REPLACE FUNCTION find_zones_containing_point(
    p_latitude NUMERIC,
    p_longitude NUMERIC
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    rate_per_km NUMERIC,
    is_active BOOLEAN,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tz.id,
        tz.name,
        tz.description,
        tz.rate_per_km,
        tz.is_active,
        tz.created_at
    FROM toll_road_zones tz
    WHERE tz.is_active = true
    AND ST_Within(
        ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326),
        tz.zone_polygon
    );
END;
$$;

-- Function to process toll charges
CREATE OR REPLACE FUNCTION process_toll_charge(
    p_toll_history_id UUID,
    p_user_id UUID,
    p_fare_amount NUMERIC
)
RETURNS TABLE (
    success BOOLEAN,
    transaction_id UUID,
    new_balance NUMERIC,
    error_message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    current_balance NUMERIC;
    new_transaction_id UUID;
BEGIN
    SELECT balance INTO current_balance
    FROM wallets
    WHERE user_id = p_user_id;
    
    IF current_balance IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, 0::NUMERIC, 'Wallet not found'::TEXT;
        RETURN;
    END IF;
    
    IF current_balance < p_fare_amount THEN
        RETURN QUERY SELECT false, NULL::UUID, current_balance, 'Insufficient balance'::TEXT;
        RETURN;
    END IF;
    
    UPDATE wallets 
    SET balance = balance - p_fare_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING balance INTO current_balance;
    
    INSERT INTO transactions (
        user_id,
        type,
        amount,
        status,
        reference_id,
        description
    ) VALUES (
        p_user_id,
        'toll_charge',
        p_fare_amount,
        'completed',
        p_toll_history_id::TEXT,
        'Toll charge deducted'
    )
    RETURNING id INTO new_transaction_id;
    
    RETURN QUERY SELECT true, new_transaction_id, current_balance, NULL::TEXT;
END;
$$;

-- Function to get vehicles within geographical bounds
CREATE OR REPLACE FUNCTION get_vehicles_in_bounds(
    p_north NUMERIC,
    p_south NUMERIC,
    p_east NUMERIC,
    p_west NUMERIC,
    p_max_age TIMESTAMPTZ
)
RETURNS TABLE (
    vehicle_id UUID,
    latitude NUMERIC,
    longitude NUMERIC,
    speed NUMERIC,
    heading NUMERIC,
    logged_at TIMESTAMPTZ,
    license_plate TEXT,
    vehicle_type TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH latest_positions AS (
        SELECT DISTINCT ON (g.vehicle_id)
            g.vehicle_id,
            g.latitude,
            g.longitude,
            g.speed,
            g.heading,
            g.logged_at,
            g.location
        FROM gps_logs g
        WHERE g.logged_at >= p_max_age
        ORDER BY g.vehicle_id, g.logged_at DESC
    )
    SELECT 
        lp.vehicle_id,
        lp.latitude,
        lp.longitude,
        lp.speed,
        lp.heading,
        lp.logged_at,
        v.license_plate,
        v.vehicle_type
    FROM latest_positions lp
    JOIN vehicles v ON v.id = lp.vehicle_id
    WHERE ST_Within(
        lp.location,
        ST_MakeEnvelope(p_west, p_south, p_east, p_north, 4326)
    );
END;
$$;

-- Function to get toll zone analytics
CREATE OR REPLACE FUNCTION get_toll_zone_analytics(
    p_zone_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
    total_entries BIGINT,
    total_revenue NUMERIC,
    average_distance NUMERIC,
    average_fare NUMERIC,
    unique_vehicles BIGINT,
    peak_hour INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_entries,
        COALESCE(SUM(vth.fare_amount), 0) as total_revenue,
        ROUND(AVG(vth.distance_km), 2) as average_distance,
        ROUND(AVG(vth.fare_amount), 2) as average_fare,
        COUNT(DISTINCT vth.vehicle_id)::BIGINT as unique_vehicles,
        MODE() WITHIN GROUP (ORDER BY EXTRACT(HOUR FROM vth.entry_time))::INTEGER as peak_hour
    FROM vehicle_toll_history vth
    WHERE vth.toll_road_zone_id = p_zone_id
    AND vth.entry_time BETWEEN p_start_date AND p_end_date
    AND vth.status = 'completed';
END;
$$;

-- Function to cleanup old GPS logs (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_gps_logs(p_days_old INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM gps_logs
    WHERE logged_at < NOW() - INTERVAL '1 day' * p_days_old;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE 'Smart Toll System database schema created successfully!';
    RAISE NOTICE 'Tables created: users, wallets, vehicles, toll_road_zones, vehicle_toll_history, transactions, gps_logs, notifications, recharges';
    RAISE NOTICE 'PostGIS functions created for GPS tracking and toll processing';
    RAISE NOTICE 'Indexes and constraints applied for optimal performance';
END $$;