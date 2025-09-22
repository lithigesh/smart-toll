-- ============================================
-- SMART TOLL SYSTEM - MISSING TABLES SETUP
-- ============================================
-- Run this SQL in your Supabase SQL Editor to create the missing toll_passages table

-- Create toll_passages table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_toll_passages_user ON toll_passages(user_id, passage_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_toll_passages_vehicle ON toll_passages(vehicle_id, passage_timestamp DESC);  
CREATE INDEX IF NOT EXISTS idx_toll_passages_toll_gate ON toll_passages(toll_gate_id, passage_timestamp DESC);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER IF NOT EXISTS update_toll_passages_updated_at 
    BEFORE UPDATE ON toll_passages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verify table creation
DO $$
BEGIN
    RAISE NOTICE 'toll_passages table created successfully!';
    RAISE NOTICE 'You can now run your toll simulation tests.';
END $$;