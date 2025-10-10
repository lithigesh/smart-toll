-- Fix timestamp constraint with more tolerance for ESP32 clock synchronization
-- This handles cases where ESP32 clocks might be slightly ahead of server time

-- Drop the existing constraint
ALTER TABLE esp32_toll_transactions 
DROP CONSTRAINT IF EXISTS chk_processed_after_device;

-- Update any existing records that might violate this constraint
UPDATE esp32_toll_transactions 
SET processed_at = GREATEST(processed_at, device_timestamp + INTERVAL '1 second')
WHERE processed_at < device_timestamp;

-- Add a very flexible check constraint that allows for significant clock differences
-- Allow processed_at to be up to 30 seconds before device_timestamp (for clock sync issues)
ALTER TABLE esp32_toll_transactions 
ADD CONSTRAINT chk_processed_after_device 
CHECK (processed_at >= (device_timestamp - INTERVAL '30 seconds'));

-- Create a comment on the constraint for future reference
COMMENT ON CONSTRAINT chk_processed_after_device ON esp32_toll_transactions IS 
'Ensures that the server processing time is within reasonable bounds of the device timestamp (allows up to 30 seconds clock difference for ESP32 synchronization)';

-- For debugging: show any records that would still violate the constraint
SELECT 
    id,
    device_timestamp,
    processed_at,
    EXTRACT(EPOCH FROM (processed_at - device_timestamp)) as time_diff_seconds
FROM esp32_toll_transactions 
WHERE processed_at < (device_timestamp - INTERVAL '30 seconds')
ORDER BY device_timestamp DESC
LIMIT 5;

-- Display confirmation
DO $$
BEGIN
    RAISE NOTICE '✓ Timestamp constraint updated with 30-second tolerance';
    RAISE NOTICE '✓ processed_at must be >= (device_timestamp - 30 seconds)';
    RAISE NOTICE '✓ Allows for ESP32 clock synchronization differences';
END $$;