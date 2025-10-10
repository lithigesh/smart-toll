-- Fix the ambiguous user_id reference in process_esp32_toll function
CREATE OR REPLACE FUNCTION process_esp32_toll(
    p_device_id VARCHAR(100),
    p_start_lat DECIMAL(10, 8),
    p_start_lon DECIMAL(11, 8),
    p_total_distance_km DECIMAL(10, 3),
    p_device_timestamp TIMESTAMP
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    transaction_id INTEGER,
    vehicle_id INTEGER,
    user_id INTEGER,
    toll_amount DECIMAL(10, 2),
    new_balance DECIMAL(10, 2)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_vehicle_id INTEGER;
    v_user_id INTEGER;
    v_vehicle_type VARCHAR(50);
    v_rate_per_km DECIMAL(10, 2);
    v_calculated_toll DECIMAL(10, 2);
    v_current_balance DECIMAL(10, 2);
    v_new_balance DECIMAL(10, 2);
    v_transaction_id INTEGER;
BEGIN
    -- Find vehicle by device_id
    SELECT v.id, v.user_id, v.vehicle_type 
    INTO v_vehicle_id, v_user_id, v_vehicle_type
    FROM vehicles v 
    WHERE v.device_id = p_device_id AND v.is_active = true;
    
    -- Check if vehicle exists
    IF v_vehicle_id IS NULL THEN
        RETURN QUERY SELECT 
            false,
            'Device not registered or inactive: ' || p_device_id,
            NULL::INTEGER,
            NULL::INTEGER,
            NULL::INTEGER,
            NULL::DECIMAL(10, 2),
            NULL::DECIMAL(10, 2);
        RETURN;
    END IF;
    
    -- Get rate per km for vehicle type
    SELECT vt.rate_per_km INTO v_rate_per_km
    FROM vehicle_types vt 
    WHERE vt.type_name = v_vehicle_type;
    
    -- Calculate toll amount
    v_calculated_toll := p_total_distance_km * v_rate_per_km;
    
    -- Get current wallet balance
    SELECT w.balance INTO v_current_balance
    FROM wallets w 
    WHERE w.user_id = v_user_id;
    
    -- Check if wallet exists
    IF v_current_balance IS NULL THEN
        -- Create wallet if it doesn't exist
        INSERT INTO wallets (user_id, balance) 
        VALUES (v_user_id, 0.00);
        v_current_balance := 0.00;
    END IF;
    
    -- Check sufficient balance
    IF v_current_balance < v_calculated_toll THEN
        -- Insert failed transaction
        INSERT INTO esp32_toll_transactions (
            device_id, vehicle_id, user_id, start_lat, start_lon, 
            total_distance_km, toll_amount, wallet_balance_before, 
            wallet_balance_after, status, device_timestamp
        ) VALUES (
            p_device_id, v_vehicle_id, v_user_id, p_start_lat, p_start_lon,
            p_total_distance_km, v_calculated_toll, v_current_balance,
            v_current_balance, 'insufficient_balance', p_device_timestamp
        ) RETURNING id INTO v_transaction_id;
        
        RETURN QUERY SELECT 
            false,
            'Insufficient wallet balance. Required: ₹' || v_calculated_toll || ', Available: ₹' || v_current_balance,
            v_transaction_id,
            v_vehicle_id,
            v_user_id,
            v_calculated_toll,
            v_current_balance;
        RETURN;
    END IF;
    
    -- Calculate new balance
    v_new_balance := v_current_balance - v_calculated_toll;
    
    -- Update wallet balance (FIXED: qualified user_id with table name)
    UPDATE wallets 
    SET balance = v_new_balance, updated_at = CURRENT_TIMESTAMP
    WHERE wallets.user_id = v_user_id;
    
    -- Insert successful transaction
    INSERT INTO esp32_toll_transactions (
        device_id, vehicle_id, user_id, start_lat, start_lon, 
        total_distance_km, toll_amount, wallet_balance_before, 
        wallet_balance_after, status, device_timestamp
    ) VALUES (
        p_device_id, v_vehicle_id, v_user_id, p_start_lat, p_start_lon,
        p_total_distance_km, v_calculated_toll, v_current_balance,
        v_new_balance, 'success', p_device_timestamp
    ) RETURNING id INTO v_transaction_id;
    
    -- Add transaction to wallet_transactions for history
    INSERT INTO wallet_transactions (
        user_id, transaction_type, amount, description, 
        balance_before, balance_after, reference_id, reference_type
    ) VALUES (
        v_user_id, 'toll_payment', -v_calculated_toll,
        'Toll payment for device ' || p_device_id || ' (' || p_total_distance_km || 'km)',
        v_current_balance, v_new_balance, v_transaction_id, 'esp32_toll'
    );
    
    RETURN QUERY SELECT 
        true,
        'Toll processed successfully. Amount: ₹' || v_calculated_toll,
        v_transaction_id,
        v_vehicle_id,
        v_user_id,
        v_calculated_toll,
        v_new_balance;
    
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 
        false,
        'Error processing toll: ' || SQLERRM,
        NULL::INTEGER,
        NULL::INTEGER,
        NULL::INTEGER,
        NULL::DECIMAL(10, 2),
        NULL::DECIMAL(10, 2);
END;
$$;