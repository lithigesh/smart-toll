const { query, withTransaction } = require('../config/db');

class TollGate {
  /**
   * Create a new toll gate
   * @param {Object} tollGateData - Toll gate data
   * @param {string} tollGateData.name - Toll gate name
   * @param {number} tollGateData.gps_lat - GPS latitude
   * @param {number} tollGateData.gps_long - GPS longitude
   * @param {number} tollGateData.charge - Toll charge amount
   * @returns {Promise<Object>} - Created toll gate object
   */
  static async create({ name, gps_lat, gps_long, charge }) {
    const result = await query(
      `INSERT INTO toll_gates (name, gps_lat, gps_long, charge, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, name, gps_lat, gps_long, charge, created_at`,
      [name, gps_lat, gps_long, charge]
    );
    return result.rows[0];
  }

  /**
   * Find toll gate by ID
   * @param {number} tollGateId - Toll gate ID
   * @returns {Promise<Object|null>} - Toll gate object or null if not found
   */
  static async findById(tollGateId) {
    const result = await query(
      'SELECT id, name, gps_lat, gps_long, charge, created_at FROM toll_gates WHERE id = $1',
      [tollGateId]
    );
    return result.rows[0] || null;
  }

  /**
   * Get all toll gates
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of toll gates to return
   * @param {number} options.offset - Number of toll gates to skip
   * @param {boolean} options.active - Filter by active status
   * @returns {Promise<Array>} - Array of toll gates
   */
  static async getAll({ limit = 50, offset = 0, active = null } = {}) {
    let queryText = `
      SELECT id, name, gps_lat, gps_long, charge, created_at 
      FROM toll_gates 
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    // Note: We don't have an 'active' field in the schema, but adding this for future extension
    if (active !== null) {
      paramCount++;
      queryText += ` AND active = $${paramCount}`;
      params.push(active);
    }
    
    paramCount++;
    queryText += ` ORDER BY name ASC LIMIT $${paramCount}`;
    params.push(limit);
    
    paramCount++;
    queryText += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await query(queryText, params);
    return result.rows;
  }

  /**
   * Update toll gate information
   * @param {number} tollGateId - Toll gate ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} - Updated toll gate object
   */
  static async update(tollGateId, updates) {
    const allowedFields = ['name', 'gps_lat', 'gps_long', 'charge'];
    const updateFields = Object.keys(updates).filter(key => allowedFields.includes(key));
    
    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    const setClause = updateFields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const values = [tollGateId, ...updateFields.map(field => updates[field])];

    const result = await query(
      `UPDATE toll_gates 
       SET ${setClause}, updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, gps_lat, gps_long, charge, created_at`,
      values
    );

    return result.rows[0];
  }

  /**
   * Delete toll gate
   * @param {number} tollGateId - Toll gate ID
   * @returns {Promise<boolean>} - True if deleted successfully
   */
  static async delete(tollGateId) {
    const result = await query(
      'DELETE FROM toll_gates WHERE id = $1',
      [tollGateId]
    );
    return result.rowCount > 0;
  }

  /**
   * Find toll gates within radius of given coordinates
   * @param {number} lat - Latitude
   * @param {number} long - Longitude
   * @param {number} radiusKm - Radius in kilometers
   * @returns {Promise<Array>} - Array of nearby toll gates
   */
  static async findNearby(lat, long, radiusKm = 10) {
    // Using Haversine formula to calculate distance
    const result = await query(
      `SELECT 
         id,
         name,
         gps_lat,
         gps_long,
         charge,
         created_at,
         (
           6371 * acos(
             cos(radians($1)) * 
             cos(radians(gps_lat)) * 
             cos(radians(gps_long) - radians($2)) + 
             sin(radians($1)) * 
             sin(radians(gps_lat))
           )
         ) AS distance_km
       FROM toll_gates
       HAVING distance_km <= $3
       ORDER BY distance_km ASC`,
      [lat, long, radiusKm]
    );
    return result.rows;
  }

  /**
   * Get toll gate statistics
   * @param {number} tollGateId - Toll gate ID
   * @param {Object} options - Query options
   * @param {string} options.startDate - Filter from date
   * @param {string} options.endDate - Filter to date
   * @returns {Promise<Object>} - Toll gate statistics
   */
  static async getStats(tollGateId, { startDate = null, endDate = null } = {}) {
    let queryText = `
      SELECT 
        tg.id,
        tg.name,
        tg.charge,
        COUNT(t.id) as total_crossings,
        COUNT(DISTINCT t.user_id) as unique_users,
        COUNT(DISTINCT t.vehicle_id) as unique_vehicles,
        COALESCE(SUM(t.amount), 0) as total_revenue,
        COALESCE(AVG(t.amount), 0) as avg_toll_amount,
        MIN(t.timestamp) as first_crossing,
        MAX(t.timestamp) as last_crossing
      FROM toll_gates tg
      LEFT JOIN transactions t ON tg.id = t.toll_gate_id AND t.type = 'deduction'
    `;
    
    const params = [tollGateId];
    let paramCount = 1;
    
    if (startDate) {
      paramCount++;
      queryText += ` AND t.timestamp >= $${paramCount}`;
      params.push(startDate);
    }
    
    if (endDate) {
      paramCount++;
      queryText += ` AND t.timestamp <= $${paramCount}`;
      params.push(endDate);
    }
    
    queryText += ` WHERE tg.id = $1 GROUP BY tg.id, tg.name, tg.charge`;

    const result = await query(queryText, params);
    
    return result.rows[0] || {
      id: tollGateId,
      name: null,
      charge: 0,
      total_crossings: 0,
      unique_users: 0,
      unique_vehicles: 0,
      total_revenue: 0,
      avg_toll_amount: 0,
      first_crossing: null,
      last_crossing: null
    };
  }

  /**
   * Get hourly traffic pattern for a toll gate
   * @param {number} tollGateId - Toll gate ID
   * @param {number} days - Number of days to analyze
   * @returns {Promise<Array>} - Array of hourly traffic data
   */
  static async getHourlyTraffic(tollGateId, days = 7) {
    const result = await query(
      `SELECT 
         EXTRACT(HOUR FROM timestamp) as hour,
         COUNT(*) as crossings,
         COALESCE(SUM(amount), 0) as revenue
       FROM transactions
       WHERE toll_gate_id = $1 
         AND type = 'deduction'
         AND timestamp >= NOW() - INTERVAL '${days} days'
       GROUP BY EXTRACT(HOUR FROM timestamp)
       ORDER BY hour`,
      [tollGateId]
    );
    return result.rows;
  }

  /**
   * Get daily traffic pattern for a toll gate
   * @param {number} tollGateId - Toll gate ID
   * @param {number} days - Number of days to analyze
   * @returns {Promise<Array>} - Array of daily traffic data
   */
  static async getDailyTraffic(tollGateId, days = 30) {
    const result = await query(
      `SELECT 
         DATE(timestamp) as date,
         COUNT(*) as crossings,
         COUNT(DISTINCT user_id) as unique_users,
         COUNT(DISTINCT vehicle_id) as unique_vehicles,
         COALESCE(SUM(amount), 0) as revenue
       FROM transactions
       WHERE toll_gate_id = $1 
         AND type = 'deduction'
         AND timestamp >= NOW() - INTERVAL '${days} days'
       GROUP BY DATE(timestamp)
       ORDER BY date DESC`,
      [tollGateId]
    );
    return result.rows;
  }

  /**
   * Get toll gates ranked by revenue
   * @param {Object} options - Query options
   * @param {string} options.startDate - Filter from date
   * @param {string} options.endDate - Filter to date
   * @param {number} options.limit - Number of toll gates to return
   * @returns {Promise<Array>} - Array of toll gates ranked by revenue
   */
  static async getRevenueRanking({ startDate = null, endDate = null, limit = 10 } = {}) {
    let queryText = `
      SELECT 
        tg.id,
        tg.name,
        tg.gps_lat,
        tg.gps_long,
        tg.charge,
        COUNT(t.id) as total_crossings,
        COALESCE(SUM(t.amount), 0) as total_revenue,
        COALESCE(AVG(t.amount), 0) as avg_toll_amount
      FROM toll_gates tg
      LEFT JOIN transactions t ON tg.id = t.toll_gate_id AND t.type = 'deduction'
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (startDate) {
      paramCount++;
      queryText += ` AND t.timestamp >= $${paramCount}`;
      params.push(startDate);
    }
    
    if (endDate) {
      paramCount++;
      queryText += ` AND t.timestamp <= $${paramCount}`;
      params.push(endDate);
    }
    
    queryText += ` GROUP BY tg.id, tg.name, tg.gps_lat, tg.gps_long, tg.charge`;
    queryText += ` ORDER BY total_revenue DESC`;
    
    if (limit) {
      paramCount++;
      queryText += ` LIMIT $${paramCount}`;
      params.push(limit);
    }

    const result = await query(queryText, params);
    return result.rows;
  }

  /**
   * Check if coordinates are valid
   * @param {number} lat - Latitude
   * @param {number} long - Longitude
   * @returns {Object} - Validation result
   */
  static validateCoordinates(lat, long) {
    if (lat < -90 || lat > 90) {
      return { valid: false, message: 'Latitude must be between -90 and 90' };
    }
    
    if (long < -180 || long > 180) {
      return { valid: false, message: 'Longitude must be between -180 and 180' };
    }
    
    return { valid: true };
  }

  /**
   * Calculate distance between two coordinates
   * @param {number} lat1 - First latitude
   * @param {number} long1 - First longitude
   * @param {number} lat2 - Second latitude
   * @param {number} long2 - Second longitude
   * @returns {number} - Distance in kilometers
   */
  static calculateDistance(lat1, long1, lat2, long2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(long2 - long1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees - Degrees
   * @returns {number} - Radians
   */
  static toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }
}

module.exports = TollGate;