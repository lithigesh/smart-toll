-- Populate Transactions and Recharges Tables
-- Run this in Supabase SQL Editor after the main schema and basic data are created

-- First, let's get the existing IDs for foreign key references
DO $$
DECLARE
    admin_user_id UUID;
    john_user_id UUID;
    admin_vehicle_id UUID;
    john_vehicle1_id UUID;
    john_vehicle2_id UUID;
    toll_gate1_id UUID;
    toll_gate2_id UUID;
    toll_gate3_id UUID;
    toll_gate4_id UUID;
    toll_gate5_id UUID;
BEGIN
    -- Get user IDs
    SELECT id INTO admin_user_id FROM users WHERE email = 'admin@smarttoll.com';
    SELECT id INTO john_user_id FROM users WHERE email = 'john.doe@example.com';
    
    -- Get vehicle IDs
    SELECT id INTO admin_vehicle_id FROM vehicles WHERE license_plate = 'MH12EF9999';
    SELECT id INTO john_vehicle1_id FROM vehicles WHERE license_plate = 'MH01AB1234';
    SELECT id INTO john_vehicle2_id FROM vehicles WHERE license_plate = 'MH02CD5678';
    
    -- Get toll gate IDs (first 5)
    SELECT id INTO toll_gate1_id FROM toll_gates WHERE name = 'Mumbai-Pune Express Entry';
    SELECT id INTO toll_gate2_id FROM toll_gates WHERE name = 'Mumbai-Pune Express Exit';
    SELECT id INTO toll_gate3_id FROM toll_gates WHERE name = 'Eastern Express Highway';
    SELECT id INTO toll_gate4_id FROM toll_gates WHERE name = 'Western Express Highway';
    SELECT id INTO toll_gate5_id FROM toll_gates WHERE name = 'Bandra-Worli Sea Link';
    
    -- Insert Recharges Data (Payment history)
    INSERT INTO recharges (id, user_id, payment_id, order_id, amount, status, payment_method, gateway_response, created_at, updated_at) VALUES
    -- John's recharges
    (uuid_generate_v4(), john_user_id, 'pay_MockJohn001', 'order_MockJohn001', 1000.00, 'completed', 'razorpay', 
     '{"razorpay_payment_id": "pay_MockJohn001", "razorpay_order_id": "order_MockJohn001", "razorpay_signature": "mock_sig_001"}',
     NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
    
    (uuid_generate_v4(), john_user_id, 'pay_MockJohn002', 'order_MockJohn002', 500.00, 'completed', 'razorpay',
     '{"razorpay_payment_id": "pay_MockJohn002", "razorpay_order_id": "order_MockJohn002", "razorpay_signature": "mock_sig_002"}',
     NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days'),
     
    (uuid_generate_v4(), john_user_id, 'pay_MockJohn003', 'order_MockJohn003', 250.00, 'failed', 'razorpay',
     '{"error": "payment_failed", "description": "Card declined by bank"}',
     NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
     
    (uuid_generate_v4(), john_user_id, 'pay_MockJohn004', 'order_MockJohn004', 300.00, 'pending', 'razorpay',
     '{"status": "created", "order_id": "order_MockJohn004"}',
     NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),
    
    -- Admin's recharges
    (uuid_generate_v4(), admin_user_id, 'pay_MockAdmin001', 'order_MockAdmin001', 5000.00, 'completed', 'razorpay',
     '{"razorpay_payment_id": "pay_MockAdmin001", "razorpay_order_id": "order_MockAdmin001", "razorpay_signature": "mock_sig_admin_001"}',
     NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days'),
     
    (uuid_generate_v4(), admin_user_id, 'pay_MockAdmin002', 'order_MockAdmin002', 2000.00, 'completed', 'razorpay',
     '{"razorpay_payment_id": "pay_MockAdmin002", "razorpay_order_id": "order_MockAdmin002", "razorpay_signature": "mock_sig_admin_002"}',
     NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days');

    -- Insert Transaction Data (Toll deductions)
    INSERT INTO transactions (id, user_id, vehicle_id, toll_gate_id, amount, status, transaction_type, created_at) VALUES
    -- John's transactions with vehicle 1 (MH01AB1234)
    (uuid_generate_v4(), john_user_id, john_vehicle1_id, toll_gate1_id, 75.00, 'completed', 'toll_deduction', NOW() - INTERVAL '5 hours'),
    (uuid_generate_v4(), john_user_id, john_vehicle1_id, toll_gate3_id, 45.00, 'completed', 'toll_deduction', NOW() - INTERVAL '2 days'),
    (uuid_generate_v4(), john_user_id, john_vehicle1_id, toll_gate4_id, 35.00, 'completed', 'toll_deduction', NOW() - INTERVAL '5 days'),
    (uuid_generate_v4(), john_user_id, john_vehicle1_id, toll_gate2_id, 75.00, 'completed', 'toll_deduction', NOW() - INTERVAL '7 days'),
    (uuid_generate_v4(), john_user_id, john_vehicle1_id, toll_gate5_id, 85.00, 'completed', 'toll_deduction', NOW() - INTERVAL '12 days'),
    
    -- John's transactions with vehicle 2 (MH02CD5678)
    (uuid_generate_v4(), john_user_id, john_vehicle2_id, toll_gate1_id, 75.00, 'completed', 'toll_deduction', NOW() - INTERVAL '3 days'),
    (uuid_generate_v4(), john_user_id, john_vehicle2_id, toll_gate4_id, 35.00, 'completed', 'toll_deduction', NOW() - INTERVAL '8 days'),
    (uuid_generate_v4(), john_user_id, john_vehicle2_id, toll_gate3_id, 45.00, 'completed', 'toll_deduction', NOW() - INTERVAL '14 days'),
    
    -- Failed transaction (insufficient balance)
    (uuid_generate_v4(), john_user_id, john_vehicle1_id, toll_gate5_id, 85.00, 'failed', 'toll_deduction', NOW() - INTERVAL '1 hour'),
    
    -- Admin's transactions
    (uuid_generate_v4(), admin_user_id, admin_vehicle_id, toll_gate1_id, 75.00, 'completed', 'toll_deduction', NOW() - INTERVAL '1 day'),
    (uuid_generate_v4(), admin_user_id, admin_vehicle_id, toll_gate2_id, 75.00, 'completed', 'toll_deduction', NOW() - INTERVAL '3 days'),
    (uuid_generate_v4(), admin_user_id, admin_vehicle_id, toll_gate5_id, 85.00, 'completed', 'toll_deduction', NOW() - INTERVAL '6 days'),
    (uuid_generate_v4(), admin_user_id, admin_vehicle_id, toll_gate3_id, 45.00, 'completed', 'toll_deduction', NOW() - INTERVAL '10 days'),
    (uuid_generate_v4(), admin_user_id, admin_vehicle_id, toll_gate4_id, 35.00, 'completed', 'toll_deduction', NOW() - INTERVAL '18 days'),
    
    -- More historical transactions
    (uuid_generate_v4(), john_user_id, john_vehicle1_id, toll_gate1_id, 75.00, 'completed', 'toll_deduction', NOW() - INTERVAL '20 days'),
    (uuid_generate_v4(), john_user_id, john_vehicle2_id, toll_gate2_id, 75.00, 'completed', 'toll_deduction', NOW() - INTERVAL '25 days'),
    (uuid_generate_v4(), admin_user_id, admin_vehicle_id, toll_gate3_id, 45.00, 'completed', 'toll_deduction', NOW() - INTERVAL '30 days'),
    
    -- Recent transactions from today
    (uuid_generate_v4(), john_user_id, john_vehicle1_id, toll_gate4_id, 35.00, 'completed', 'toll_deduction', NOW() - INTERVAL '30 minutes'),
    (uuid_generate_v4(), admin_user_id, admin_vehicle_id, toll_gate5_id, 85.00, 'completed', 'toll_deduction', NOW() - INTERVAL '2 hours');

END $$;

-- Update wallet balances based on transactions (simulate realistic balances)
UPDATE wallets SET balance = 425.00 WHERE user_id = (SELECT id FROM users WHERE email = 'john.doe@example.com');
UPDATE wallets SET balance = 615.00 WHERE user_id = (SELECT id FROM users WHERE email = 'admin@smarttoll.com');

-- Show summary after population
SELECT 
    'Transactions and Recharges Populated!' as message,
    (SELECT COUNT(*) FROM transactions) as total_transactions,
    (SELECT COUNT(*) FROM recharges) as total_recharges,
    (SELECT COUNT(*) FROM transactions WHERE status = 'completed') as completed_transactions,
    (SELECT COUNT(*) FROM recharges WHERE status = 'completed') as completed_recharges,
    (SELECT SUM(amount) FROM transactions WHERE status = 'completed') as total_toll_revenue,
    (SELECT SUM(amount) FROM recharges WHERE status = 'completed') as total_recharge_amount;

-- Show recent activity
SELECT 'RECENT TRANSACTIONS' as activity_type, 
       u.name as user_name, 
       v.license_plate, 
       tg.name as location, 
       t.amount::text as amount, 
       t.status, 
       t.created_at::text as timestamp
FROM transactions t
JOIN users u ON t.user_id = u.id
JOIN vehicles v ON t.vehicle_id = v.id  
JOIN toll_gates tg ON t.toll_gate_id = tg.id
ORDER BY t.created_at DESC
LIMIT 5

UNION ALL

SELECT 'RECENT RECHARGES' as activity_type,
       u.name as user_name,
       r.payment_method as license_plate,
       'Payment Gateway' as location,
       r.amount::text as amount,
       r.status,
       r.created_at::text as timestamp
FROM recharges r
JOIN users u ON r.user_id = u.id
ORDER BY r.created_at DESC
LIMIT 5;