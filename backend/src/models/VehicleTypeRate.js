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

class VehicleTypeRate {
  /**
   * Get rate per km for a specific vehicle type and toll road
   * @param {string} tollRoadId - Toll road ID
   * @param {string} vehicleType - Vehicle type (car, truck, bus, bike)
   * @returns {Promise<number|null>} - Rate per km or null if not found
   */
  static async getRate(tollRoadId, vehicleType) {
    const { data, error } = await supabase.rpc('get_vehicle_rate', {
      p_toll_road_id: tollRoadId,
      p_vehicle_type: vehicleType
    });

    if (error) {
      console.error('Error fetching vehicle type rate:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get all rates for a toll road
   * @param {string} tollRoadId - Toll road ID
   * @returns {Promise<Array>} - Array of vehicle type rates
   */
  static async getRatesByTollRoad(tollRoadId) {
    const { data, error } = await supabase
      .from('vehicle_type_rates')
      .select(`
        id,
        vehicle_type,
        rate_per_km,
        created_at,
        toll_roads!inner(
          id,
          name,
          minimum_fare
        )
      `)
      .eq('toll_road_id', tollRoadId)
      .order('vehicle_type');

    if (error) {
      console.error('Error fetching toll road rates:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get all rates for all toll roads (admin view)
   * @returns {Promise<Array>} - Array of all vehicle type rates
   */
  static async getAllRates() {
    const { data, error } = await supabase
      .from('vehicle_type_rates')
      .select(`
        id,
        vehicle_type,
        rate_per_km,
        created_at,
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
      .order('toll_roads.name', { ascending: true });

    if (error) {
      console.error('Error fetching all vehicle type rates:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Create or update vehicle type rate
   * @param {Object} rateData - Rate data
   * @param {string} rateData.toll_road_id - Toll road ID
   * @param {string} rateData.vehicle_type - Vehicle type
   * @param {number} rateData.rate_per_km - Rate per kilometer
   * @returns {Promise<Object>} - Created/updated rate
   */
  static async upsert(rateData) {
    const { data, error } = await supabase
      .from('vehicle_type_rates')
      .upsert({
        toll_road_id: rateData.toll_road_id,
        vehicle_type: rateData.vehicle_type,
        rate_per_km: rateData.rate_per_km,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'toll_road_id,vehicle_type'
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting vehicle type rate:', error);
      throw error;
    }

    return data;
  }

  /**
   * Delete vehicle type rate
   * @param {string} rateId - Rate ID
   * @returns {Promise<boolean>} - Success status
   */
  static async delete(rateId) {
    const { error } = await supabase
      .from('vehicle_type_rates')
      .delete()
      .eq('id', rateId);

    if (error) {
      console.error('Error deleting vehicle type rate:', error);
      throw error;
    }

    return true;
  }

  /**
   * Calculate fare for distance and vehicle type
   * @param {Object} fareData - Fare calculation data
   * @param {string} fareData.toll_road_id - Toll road ID
   * @param {string} fareData.vehicle_type - Vehicle type
   * @param {number} fareData.distance_km - Distance in kilometers
   * @returns {Promise<Object>} - Fare calculation result
   */
  static async calculateFare(fareData) {
    const { data, error } = await supabase.rpc('calculate_fare', {
      p_distance_km: fareData.distance_km,
      p_toll_road_id: fareData.toll_road_id,
      p_vehicle_type: fareData.vehicle_type
    });

    if (error) {
      console.error('Error calculating fare:', error);
      throw error;
    }

    return {
      distance_km: fareData.distance_km,
      rate_per_km: data.rate_per_km,
      calculated_fare: data.calculated_fare,
      minimum_fare: data.minimum_fare,
      final_fare: data.final_fare,
      vehicle_type: fareData.vehicle_type
    };
  }

  /**
   * Get rate structure for a zone (all roads in zone)
   * @param {string} zoneId - Zone ID
   * @returns {Promise<Array>} - Rate structure for zone
   */
  static async getRatesByZone(zoneId) {
    const { data, error } = await supabase
      .from('vehicle_type_rates')
      .select(`
        id,
        vehicle_type,
        rate_per_km,
        toll_roads!inner(
          id,
          name,
          zone_id,
          minimum_fare,
          toll_road_zones!inner(
            id,
            name
          )
        )
      `)
      .eq('toll_roads.zone_id', zoneId)
      .order('toll_roads.name', { ascending: true });

    if (error) {
      console.error('Error fetching zone rates:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Bulk create rates for a toll road (all vehicle types)
   * @param {Object} bulkData - Bulk rate data
   * @param {string} bulkData.toll_road_id - Toll road ID
   * @param {Object} bulkData.rates - Rates object { car: 5.0, truck: 10.0, bus: 8.0, bike: 3.0 }
   * @returns {Promise<Array>} - Array of created rates
   */
  static async bulkCreate(bulkData) {
    const { toll_road_id, rates } = bulkData;
    
    const rateRecords = Object.entries(rates).map(([vehicle_type, rate_per_km]) => ({
      toll_road_id,
      vehicle_type,
      rate_per_km: parseFloat(rate_per_km),
      created_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from('vehicle_type_rates')
      .upsert(rateRecords, {
        onConflict: 'toll_road_id,vehicle_type'
      })
      .select();

    if (error) {
      console.error('Error bulk creating vehicle type rates:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get supported vehicle types
   * @returns {Array} - Array of supported vehicle types
   */
  static getSupportedVehicleTypes() {
    return ['car', 'truck', 'bus', 'bike'];
  }

  /**
   * Validate vehicle type
   * @param {string} vehicleType - Vehicle type to validate
   * @returns {boolean} - Is valid vehicle type
   */
  static isValidVehicleType(vehicleType) {
    return this.getSupportedVehicleTypes().includes(vehicleType);
  }

  /**
   * Get default rates template
   * @returns {Object} - Default rates for all vehicle types
   */
  static getDefaultRates() {
    return {
      car: 5.00,
      bike: 2.50,
      truck: 10.00,
      bus: 8.00
    };
  }
}

module.exports = VehicleTypeRate;