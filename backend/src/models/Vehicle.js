const { query, withTransaction } = require('../config/db');

class Vehicle {
  /**
   * Create a new vehicle
   * @param {Object} vehicleData - Vehicle data
   * @param {string} vehicleData.user_id - User ID
   * @param {string} vehicleData.plate_number - Vehicle plate number
   * @param {string} vehicleData.vehicle_type - Vehicle type (car, truck, bus, bike)
   * @param {string} vehicleData.model - Vehicle model (optional)
   * @returns {Promise<Object>} - Created vehicle object
   */
  static async create({ user_id, plate_number, vehicle_type = 'car', model }) {
    const result = await query(
      `INSERT INTO vehicles (user_id, plate_number, vehicle_type, model, registered_at, created_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, user_id, plate_number, vehicle_type, model, registered_at, created_at`,
      [user_id, plate_number.toUpperCase(), vehicle_type, model]
    );
    return result.rows[0];
  }

  /**
   * Find vehicle by plate number
   * @param {string} plateNumber - Vehicle plate number
   * @returns {Promise<Object|null>} - Vehicle object or null if not found
   */
  static async findByPlateNumber(plateNumber) {
    const result = await query(
      `SELECT 
         v.id,
         v.user_id,
         v.plate_number,
         v.vehicle_type,
         v.model,
         v.is_active,
         v.registered_at,
         v.created_at,
         u.name as owner_name,
         u.email as owner_email
       FROM vehicles v
       JOIN users u ON v.user_id = u.id
       WHERE v.plate_number = $1 AND v.is_active = true`,
      [plateNumber.toUpperCase()]
    );
    return result.rows[0] || null;
  }

  /**
   * Find vehicle by ID
   * @param {number} vehicleId - Vehicle ID
   * @returns {Promise<Object|null>} - Vehicle object or null if not found
   */
  static async findById(vehicleId) {
    const result = await query(
      `SELECT 
         v.id,
         v.user_id,
         v.plate_number,
         v.vehicle_type,
         v.model,
         v.is_active,
         v.registered_at,
         v.created_at,
         u.name as owner_name,
         u.email as owner_email
       FROM vehicles v
       JOIN users u ON v.user_id = u.id
       WHERE v.id = $1`,
      [vehicleId]
    );
    return result.rows[0] || null;
  }

  /**
   * Get vehicles by user ID
   * @param {number} userId - User ID
   * @returns {Promise<Array>} - Array of user's vehicles
   */
  static async findByUserId(userId) {
    const result = await query(
      `SELECT id, user_id, plate_number, vehicle_type, model, is_active, registered_at, created_at 
       FROM vehicles 
       WHERE user_id = $1 AND is_active = true
       ORDER BY registered_at DESC`,
      [userId]
    );
    return result.rows;
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
   * @returns {Promise<Object>} - Updated vehicle object
   */
  static async update(vehicleId, userId, updates) {
    const allowedFields = ['plate_number', 'vehicle_type', 'model'];
    const updateFields = Object.keys(updates).filter(key => allowedFields.includes(key));
    
    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    // If updating plate_number, normalize it
    if (updates.plate_number) {
      updates.plate_number = updates.plate_number.toUpperCase();
    }

    const setClause = updateFields.map((field, index) => `${field} = $${index + 3}`).join(', ');
    const values = [vehicleId, userId, ...updateFields.map(field => updates[field])];

    const result = await query(
      `UPDATE vehicles 
       SET ${setClause}, updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND is_active = true
       RETURNING id, user_id, plate_number, vehicle_type, model, updated_at`,
      values
    );

    return result.rows[0];
  }

  /**
   * Delete vehicle
   * @param {number} vehicleId - Vehicle ID
   * @param {number} userId - User ID (for authorization)
   * @returns {Promise<boolean>} - True if deleted successfully
   */
  /**
   * Delete vehicle (soft delete)
   * @param {number} vehicleId - Vehicle ID
   * @param {number} userId - User ID (for authorization)
   * @returns {Promise<boolean>} - True if deleted successfully
   */
  static async delete(vehicleId, userId) {
    const result = await query(
      `UPDATE vehicles 
       SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [vehicleId, userId]
    );
    return result.rowCount > 0;
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