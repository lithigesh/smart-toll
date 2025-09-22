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

class Transaction {
  /**
   * Create a new transaction
   * @param {Object} transactionData - Transaction data
   * @param {string} transactionData.user_id - User ID
   * @param {string} transactionData.vehicle_id - Vehicle ID (nullable for recharges)
   * @param {string} transactionData.toll_gate_id - Toll gate ID (will be stored as reference_id) 
   * @param {string} transactionData.transaction_type - Transaction type ('toll_deduction' -> 'toll_charge')
   * @param {number} transactionData.amount - Transaction amount
   * @param {string} transactionData.status - Transaction status ('completed', 'failed', 'pending')
   * @param {string} transactionData.description - Transaction description
   * @returns {Promise<Object>} - Created transaction object
   */
  static async create({ user_id, vehicle_id, toll_gate_id, transaction_type, amount, status = 'completed', description = null }) {
    console.log('🔧 Creating transaction with:', { user_id, vehicle_id, toll_gate_id, transaction_type, amount, status });
    
    // Map transaction_type to the schema's allowed values
    const typeMapping = {
      'toll_deduction': 'toll_charge',
      'recharge': 'recharge',
      'refund': 'refund'
    };
    
    const mappedType = typeMapping[transaction_type] || 'toll_charge';
    
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id,
        vehicle_id,
        amount,
        type: mappedType,
        status: status,
        reference_id: toll_gate_id, // Store toll_gate_id as reference_id
        description: description || `${mappedType} transaction`,
        metadata: {
          toll_gate_id: toll_gate_id,
          transaction_type: transaction_type
        }
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating transaction:', error);
      throw new Error(`Failed to create transaction: ${error.message}`);
    }
    
