-- SMART TOLL SYSTEM - COMPLETE DATABASE SETUP
-- Distance-based GPS toll calculation with PostGIS
-- Run this in Supabase SQL Editor or PostgreSQL with PostGIS

-- =============================================
-- EXTENSIONS
-- =============================================

-- Enable PostGIS for spatial operations
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enable uuid-ossp for UUID generation (if not using gen_random_uuid)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================
-- CORE TABLES
-- =============================================

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    phone TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- WALLETS TABLE
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    balance NUMERIC(10,2) DEFAULT 0 CHECK (balance >= 0),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

-- VEHICLES TABLE
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    plate_number TEXT UNIQUE NOT NULL,
    vehicle_type TEXT DEFAULT 'car' CHECK (vehicle_type IN ('car', 'truck', 'bus', 'bike')),
    model TEXT,
    registered_at TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- SPATIAL TOLL SYSTEM TABLES
-- =============================================

-- TOLL ROAD ZONES TABLE (PostGIS polygon-based zones)
CREATE TABLE IF NOT EXISTS toll_road_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    zone_polygon GEOMETRY(POLYGON, 4326) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- TOLL ROADS TABLE (linked to zones)
CREATE TABLE IF NOT EXISTS toll_roads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID REFERENCES toll_road_zones(id) ON DELETE CASCADE,
    name TEXT,
    rate_per_km NUMERIC(8,3) NOT NULL CHECK (rate_per_km > 0),
    minimum_fare NUMERIC(8,2) DEFAULT 5.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- VEHICLE TYPE RATES TABLE (different rates per vehicle type)
CREATE TABLE IF NOT EXISTS vehicle_type_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    toll_road_id UUID REFERENCES toll_roads(id) ON DELETE CASCADE,
    vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('car', 'truck', 'bus', 'bike')),
    rate_per_km NUMERIC(8,3) NOT NULL CHECK (rate_per_km > 0),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(toll_road_id, vehicle_type)
);

-- =============================================
-- GPS & JOURNEY TRACKING
-- =============================================

-- GPS LOGS TABLE (PostGIS point storage)
CREATE TABLE IF NOT EXISTS gps_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    location GEOMETRY(POINT, 4326) NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude NUMERIC(10, 7) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    speed NUMERIC(6,2) CHECK (speed >= 0),
    heading NUMERIC(5,2) CHECK (heading >= 0 AND heading < 360),
    accuracy NUMERIC(6,2),
    logged_at TIMESTAMPTZ DEFAULT now()
);

-- JOURNEYS TABLE (entry/exit tracking for toll zones)
CREATE TABLE IF NOT EXISTS journeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    toll_road_id UUID REFERENCES toll_roads(id) ON DELETE SET NULL,
    zone_id UUID REFERENCES toll_road_zones(id) ON DELETE SET NULL,
    entry_point GEOMETRY(POINT, 4326) NOT NULL,
    exit_point GEOMETRY(POINT, 4326),
    entry_time TIMESTAMPTZ DEFAULT now(),
    exit_time TIMESTAMPTZ,
    total_distance_km NUMERIC(10,3),
    calculated_fare NUMERIC(10,2),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- FINANCIAL TRACKING
-- =============================================

-- TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    journey_id UUID REFERENCES journeys(id) ON DELETE SET NULL,
    amount NUMERIC(10,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('credit', 'debit', 'recharge', 'toll', 'refund')),
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    description TEXT,
    reference_id TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RECHARGES TABLE (for wallet top-ups)
CREATE TABLE IF NOT EXISTS recharges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
    payment_gateway TEXT DEFAULT 'razorpay',
    gateway_order_id TEXT,
    gateway_payment_id TEXT,
    gateway_signature TEXT,
    status TEXT DEFAULT 'created' CHECK (status IN ('created', 'paid', 'failed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- NOTIFICATIONS
-- =============================================

-- NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('entry', 'exit', 'toll_deducted', 'low_balance', 'insufficient_balance', 'recharge', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- PERFORMANCE INDEXES
-- =============================================

-- Spatial indexes
CREATE INDEX IF NOT EXISTS idx_toll_road_zones_polygon ON toll_road_zones USING GIST(zone_polygon);
CREATE INDEX IF NOT EXISTS idx_gps_logs_location ON gps_logs USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_journeys_entry_point ON journeys USING GIST(entry_point);
CREATE INDEX IF NOT EXISTS idx_journeys_exit_point ON journeys USING GIST(exit_point);

-- Time-based indexes
CREATE INDEX IF NOT EXISTS idx_gps_logs_vehicle_time ON gps_logs(vehicle_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_journeys_vehicle_time ON journeys(vehicle_id, entry_time DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_time ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_time ON notifications(user_id, created_at DESC);

-- Status and lookup indexes
CREATE INDEX IF NOT EXISTS idx_journeys_status ON journeys(status, entry_time);
CREATE INDEX IF NOT EXISTS idx_transactions_type_status ON transactions(type, status);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_user_active ON vehicles(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);

-- =============================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =============================================

-- Update triggers for updated_at columns
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at 
    BEFORE UPDATE ON wallets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at 
    BEFORE UPDATE ON vehicles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_toll_road_zones_updated_at 
    BEFORE UPDATE ON toll_road_zones 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_toll_roads_updated_at 
    BEFORE UPDATE ON toll_roads 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journeys_updated_at 
    BEFORE UPDATE ON journeys 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recharges_updated_at 
    BEFORE UPDATE ON recharges 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- GPS LOCATION SYNC TRIGGER
-- =============================================

-- Automatically sync GPS point with lat/lon on insert
CREATE OR REPLACE FUNCTION sync_gps_location()
RETURNS TRIGGER AS $$
BEGIN
    -- Set location from lat/lon if location is null
    IF NEW.location IS NULL THEN
        NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    END IF;
    
    -- Update lat/lon from location if they are null/zero
    IF NEW.latitude = 0 OR NEW.longitude = 0 THEN
        NEW.latitude = ST_Y(NEW.location);
        NEW.longitude = ST_X(NEW.location);
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER sync_gps_logs_location 
    BEFORE INSERT OR UPDATE ON gps_logs 
    FOR EACH ROW EXECUTE FUNCTION sync_gps_location();

-- =============================================
-- COMPLETION MESSAGE
-- =============================================

DO $$
BEGIN
    RAISE NOTICE 'Smart Toll System database setup completed successfully!';
    RAISE NOTICE 'PostGIS enabled: %', (SELECT postgis_version());
    RAISE NOTICE 'Tables created: users, wallets, vehicles, toll_road_zones, toll_roads, vehicle_type_rates, gps_logs, journeys, transactions, recharges, notifications';
    RAISE NOTICE 'Next steps: Run test-data.sql and coimbatore-roads.sql';
END $$;