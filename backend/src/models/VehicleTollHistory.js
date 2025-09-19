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

class VehicleTollHistory {
  /**
   * Create a new toll history entry (vehicle enters toll zone)
   * @param {Object} historyData - History data
   * @param {string} historyData.vehicle_id - Vehicle ID
   * @param {string} historyData.toll_road_zone_id - Toll road zone ID
   * @param {number} historyData.entry_lat - Entry latitude
   * @param {number} historyData.entry_lon - Entry longitude
   * @returns {Promise<Object>} - Created history entry
   */
  static async createEntry(historyData) {
    const { data, error } = await supabase
      .from('vehicle_toll_history')
      .insert({
        ...historyData,
        entry_time: new Date().toISOString(),
        status: 'active'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating toll history entry:', error);
      throw error;
    }
    
    console.log('Vehicle toll entry created:', data);
    return data;
  }

  /**
   * Complete toll history entry (vehicle exits toll zone)
   * @param {string} historyId - History entry ID
   * @param {Object} exitData - Exit data
   * @param {number} exitData.exit_lat - Exit latitude
   * @param {number} exitData.exit_lon - Exit longitude
   * @param {number} exitData.distance_km - Calculated distance
   * @param {number} exitData.fare_amount - Calculated fare
   * @returns {Promise<Object>} - Updated history entry
   */
  static async completeExit(historyId, exitData) {
    const { data, error } = await supabase
      .from('vehicle_toll_history')
      .update({
        ...exitData,
        exit_time: new Date().toISOString(),
        status: 'completed'
      })
      .eq('id', historyId)
      .eq('status', 'active') // Ensure we only update active entries
      .select()
      .single();
    
    if (error) {
      console.error('Error completing toll history exit:', error);
      throw error;
    }
    
    if (!data) {
      throw new Error('No active toll history entry found to complete');
    }
    
    console.log('Vehicle toll exit completed:', data);
    return data;
  }

  /**
   * Get active toll entry for a vehicle (if any)
   * @param {string} vehicleId - Vehicle ID
   * @returns {Promise<Object|null>} - Active toll entry or null
   */
  static async getActiveEntry(vehicleId) {
    const { data, error } = await supabase
      .from('vehicle_toll_history')
      .select(`
        *,
        toll_road_zones:toll_road_zone_id (
          name,
          rate_per_km,
          zone_polygon
        )
      `)
      .eq('vehicle_id', vehicleId)
      .eq('status', 'active')
      .order('entry_time', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching active toll entry:', error);
      throw error;
    }
    
    return data || null;
  }

  /**
   * Get toll history for a vehicle
   * @param {string} vehicleId - Vehicle ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of records to return
   * @param {number} options.offset - Number of records to skip
   * @param {string} options.status - Filter by status
   * @returns {Promise<Array>} - Array of toll history entries
   */
  static async getVehicleHistory(vehicleId, { limit = 20, offset = 0, status = null } = {}) {
    let query = supabase
      .from('vehicle_toll_history')
      .select(`
        *,
        toll_road_zones:toll_road_zone_id (
          name,
          rate_per_km,
          zone_polygon
        ),
        vehicles:vehicle_id (
          license_plate,
          vehicle_type
        )
      `)
      .eq('vehicle_id', vehicleId)
      .order('entry_time', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching vehicle toll history:', error);
      throw error;
    }
    
    return data || [];
  }

  /**
   * Get toll history for a user (all their vehicles)
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of toll history entries
   */
  static async getUserTollHistory(userId, { limit = 20, offset = 0, status = null } = {}) {
    let query = supabase
      .from('vehicle_toll_history')
      .select(`
        *,
        toll_road_zones:toll_road_zone_id (
          name,
          rate_per_km,
          zone_polygon
        ),
        vehicles:vehicle_id (
          license_plate,
          vehicle_type,
          user_id
        )
      `)
      .eq('vehicles.user_id', userId)
      .order('entry_time', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching user toll history:', error);
      throw error;
    }
    
    return data || [];
  }

  /**
   * Calculate toll statistics for a vehicle
   * @param {string} vehicleId - Vehicle ID
   * @param {Object} dateRange - Date range for calculation
   * @param {string} dateRange.startDate - Start date
   * @param {string} dateRange.endDate - End date
   * @returns {Promise<Object>} - Toll statistics
   */
  static async getVehicleStats(vehicleId, { startDate = null, endDate = null } = {}) {
    let query = supabase
      .from('vehicle_toll_history')
      .select('fare_amount, distance_km, entry_time')
      .eq('vehicle_id', vehicleId)
      .eq('status', 'completed');

    if (startDate) {
      query = query.gte('entry_time', startDate);
    }
    
    if (endDate) {
      query = query.lte('entry_time', endDate);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching vehicle toll stats:', error);
      throw error;
    }

    const stats = {
      total_trips: data.length,
      total_distance_km: data.reduce((sum, trip) => sum + (trip.distance_km || 0), 0),
      total_fare_paid: data.reduce((sum, trip) => sum + (trip.fare_amount || 0), 0),
      average_distance: 0,
      average_fare: 0
    };

    if (stats.total_trips > 0) {
      stats.average_distance = stats.total_distance_km / stats.total_trips;
      stats.average_fare = stats.total_fare_paid / stats.total_trips;
    }

    return stats;
  }

  /**
   * Get incomplete toll entries (vehicles that entered but didn't exit)
   * Useful for cleanup and monitoring
   * @param {number} hoursOld - Entries older than this many hours
   * @returns {Promise<Array>} - Array of incomplete entries
   */
  static async getIncompleteEntries(hoursOld = 24) {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hoursOld);

    const { data, error } = await supabase
      .from('vehicle_toll_history')
      .select(`
        *,
        toll_road_zones:toll_road_zone_id (name),
        vehicles:vehicle_id (license_plate, user_id)
      `)
      .eq('status', 'active')
      .lt('entry_time', cutoffTime.toISOString())
      .order('entry_time', { ascending: true });
    
    if (error) {
      console.error('Error fetching incomplete toll entries:', error);
      throw error;
    }
    
    return data || [];
  }

  /**
   * Mark incomplete entry as cancelled
   * @param {string} historyId - History entry ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} - Updated entry
   */
  static async cancelEntry(historyId, reason = 'System cleanup') {
    const { data, error } = await supabase
      .from('vehicle_toll_history')
      .update({
        status: 'cancelled',
        exit_time: new Date().toISOString(),
        notes: reason
      })
      .eq('id', historyId)
      .eq('status', 'active')
      .select()
      .single();
    
    if (error) {
      console.error('Error cancelling toll entry:', error);
      throw error;
    }
    
    return data;
  }
}

module.exports = VehicleTollHistory;