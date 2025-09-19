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

class GpsLog {
  /**
   * Log GPS position for a vehicle
   * @param {Object} gpsData - GPS data
   * @param {string} gpsData.vehicle_id - Vehicle ID
   * @param {number} gpsData.latitude - GPS latitude
   * @param {number} gpsData.longitude - GPS longitude
   * @param {number} gpsData.speed - Speed in km/h (optional)
   * @param {number} gpsData.heading - Heading in degrees (optional)
   * @param {number} gpsData.accuracy - GPS accuracy in meters (optional)
   * @returns {Promise<Object>} - Created GPS log entry
   */
  static async logPosition(gpsData) {
    // Use PostGIS to create point geometry from latitude and longitude
    const { data, error } = await supabase.rpc('log_gps_position', {
      p_vehicle_id: gpsData.vehicle_id,
      p_latitude: gpsData.latitude,
      p_longitude: gpsData.longitude,
      p_speed: gpsData.speed || null,
      p_heading: gpsData.heading || null,
      p_accuracy: gpsData.accuracy || null
    });
    
    if (error) {
      console.error('Error logging GPS position:', error);
      throw error;
    }
    
    return data;
  }

  /**
   * Get recent GPS positions for a vehicle
   * @param {string} vehicleId - Vehicle ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of positions to return
   * @param {number} options.minutes - Minutes back to query
   * @returns {Promise<Array>} - Array of GPS positions
   */
  static async getRecentPositions(vehicleId, { limit = 50, minutes = 60 } = {}) {
    const timeAgo = new Date();
    timeAgo.setMinutes(timeAgo.getMinutes() - minutes);

    const { data, error } = await supabase
      .from('gps_logs')
      .select(`
        id,
        latitude,
        longitude,
        speed,
        heading,
        accuracy,
        logged_at,
        ST_X(location::geometry) as lon,
        ST_Y(location::geometry) as lat
      `)
      .eq('vehicle_id', vehicleId)
      .gte('logged_at', timeAgo.toISOString())
      .order('logged_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching recent GPS positions:', error);
      throw error;
    }
    
