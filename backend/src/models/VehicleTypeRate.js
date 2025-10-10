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
  constructor(data) {
    this.id = data.id;
    this.vehicle_type = data.vehicle_type;
    this.rate_per_km = data.rate_per_km;
    this.created_at = data.created_at;
  }

  /**
   * Get rate per km for a specific vehicle type
   * @param {string} vehicleType - Vehicle type (car, truck, bus, bike)
   * @returns {Promise<number|null>} - Rate per km or null if not found
   */
  static async getRate(vehicleType) {
    try {
      const { data, error } = await supabase
        .from('vehicle_types')
        .select('rate_per_km')
        .eq('type', vehicleType)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching vehicle type rate:', error);
        throw new Error(`Failed to get rate for vehicle type: ${error.message}`);
      }

      return data ? data.rate_per_km : null;

    } catch (error) {
      console.error('Error in getRate:', error);
      throw error;
    }
  }

  /**
   * Get all vehicle types and their rates
   * @returns {Promise<Array>} - Array of all vehicle types
   */
  static async getAllRates() {
    try {
      const { data, error } = await supabase
        .from('vehicle_types')
        .select('*')
        .order('type');

      if (error) {
        console.error('Error fetching all vehicle type rates:', error);
        throw new Error(`Failed to get all rates: ${error.message}`);
      }

      return data || [];

    } catch (error) {
      console.error('Error in getAllRates:', error);
      throw error;
    }
  }

  /**
   * Calculate fare for distance and vehicle type
   * @param {string} vehicleType - Vehicle type
   * @param {number} distanceKm - Distance in kilometers
   * @returns {Promise<number>} - Calculated fare
   */
  static async calculateFare(vehicleType, distanceKm) {
    try {
      const rate = await this.getRate(vehicleType);
      
      if (!rate) {
        throw new Error(`No rate found for vehicle type: ${vehicleType}`);
      }

      return rate * distanceKm;

    } catch (error) {
      console.error('Error in calculateFare:', error);
      throw error;
    }
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