    console.log('✅ Transaction created successfully:', data);
    return data;
  }

  /**
   * Create transaction within a database transaction (using Supabase)
   * @param {Object} client - Database client (transaction)
   * @param {Object} transactionData - Transaction data
   * @returns {Promise<Object>} - Created transaction object
   */
  static async createInTransaction(client, { user_id, vehicle_id, toll_gate_id, type, amount, balance_after }) {
    // Use Supabase client directly since transaction client is mock
    // Map 'type' to 'transaction_type' to match schema
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id,
        vehicle_id,
        toll_gate_id,
        amount,
        transaction_type: type, // Map 'type' to 'transaction_type'
        status: 'completed'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating transaction record:', error);
      throw new Error(`Failed to create transaction record: ${error.message}`);
    }
    
    console.log('Transaction record created successfully:', data);
    return data;
  }

  /**
   * Get user's transaction history
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of transactions to return
   * @param {number} options.offset - Number of transactions to skip
   * @param {string} options.type - Filter by transaction type
   * @param {string} options.startDate - Filter from date
   * @param {string} options.endDate - Filter to date
   * @returns {Promise<Array>} - Array of transactions with related data
   */
  static async getUserTransactions(userId, { limit = 20, offset = 0, type = null, startDate = null, endDate = null } = {}) {
    let queryText = `
      SELECT 
        t.id,
        t.type,
        t.amount,
        t.balance_after,
        t.timestamp,
        v.vehicle_no,
        v.vehicle_type,
        tg.name as toll_gate_name,
        tg.gps_lat as toll_gate_lat,
        tg.gps_long as toll_gate_long
      FROM transactions t
      LEFT JOIN vehicles v ON t.vehicle_id = v.id
      LEFT JOIN toll_gates tg ON t.toll_gate_id = tg.id
      WHERE t.user_id = $1
    `;
    
    const params = [userId];
    let paramCount = 1;
    
    if (type) {
      paramCount++;
      queryText += ` AND t.type = $${paramCount}`;
      params.push(type);
    }
    
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
    
    paramCount++;
    queryText += ` ORDER BY t.timestamp DESC LIMIT $${paramCount}`;
    params.push(limit);
    
    paramCount++;
    queryText += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await query(queryText, params);
    return result.rows;
  }

  /**
   * Get transaction by ID
   * @param {number} transactionId - Transaction ID
   * @param {number} userId - User ID (for authorization)
   * @returns {Promise<Object|null>} - Transaction object or null if not found
   */
  static async getById(transactionId, userId = null) {
    let queryText = `
      SELECT 
        t.id,
        t.user_id,
        t.type,
        t.amount,
        t.balance_after,
        t.timestamp,
        v.vehicle_no,
        v.vehicle_type,
        tg.name as toll_gate_name,
        tg.gps_lat as toll_gate_lat,
        tg.gps_long as toll_gate_long,
        u.name as user_name,
        u.email as user_email
      FROM transactions t
      LEFT JOIN vehicles v ON t.vehicle_id = v.id
      LEFT JOIN toll_gates tg ON t.toll_gate_id = tg.id
      JOIN users u ON t.user_id = u.id
      WHERE t.id = $1
    `;
    
    const params = [transactionId];
    
    if (userId) {
      queryText += ' AND t.user_id = $2';
      params.push(userId);
    }

    const result = await query(queryText, params);
    return result.rows[0] || null;
  }

  /**
   * Get transaction statistics for a user
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @param {string} options.period - Time period ('day', 'week', 'month', 'year')
   * @returns {Promise<Object>} - Transaction statistics
   */
  static async getUserStats(userId, { period = 'month' } = {}) {
    const periodMap = {
      day: '1 day',
      week: '7 days',
      month: '30 days',
      year: '365 days'
    };

    const interval = periodMap[period] || '30 days';

    const result = await query(
      `SELECT 
         COUNT(*) as total_transactions,
         COUNT(CASE WHEN type = 'recharge' THEN 1 END) as total_recharges,
         COUNT(CASE WHEN type = 'deduction' THEN 1 END) as total_deductions,
         COALESCE(SUM(CASE WHEN type = 'recharge' THEN amount END), 0) as total_recharged,
         COALESCE(SUM(CASE WHEN type = 'deduction' THEN amount END), 0) as total_spent,
         COALESCE(AVG(CASE WHEN type = 'deduction' THEN amount END), 0) as avg_toll_amount,
         MAX(CASE WHEN type = 'recharge' THEN timestamp END) as last_recharge,
         MAX(CASE WHEN type = 'deduction' THEN timestamp END) as last_toll_payment
       FROM transactions 
       WHERE user_id = $1 AND timestamp >= NOW() - INTERVAL '${interval}'`,
      [userId]
    );

    return result.rows[0] || {
      total_transactions: 0,
      total_recharges: 0,
      total_deductions: 0,
      total_recharged: 0,
      total_spent: 0,
      avg_toll_amount: 0,
      last_recharge: null,
      last_toll_payment: null
    };
  }

  /**
   * Get daily transaction summary for a user
   * @param {number} userId - User ID
   * @param {number} days - Number of days to include
   * @returns {Promise<Array>} - Array of daily summaries
   */
  static async getDailySummary(userId, days = 30) {
    const result = await query(
      `SELECT 
         DATE(timestamp) as transaction_date,
         COUNT(*) as total_transactions,
         COUNT(CASE WHEN type = 'recharge' THEN 1 END) as recharges,
         COUNT(CASE WHEN type = 'deduction' THEN 1 END) as deductions,
         COALESCE(SUM(CASE WHEN type = 'recharge' THEN amount END), 0) as total_recharged,
         COALESCE(SUM(CASE WHEN type = 'deduction' THEN amount END), 0) as total_spent
       FROM transactions 
       WHERE user_id = $1 AND timestamp >= NOW() - INTERVAL '${days} days'
       GROUP BY DATE(timestamp)
       ORDER BY transaction_date DESC`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Get recent transactions across all users (admin function)
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of transactions to return
   * @param {number} options.offset - Number of transactions to skip
   * @param {string} options.type - Filter by transaction type
   * @returns {Promise<Array>} - Array of transactions with user info
   */
  static async getRecentTransactions({ limit = 50, offset = 0, type = null } = {}) {
    let queryText = `
      SELECT 
        t.id,
        t.type,
        t.amount,
        t.balance_after,
        t.timestamp,
        u.name as user_name,
        u.email as user_email,
        v.vehicle_no,
        tg.name as toll_gate_name
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN vehicles v ON t.vehicle_id = v.id
      LEFT JOIN toll_gates tg ON t.toll_gate_id = tg.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (type) {
      paramCount++;
      queryText += ` AND t.type = $${paramCount}`;
      params.push(type);
    }
    
    paramCount++;
    queryText += ` ORDER BY t.timestamp DESC LIMIT $${paramCount}`;
    params.push(limit);
    
    paramCount++;
    queryText += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await query(queryText, params);
    return result.rows;
  }

  /**
   * Get transaction volume by toll gate
   * @param {Object} options - Query options
   * @param {string} options.startDate - Filter from date
   * @param {string} options.endDate - Filter to date
   * @returns {Promise<Array>} - Array of toll gate transaction volumes
   */
  static async getTollGateVolume({ startDate = null, endDate = null } = {}) {
    let queryText = `
      SELECT 
        tg.id as toll_gate_id,
        tg.name as toll_gate_name,
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
    
    queryText += ` GROUP BY tg.id, tg.name ORDER BY total_crossings DESC`;

    const result = await query(queryText, params);
    return result.rows;
  }

  /**
   * Get monthly revenue report
   * @param {number} months - Number of months to include
   * @returns {Promise<Array>} - Array of monthly revenue data
   */
  static async getMonthlyRevenue(months = 12) {
    const result = await query(
      `SELECT 
         DATE_TRUNC('month', timestamp) as month,
         COUNT(CASE WHEN type = 'deduction' THEN 1 END) as toll_crossings,
         COUNT(CASE WHEN type = 'recharge' THEN 1 END) as recharges,
         COALESCE(SUM(CASE WHEN type = 'deduction' THEN amount END), 0) as toll_revenue,
         COALESCE(SUM(CASE WHEN type = 'recharge' THEN amount END), 0) as recharge_volume
       FROM transactions 
       WHERE timestamp >= NOW() - INTERVAL '${months} months'
       GROUP BY DATE_TRUNC('month', timestamp)
       ORDER BY month DESC`,
      []
    );
    return result.rows;
  }
}

module.exports = Transaction;