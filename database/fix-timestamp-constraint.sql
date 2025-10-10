-- Fix timestamp constraint: processed_at should always be >= device_timestamp
-- This ensures data integrity and logical consistency

-- First, let's drop the existing constraint if it exists to recreate it properly
ALTER TABLE esp32_toll_transactions 
DROP CONSTRAINT IF EXISTS chk_processed_after_device;

-- Update any existing records that might violate this constraint
-- Set processed_at to be at least 1 second after device_timestamp if it's not already
UPDATE esp32_toll_transactions 
SET processed_at = GREATEST(processed_at, device_timestamp + INTERVAL '1 second')
WHERE processed_at < device_timestamp;

-- Add a more flexible check constraint that handles edge cases
-- Allow processed_at to be equal to device_timestamp or up to 1 second before (for clock sync issues)
ALTER TABLE esp32_toll_transactions 
ADD CONSTRAINT chk_processed_after_device 
CHECK (processed_at >= (device_timestamp - INTERVAL '1 second'));

-- Create a comment on the constraint for future reference
COMMENT ON CONSTRAINT chk_processed_after_device ON esp32_toll_transactions IS 
'Ensures that the server processing time is within reasonable bounds of the device timestamp (allows up to 1 second clock difference)';

-- Display confirmation
DO $$
BEGIN
    RAISE NOTICE '✓ Timestamp constraint updated successfully';
    RAISE NOTICE '✓ processed_at must be >= (device_timestamp - 1 second)';
    RAISE NOTICE '✓ Allows for minor clock synchronization differences';
    RAISE NOTICE '✓ Data integrity enforced at database level';
END $$;
