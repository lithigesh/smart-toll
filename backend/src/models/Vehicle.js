const { query, withTransaction } = require('../config/db');
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

class Vehicle {
  /**
   * Create a new vehicle
   * @param {Object} vehicleData - Vehicle data
   * @param {string} vehicleData.user_id - User ID
   * @param {string} vehicleData.plate_number - Vehicle plate number
   * @param {string} vehicleData.vehicle_type - Vehicle type (car, truck, bus, bike)
   * @param {string} vehicleData.model - Vehicle model (optional)
   * @param {string} vehicleData.device_id - IoT device identifier (required)
   * @returns {Promise<Object>} - Created vehicle object
   */
  static async create({ user_id, plate_number, vehicle_type = 'car', model, device_id }) {
    try {
      // Validate required device_id
      if (!device_id || device_id.trim() === '') {
        throw new Error('Device ID is required for vehicle registration');
      }

      // Validate device_id format and uniqueness
      await this.validateDeviceId(device_id);

      const vehicle = {
        user_id,
        plate_number: plate_number.toUpperCase(),
        vehicle_type,
        model,
        device_id: device_id.trim(),
        registered_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        is_active: true
      };

      const { data, error } = await supabase
        .from('vehicles')
        .insert(vehicle)
        .select()
        .single();

      if (error) {
        console.error('Error creating vehicle:', error);
        if (error.code === '23505' && error.message.includes('device_id')) {
          throw new Error('Device ID is already registered with another vehicle');
        }
        throw new Error(`Failed to create vehicle: ${error.message}`);
      }

      console.log(`✅ Vehicle created: ${data.plate_number} with device ${data.device_id}`);
      return data;
    } catch (error) {
      console.error('Error in create:', error);
      throw error;
    }
  }

