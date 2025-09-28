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

class Recharge {
  /**
   * Create a new recharge record
   * @param {Object} rechargeData - Recharge data
   * @param {number} rechargeData.user_id - User ID
   * @param {string} rechargeData.order_id - Razorpay order ID
   * @param {string} rechargeData.payment_id - Razorpay payment ID
   * @param {number} rechargeData.amount - Recharge amount
   * @param {string} rechargeData.status - Recharge status
   * @returns {Promise<Object>} - Created recharge object
   */
  static async create({ user_id, order_id, payment_id, amount, status = 'created' }) {
    const { data, error } = await supabase
      .from('recharges')
      .insert({
        user_id,
        gateway_order_id: order_id,
        gateway_payment_id: payment_id,
        amount,
        status,
        created_at: new Date().toISOString()
      })
      .select('id, user_id, gateway_order_id, gateway_payment_id, amount, status, created_at')
      .single();
    
    if (error) {
      throw new Error(`Failed to create recharge: ${error.message}`);
    }
    
    return data;
  }

  /**
   * Create recharge record within a transaction (using Supabase)
   * @param {Object} client - Database client (transaction)
   * @param {Object} rechargeData - Recharge data
   * @returns {Promise<Object>} - Created recharge object
   */
  static async createInTransaction(client, { user_id, order_id, payment_id, amount, status = 'created' }) {
    // Use Supabase client directly since transaction client is mock
    const { data, error } = await supabase
      .from('recharges')
      .insert({
        user_id,
        gateway_order_id: order_id,
        gateway_payment_id: payment_id,
        amount,
        status
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating recharge record:', error);
      throw new Error(`Failed to create recharge record: ${error.message}`);
    }
    
    return data;
  }

  /**
   * Find recharge by payment ID (for idempotency)
   * @param {string} paymentId - Razorpay payment ID
   * @returns {Promise<Object|null>} - Recharge object or null if not found
   */
  static async findByPaymentId(paymentId) {
    const { data, error } = await supabase
      .from('recharges')
      .select('id, user_id, gateway_order_id, gateway_payment_id, amount, status, created_at')
      .eq('gateway_payment_id', paymentId)
      .single();
    
    if (error) {
      console.log('Error finding recharge by payment ID:', error);
      return null;
    }
    
    return data;
  }

  /**
   * Find recharge by order ID
   * @param {string} orderId - Razorpay order ID
   * @returns {Promise<Object|null>} - Recharge object or null if not found
   */
  static async findByOrderId(orderId) {
    const { data, error } = await supabase
      .from('recharges')
      .select('id, user_id, gateway_order_id, gateway_payment_id, amount, status, created_at')
      .eq('gateway_order_id', orderId)
      .single();
    
    if (error) {
      console.log('Error finding recharge by order ID:', error);
      return null;
    }
    
    return data;
  }

  /**
   * Find recharge by payment ID within a transaction (for idempotency)
   * @param {Object} client - Database client (transaction)
   * @param {string} paymentId - Razorpay payment ID
   * @returns {Promise<Object|null>} - Recharge object or null if not found
   */
  static async findByPaymentIdInTransaction(client, paymentId) {
    const result = await client.query(
      'SELECT id, user_id, gateway_order_id, gateway_payment_id, amount, status, created_at FROM recharges WHERE gateway_payment_id = $1',
      [paymentId]
    );
    return result.rows[0] || null;
  }

  /**
   * Update recharge status
   * @param {number} id - Recharge ID
   * @param {string} status - New status
   * @returns {Promise<Object>} - Updated recharge object
   */
  static async updateStatus(id, status) {
    const { data, error } = await supabase
      .from('recharges')
      .update({ 
        status, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select('id, user_id, gateway_order_id, gateway_payment_id, amount, status, created_at')
      .single();
    
    if (error) {
      throw new Error(`Failed to update recharge status: ${error.message}`);
    }
    
    return data;
  }

  /**
   * Update recharge status within a transaction
   * @param {Object} client - Database client (transaction)
   * @param {number} id - Recharge ID
   * @param {string} status - New status
   * @returns {Promise<Object>} - Updated recharge object
   */
  static async updateStatusInTransaction(client, id, status) {
    const result = await client.query(
      `UPDATE recharges 
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, user_id, gateway_order_id, gateway_payment_id, amount, status, created_at`,
      [status, id]
    );
    return result.rows[0];
  }

  /**
   * Get user's recharge history
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of recharges to return
   * @param {number} options.offset - Number of recharges to skip
   * @param {string} options.status - Filter by status
   * @returns {Promise<Array>} - Array of recharges
   */
  static async getUserRecharges(userId, { limit = 20, offset = 0, status = null } = {}) {
    console.log('getUserRecharges called with:', { userId, limit, offset, status });
    
    let query = supabase
      .from('recharges')
      .select('id, gateway_order_id, gateway_payment_id, amount, status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (status) {
      query = query.eq('status', status);
    }
    
    console.log('Executing Supabase query for user recharges...');
    const { data, error } = await query;
    
    if (error) {
      console.error('Supabase error in getUserRecharges:', error);
      throw new Error(`Failed to fetch recharges: ${error.message}`);
    }
    
    console.log('Supabase returned data:', data);
    return data || [];
  }

  /**
   * Get recharge statistics for a user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} - Recharge statistics
   */
  static async getUserStats(userId) {
    try {
      console.log('getUserStats called for user:', userId);
      
      // Get all user recharges to calculate stats
      const { data: recharges, error } = await supabase
        .from('recharges')
        .select('amount, status, created_at')
        .eq('user_id', userId);

      if (error) {
        console.error('Supabase error in getUserStats:', error);
        throw new Error(`Failed to fetch recharge stats: ${error.message}`);
      }
      
      console.log('getUserStats raw data from Supabase:', recharges);

      if (!recharges || recharges.length === 0) {
        return {
          total_recharges: 0,
          successful_recharges: 0,
          failed_recharges: 0,
          total_amount: 0,
          average_amount: 0,
          last_successful_recharge: null
        };
      }

      const paidRecharges = recharges.filter(r => r.status === 'paid');
      const failedRecharges = recharges.filter(r => r.status === 'failed');
      const totalAmount = paidRecharges.reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
      const averageAmount = paidRecharges.length > 0 ? totalAmount / paidRecharges.length : 0;
      const lastSuccessful = paidRecharges.length > 0 
        ? paidRecharges.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0].created_at 
        : null;

      return {
        total_recharges: recharges.length,
        successful_recharges: paidRecharges.length,
        failed_recharges: failedRecharges.length,
        total_amount: totalAmount,
        average_amount: averageAmount,
        last_successful_recharge: lastSuccessful
      };
    } catch (error) {
      console.error('Error in getUserStats:', error);
      return {
        total_recharges: 0,
        successful_recharges: 0,
        failed_recharges: 0,
        total_amount: 0,
        average_amount: 0,
        last_successful_recharge: null
      };
    }
  }

  /**
   * Get all recharges (admin function)
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of recharges to return
   * @param {number} options.offset - Number of recharges to skip
   * @param {string} options.status - Filter by status
   * @param {string} options.startDate - Filter from date
   * @param {string} options.endDate - Filter to date
   * @returns {Promise<Array>} - Array of recharges with user info
   */
  static async getAll({ limit = 50, offset = 0, status = null, startDate = null, endDate = null } = {}) {
    let queryText = `
      SELECT 
        r.id,
        r.gateway_order_id,
        r.gateway_payment_id,
        r.amount,
        r.status,
        r.created_at,
        u.name as user_name,
        u.email as user_email
      FROM recharges r
      JOIN users u ON r.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (status) {
      paramCount++;
      queryText += ` AND r.status = $${paramCount}`;
      params.push(status);
    }
    
    if (startDate) {
      paramCount++;
      queryText += ` AND r.created_at >= $${paramCount}`;
      params.push(startDate);
    }
    
    if (endDate) {
      paramCount++;
      queryText += ` AND r.created_at <= $${paramCount}`;
      params.push(endDate);
    }
    
    paramCount++;
    queryText += ` ORDER BY r.created_at DESC LIMIT $${paramCount}`;
    params.push(limit);
    
    paramCount++;
    queryText += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await query(queryText, params);
    return result.rows;
  }

  /**
   * Get pending recharges (for cleanup/monitoring)
   * @param {number} maxAgeMinutes - Max age in minutes for pending recharges
   * @returns {Promise<Array>} - Array of pending recharges
   */
  static async getPendingRecharges(maxAgeMinutes = 60) {
    const result = await query(
      `SELECT 
         r.id,
         r.user_id,
         r.gateway_order_id,
         r.gateway_payment_id,
         r.amount,
         r.status,
         r.created_at,
         u.name as user_name,
         u.email as user_email
       FROM recharges r
       JOIN users u ON r.user_id = u.id
       WHERE r.status = 'created' 
         AND r.created_at < NOW() - INTERVAL '${maxAgeMinutes} minutes'
       ORDER BY r.created_at DESC`,
      []
    );
    return result.rows;
  }

  /**
   * Mark failed recharges as expired
   * @param {number} maxAgeMinutes - Max age in minutes
   * @returns {Promise<number>} - Number of updated records
   */
  static async markExpiredAsFailed(maxAgeMinutes = 120) {
    const result = await query(
      `UPDATE recharges 
       SET status = 'failed', updated_at = NOW()
       WHERE status = 'created' 
         AND created_at < NOW() - INTERVAL '${maxAgeMinutes} minutes'`,
      []
    );
    return result.rowCount;
  }
}

module.exports = Recharge;