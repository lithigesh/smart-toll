-- SMART TOLL SYSTEM - COIMBATORE SAMPLE ROADS AND ZONES
-- Creates toll road zones with polygons and vehicle-type dependent rates
-- Run this after complete-setup.sql and test-data.sql

-- =============================================
-- COIMBATORE TOLL ROAD ZONES (PostGIS Polygons)
-- =============================================

-- Zone 1: NH544 Coimbatore to Salem segment (Major highway)
INSERT INTO toll_road_zones (id, name, description, zone_polygon, is_active)
VALUES (
    gen_random_uuid(),
    'NH544 Coimbatore-Salem Segment',
    'National Highway 544 connecting Coimbatore to Salem - Major commercial route',
    ST_GeomFromText('POLYGON((
        76.8500 11.0000,
        77.0000 11.0000,
        77.0000 11.0500,
        76.8500 11.0500,
        76.8500 11.0000
    ))', 4326),
    true
);

-- Zone 2: Coimbatore Ring Road (Inner city circulation)
INSERT INTO toll_road_zones (id, name, description, zone_polygon, is_active)
VALUES (
    gen_random_uuid(),
    'Coimbatore Ring Road East',
    'Eastern segment of Coimbatore Ring Road for city traffic management',
    ST_GeomFromText('POLYGON((
        76.9200 10.9800,
        76.9900 10.9800,
        76.9900 11.0600,
        76.9200 11.0600,
        76.9200 10.9800
    ))', 4326),
    true
);

-- Zone 3: NH181 Coimbatore to Pollachi (Tourism route)
INSERT INTO toll_road_zones (id, name, description, zone_polygon, is_active)
VALUES (
    gen_random_uuid(),
    'NH181 Coimbatore-Pollachi Route',
    'National Highway 181 towards Pollachi and Valparai - Popular tourism route',
    ST_GeomFromText('POLYGON((
        76.8800 10.9500,
        76.9500 10.9500,
        76.9500 11.0300,
        76.8800 11.0300,
        76.8800 10.9500
    ))', 4326),
    true
);

-- Zone 4: Airport Express Route
INSERT INTO toll_road_zones (id, name, description, zone_polygon, is_active)
VALUES (
    gen_random_uuid(),
    'Coimbatore Airport Express',
    'Dedicated express route to Coimbatore International Airport',
    ST_GeomFromText('POLYGON((
        76.9800 11.0200,
        77.0600 11.0200,
        77.0600 11.0800,
        76.9800 11.0800,
        76.9800 11.0200
    ))', 4326),
    true
);

-- Zone 5: Industrial Area Connector
INSERT INTO toll_road_zones (id, name, description, zone_polygon, is_active)
VALUES (
    gen_random_uuid(),
    'Tidel Park Industrial Connector',
    'Express route connecting major industrial areas including Tidel Park',
    ST_GeomFromText('POLYGON((
        76.9000 10.9900,
        76.9700 10.9900,
        76.9700 11.0400,
        76.9000 11.0400,
        76.9000 10.9900
    ))', 4326),
    true
);

-- =============================================
-- TOLL ROADS CREATION (linked to zones)
-- =============================================

-- Road 1: NH544 (High-capacity highway)
INSERT INTO toll_roads (id, zone_id, name, rate_per_km, minimum_fare, is_active)
SELECT 
    gen_random_uuid(),
    id,
    'NH544 Coimbatore-Salem Express',
    8.00,  -- Base rate ₹8 per km
    10.00, -- Minimum ₹10
    true
FROM toll_road_zones 
WHERE name = 'NH544 Coimbatore-Salem Segment';

-- Road 2: Ring Road (Medium traffic)
INSERT INTO toll_roads (id, zone_id, name, rate_per_km, minimum_fare, is_active)
SELECT 
    gen_random_uuid(),
    id,
    'Coimbatore Ring Road East Section',
    5.00,  -- Base rate ₹5 per km
    8.00,  -- Minimum ₹8
    true
FROM toll_road_zones 
WHERE name = 'Coimbatore Ring Road East';

-- Road 3: NH181 (Tourism route - moderate pricing)
INSERT INTO toll_roads (id, zone_id, name, rate_per_km, minimum_fare, is_active)
SELECT 
    gen_random_uuid(),
    id,
    'NH181 Pollachi Tourism Route',
    6.00,  -- Base rate ₹6 per km
    8.00,  -- Minimum ₹8
    true
FROM toll_road_zones 
WHERE name = 'NH181 Coimbatore-Pollachi Route';

