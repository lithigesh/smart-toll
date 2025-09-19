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
   * Get all active toll road zones
   * @returns {Promise<Array>} - Array of toll road zones
   */
  static async getAll() {
    const { data, error } = await supabase
      .from('toll_road_zones')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      console.error('Error fetching toll road zones:', error);
      throw error;
    }
    
    return data;
  }

  /**
   * Get toll road zone by ID
   * @param {string} zoneId - Zone ID
   * @returns {Promise<Object|null>} - Toll road zone or null
   */
  static async getById(zoneId) {
    const { data, error } = await supabase
      .from('toll_road_zones')
      .select('*')
      .eq('id', zoneId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching toll road zone:', error);
      throw error;
    }
    
    return data || null;
  }

  /**
   * Check if a GPS point is within any toll zone
   * Uses PostGIS ST_Within function
   * @param {number} latitude - GPS latitude
   * @param {number} longitude - GPS longitude
   * @returns {Promise<Object|null>} - Toll zone if point is within, null otherwise
   */
  static async findZoneContainingPoint(latitude, longitude) {
    try {
      // Use PostGIS function to check if point is within any toll zone polygon
      const { data, error } = await supabase.rpc('find_toll_zone_for_point', {
        lat: latitude,
        lon: longitude
      });

      if (error) {
        console.error('Error checking point in toll zones:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in findZoneContainingPoint:', error);
      throw error;
    }
  }

  /**
   * Get toll zones within a specific area (bounding box)
   * @param {Object} bounds - Bounding box coordinates
   * @param {number} bounds.north - North boundary
   * @param {number} bounds.south - South boundary  
   * @param {number} bounds.east - East boundary
   * @param {number} bounds.west - West boundary
   * @returns {Promise<Array>} - Array of toll zones within bounds
   */
  static async getZonesInBounds({ north, south, east, west }) {
    try {
      const { data, error } = await supabase.rpc('get_zones_in_bounds', {
        north_lat: north,
        south_lat: south,
        east_lon: east,
        west_lon: west
      });

      if (error) {
        console.error('Error fetching zones in bounds:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getZonesInBounds:', error);
      throw error;
    }
  }

  /**
   * Create a new toll road zone
   * @param {Object} zoneData - Zone data
   * @returns {Promise<Object>} - Created zone
   */
  static async create(zoneData) {
    const { data, error } = await supabase
      .from('toll_road_zones')
      .insert(zoneData)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating toll road zone:', error);
      throw error;
    }
    
    return data;
  }

  /**
   * Update toll road zone
   * @param {string} zoneId - Zone ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} - Updated zone
   */
  static async update(zoneId, updates) {
    const { data, error } = await supabase
      .from('toll_road_zones')
      .update(updates)
      .eq('id', zoneId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating toll road zone:', error);
      throw error;
    }
    
    return data;
  }

  /**
   * Delete toll road zone (soft delete - set is_active to false)
   * @param {string} zoneId - Zone ID
   * @returns {Promise<boolean>} - Success status
   */
  static async delete(zoneId) {
    const { error } = await supabase
      .from('toll_road_zones')
      .update({ is_active: false })
      .eq('id', zoneId);
    
    if (error) {
      console.error('Error deleting toll road zone:', error);
      throw error;
    }
    
    return true;
  }
}

module.exports = TollRoadZone;