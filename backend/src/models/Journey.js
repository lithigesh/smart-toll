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

class Journey {
  /**
   * Create a new journey when vehicle enters toll zone
   * @param {Object} journeyData - Journey data
   * @param {string} journeyData.vehicle_id - Vehicle ID
   * @param {string} journeyData.toll_road_id - Toll road ID
   * @param {string} journeyData.zone_id - Zone ID
   * @param {number} journeyData.entry_lat - Entry latitude
   * @param {number} journeyData.entry_lon - Entry longitude
   * @returns {Promise<Object>} - Created journey
   */
  static async create(journeyData) {
    const { data, error } = await supabase.rpc('create_journey_entry', {
      p_vehicle_id: journeyData.vehicle_id,
      p_toll_road_id: journeyData.toll_road_id,
      p_zone_id: journeyData.zone_id,
      p_lat: journeyData.entry_lat,
      p_lon: journeyData.entry_lon,
      p_entry_time: new Date().toISOString()
    });
    
    if (error) {
      console.error('Error creating journey:', error);
      throw error;
    }
    
    console.log('Journey created:', data);
    return data;
  }

  /**
   * Complete journey and calculate distance/fare
   * @param {string} journeyId - Journey ID
   * @param {Object} exitData - Exit data
   * @param {number} exitData.exit_lat - Exit latitude
   * @param {number} exitData.exit_lon - Exit longitude
   * @param {boolean} exitData.use_path_distance - Use GPS path distance vs straight-line
   * @returns {Promise<Object>} - Completed journey with fare calculation
   */
  static async completeExit(journeyId, exitData) {
    const { data, error } = await supabase.rpc('complete_journey_exit', {
      p_journey_id: journeyId,
      p_exit_lat: exitData.exit_lat,
      p_exit_lon: exitData.exit_lon,
      p_exit_time: new Date().toISOString(),
      p_use_path_distance: exitData.use_path_distance || false
    });
    
    if (error) {
      console.error('Error completing journey exit:', error);
      throw error;
    }
    
    console.log('Journey exit completed:', data);
    return data;
  }

  /**
   * Get active journey for a vehicle (if any)
   * @param {string} vehicleId - Vehicle ID
   * @returns {Promise<Object|null>} - Active journey or null
   */
  static async getActiveByVehicleId(vehicleId) {
    const { data, error } = await supabase
      .from('journeys')
      .select(`
        *,
        toll_roads!inner(
          id,
          name,
          rate_per_km,
          minimum_fare,
          zone_id,
          toll_road_zones!inner(
            id,
            name,
            zone_polygon
          )
        )
      `)
      .eq('vehicle_id', vehicleId)
      .eq('status', 'active')
      .order('entry_time', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching active journey:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get journey by ID
   * @param {string} journeyId - Journey ID
   * @returns {Promise<Object|null>} - Journey or null
   */
  static async getById(journeyId) {
    const { data, error } = await supabase
      .from('journeys')
      .select(`
        *,
        vehicles!inner(
          id,
          plate_number,
          vehicle_type,
          user_id,
          users!inner(
            id,
            name,
            email
          )
        ),
        toll_roads!inner(
          id,
          name,
          rate_per_km,
          minimum_fare,
          toll_road_zones!inner(
            id,
            name
          )
        )
      `)
      .eq('id', journeyId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching journey:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get recent journeys for a vehicle
   * @param {string} vehicleId - Vehicle ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of journeys to return
   * @param {string} options.status - Filter by status (optional)
   * @returns {Promise<Array>} - Array of journeys
   */
  static async getByVehicleId(vehicleId, options = {}) {
    const { limit = 20, status } = options;
    
    let query = supabase
      .from('journeys')
      .select(`
        *,
        toll_roads!inner(
          id,
          name,
          rate_per_km,
          minimum_fare,
          toll_road_zones!inner(
            id,
            name
          )
        )
      `)
      .eq('vehicle_id', vehicleId)
      .order('entry_time', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching vehicle journeys:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get journeys for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of journeys
   */
  static async getByUserId(userId, options = {}) {
    const { limit = 50, status, startDate, endDate } = options;
    
    let query = supabase
      .from('journeys')
      .select(`
        *,
        vehicles!inner(
          id,
          plate_number,
          vehicle_type
        ),
        toll_roads!inner(
          id,
          name,
          rate_per_km,
          minimum_fare,
          toll_road_zones!inner(
            id,
            name
          )
        )
      `)
      .eq('vehicles.user_id', userId)
      .order('entry_time', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    if (startDate) {
      query = query.gte('entry_time', startDate);
    }

    if (endDate) {
      query = query.lte('entry_time', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching user journeys:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Mark journey as settled (toll paid)
   * @param {string} journeyId - Journey ID
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<Object>} - Updated journey
   */
  static async markAsSettled(journeyId, transactionId) {
    const { data, error } = await supabase
      .from('journeys')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', journeyId)
      .select()
      .single();

    if (error) {
      console.error('Error marking journey as settled:', error);
      throw error;
    }

    // Also update the transaction with journey reference
    await supabase
      .from('transactions')
      .update({
        journey_id: journeyId,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId);

    return data;
  }

  /**
   * Cancel journey
   * @param {string} journeyId - Journey ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} - Cancelled journey
   */
  static async cancel(journeyId, reason = 'Cancelled') {
    const { data, error } = await supabase
      .from('journeys')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', journeyId)
      .select()
      .single();

    if (error) {
      console.error('Error cancelling journey:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get pending toll journeys for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of journeys with calculated fares but unpaid
   */
  static async getPendingTollsByUserId(userId) {
    const { data, error } = await supabase
      .from('journeys')
      .select(`
        *,
        vehicles!inner(
          id,
          plate_number,
          vehicle_type
        ),
        toll_roads!inner(
          id,
          name,
          minimum_fare,
          toll_road_zones!inner(
            id,
            name
          )
        )
      `)
      .eq('vehicles.user_id', userId)
      .eq('status', 'completed')
      .not('calculated_fare', 'is', null)
      .is('transactions.journey_id', null) // No payment transaction exists
      .order('exit_time', { ascending: false });

    if (error) {
      console.error('Error fetching pending toll journeys:', error);
      throw error;
    }

    return data || [];
  }
}

module.exports = Journey;