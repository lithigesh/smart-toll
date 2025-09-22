-- Additional toll_gates table to match the application code expectations
-- This is a simpler version compared to the toll_road_zones

CREATE TABLE IF NOT EXISTS toll_gates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT,
    gps_lat NUMERIC(10, 7) NOT NULL,
    gps_long NUMERIC(10, 7) NOT NULL,
    toll_amount NUMERIC(8,2) NOT NULL DEFAULT 10.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert sample toll gates with specific UUIDs for testing
INSERT INTO toll_gates (id, name, location, gps_lat, gps_long, toll_amount, is_active) VALUES 
('11111111-1111-1111-1111-111111111111', 'Main Highway Toll Gate', 'Highway 101 North Entry', 37.7749, -122.4194, 15.00, true),
('22222222-2222-2222-2222-222222222222', 'Downtown Toll Plaza', 'Financial District Entry', 37.7849, -122.4094, 20.00, true),
('33333333-3333-3333-3333-333333333333', 'Airport Express Gate', 'Airport Express Lane', 37.7949, -122.3994, 25.00, true),
('44444444-4444-4444-4444-444444444444', 'City Center Gate', 'Downtown Core Entry', 37.7889, -122.4054, 18.00, true),
('55555555-5555-5555-5555-555555555555', 'Bridge Toll Plaza', 'Bay Bridge Entry', 37.7989, -122.3854, 30.00, true);

-- Create trigger for updated_at
CREATE TRIGGER update_toll_gates_updated_at 
    BEFORE UPDATE ON toll_gates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add index for location queries
CREATE INDEX IF NOT EXISTS idx_toll_gates_location ON toll_gates(gps_lat, gps_long);
CREATE INDEX IF NOT EXISTS idx_toll_gates_active ON toll_gates(is_active);

-- =============================================
-- TOLL PASSAGES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS toll_passages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    toll_gate_id UUID REFERENCES toll_gates(id),
    charge NUMERIC(8,2) NOT NULL,
    balance_after NUMERIC(10,2) NOT NULL,
    passage_timestamp TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create trigger for toll_passages updated_at
CREATE TRIGGER update_toll_passages_updated_at 
    BEFORE UPDATE ON toll_passages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add indexes for toll_passages
CREATE INDEX IF NOT EXISTS idx_toll_passages_user ON toll_passages(user_id, passage_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_toll_passages_vehicle ON toll_passages(vehicle_id, passage_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_toll_passages_toll_gate ON toll_passages(toll_gate_id, passage_timestamp DESC);