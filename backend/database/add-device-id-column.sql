-- Add device_id column to vehicles table
-- This column will store unique IoT device identifiers (ESP32 MAC address, UUID, QR code, etc.)

ALTER TABLE vehicles
ADD COLUMN device_id VARCHAR(100) UNIQUE;

-- Add comment to explain the column purpose
COMMENT ON COLUMN vehicles.device_id IS 'Unique identifier for IoT device (ESP32 MAC address, UUID, or QR code)';

-- Create index for faster lookups on device_id
CREATE INDEX idx_vehicles_device_id ON vehicles(device_id);

-- Update any existing vehicles with NULL device_id (optional - for existing data)
-- UPDATE vehicles SET device_id = NULL WHERE device_id IS NULL;