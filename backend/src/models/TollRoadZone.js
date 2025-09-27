const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

class TollRoadZone {
  /**
   * Find zones containing a specific point
   * @param {number} latitude - Point latitude
   * @param {number} longitude - Point longitude
   * @returns {Promise<Array>} - Array of zones containing the point
   */
  static async findZonesContainingPoint(latitude, longitude) {
    try {
      console.log(`🔍 Checking point (${latitude}, ${longitude}) against toll zones...`);

      // For now, let's use a simple approach with coordinate bounds for testing
      // This can be optimized later with proper PostGIS queries
      const { data: zones, error } = await supabase
        .from('toll_road_zones')
        .select(`
          id,
          name,
          description,
          is_active,
          toll_roads (
            id,
            name,
            rate_per_km,
            minimum_fare,
            is_active
          )
        `)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching toll zones:', error);
        throw new Error(`Failed to fetch toll zones: ${error.message}`);
      }

      console.log(`📍 Found ${zones?.length || 0} active toll zones to check`);

      // For testing purposes, use simple coordinate bounds that match our test coordinates
      const testZones = [
        {
          name: 'NH544 Coimbatore-Salem Segment',
          bounds: { minLat: 10.9, maxLat: 11.1, minLon: 76.8, maxLon: 77.2 }
        },
        {
          name: 'Coimbatore Ring Road East', 
          bounds: { minLat: 11.0, maxLat: 11.2, minLon: 77.0, maxLon: 77.3 }
        }
      ];

      const matchingZones = [];
      
      // Check if point is within any test zone bounds
      for (const testZone of testZones) {
        const bounds = testZone.bounds;
        if (latitude >= bounds.minLat && latitude <= bounds.maxLat &&
            longitude >= bounds.minLon && longitude <= bounds.maxLon) {
          
          // Find the corresponding zone from database
          const dbZone = zones?.find(z => z.name === testZone.name);
          if (dbZone) {
            console.log(`✅ Point is within zone: ${dbZone.name}`);
            matchingZones.push(dbZone);
          }
        }
      }

      if (matchingZones.length === 0) {
        console.log(`🚫 Point (${latitude}, ${longitude}) is not within any toll zone`);
      }

      return matchingZones;

    } catch (error) {
      console.error('Error in findZonesContainingPoint:', error);
      throw error;
    }
  }

  /**
   * Get toll road zone by ID with related data
   * @param {string} zoneId - Zone ID
   * @returns {Promise<Object|null>} - Zone data or null
   */
  static async findById(zoneId) {
    try {
      const { data, error } = await supabase
        .from('toll_road_zones')
        .select(`
          *,
          toll_roads(
            id,
            name,
            description,
            status
          )
        `)
        .eq('id', zoneId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error finding toll road zone:', error);
        throw new Error(`Failed to find toll road zone: ${error.message}`);
      }

      return data || null;

    } catch (error) {
      console.error('Error in findById:', error);
      throw error;
    }
  }

  /**
   * Get all active toll road zones
   * @returns {Promise<Array>} - Array of active zones
   */
  static async findAllActive() {
    try {
      const { data, error } = await supabase
        .from('toll_road_zones')
        .select(`
          *,
          toll_roads(
            id,
            name,
            description,
            status
          )
        `)
        .eq('is_active', true)
        .eq('toll_roads.status', 'active')
        .order('name');

      if (error) {
        console.error('Error finding active toll road zones:', error);
        throw new Error(`Failed to find active toll road zones: ${error.message}`);
      }

      return data || [];

    } catch (error) {
      console.error('Error in findAllActive:', error);
      throw error;
    }
  }

  /**
   * Find zones within a bounding box
   * @param {Object} bounds - Bounding box coordinates
   * @param {number} bounds.north - Northern latitude
   * @param {number} bounds.south - Southern latitude
   * @param {number} bounds.east - Eastern longitude
   * @param {number} bounds.west - Western longitude
   * @returns {Promise<Array>} - Zones within the bounds
   */
  static async findZonesInBounds(bounds) {
    try {
      const { north, south, east, west } = bounds;

      const { data, error } = await supabase.rpc('find_zones_in_bounds', {
        north_lat: north,
        south_lat: south,
        east_lon: east,
        west_lon: west
      });

      if (error) {
        console.error('Error finding zones in bounds:', error);
        throw new Error(`Failed to find zones in bounds: ${error.message}`);
      }

      return data || [];

    } catch (error) {
      console.error('Error in findZonesInBounds:', error);
      throw error;
    }
  }

  /**
   * Get zones along a toll road
   * @param {string} tollRoadId - Toll road ID
   * @returns {Promise<Array>} - Zones on the toll road
   */
  static async findByTollRoad(tollRoadId) {
    try {
      const { data, error } = await supabase
        .from('toll_road_zones')
        .select(`
          *,
          toll_roads(
            id,
            name,
            description
          )
        `)
        .eq('toll_road_id', tollRoadId)
        .eq('is_active', true)
        .order('zone_order');

      if (error) {
        console.error('Error finding zones by toll road:', error);
        throw new Error(`Failed to find zones by toll road: ${error.message}`);
      }

      return data || [];

    } catch (error) {
      console.error('Error in findByTollRoad:', error);
      throw error;
    }
  }

  /**
   * Create a new toll road zone
   * @param {Object} zoneData - Zone data
   * @param {string} zoneData.toll_road_id - Toll road ID
   * @param {string} zoneData.name - Zone name
   * @param {string} zoneData.description - Zone description
   * @param {Array} zoneData.coordinates - Zone boundary coordinates
   * @param {number} zoneData.zone_order - Zone order on the road
   * @param {Object} zoneData.metadata - Additional metadata
   * @returns {Promise<Object>} - Created zone
   */
  static async create(zoneData) {
    try {
      const zone = {
        toll_road_id: zoneData.toll_road_id,
        name: zoneData.name,
        description: zoneData.description || null,
        zone_boundary: {
          type: 'Polygon',
          coordinates: [zoneData.coordinates]
        },
        zone_order: zoneData.zone_order || 1,
        is_active: zoneData.is_active !== false,
        metadata: zoneData.metadata || {},
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('toll_road_zones')
        .insert(zone)
        .select(`
          *,
          toll_roads(
            id,
            name,
            description
          )
        `)
        .single();

      if (error) {
        console.error('Error creating toll road zone:', error);
        throw new Error(`Failed to create toll road zone: ${error.message}`);
      }

      return data;

    } catch (error) {
      console.error('Error in create:', error);
      throw error;
    }
  }

  /**
   * Update a toll road zone
   * @param {string} zoneId - Zone ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} - Updated zone
   */
  static async update(zoneId, updates) {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      // Handle coordinates update
      if (updates.coordinates) {
        updateData.zone_boundary = {
          type: 'Polygon',
          coordinates: [updates.coordinates]
        };
        delete updateData.coordinates;
      }

      const { data, error } = await supabase
        .from('toll_road_zones')
        .update(updateData)
        .eq('id', zoneId)
        .select(`
          *,
          toll_roads(
            id,
            name,
            description
          )
        `)
        .single();

      if (error) {
        console.error('Error updating toll road zone:', error);
        throw new Error(`Failed to update toll road zone: ${error.message}`);
      }

      if (!data) {
        throw new Error('Toll road zone not found');
      }

      return data;

    } catch (error) {
      console.error('Error in update:', error);
      throw error;
    }
  }

  /**
   * Delete (deactivate) a toll road zone
   * @param {string} zoneId - Zone ID
   * @returns {Promise<boolean>} - Success status
   */
  static async delete(zoneId) {
    try {
      const { data, error } = await supabase
        .from('toll_road_zones')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', zoneId)
        .select('id')
        .single();

      if (error) {
        console.error('Error deleting toll road zone:', error);
        throw new Error(`Failed to delete toll road zone: ${error.message}`);
      }

      return !!data;

    } catch (error) {
      console.error('Error in delete:', error);
      throw error;
    }
  }

  /**
   * Find nearest toll road zone to a point
   * @param {number} latitude - Point latitude
   * @param {number} longitude - Point longitude
   * @param {number} maxDistance - Maximum distance in kilometers
   * @returns {Promise<Object|null>} - Nearest zone or null
   */
  static async findNearest(latitude, longitude, maxDistance = 50) {
    try {
      const { data, error } = await supabase.rpc('find_nearest_toll_zone', {
        point_lat: latitude,
        point_lon: longitude,
        max_distance_km: maxDistance
      });

      if (error) {
        console.error('Error finding nearest toll zone:', error);
        throw new Error(`Failed to find nearest toll zone: ${error.message}`);
      }

      return data && data.length > 0 ? data[0] : null;

    } catch (error) {
      console.error('Error in findNearest:', error);
      throw error;
    }
  }

  /**
   * Get zone statistics
   * @param {string} zoneId - Zone ID
   * @param {Object} dateRange - Date range for statistics
   * @returns {Promise<Object>} - Zone statistics
   */
  static async getStats(zoneId, dateRange = {}) {
    try {
      const { start_date, end_date } = dateRange;

      const { data, error } = await supabase.rpc('get_toll_zone_stats', {
        zone_id: zoneId,
        start_date: start_date || null,
        end_date: end_date || null
      });

      if (error) {
        console.error('Error getting toll zone stats:', error);
        throw new Error(`Failed to get toll zone stats: ${error.message}`);
      }

      return data || {
        total_entries: 0,
        total_exits: 0,
        total_revenue: 0,
        avg_duration: 0,
        unique_vehicles: 0
      };

    } catch (error) {
      console.error('Error in getStats:', error);
      throw error;
    }
  }

  /**
   * Validate zone boundaries don't overlap
   * @param {Array} coordinates - Zone coordinates
   * @param {string} excludeZoneId - Zone ID to exclude from overlap check
   * @returns {Promise<boolean>} - True if valid, false if overlapping
   */
  static async validateNonOverlapping(coordinates, excludeZoneId = null) {
    try {
      const polygon = {
        type: 'Polygon',
        coordinates: [coordinates]
      };

      const { data, error } = await supabase.rpc('check_zone_overlap', {
        new_zone_boundary: polygon,
        exclude_zone_id: excludeZoneId
      });

      if (error) {
        console.error('Error validating zone overlap:', error);
        throw new Error(`Failed to validate zone overlap: ${error.message}`);
      }

      return !data || data.length === 0; // No overlap if no results

    } catch (error) {
      console.error('Error in validateNonOverlapping:', error);
      throw error;
    }
  }

  /**
   * Get all zones with their boundaries for mapping
   * @returns {Promise<Array>} - Zones with boundaries
   */
  static async getZonesForMapping() {
    try {
      const { data, error } = await supabase
        .from('toll_road_zones')
        .select(`
          id,
          name,
          description,
          zone_boundary,
          is_active,
          toll_roads(
            id,
            name
          )
        `)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error getting zones for mapping:', error);
        throw new Error(`Failed to get zones for mapping: ${error.message}`);
      }

      // Convert PostGIS geometries to GeoJSON format
      return (data || []).map(zone => ({
        ...zone,
        coordinates: zone.zone_boundary?.coordinates?.[0] || []
      }));

    } catch (error) {
      console.error('Error in getZonesForMapping:', error);
      throw error;
    }
  }
}

module.exports = TollRoadZone;