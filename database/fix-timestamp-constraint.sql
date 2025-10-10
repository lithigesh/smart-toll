-- Fix timestamp constraint: processed_at should always be >= device_timestamp
-- This ensures data integrity and logical consistency

-- Add a check constraint to ensure processed_at is always >= device_timestamp
ALTER TABLE esp32_toll_transactions 
ADD CONSTRAINT chk_processed_after_device 
CHECK (processed_at >= device_timestamp);

-- Update any existing records that might violate this constraint
-- (This should not be needed with our current data, but just in case)
UPDATE esp32_toll_transactions 
SET processed_at = device_timestamp + INTERVAL '1 second'
WHERE processed_at < device_timestamp;

-- Create a comment on the constraint for future reference
COMMENT ON CONSTRAINT chk_processed_after_device ON esp32_toll_transactions IS 
'Ensures that the server processing time is always after or equal to the device timestamp';

-- Display confirmation
DO $$
BEGIN
    RAISE NOTICE '✓ Timestamp constraint added successfully';
    RAISE NOTICE '✓ processed_at must be >= device_timestamp';
    RAISE NOTICE '✓ Data integrity enforced at database level';
END $$;