  /**
   * Validate device ID format and check uniqueness
   * @param {string} deviceId - Device ID to validate
   * @param {string} excludeVehicleId - Vehicle ID to exclude from uniqueness check (for updates)
   * @returns {Promise<void>} - Throws error if validation fails
   */
  static async validateDeviceId(deviceId, excludeVehicleId = null) {
    try {
      // Format validation - support multiple formats
      const deviceIdPatterns = [
        /^ESP32-[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}:[0-9A-Fa-f]{2}$/, // ESP32 MAC format
        /^IOT-[A-Z]+-\d{3}-[A-Z0-9]+$/, // Custom IoT format (IOT-BIKE-001-QR789)
        /^[A-Z]+-[A-Z]+-\d{3}-[A-Z]+$/, // Custom device format (BUS-DEVICE-456-ABC)
        /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/, // UUID format
        /^QR-[A-Z0-9]{8,16}$/ // QR code format
      ];

      const isValidFormat = deviceIdPatterns.some(pattern => pattern.test(deviceId));
      
      if (!isValidFormat) {
        throw new Error('Invalid device ID format. Supported formats: ESP32-MAC, IOT-DEVICE-ID, UUID, or QR-CODE');
      }

      // Length validation
      if (deviceId.length > 100) {
        throw new Error('Device ID must be 100 characters or less');
      }

      // Uniqueness check
      let query = supabase
        .from('vehicles')
        .select('id, plate_number')
        .eq('device_id', deviceId);
      
      if (excludeVehicleId) {
        query = query.neq('id', excludeVehicleId);
      }
      
      const { data: existingVehicle, error } = await query.single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking device ID uniqueness:', error);
        throw new Error('Unable to verify device ID uniqueness');
      }
      
      if (existingVehicle) {
        throw new Error(`Device ID '${deviceId}' is already registered with vehicle ${existingVehicle.plate_number}`);
      }

      console.log(`✅ Device ID validation passed: ${deviceId}`);
      
    } catch (error) {
      console.error('Device ID validation failed:', error.message);
      throw error;
    }
  }

  /**
   * Find vehicle by device ID
   * @param {string} deviceId - Device ID to search for
   * @returns {Promise<Object|null>} - Vehicle object or null
   */
  static async findByDeviceId(deviceId) {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('device_id', deviceId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error finding vehicle by device ID:', error);
        throw new Error(`Failed to find vehicle: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      console.error('Error in findByDeviceId:', error);
      throw error;
    }
  }

  /**
   * Find vehicle by plate number
   * @param {string} plateNumber - Vehicle plate number
   * @returns {Promise<Object|null>} - Vehicle object or null if not found
   */
  static async findByPlateNumber(plateNumber) {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          id,
          user_id,
          plate_number,
          vehicle_type,
          model,
          is_active,
          registered_at,
          created_at,
          users:user_id (
            name,
            email
          )
        `)
        .eq('plate_number', plateNumber.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching vehicle by plate number:', error);
        throw new Error(`Failed to fetch vehicle: ${error.message}`);
      }

      if (!data) {
        return null;
      }

      // Flatten the user data
      return {
        ...data,
        owner_name: data.users?.name,
        owner_email: data.users?.email,
        users: undefined // Remove the nested object
      };
    } catch (error) {
      console.error('Error in findByPlateNumber:', error);
      throw error;
    }
  }

  /**
   * Find vehicle by ID
   * @param {number} vehicleId - Vehicle ID
   * @returns {Promise<Object|null>} - Vehicle object or null if not found
   */
  /**
   * Find vehicle by ID
   * @param {string} vehicleId - Vehicle ID
   * @returns {Promise<Object|null>} - Vehicle object or null if not found
   */
  static async findById(vehicleId) {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          id,
          user_id,
          plate_number,
          vehicle_type,
          model,
          device_id,
          is_active,
          registered_at,
          created_at,
          users:user_id (
            name,
            email
          )
        `)
        .eq('id', vehicleId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching vehicle by ID:', error);
        throw new Error(`Failed to fetch vehicle: ${error.message}`);
      }

      if (!data) {
        return null;
      }

      // Flatten the user data
      return {
        ...data,
        owner_name: data.users?.name,
        owner_email: data.users?.email,
        users: undefined // Remove the nested object
      };
    } catch (error) {
      console.error('Error in findById:', error);
      throw error;
    }
  }

  /**
   * Get vehicles by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Array of user's vehicles
   */
  static async findByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, user_id, plate_number, vehicle_type, model, is_active, registered_at, created_at')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('registered_at', { ascending: false });

      if (error) {
        console.error('Error fetching user vehicles:', error);
        throw new Error(`Failed to fetch user vehicles: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in findByUserId:', error);
      throw error;
    }
  }

  /**
   * Check if vehicle number already exists
   * @param {string} vehicleNo - Vehicle number
   * @param {number} excludeUserId - User ID to exclude from check (for updates)
   * @returns {Promise<boolean>} - True if vehicle number exists
   */
  static async plateNumberExists(plateNumber, excludeUserId = null) {
    let queryText = 'SELECT id FROM vehicles WHERE plate_number = $1 AND is_active = true';
    const params = [plateNumber.toUpperCase()];
    
    if (excludeUserId) {
      queryText += ' AND user_id != $2';
      params.push(excludeUserId);
    }

    const result = await query(queryText, params);
    return result.rows.length > 0;
  }

  /**
   * Update vehicle information
   * @param {number} vehicleId - Vehicle ID
   * @param {number} userId - User ID (for authorization)
   * @param {Object} updates - Fields to update
   * @param {string} updates.plate_number - New plate number (optional)
   * @param {string} updates.vehicle_type - New vehicle type (optional)
   * @param {string} updates.model - New model (optional)
   * @param {string} updates.device_id - New device ID (optional)
   * @returns {Promise<Object>} - Updated vehicle object
   */
  static async update(vehicleId, userId, updates) {
    try {
      const allowedFields = ['plate_number', 'vehicle_type', 'model', 'device_id'];
      const updateFields = Object.keys(updates).filter(key => allowedFields.includes(key));
      
      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      // Validate device_id if provided
      if (updates.device_id) {
        await this.validateDeviceId(updates.device_id, vehicleId);
        updates.device_id = updates.device_id.trim();
      }

      // If updating plate_number, normalize it
      if (updates.plate_number) {
        updates.plate_number = updates.plate_number.toUpperCase();
      }

      const updateData = {};
      updateFields.forEach(field => {
        updateData[field] = updates[field];
      });
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('vehicles')
        .update(updateData)
        .eq('id', vehicleId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .select()
        .single();

      if (error) {
        console.error('Error updating vehicle:', error);
        if (error.code === '23505' && error.message.includes('device_id')) {
          throw new Error('Device ID is already registered with another vehicle');
        }
        throw new Error(`Failed to update vehicle: ${error.message}`);
      }

      if (!data) {
        throw new Error('Vehicle not found or access denied');
      }

      console.log(`✅ Vehicle updated: ${data.plate_number}`);
      return data;
      
    } catch (error) {
      console.error('Error in update:', error);
      throw error;
    }
  }

  /**
   * Delete vehicle
   * @param {number} vehicleId - Vehicle ID
   * @param {number} userId - User ID (for authorization)
   * @returns {Promise<boolean>} - True if deleted successfully
   */
  /**
   * Delete vehicle (hard delete from database)
   * @param {string} vehicleId - Vehicle ID (UUID)
   * @param {string} userId - User ID (for authorization)
   * @returns {Promise<boolean>} - True if deleted successfully
   */
  static async delete(vehicleId, userId) {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicleId)
        .eq('user_id', userId)
        .select();

      if (error) {
        console.error('Error deleting vehicle:', error);
        throw new Error(`Failed to delete vehicle: ${error.message}`);
      }

      console.log(`✅ Vehicle permanently deleted from database: ${vehicleId}`);
      return data && data.length > 0;
    } catch (error) {
      console.error('Error in delete:', error);
      throw error;
    }
  }

  /**
   * Get vehicle transaction history
   * @param {number} vehicleId - Vehicle ID
   * @param {number} userId - User ID (for authorization)
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of transactions to return
   * @param {number} options.offset - Number of transactions to skip
   * @returns {Promise<Array>} - Array of vehicle transactions
   */
  static async getTransactionHistory(vehicleId, userId, { limit = 20, offset = 0 } = {}) {
    const result = await query(
      `SELECT 
         t.id,
         t.amount,
         t.balance_after,
         t.timestamp,
         tg.name as toll_gate_name,
         tg.gps_lat as toll_gate_lat,
         tg.gps_long as toll_gate_long
       FROM transactions t
       JOIN toll_gates tg ON t.toll_gate_id = tg.id
       WHERE t.vehicle_id = $1 AND t.user_id = $2 AND t.type = 'deduction'
       ORDER BY t.timestamp DESC
       LIMIT $3 OFFSET $4`,
      [vehicleId, userId, limit, offset]
    );
    return result.rows;
  }

  /**
   * Get vehicle statistics
   * @param {number} vehicleId - Vehicle ID
   * @param {number} userId - User ID (for authorization)
   * @returns {Promise<Object>} - Vehicle statistics
   */
  static async getStats(vehicleId, userId) {
    const result = await query(
      `SELECT 
         COUNT(t.id) as total_toll_crossings,
         COALESCE(SUM(t.amount), 0) as total_toll_paid,
         COALESCE(AVG(t.amount), 0) as avg_toll_amount,
         MAX(t.timestamp) as last_toll_crossing,
         COUNT(DISTINCT t.toll_gate_id) as unique_toll_gates
       FROM transactions t
       WHERE t.vehicle_id = $1 AND t.user_id = $2 AND t.type = 'deduction'`,
      [vehicleId, userId]
    );

    return result.rows[0] || {
      total_toll_crossings: 0,
      total_toll_paid: 0,
      avg_toll_amount: 0,
      last_toll_crossing: null,
      unique_toll_gates: 0
    };
  }

  /**
   * Get vehicles with recent activity (admin function)
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of vehicles to return
   * @param {number} options.days - Number of days to look back for activity
   * @returns {Promise<Array>} - Array of vehicles with activity
   */
  static async getRecentActivity({ limit = 50, days = 7 } = {}) {
    const result = await query(
      `SELECT 
         v.id,
         v.vehicle_no,
         v.vehicle_type,
         u.name as owner_name,
         u.email as owner_email,
         COUNT(t.id) as recent_crossings,
         COALESCE(SUM(t.amount), 0) as recent_toll_paid,
         MAX(t.timestamp) as last_crossing
       FROM vehicles v
       JOIN users u ON v.user_id = u.id
       LEFT JOIN transactions t ON v.id = t.vehicle_id 
         AND t.type = 'deduction' 
         AND t.timestamp >= NOW() - INTERVAL '${days} days'
       GROUP BY v.id, v.vehicle_no, v.vehicle_type, u.name, u.email
       HAVING COUNT(t.id) > 0
       ORDER BY last_crossing DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  /**
   * Get all vehicles (admin function)
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of vehicles to return
   * @param {number} options.offset - Number of vehicles to skip
   * @param {string} options.search - Search term for vehicle number or owner
   * @returns {Promise<Array>} - Array of vehicles
   */
  static async getAll({ limit = 50, offset = 0, search = null } = {}) {
    let queryText = `
      SELECT 
        v.id,
        v.vehicle_no,
        v.vehicle_type,
        v.created_at,
        u.name as owner_name,
        u.email as owner_email
      FROM vehicles v
      JOIN users u ON v.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (search) {
      paramCount++;
      queryText += ` AND (v.vehicle_no ILIKE $${paramCount} OR u.name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }
    
    paramCount++;
    queryText += ` ORDER BY v.created_at DESC LIMIT $${paramCount}`;
    params.push(limit);
    
    paramCount++;
    queryText += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await query(queryText, params);
    return result.rows;
  }

  /**
   * Get vehicle types summary
   * @returns {Promise<Array>} - Array of vehicle type statistics
   */
  static async getVehicleTypeStats() {
    const result = await query(
      `SELECT 
         vehicle_type,
         COUNT(*) as total_vehicles,
         COUNT(DISTINCT user_id) as unique_owners
       FROM vehicles 
       GROUP BY vehicle_type 
       ORDER BY total_vehicles DESC`,
      []
    );
    return result.rows;
  }

  /**
   * Validate vehicle number format (basic validation)
   * @param {string} vehicleNo - Vehicle number to validate
   * @returns {Object} - Validation result
   */
  static validateVehicleNo(vehicleNo) {
    if (!vehicleNo) {
      return { valid: false, message: 'Vehicle number is required' };
    }

    // Remove spaces and convert to uppercase
    const cleaned = vehicleNo.replace(/\s+/g, '').toUpperCase();

    // Basic format validation (Indian vehicle number pattern)
    const indianPattern = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{1,4}$/;
    
    if (!indianPattern.test(cleaned)) {
      return { 
        valid: false, 
        message: 'Invalid vehicle number format. Expected format: XX00XX0000' 
      };
    }

    return { valid: true, cleaned };
  }
}

module.exports = Vehicle;