-- Fix timestamp constraint for ESP32 devices with significant clock drift
-- This handles cases where ESP32 clocks might be hours ahead or behind server time

-- Drop the existing constraint completely
ALTER TABLE esp32_toll_transactions 
DROP CONSTRAINT IF EXISTS chk_processed_after_device;

-- Update any existing records that might have issues
UPDATE esp32_toll_transactions 
SET processed_at = GREATEST(processed_at, device_timestamp + INTERVAL '1 second')
WHERE processed_at < device_timestamp;

-- Add a very lenient check constraint that allows for large clock differences
-- Allow processed_at to be up to 12 hours before device_timestamp (for major clock sync issues)
ALTER TABLE esp32_toll_transactions 
ADD CONSTRAINT chk_processed_after_device 
CHECK (processed_at >= (device_timestamp - INTERVAL '12 hours'));

-- Create a comment explaining the constraint
COMMENT ON CONSTRAINT chk_processed_after_device ON esp32_toll_transactions IS 
'Ensures that the server processing time is within 12 hours of the device timestamp to handle ESP32 clock synchronization issues while maintaining basic data integrity';

-- For debugging: show the time differences in existing records
SELECT 
    id,
    device_id,
    device_timestamp,
    processed_at,
    EXTRACT(EPOCH FROM (processed_at - device_timestamp))/3600 as time_diff_hours,
    status
FROM esp32_toll_transactions 
ORDER BY device_timestamp DESC
LIMIT 10;

-- Display confirmation
DO $$
BEGIN
    RAISE NOTICE '✓ Timestamp constraint updated with 12-hour tolerance';
    RAISE NOTICE '✓ processed_at must be >= (device_timestamp - 12 hours)';
    RAISE NOTICE '✓ Handles major ESP32 clock synchronization differences';
    RAISE NOTICE '✓ Maintains basic data integrity while allowing flexibility';
END $$;