-- Road 4: Airport Express (Premium pricing)
INSERT INTO toll_roads (id, zone_id, name, rate_per_km, minimum_fare, is_active)
SELECT 
    gen_random_uuid(),
    id,
    'Airport Express Premium Route',
    12.00, -- Premium rate ₹12 per km
    15.00, -- Minimum ₹15
    true
FROM toll_road_zones 
WHERE name = 'Coimbatore Airport Express';

-- Road 5: Industrial Connector (Commercial rate)
INSERT INTO toll_roads (id, zone_id, name, rate_per_km, minimum_fare, is_active)
SELECT 
    gen_random_uuid(),
    id,
    'Tidel Park Industrial Express',
    7.00,  -- Commercial rate ₹7 per km
    10.00, -- Minimum ₹10
    true
FROM toll_road_zones 
WHERE name = 'Tidel Park Industrial Connector';

-- =============================================
-- VEHICLE TYPE RATES (Different rates per vehicle type)
-- =============================================

-- NH544 Coimbatore-Salem rates
INSERT INTO vehicle_type_rates (toll_road_id, vehicle_type, rate_per_km)
SELECT tr.id, 'car', 8.00 FROM toll_roads tr 
JOIN toll_road_zones tz ON tr.zone_id = tz.id 
WHERE tz.name = 'NH544 Coimbatore-Salem Segment';

INSERT INTO vehicle_type_rates (toll_road_id, vehicle_type, rate_per_km)
SELECT tr.id, 'bike', 4.00 FROM toll_roads tr 
JOIN toll_road_zones tz ON tr.zone_id = tz.id 
WHERE tz.name = 'NH544 Coimbatore-Salem Segment';

INSERT INTO vehicle_type_rates (toll_road_id, vehicle_type, rate_per_km)
SELECT tr.id, 'truck', 16.00 FROM toll_roads tr 
JOIN toll_road_zones tz ON tr.zone_id = tz.id 
WHERE tz.name = 'NH544 Coimbatore-Salem Segment';

INSERT INTO vehicle_type_rates (toll_road_id, vehicle_type, rate_per_km)
SELECT tr.id, 'bus', 14.00 FROM toll_roads tr 
JOIN toll_road_zones tz ON tr.zone_id = tz.id 
WHERE tz.name = 'NH544 Coimbatore-Salem Segment';

-- Ring Road East rates (Lower for city traffic)
INSERT INTO vehicle_type_rates (toll_road_id, vehicle_type, rate_per_km)
SELECT tr.id, 'car', 5.00 FROM toll_roads tr 
JOIN toll_road_zones tz ON tr.zone_id = tz.id 
WHERE tz.name = 'Coimbatore Ring Road East';

INSERT INTO vehicle_type_rates (toll_road_id, vehicle_type, rate_per_km)
SELECT tr.id, 'bike', 2.50 FROM toll_roads tr 
JOIN toll_road_zones tz ON tr.zone_id = tz.id 
WHERE tz.name = 'Coimbatore Ring Road East';

INSERT INTO vehicle_type_rates (toll_road_id, vehicle_type, rate_per_km)
SELECT tr.id, 'truck', 10.00 FROM toll_roads tr 
JOIN toll_road_zones tz ON tr.zone_id = tz.id 
WHERE tz.name = 'Coimbatore Ring Road East';

INSERT INTO vehicle_type_rates (toll_road_id, vehicle_type, rate_per_km)
SELECT tr.id, 'bus', 8.00 FROM toll_roads tr 
JOIN toll_road_zones tz ON tr.zone_id = tz.id 
WHERE tz.name = 'Coimbatore Ring Road East';

-- NH181 Pollachi tourism route rates
INSERT INTO vehicle_type_rates (toll_road_id, vehicle_type, rate_per_km)
SELECT tr.id, 'car', 6.00 FROM toll_roads tr 
JOIN toll_road_zones tz ON tr.zone_id = tz.id 
WHERE tz.name = 'NH181 Coimbatore-Pollachi Route';

INSERT INTO vehicle_type_rates (toll_road_id, vehicle_type, rate_per_km)
SELECT tr.id, 'bike', 3.00 FROM toll_roads tr 
JOIN toll_road_zones tz ON tr.zone_id = tz.id 
WHERE tz.name = 'NH181 Coimbatore-Pollachi Route';

INSERT INTO vehicle_type_rates (toll_road_id, vehicle_type, rate_per_km)
SELECT tr.id, 'truck', 12.00 FROM toll_roads tr 
JOIN toll_road_zones tz ON tr.zone_id = tz.id 
WHERE tz.name = 'NH181 Coimbatore-Pollachi Route';