    return data || [];
  }

  /**
   * Get GPS trail for a vehicle within a time range
   * @param {string} vehicleId - Vehicle ID
   * @param {string} startTime - Start time (ISO string)
   * @param {string} endTime - End time (ISO string)
   * @returns {Promise<Array>} - Array of GPS positions in chronological order
   */
  static async getGpsTrail(vehicleId, startTime, endTime) {
    const { data, error } = await supabase
      .from('gps_logs')
      .select(`
        id,
        latitude,
        longitude,
        speed,
        heading,
        accuracy,
        logged_at
      `)
      .eq('vehicle_id', vehicleId)
      .gte('logged_at', startTime)
      .lte('logged_at', endTime)
      .order('logged_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching GPS trail:', error);
      throw error;
    }
    
    return data || [];
  }

  /**
   * Calculate distance traveled by a vehicle in a time period
   * @param {string} vehicleId - Vehicle ID
   * @param {string} startTime - Start time (ISO string)
   * @param {string} endTime - End time (ISO string)
   * @returns {Promise<number>} - Distance in kilometers
   */
  static async calculateDistanceTraveled(vehicleId, startTime, endTime) {
    const { data, error } = await supabase.rpc('calculate_vehicle_distance', {
      p_vehicle_id: vehicleId,
      p_start_time: startTime,
      p_end_time: endTime
    });
    
    if (error) {
      console.error('Error calculating distance traveled:', error);
      throw error;
    }
    
    return data || 0;
  }

  /**
   * Get vehicles currently within a geographical area
   * @param {Object} bounds - Geographical bounds
   * @param {number} bounds.north - North latitude
   * @param {number} bounds.south - South latitude
   * @param {number} bounds.east - East longitude
   * @param {number} bounds.west - West longitude
   * @param {number} maxAgeMinutes - Maximum age of GPS position in minutes
   * @returns {Promise<Array>} - Array of vehicles with their latest positions
   */
  static async getVehiclesInArea(bounds, maxAgeMinutes = 10) {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - maxAgeMinutes);

    const { data, error } = await supabase.rpc('get_vehicles_in_bounds', {
      p_north: bounds.north,
      p_south: bounds.south,
      p_east: bounds.east,
      p_west: bounds.west,
      p_max_age: cutoffTime.toISOString()
    });
    
    if (error) {
      console.error('Error fetching vehicles in area:', error);
      throw error;
    }
    
    return data || [];
  }

  /**
   * Get latest GPS position for a vehicle
   * @param {string} vehicleId - Vehicle ID
   * @returns {Promise<Object|null>} - Latest GPS position or null
   */
  static async getLatestPosition(vehicleId) {
    const { data, error } = await supabase
      .from('gps_logs')
      .select(`
        id,
        latitude,
        longitude,
        speed,
        heading,
        accuracy,
        logged_at
      `)
      .eq('vehicle_id', vehicleId)
      .order('logged_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching latest GPS position:', error);
      throw error;
    }
    
    return data || null;
  }

  /**
   * Clean up old GPS logs to manage storage
   * @param {number} daysOld - Delete logs older than this many days
   * @returns {Promise<number>} - Number of records deleted
   */
  static async cleanupOldLogs(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { data, error } = await supabase
      .from('gps_logs')
      .delete()
      .lt('logged_at', cutoffDate.toISOString())
      .select('id');
    
    if (error) {
      console.error('Error cleaning up old GPS logs:', error);
      throw error;
    }
    
    const deletedCount = data ? data.length : 0;
    console.log(`Cleaned up ${deletedCount} GPS log entries older than ${daysOld} days`);
    return deletedCount;
  }

  /**
   * Get GPS statistics for a vehicle
   * @param {string} vehicleId - Vehicle ID
   * @param {string} startDate - Start date (ISO string)
   * @param {string} endDate - End date (ISO string)
   * @returns {Promise<Object>} - GPS statistics
   */
  static async getVehicleGpsStats(vehicleId, startDate, endDate) {
    const { data, error } = await supabase.rpc('get_vehicle_gps_stats', {
      p_vehicle_id: vehicleId,
      p_start_date: startDate,
      p_end_date: endDate
    });
    
    if (error) {
      console.error('Error fetching vehicle GPS stats:', error);
      throw error;
    }
    
    return data || {
      total_logs: 0,
      total_distance_km: 0,
      average_speed: 0,
      max_speed: 0,
      first_log: null,
      last_log: null
    };
  }

  /**
   * Check if vehicle is currently moving (based on recent GPS data)
   * @param {string} vehicleId - Vehicle ID
   * @param {number} speedThreshold - Minimum speed to consider moving (km/h)
   * @param {number} timeWindowMinutes - Time window to check for movement
   * @returns {Promise<boolean>} - True if vehicle is moving
   */
  static async isVehicleMoving(vehicleId, speedThreshold = 5, timeWindowMinutes = 5) {
    const timeAgo = new Date();
    timeAgo.setMinutes(timeAgo.getMinutes() - timeWindowMinutes);

    const { data, error } = await supabase
      .from('gps_logs')
      .select('speed')
      .eq('vehicle_id', vehicleId)
      .gte('logged_at', timeAgo.toISOString())
      .not('speed', 'is', null)
      .gte('speed', speedThreshold)
      .limit(1);
    
    if (error) {
      console.error('Error checking vehicle movement:', error);
      throw error;
    }
    
    return data && data.length > 0;
  }

  /**
   * Get GPS data for generating a heat map
   * @param {Object} bounds - Geographical bounds
   * @param {string} startDate - Start date (ISO string)
   * @param {string} endDate - End date (ISO string)
   * @returns {Promise<Array>} - Array of coordinate points for heat map
   */
  static async getHeatMapData(bounds, startDate, endDate) {
    const { data, error } = await supabase.rpc('get_gps_heatmap_data', {
      p_north: bounds.north,
      p_south: bounds.south,
      p_east: bounds.east,
      p_west: bounds.west,
      p_start_date: startDate,
      p_end_date: endDate
    });
    
    if (error) {
      console.error('Error fetching heat map data:', error);
      throw error;
    }
    
    return data || [];
  }
}

module.exports = GpsLog;