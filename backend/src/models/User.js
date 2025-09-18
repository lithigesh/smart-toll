const { query, withTransaction } = require('../config/db');

// Import Supabase client
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

class User {
  /**
   * Create a new user
   * @param {Object} userData - User registration data
   * @param {string} userData.name - User's full name
   * @param {string} userData.email - User's email address
   * @param {string} userData.password_hash - Hashed password
   * @param {string} userData.role - User role (default: 'user')
   * @returns {Promise<Object>} - Created user object
   */
  static async create({ name, email, password_hash, role = 'user' }) {
    const { data, error } = await supabase
      .from('users')
      .insert({ name, email, password_hash, role })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  /**
   * Find user by email
   * @param {string} email - User's email address
   * @returns {Promise<Object|null>} - User object or null if not found
   */
  static async findByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, password_hash, role, created_at')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw error;
    }
    
    return data || null;
  }

  /**
   * Find user by ID
   * @param {number} id - User ID
   * @returns {Promise<Object|null>} - User object or null if not found
   */
  static async findById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, created_at')
      .eq('id', id)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw error;
    }
    
    return data || null;
  }

  /**
   * Update user profile
   * @param {number} id - User ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} - Updated user object
   */
  static async update(id, updates) {
    const allowedFields = ['name', 'email', 'password_hash'];
    const updateFields = Object.keys(updates).filter(key => allowedFields.includes(key));
    
    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    const setClause = updateFields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const values = [id, ...updateFields.map(field => updates[field])];

    const result = await query(
      `UPDATE users 
       SET ${setClause}, updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, email, role, created_at`,
      values
    );

    return result.rows[0];
  }

  /**
   * Check if email already exists
   * @param {string} email - Email to check
   * @returns {Promise<boolean>} - True if email exists
   */
  static async emailExists(email) {
    const result = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    return result.rows.length > 0;
  }

  /**
   * Get user statistics
   * @param {number} userId - User ID
   * @returns {Promise<Object>} - User statistics
   */
  static async getStats(userId) {
    const result = await query(
      `SELECT 
         COUNT(CASE WHEN t.type = 'deduction' THEN 1 END) as total_toll_crossings,
         COUNT(CASE WHEN t.type = 'recharge' THEN 1 END) as total_recharges,
         COALESCE(SUM(CASE WHEN t.type = 'deduction' THEN t.amount END), 0) as total_spent,
         COALESCE(SUM(CASE WHEN t.type = 'recharge' THEN t.amount END), 0) as total_recharged,
         COUNT(v.id) as registered_vehicles
       FROM users u
       LEFT JOIN transactions t ON u.id = t.user_id
       LEFT JOIN vehicles v ON u.id = v.user_id
       WHERE u.id = $1
       GROUP BY u.id`,
      [userId]
    );

    return result.rows[0] || {
      total_toll_crossings: 0,
      total_recharges: 0,
      total_spent: 0,
      total_recharged: 0,
      registered_vehicles: 0
    };
  }

  /**
   * Get all users (admin only)
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of users to return
   * @param {number} options.offset - Number of users to skip
   * @returns {Promise<Array>} - Array of users
   */
  static async getAll({ limit = 20, offset = 0 } = {}) {
    const result = await query(
      `SELECT id, name, email, role, created_at 
       FROM users 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  /**
   * Delete user (soft delete by setting status)
   * @param {number} id - User ID
   * @returns {Promise<boolean>} - True if deleted successfully
   */
  static async delete(id) {
    const result = await query(
      'DELETE FROM users WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }
}

module.exports = User;