-- Populate vehicles table with sample data including device_id values
-- Clear existing data first (optional)
-- DELETE FROM vehicles WHERE user_id = '8116d789-c394-48af-a3fa-f06f3f231648';

-- Insert vehicles with device_id values
INSERT INTO vehicles (id, user_id, plate_number, vehicle_type, model, registered_at, is_active, created_at, updated_at, device_id) VALUES
('0dec8d29-ae5e-48d7-839c-2a83d53ebf74', '8116d789-c394-48af-a3fa-f06f3f231648', 'TN38IJ7890', 'car', 'Honda City VX CVT', '2025-09-27 08:39:27.825734+00', true, '2025-09-27 08:39:27.825734+00', '2025-09-27 08:39:27.825734+00', 'ESP32-24:0A:C4:12:34:56'),

('78af0c90-b52a-4a4f-9362-5d03e7f68f0c', '8116d789-c394-48af-a3fa-f06f3f231648', 'TN37AB1234', 'car', 'Maruti Swift DZire', '2025-09-27 08:39:27.825734+00', true, '2025-09-27 08:39:27.825734+00', '2025-09-27 08:39:27.825734+00', 'ESP32-30:AE:A4:78:9A:BC'),

('8554c67b-e93f-4192-b7a6-af9f9b3ab5ea', '8116d789-c394-48af-a3fa-f06f3f231648', 'TN37GH3456', 'bike', 'Royal Enfield Classic 350', '2025-09-27 08:39:27.825734+00', true, '2025-09-27 08:39:27.825734+00', '2025-09-27 08:39:27.825734+00', 'IOT-BIKE-001-QR789'),

('c1bdae25-9228-4689-96b3-05fd228945fb', '8116d789-c394-48af-a3fa-f06f3f231648', 'TN41EF9012', 'bus', 'Ashok Leyland Stile', '2025-09-27 08:39:27.825734+00', true, '2025-09-27 08:39:27.825734+00', '2025-09-27 08:39:27.825734+00', 'BUS-DEVICE-456-ABC'),

('c35a3b11-37e6-4a28-9c44-314a38e73f99', '8116d789-c394-48af-a3fa-f06f3f231648', 'TN38CD5678', 'truck', 'Tata Ace Gold Petrol', '2025-09-27 08:39:27.825734+00', true, '2025-09-27 08:39:27.825734+00', '2025-09-27 08:39:27.825734+00', 'TRUCK-IOT-789-DEF');

-- Verify the insertion
SELECT id, plate_number, vehicle_type, model, device_id, is_active 
FROM vehicles 
WHERE user_id = '8116d789-c394-48af-a3fa-f06f3f231648' 
ORDER BY plate_number;