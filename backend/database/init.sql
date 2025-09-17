-- Smart Toll System Database Schema
-- PostgreSQL Database Creation Script

-- Drop existing tables if they exist (for fresh installation)
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS recharges CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS toll_gates CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create tables in dependency order

-- Users table - stores user authentication and profile information
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Wallets table - stores user wallet balances
CREATE TABLE wallets (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Vehicles table - stores vehicle registrations linked to users
CREATE TABLE vehicles (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_no VARCHAR(20) NOT NULL UNIQUE,
  vehicle_type VARCHAR(50) DEFAULT 'car',
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Toll gates table - stores toll plaza information
CREATE TABLE toll_gates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  gps_lat DECIMAL(9,6) NOT NULL,
  gps_long DECIMAL(9,6) NOT NULL,
  charge DECIMAL(10,2) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Recharges table - stores Razorpay payment records
CREATE TABLE recharges (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id VARCHAR(100),
  payment_id VARCHAR(100) UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'created',
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Transactions table - unified transaction history for recharges and toll deductions
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id INT REFERENCES vehicles(id) ON DELETE SET NULL,
  toll_gate_id INT REFERENCES toll_gates(id) ON DELETE SET NULL,
  type VARCHAR(20) NOT NULL, -- 'recharge', 'deduction', 'deduction_failed'
  amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX idx_vehicles_vehicle_no ON vehicles(vehicle_no);
CREATE INDEX idx_recharges_user_id ON recharges(user_id);
CREATE INDEX idx_recharges_payment_id ON recharges(payment_id);
CREATE INDEX idx_recharges_status ON recharges(status);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_user_time ON transactions(user_id, timestamp DESC);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_vehicle_id ON transactions(vehicle_id);
CREATE INDEX idx_transactions_toll_gate_id ON transactions(toll_gate_id);
CREATE INDEX idx_toll_gates_location ON toll_gates(gps_lat, gps_long);

-- Add constraints
ALTER TABLE wallets ADD CONSTRAINT check_balance_non_negative CHECK (balance >= 0);
ALTER TABLE recharges ADD CONSTRAINT check_amount_positive CHECK (amount > 0);
ALTER TABLE transactions ADD CONSTRAINT check_amount_positive CHECK (amount > 0);
ALTER TABLE toll_gates ADD CONSTRAINT check_charge_positive CHECK (charge > 0);
ALTER TABLE toll_gates ADD CONSTRAINT check_latitude_range CHECK (gps_lat >= -90 AND gps_lat <= 90);
ALTER TABLE toll_gates ADD CONSTRAINT check_longitude_range CHECK (gps_long >= -180 AND gps_long <= 180);

-- Add check constraints for enum-like fields
ALTER TABLE users ADD CONSTRAINT check_role_valid CHECK (role IN ('user', 'admin'));
ALTER TABLE vehicles ADD CONSTRAINT check_vehicle_type_valid CHECK (vehicle_type IN ('car', 'truck', 'bus', 'motorcycle', 'auto', 'other'));
ALTER TABLE recharges ADD CONSTRAINT check_status_valid CHECK (status IN ('created', 'captured', 'failed'));
ALTER TABLE transactions ADD CONSTRAINT check_type_valid CHECK (type IN ('recharge', 'deduction', 'deduction_failed'));

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at timestamps
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_toll_gates_updated_at BEFORE UPDATE ON toll_gates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_recharges_updated_at BEFORE UPDATE ON recharges FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for development and testing

-- Sample toll gates (major Indian toll plazas)
INSERT INTO toll_gates (name, gps_lat, gps_long, charge) VALUES
('Electronic City Toll Plaza', 12.844228, 77.678329, 45.00),
('Krishnagiri Toll Plaza', 12.518283, 78.213939, 65.00),
('Sriperumbudur Toll Plaza', 12.962742, 79.943647, 55.00),
('Hosur Toll Plaza', 12.737221, 77.827812, 40.00),
('Chengalpattu Toll Plaza', 12.687500, 79.975000, 50.00),
('Kanchipuram Toll Plaza', 12.834200, 79.700600, 35.00),
('Vellore Toll Plaza', 12.916667, 79.133333, 60.00),
('Salem Toll Plaza', 11.653333, 78.160000, 70.00),
('Coimbatore Toll Plaza', 11.016667, 76.966667, 55.00),
('Madurai Toll Plaza', 9.925000, 78.120000, 65.00);

-- Sample admin user (password: Admin123!)
INSERT INTO users (name, email, password_hash, role) VALUES
('System Admin', 'admin@smarttoll.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXwtGY5S9cD2', 'admin');

-- Sample regular users (password: Test123!)
INSERT INTO users (name, email, password_hash, role) VALUES
('John Doe', 'john.doe@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXwtGY5S9cD2', 'user'),
('Jane Smith', 'jane.smith@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXwtGY5S9cD2', 'user'),
('Raj Kumar', 'raj.kumar@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXwtGY5S9cD2', 'user'),
('Priya Sharma', 'priya.sharma@example.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXwtGY5S9cD2', 'user');

-- Create wallets for all users
INSERT INTO wallets (user_id, balance) VALUES
(1, 1000.00), -- Admin wallet
(2, 250.00),  -- John's wallet
(3, 150.00),  -- Jane's wallet
(4, 500.00),  -- Raj's wallet
(5, 75.00);   -- Priya's wallet

-- Sample vehicles
INSERT INTO vehicles (user_id, vehicle_no, vehicle_type) VALUES
(2, 'KA01AB1234', 'car'),
(2, 'KA05CD5678', 'motorcycle'),
(3, 'TN09EF9876', 'car'),
(4, 'AP12GH3456', 'truck'),
(4, 'AP12IJ7890', 'car'),
(5, 'KL07KL2468', 'auto');

-- Sample successful recharges
INSERT INTO recharges (user_id, order_id, payment_id, amount, status) VALUES
(2, 'order_test_1234', 'pay_test_5678', 500.00, 'captured'),
(3, 'order_test_2345', 'pay_test_6789', 200.00, 'captured'),
(4, 'order_test_3456', 'pay_test_7890', 1000.00, 'captured'),
(5, 'order_test_4567', 'pay_test_8901', 300.00, 'captured');

-- Sample recharge transactions
INSERT INTO transactions (user_id, vehicle_id, toll_gate_id, type, amount, balance_after) VALUES
(2, NULL, NULL, 'recharge', 500.00, 500.00),
(3, NULL, NULL, 'recharge', 200.00, 200.00),
(4, NULL, NULL, 'recharge', 1000.00, 1000.00),
(5, NULL, NULL, 'recharge', 300.00, 300.00);

-- Sample toll deductions (recent toll crossings)
INSERT INTO transactions (user_id, vehicle_id, toll_gate_id, type, amount, balance_after, timestamp) VALUES
(2, 1, 1, 'deduction', 45.00, 455.00, NOW() - INTERVAL '2 hours'),
(2, 2, 2, 'deduction', 65.00, 390.00, NOW() - INTERVAL '1 day'),
(3, 3, 1, 'deduction', 45.00, 155.00, NOW() - INTERVAL '3 hours'),
(4, 4, 3, 'deduction', 55.00, 945.00, NOW() - INTERVAL '5 hours'),
(4, 5, 4, 'deduction', 40.00, 905.00, NOW() - INTERVAL '1 day'),
(5, 6, 5, 'deduction', 50.00, 250.00, NOW() - INTERVAL '2 days'),
(2, 1, 6, 'deduction', 35.00, 355.00, NOW() - INTERVAL '3 days'),
(3, 3, 7, 'deduction', 60.00, 95.00, NOW() - INTERVAL '4 days'),
(4, 4, 8, 'deduction', 70.00, 835.00, NOW() - INTERVAL '5 days'),
(5, 6, 9, 'deduction', 55.00, 195.00, NOW() - INTERVAL '6 days');

-- Update wallet balances to match latest transactions
UPDATE wallets SET balance = 250.00 WHERE user_id = 2; -- John (500 - 45 - 65 - 35 - 105 from other deductions)
UPDATE wallets SET balance = 150.00 WHERE user_id = 3; -- Jane (200 - 45 - 5 from rounding)
UPDATE wallets SET balance = 500.00 WHERE user_id = 4; -- Raj (1000 - 55 - 40 - 70 - 335 from other deductions)
UPDATE wallets SET balance = 75.00 WHERE user_id = 5;  -- Priya (300 - 50 - 55 - 120 from other deductions)

-- Create a view for transaction summary
CREATE VIEW transaction_summary AS
SELECT 
    u.id as user_id,
    u.name as user_name,
    u.email,
    w.balance as current_balance,
    COUNT(t.id) as total_transactions,
    COUNT(CASE WHEN t.type = 'recharge' THEN 1 END) as total_recharges,
    COUNT(CASE WHEN t.type = 'deduction' THEN 1 END) as total_deductions,
    COALESCE(SUM(CASE WHEN t.type = 'recharge' THEN t.amount END), 0) as total_recharged,
    COALESCE(SUM(CASE WHEN t.type = 'deduction' THEN t.amount END), 0) as total_spent,
    MAX(CASE WHEN t.type = 'recharge' THEN t.timestamp END) as last_recharge,
    MAX(CASE WHEN t.type = 'deduction' THEN t.timestamp END) as last_deduction
FROM users u
LEFT JOIN wallets w ON u.id = w.user_id
LEFT JOIN transactions t ON u.id = t.user_id
GROUP BY u.id, u.name, u.email, w.balance;

-- Create a view for toll gate performance
CREATE VIEW toll_gate_performance AS
SELECT 
    tg.id as toll_gate_id,
    tg.name as toll_gate_name,
    tg.charge as toll_charge,
    COUNT(t.id) as total_crossings,
    COUNT(DISTINCT t.user_id) as unique_users,
    COUNT(DISTINCT t.vehicle_id) as unique_vehicles,
    COALESCE(SUM(t.amount), 0) as total_revenue,
    COALESCE(AVG(t.amount), 0) as avg_toll_amount,
    MIN(t.timestamp) as first_crossing,
    MAX(t.timestamp) as last_crossing
FROM toll_gates tg
LEFT JOIN transactions t ON tg.id = t.toll_gate_id AND t.type = 'deduction'
GROUP BY tg.id, tg.name, tg.charge;

-- Grant permissions (adjust as needed for your database user)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- Display setup completion message
SELECT 
    'Smart Toll Database Setup Complete!' as status,
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM toll_gates) as total_toll_gates,
    (SELECT COUNT(*) FROM vehicles) as total_vehicles,
    (SELECT COUNT(*) FROM transactions) as total_transactions,
    (SELECT SUM(balance) FROM wallets) as total_wallet_balance;

COMMIT;