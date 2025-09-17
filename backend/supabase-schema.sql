-- Smart Toll System Database Schema for Supabase
-- Run this script in your Supabase SQL Editor
-- Dashboard: https://supabase.com/dashboard/project/ftrtjmovhndrntmpaxih/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security (RLS) by default
-- We'll configure specific policies later

-- 1. Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Wallets table
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 3. Vehicles table
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    vehicle_type VARCHAR(50) DEFAULT 'car',
    make VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Toll Gates table
CREATE TABLE toll_gates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    toll_amount DECIMAL(8,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    toll_gate_id UUID NOT NULL REFERENCES toll_gates(id) ON DELETE CASCADE,
    amount DECIMAL(8,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'completed',
    transaction_type VARCHAR(50) DEFAULT 'toll_deduction',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Recharges table
CREATE TABLE recharges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_id VARCHAR(255) UNIQUE NOT NULL,
    order_id VARCHAR(255) NOT NULL,
    amount DECIMAL(8,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(100),
    gateway_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Toll Passages table (dedicated for toll gate crossings)
CREATE TABLE toll_passages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    toll_gate_id UUID NOT NULL REFERENCES toll_gates(id) ON DELETE CASCADE,
    charge DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    passage_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX idx_vehicles_license_plate ON vehicles(license_plate);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_recharges_payment_id ON recharges(payment_id);
CREATE INDEX idx_recharges_user_id ON recharges(user_id);
CREATE INDEX idx_toll_passages_user_id ON toll_passages(user_id);
CREATE INDEX idx_toll_passages_vehicle_id ON toll_passages(vehicle_id);
CREATE INDEX idx_toll_passages_toll_gate_id ON toll_passages(toll_gate_id);
CREATE INDEX idx_toll_passages_timestamp ON toll_passages(passage_timestamp);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_toll_gates_updated_at BEFORE UPDATE ON toll_gates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recharges_updated_at BEFORE UPDATE ON recharges FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample toll gates
INSERT INTO toll_gates (name, location, toll_amount) VALUES
('Mumbai-Pune Express Entry', 'Mumbai Entry Point', 75.00),
('Mumbai-Pune Express Exit', 'Pune Entry Point', 75.00),
('Eastern Express Highway', 'Thane Toll Plaza', 45.00),
('Western Express Highway', 'Borivali Toll Plaza', 35.00),
('Bandra-Worli Sea Link', 'Bandra Entry', 85.00);

-- Insert sample admin user (password: Admin123!)
INSERT INTO users (email, password_hash, name, role) VALUES
('admin@smarttoll.com', '$2b$12$LQv3c1yqBo7ByQv5s8g7/.PSRQH5LHlqPQjM5Q7x8O6rP3i8F9E1e', 'Smart Toll Admin', 'admin');

-- Insert sample test user (password: Test123!)
INSERT INTO users (email, password_hash, name, phone) VALUES
('john.doe@example.com', '$2b$12$8XvL5Z7gY6fN1mR5a8p2G.HT3jK9sA0VKLM6nO8qP7bC4vW9eL2xD', 'John Doe', '+91-9876543210');

-- Get the user IDs for wallet creation
DO $$
DECLARE
    admin_user_id UUID;
    test_user_id UUID;
BEGIN
    SELECT id INTO admin_user_id FROM users WHERE email = 'admin@smarttoll.com';
    SELECT id INTO test_user_id FROM users WHERE email = 'john.doe@example.com';
    
    -- Create wallets for sample users
    INSERT INTO wallets (user_id, balance) VALUES
    (admin_user_id, 1000.00),
    (test_user_id, 500.00);
    
    -- Create sample vehicles
    INSERT INTO vehicles (user_id, license_plate, vehicle_type, make, model, year) VALUES
    (test_user_id, 'MH01AB1234', 'car', 'Maruti', 'Swift', 2020),
    (test_user_id, 'MH02CD5678', 'car', 'Honda', 'City', 2021),
    (admin_user_id, 'MH12EF9999', 'suv', 'Toyota', 'Fortuner', 2022);
END $$;

-- Create a view for transaction summaries
CREATE VIEW transaction_summary AS
SELECT 
    u.name as user_name,
    u.email,
    v.license_plate,
    tg.name as toll_gate_name,
    t.amount,
    t.status,
    t.created_at
FROM transactions t
JOIN users u ON t.user_id = u.id
JOIN vehicles v ON t.vehicle_id = v.id
JOIN toll_gates tg ON t.toll_gate_id = tg.id
ORDER BY t.created_at DESC;

-- Create a view for wallet summaries
CREATE VIEW wallet_summary AS
SELECT 
    u.name as user_name,
    u.email,
    w.balance,
    (SELECT COUNT(*) FROM vehicles WHERE user_id = u.id) as vehicle_count,
    (SELECT COUNT(*) FROM transactions WHERE user_id = u.id) as transaction_count,
    (SELECT SUM(amount) FROM transactions WHERE user_id = u.id) as total_spent
FROM users u
JOIN wallets w ON u.id = w.user_id;

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE toll_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recharges ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users (can only see their own data)
CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view their own wallet" ON wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own vehicles" ON vehicles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own recharges" ON recharges FOR SELECT USING (auth.uid() = user_id);

-- Allow public read access to toll gates
CREATE POLICY "Public toll gate access" ON toll_gates FOR SELECT TO public USING (true);

-- Create service role policies (for server-side operations)
CREATE POLICY "Service role full access on users" ON users FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on wallets" ON wallets FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on vehicles" ON vehicles FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on toll_gates" ON toll_gates FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on transactions" ON transactions FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on recharges" ON recharges FOR ALL TO service_role USING (true);

-- Grant permissions to authenticated and service_role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create a function to execute raw SQL (for our backend compatibility)
CREATE OR REPLACE FUNCTION execute_sql(query TEXT, params JSONB DEFAULT '[]'::JSONB)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
BEGIN
    -- This is a simplified version - in production, you'd want more sophisticated query parsing
    -- For now, we'll just return a success response
    RETURN jsonb_build_object('status', 'success', 'message', 'SQL execution not implemented in this demo');
END;
$$ LANGUAGE plpgsql;

-- Summary
SELECT 
    'Smart Toll Database Schema Created Successfully!' as message,
    (SELECT COUNT(*) FROM users) as users_count,
    (SELECT COUNT(*) FROM toll_gates) as toll_gates_count,
    (SELECT COUNT(*) FROM vehicles) as vehicles_count,
    (SELECT SUM(balance) FROM wallets) as total_wallet_balance;