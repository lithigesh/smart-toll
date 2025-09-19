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

class Wallet {
  /**
   * Create a new wallet for a user
   * @param {number} userId - User ID
   * @param {number} initialBalance - Initial balance (default: 0)
   * @returns {Promise<Object>} - Created wallet object
   */
  static async create(userId, initialBalance = 0) {
    const { data, error } = await supabase
      .from('wallets')
      .insert({ user_id: userId, balance: initialBalance })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  /**
   * Create a new wallet for a user within a transaction
   * @param {Object} client - Database client (transaction)
   * @param {number} userId - User ID
   * @param {number} initialBalance - Initial balance (default: 0)
   * @returns {Promise<Object>} - Created wallet object
   */
  static async createInTransaction(client, userId, initialBalance = 0) {
    const result = await client.query(
      `INSERT INTO wallets (user_id, balance) 
       VALUES ($1, $2) 
       RETURNING id, user_id, balance, updated_at`,
      [userId, initialBalance]
    );
    
    return result.rows[0];
  }

  /**
   * Get wallet by user ID
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} - Wallet object or null if not found
   */
  static async findByUserId(userId) {
    const { data, error } = await supabase
      .from('wallets')
      .select('id, user_id, balance, updated_at')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return data || null;
  }

  /**
   * Get wallet balance
   * @param {number} userId - User ID
   * @returns {Promise<number>} - Current balance
   */
  static async getBalance(userId) {
    const result = await query(
      'SELECT balance FROM wallets WHERE user_id = $1',
      [userId]
    );
    return result.rows[0]?.balance || 0;
  }

  /**
   * Credit amount to wallet (within transaction)
   * @param {Object} client - Database client (transaction)
   * @param {number} userId - User ID
   * @param {number} amount - Amount to credit
   * @returns {Promise<Object>} - Updated wallet with new balance
   */
  static async credit(client, userId, amount) {
    // Lock the wallet row for update
    const lockResult = await client.query(
      'SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE',
      [userId]
    );

    if (lockResult.rows.length === 0) {
      throw new Error('Wallet not found');
    }

    const wallet = lockResult.rows[0];

    // Update balance
    const result = await client.query(
      `UPDATE wallets 
       SET balance = balance + $1, updated_at = NOW()
       WHERE user_id = $2
       RETURNING id, user_id, balance, updated_at`,
      [amount, userId]
    );

    return result.rows[0];
  }

  /**
   * Debit amount from wallet (within transaction)
   * @param {Object} client - Database client (transaction)
   * @param {number} userId - User ID
   * @param {number} amount - Amount to debit
   * @returns {Promise<Object>} - Updated wallet with new balance
   * @throws {Error} - If insufficient balance
   */
  static async debit(client, userId, amount) {
    // Lock the wallet row for update
    const lockResult = await client.query(
      'SELECT id, balance FROM wallets WHERE user_id = $1 FOR UPDATE',
      [userId]
    );

    if (lockResult.rows.length === 0) {
      throw new Error('Wallet not found');
    }

    const wallet = lockResult.rows[0];

    // Check sufficient balance
    if (wallet.balance < amount) {
      throw new Error(`Insufficient balance. Current: ${wallet.balance}, Required: ${amount}`);
    }

    // Update balance
    const result = await client.query(
      `UPDATE wallets 
       SET balance = balance - $1, updated_at = NOW()
       WHERE user_id = $2
       RETURNING id, user_id, balance, updated_at`,
      [amount, userId]
    );

    return result.rows[0];
  }

  /**
   * Check if wallet has sufficient balance
   * @param {number} userId - User ID
   * @param {number} amount - Amount to check
   * @returns {Promise<boolean>} - True if sufficient balance
   */
  static async hasSufficientBalance(userId, amount) {
    const result = await query(
      'SELECT balance >= $1 as sufficient FROM wallets WHERE user_id = $2',
      [amount, userId]
    );
    return result.rows[0]?.sufficient || false;
  }

  /**
   * Get wallet transaction history
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of transactions to return
   * @param {number} options.offset - Number of transactions to skip
   * @returns {Promise<Array>} - Array of transactions
   */
  static async getTransactionHistory(userId, { limit = 20, offset = 0 } = {}) {
    const result = await query(
      `SELECT 
         t.id,
         t.type,
         t.amount,
         t.balance_after,
         t.timestamp,
         v.vehicle_no,
         tg.name as toll_gate_name,
         tg.charge as toll_charge
       FROM transactions t
       LEFT JOIN vehicles v ON t.vehicle_id = v.id
       LEFT JOIN toll_gates tg ON t.toll_gate_id = tg.id
       WHERE t.user_id = $1
       ORDER BY t.timestamp DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }

  /**
   * Get wallet statistics
   * @param {number} userId - User ID
   * @returns {Promise<Object>} - Wallet statistics
   */
  static async getStats(userId) {
    const result = await query(
      `SELECT 
         w.balance as current_balance,
         COUNT(t.id) as total_transactions,
         COUNT(CASE WHEN t.type = 'recharge' THEN 1 END) as total_recharges,
         COUNT(CASE WHEN t.type = 'deduction' THEN 1 END) as total_deductions,
         COALESCE(SUM(CASE WHEN t.type = 'recharge' THEN t.amount END), 0) as total_credited,
         COALESCE(SUM(CASE WHEN t.type = 'deduction' THEN t.amount END), 0) as total_debited,
         MAX(CASE WHEN t.type = 'recharge' THEN t.timestamp END) as last_recharge,
         MAX(CASE WHEN t.type = 'deduction' THEN t.timestamp END) as last_deduction
       FROM wallets w
       LEFT JOIN transactions t ON w.user_id = t.user_id
       WHERE w.user_id = $1
       GROUP BY w.id, w.balance`,
      [userId]
    );

    return result.rows[0] || {
      current_balance: 0,
      total_transactions: 0,
      total_recharges: 0,
      total_deductions: 0,
      total_credited: 0,
      total_debited: 0,
      last_recharge: null,
      last_deduction: null
    };
  }

  /**
   * Set wallet balance (admin function)
   * @param {number} userId - User ID
   * @param {number} newBalance - New balance to set
   * @returns {Promise<Object>} - Updated wallet
   */
  static async setBalance(userId, newBalance) {
    const result = await query(
      `UPDATE wallets 
       SET balance = $1, updated_at = NOW()
       WHERE user_id = $2
       RETURNING id, user_id, balance, updated_at`,
      [newBalance, userId]
    );
    return result.rows[0];
  }

  /**
   * Get low balance users (for notifications)
   * @param {number} threshold - Balance threshold
   * @returns {Promise<Array>} - Array of users with low balance
   */
  static async getLowBalanceUsers(threshold = 100) {
    const result = await query(
      `SELECT 
         u.id as user_id,
         u.name,
         u.email,
         w.balance
       FROM wallets w
       JOIN users u ON w.user_id = u.id
       WHERE w.balance < $1
       ORDER BY w.balance ASC`,
      [threshold]
    );
    return result.rows;
  }
}

module.exports = Wallet;