INSERT INTO vehicle_type_rates (toll_road_id, vehicle_type, rate_per_km)
SELECT tr.id, 'bus', 9.00 FROM toll_roads tr 
JOIN toll_road_zones tz ON tr.zone_id = tz.id 
WHERE tz.name = 'NH181 Coimbatore-Pollachi Route';

-- Airport Express premium rates
INSERT INTO vehicle_type_rates (toll_road_id, vehicle_type, rate_per_km)
SELECT tr.id, 'car', 12.00 FROM toll_roads tr 
JOIN toll_road_zones tz ON tr.zone_id = tz.id 
WHERE tz.name = 'Coimbatore Airport Express';

INSERT INTO vehicle_type_rates (toll_road_id, vehicle_type, rate_per_km)
SELECT tr.id, 'bike', 6.00 FROM toll_roads tr 
JOIN toll_road_zones tz ON tr.zone_id = tz.id 
WHERE tz.name = 'Coimbatore Airport Express';

INSERT INTO vehicle_type_rates (toll_road_id, vehicle_type, rate_per_km)
SELECT tr.id, 'truck', 20.00 FROM toll_roads tr 
JOIN toll_road_zones tz ON tr.zone_id = tz.id 
WHERE tz.name = 'Coimbatore Airport Express';

INSERT INTO vehicle_type_rates (toll_road_id, vehicle_type, rate_per_km)
SELECT tr.id, 'bus', 18.00 FROM toll_roads tr 
JOIN toll_road_zones tz ON tr.zone_id = tz.id 
WHERE tz.name = 'Coimbatore Airport Express';

-- Industrial Connector commercial rates
INSERT INTO vehicle_type_rates (toll_road_id, vehicle_type, rate_per_km)
SELECT tr.id, 'car', 7.00 FROM toll_roads tr 
JOIN toll_road_zones tz ON tr.zone_id = tz.id 
WHERE tz.name = 'Tidel Park Industrial Connector';

INSERT INTO vehicle_type_rates (toll_road_id, vehicle_type, rate_per_km)
SELECT tr.id, 'bike', 3.50 FROM toll_roads tr 
JOIN toll_road_zones tz ON tr.zone_id = tz.id 
WHERE tz.name = 'Tidel Park Industrial Connector';

INSERT INTO vehicle_type_rates (toll_road_id, vehicle_type, rate_per_km)
SELECT tr.id, 'truck', 14.00 FROM toll_roads tr 
JOIN toll_road_zones tz ON tr.zone_id = tz.id 
WHERE tz.name = 'Tidel Park Industrial Connector';

INSERT INTO vehicle_type_rates (toll_road_id, vehicle_type, rate_per_km)
SELECT tr.id, 'bus', 11.00 FROM toll_roads tr 
JOIN toll_road_zones tz ON tr.zone_id = tz.id 
WHERE tz.name = 'Tidel Park Industrial Connector';

-- =============================================
-- VERIFICATION AND SUMMARY
-- =============================================

DO $$
DECLARE
    zone_count INTEGER;
    road_count INTEGER;
    rate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO zone_count FROM toll_road_zones;
    SELECT COUNT(*) INTO road_count FROM toll_roads;
    SELECT COUNT(*) INTO rate_count FROM vehicle_type_rates;
    
    RAISE NOTICE '=== COIMBATORE ROADS SETUP SUMMARY ===';
    RAISE NOTICE 'Toll road zones created: %', zone_count;
    RAISE NOTICE 'Toll roads created: %', road_count;
    RAISE NOTICE 'Vehicle type rates configured: %', rate_count;
    RAISE NOTICE '======================================';
END $$;

-- Display all created zones and roads with their rates
SELECT 
    tz.name AS zone_name,
    tr.name AS road_name,
    tr.rate_per_km AS base_rate,
    tr.minimum_fare,
    COUNT(vtr.id) AS vehicle_types_configured
FROM toll_road_zones tz
JOIN toll_roads tr ON tz.id = tr.zone_id
LEFT JOIN vehicle_type_rates vtr ON tr.id = vtr.toll_road_id
GROUP BY tz.id, tz.name, tr.id, tr.name, tr.rate_per_km, tr.minimum_fare
ORDER BY tz.name;

-- Display rate structure for each road
SELECT 
    tz.name AS zone_name,
    tr.name AS road_name,
    vtr.vehicle_type,
    vtr.rate_per_km
FROM toll_road_zones tz
JOIN toll_roads tr ON tz.id = tr.zone_id
JOIN vehicle_type_rates vtr ON tr.id = vtr.toll_road_id
ORDER BY tz.name, vtr.vehicle_type;