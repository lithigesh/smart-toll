const { createClient } = require('@supabase/supabase-js');const { query, withTransaction } = require('../config/db');



const supabase = createClient(// Import Supabase client

  process.env.SUPABASE_URL,const { createClient } = require('@supabase/supabase-js');

  process.env.SUPABASE_SERVICE_ROLE_KEY,const supabase = createClient(

  {  process.env.SUPABASE_URL,

    auth: {  process.env.SUPABASE_SERVICE_ROLE_KEY,

      autoRefreshToken: false,  {

      persistSession: false    auth: {

    }      autoRefreshToken: false,

  }      persistSession: false

);    }

  }

class Transaction {);

  /**

   * Create a new transactionclass Transaction {

   * @param {Object} transactionData - Transaction data  /**

   * @param {string} transactionData.user_id - User ID   * Create a new transaction

   * @param {string} transactionData.vehicle_id - Vehicle ID (optional)   * @param {Object} transactionData - Transaction data

   * @param {string} transactionData.journey_id - Journey ID (optional)   * @param {string} transactionData.user_id - User ID

   * @param {number} transactionData.amount - Transaction amount   * @param {string} transactionData.vehicle_id - Vehicle ID (optional)

   * @param {string} transactionData.type - Transaction type ('credit', 'debit', 'recharge', 'toll', 'refund')   * @param {string} transactionData.journey_id - Journey ID (optional)

   * @param {string} transactionData.status - Transaction status ('pending', 'completed', 'failed', 'cancelled')   * @param {number} transactionData.amount - Transaction amount

   * @param {string} transactionData.description - Transaction description   * @param {string} transactionData.type - Transaction type ('credit', 'debit', 'recharge', 'toll', 'refund')

   * @param {string} transactionData.reference_id - Reference ID (optional)   * @param {string} transactionData.status - Transaction status ('pending', 'completed', 'failed', 'cancelled')

   * @param {Object} transactionData.metadata - Additional metadata (optional)   * @param {string} transactionData.description - Transaction description

   * @returns {Promise<Object>} - Created transaction object   * @param {string} transactionData.reference_id - Reference ID (optional)

   */   * @param {Object} transactionData.metadata - Additional metadata (optional)

  static async create({ user_id, vehicle_id, journey_id, amount, type, status = 'completed', description, reference_id, metadata }) {   * @returns {Promise<Object>} - Created transaction object

    console.log('🔧 Creating transaction with:', { user_id, vehicle_id, journey_id, amount, type, status });   */

      static async create({ user_id, vehicle_id, journey_id, amount, type, status = 'completed', description, reference_id, metadata }) {

    const { data, error } = await supabase    console.log('🔧 Creating transaction with:', { user_id, vehicle_id, journey_id, amount, type, status });

      .from('transactions')    

      .insert({    const { data, error } = await supabase

        user_id,      .from('transactions')

        vehicle_id,      .insert({

        journey_id,        user_id,

        amount,        vehicle_id,

        type,        journey_id,

        status,        amount,

        description,        type,

        reference_id,        status,

        metadata,        description,

        created_at: new Date().toISOString()        reference_id,

      })        metadata,

      .select()        created_at: new Date().toISOString()

      .single();      })

      .select()

    if (error) {      .single();

      console.error('Error creating transaction:', error);

      throw error;    if (error) {

    }      console.error('Error creating transaction:', error);

      throw error;

    console.log('✅ Transaction created successfully:', data.id);    }

    return data;

  }    console.log('✅ Transaction created successfully:', data.id);

    return data;

  /**  }

   * Create pending toll transaction (when journey exits zone but not paid yet)        metadata: {

   * @param {Object} tollData - Toll transaction data          toll_gate_id: toll_gate_id,

   * @param {string} tollData.user_id - User ID          transaction_type: transaction_type

   * @param {string} tollData.vehicle_id - Vehicle ID        }

   * @param {string} tollData.journey_id - Journey ID      })

   * @param {number} tollData.amount - Toll amount      .select()

   * @param {string} tollData.description - Transaction description      .single();

   * @param {Object} tollData.metadata - Additional metadata    

   * @returns {Promise<Object>} - Created pending transaction    if (error) {

   */      console.error('❌ Error creating transaction:', error);

  static async createPendingToll({ user_id, vehicle_id, journey_id, amount, description, metadata }) {      throw new Error(`Failed to create transaction: ${error.message}`);

    return await this.create({    }

      user_id,    

      vehicle_id,    console.log('✅ Transaction created successfully:', data);

      journey_id,    return data;

      amount,  }

      type: 'toll',

      status: 'pending',  /**

      description: description || 'Pending toll payment',   * Create transaction within a database transaction (using Supabase)

      metadata: {   * @param {Object} client - Database client (transaction)

        ...metadata,   * @param {Object} transactionData - Transaction data

        toll_phase: 'pending_gate_contact'   * @returns {Promise<Object>} - Created transaction object

      }   */

    });  static async createInTransaction(client, { user_id, vehicle_id, toll_gate_id, type, amount, balance_after }) {

  }    // Use Supabase client directly since transaction client is mock

    // Map 'type' to 'transaction_type' to match schema

  /**    const { data, error } = await supabase

   * Process pending toll payment (when vehicle contacts toll gate)      .from('transactions')

   * @param {string} transactionId - Pending transaction ID      .insert({

   * @param {string} reference_id - Toll gate reference ID        user_id,

   * @returns {Promise<Object>} - Updated transaction        vehicle_id,

   */        toll_gate_id,

  static async processPendingToll(transactionId, reference_id) {        amount,

    const { data, error } = await supabase        transaction_type: type, // Map 'type' to 'transaction_type'

      .from('transactions')        status: 'completed'

      .update({      })

        status: 'completed',      .select()

        reference_id,      .single();

        updated_at: new Date().toISOString(),    

        metadata: supabase.sql`metadata || '{"toll_phase": "gate_contact_completed"}'`    if (error) {

      })      console.error('Error creating transaction record:', error);

      .eq('id', transactionId)      throw new Error(`Failed to create transaction record: ${error.message}`);

      .eq('status', 'pending')    }

      .eq('type', 'toll')    

      .select()    console.log('Transaction record created successfully:', data);

      .single();    return data;

  }

    if (error) {

      console.error('Error processing pending toll:', error);  /**

      throw error;   * Get user's transaction history

    }   * @param {number} userId - User ID

   * @param {Object} options - Query options

    return data;   * @param {number} options.limit - Number of transactions to return

  }   * @param {number} options.offset - Number of transactions to skip

   * @param {string} options.type - Filter by transaction type

  /**   * @param {string} options.startDate - Filter from date

   * Get user transactions with filtering   * @param {string} options.endDate - Filter to date

   * @param {string} userId - User ID   * @returns {Promise<Array>} - Array of transactions with related data

   * @param {Object} options - Query options   */

   * @returns {Promise<Array>} - Array of transactions  static async getUserTransactions(userId, { limit = 20, offset = 0, type = null, startDate = null, endDate = null } = {}) {

   */    let queryText = `

  static async getUserTransactions(userId, options = {}) {      SELECT 

    const {         t.id,

      limit = 20,         t.type,

      type,         t.amount,

      status,         t.balance_after,

      startDate,         t.timestamp,

      endDate,        v.vehicle_no,

      include_journey = false         v.vehicle_type,

    } = options;        tg.name as toll_gate_name,

            tg.gps_lat as toll_gate_lat,

    let query = supabase        tg.gps_long as toll_gate_long

      .from('transactions')      FROM transactions t

      .select(`      LEFT JOIN vehicles v ON t.vehicle_id = v.id

        *,      LEFT JOIN toll_gates tg ON t.toll_gate_id = tg.id

        vehicles (      WHERE t.user_id = $1

          id,    `;

          plate_number,    

          vehicle_type    const params = [userId];

        )    let paramCount = 1;

        ${include_journey ? ', journeys (id, entry_time, exit_time, total_distance_km)' : ''}    

      `)    if (type) {

      .eq('user_id', userId)      paramCount++;

      .order('created_at', { ascending: false })      queryText += ` AND t.type = $${paramCount}`;

      .limit(limit);      params.push(type);

    }

    if (type) {    

      query = query.eq('type', type);    if (startDate) {

    }      paramCount++;

      queryText += ` AND t.timestamp >= $${paramCount}`;

    if (status) {      params.push(startDate);

      query = query.eq('status', status);    }

    }    

    if (endDate) {

    if (startDate) {      paramCount++;

      query = query.gte('created_at', startDate);      queryText += ` AND t.timestamp <= $${paramCount}`;

    }      params.push(endDate);

    }

    if (endDate) {    

      query = query.lte('created_at', endDate);    paramCount++;

    }    queryText += ` ORDER BY t.timestamp DESC LIMIT $${paramCount}`;

    params.push(limit);

    const { data, error } = await query;    

    paramCount++;

    if (error) {    queryText += ` OFFSET $${paramCount}`;

      console.error('Error fetching user transactions:', error);    params.push(offset);

      throw error;

    }    const result = await query(queryText, params);

    return result.rows;

    return data || [];  }

  }

  /**

  /**   * Get transaction by ID

   * Get pending toll transactions for a user   * @param {number} transactionId - Transaction ID

   * @param {string} userId - User ID   * @param {number} userId - User ID (for authorization)

   * @returns {Promise<Array>} - Array of pending toll transactions   * @returns {Promise<Object|null>} - Transaction object or null if not found

   */   */

  static async getPendingTolls(userId) {  static async getById(transactionId, userId = null) {

    const { data, error } = await supabase    let queryText = `

      .from('transactions')      SELECT 

      .select(`        t.id,

        *,        t.user_id,

        vehicles (        t.type,

          id,        t.amount,

          plate_number,        t.balance_after,

          vehicle_type        t.timestamp,

        ),        v.vehicle_no,

        journeys (        v.vehicle_type,

          id,        tg.name as toll_gate_name,

          entry_time,        tg.gps_lat as toll_gate_lat,

          exit_time,        tg.gps_long as toll_gate_long,

          total_distance_km,        u.name as user_name,

          toll_roads (        u.email as user_email

            name,      FROM transactions t

            toll_road_zones (      LEFT JOIN vehicles v ON t.vehicle_id = v.id

              name      LEFT JOIN toll_gates tg ON t.toll_gate_id = tg.id

            )      JOIN users u ON t.user_id = u.id

          )      WHERE t.id = $1

        )    `;

      `)    

      .eq('user_id', userId)    const params = [transactionId];

      .eq('type', 'toll')    

      .eq('status', 'pending')    if (userId) {

      .order('created_at', { ascending: false });      queryText += ' AND t.user_id = $2';

      params.push(userId);

    if (error) {    }

      console.error('Error fetching pending tolls:', error);

      throw error;    const result = await query(queryText, params);

    }    return result.rows[0] || null;

  }

    return data || [];

  }  /**

   * Get transaction statistics for a user

  /**   * @param {number} userId - User ID

   * Get transaction by ID   * @param {Object} options - Query options

   * @param {string} transactionId - Transaction ID   * @param {string} options.period - Time period ('day', 'week', 'month', 'year')

   * @param {string} userId - User ID for authorization (optional)   * @returns {Promise<Object>} - Transaction statistics

   * @returns {Promise<Object|null>} - Transaction or null   */

   */  static async getUserStats(userId, { period = 'month' } = {}) {

  static async getById(transactionId, userId = null) {    const periodMap = {

    let query = supabase      day: '1 day',

      .from('transactions')      week: '7 days',

      .select(`      month: '30 days',

        *,      year: '365 days'

        vehicles (    };

          id,

          plate_number,    const interval = periodMap[period] || '30 days';

          vehicle_type

        ),    const result = await query(

        journeys (      `SELECT 

          id,         COUNT(*) as total_transactions,

          entry_time,         COUNT(CASE WHEN type = 'recharge' THEN 1 END) as total_recharges,

          exit_time,         COUNT(CASE WHEN type = 'deduction' THEN 1 END) as total_deductions,

          total_distance_km,         COALESCE(SUM(CASE WHEN type = 'recharge' THEN amount END), 0) as total_recharged,

          toll_roads (         COALESCE(SUM(CASE WHEN type = 'deduction' THEN amount END), 0) as total_spent,

            name,         COALESCE(AVG(CASE WHEN type = 'deduction' THEN amount END), 0) as avg_toll_amount,

            toll_road_zones (         MAX(CASE WHEN type = 'recharge' THEN timestamp END) as last_recharge,

              name         MAX(CASE WHEN type = 'deduction' THEN timestamp END) as last_toll_payment

            )       FROM transactions 

          )       WHERE user_id = $1 AND timestamp >= NOW() - INTERVAL '${interval}'`,

        )      [userId]

      `)    );

      .eq('id', transactionId);

    return result.rows[0] || {

    if (userId) {      total_transactions: 0,

      query = query.eq('user_id', userId);      total_recharges: 0,

    }      total_deductions: 0,

      total_recharged: 0,

    const { data, error } = await query.single();      total_spent: 0,

      avg_toll_amount: 0,

    if (error && error.code !== 'PGRST116') {      last_recharge: null,

      console.error('Error fetching transaction:', error);      last_toll_payment: null

      throw error;    };

    }  }



    return data;  /**

  }   * Get daily transaction summary for a user

   * @param {number} userId - User ID

  /**   * @param {number} days - Number of days to include

   * Update transaction status   * @returns {Promise<Array>} - Array of daily summaries

   * @param {string} transactionId - Transaction ID   */

   * @param {string} status - New status  static async getDailySummary(userId, days = 30) {

   * @param {Object} additionalData - Additional data to update    const result = await query(

   * @returns {Promise<Object>} - Updated transaction      `SELECT 

   */         DATE(timestamp) as transaction_date,

  static async updateStatus(transactionId, status, additionalData = {}) {         COUNT(*) as total_transactions,

    const updateData = {         COUNT(CASE WHEN type = 'recharge' THEN 1 END) as recharges,

      status,         COUNT(CASE WHEN type = 'deduction' THEN 1 END) as deductions,

      updated_at: new Date().toISOString(),         COALESCE(SUM(CASE WHEN type = 'recharge' THEN amount END), 0) as total_recharged,

      ...additionalData         COALESCE(SUM(CASE WHEN type = 'deduction' THEN amount END), 0) as total_spent

    };       FROM transactions 

       WHERE user_id = $1 AND timestamp >= NOW() - INTERVAL '${days} days'

    const { data, error } = await supabase       GROUP BY DATE(timestamp)

      .from('transactions')       ORDER BY transaction_date DESC`,

      .update(updateData)      [userId]

      .eq('id', transactionId)    );

      .select()    return result.rows;

      .single();  }



    if (error) {  /**

      console.error('Error updating transaction status:', error);   * Get recent transactions across all users (admin function)

      throw error;   * @param {Object} options - Query options

    }   * @param {number} options.limit - Number of transactions to return

   * @param {number} options.offset - Number of transactions to skip

    return data;   * @param {string} options.type - Filter by transaction type

  }   * @returns {Promise<Array>} - Array of transactions with user info

   */

  /**  static async getRecentTransactions({ limit = 50, offset = 0, type = null } = {}) {

   * Get user transaction statistics    let queryText = `

   * @param {string} userId - User ID      SELECT 

   * @param {Object} options - Query options        t.id,

   * @returns {Promise<Object>} - Transaction statistics        t.type,

   */        t.amount,

  static async getUserStats(userId, options = {}) {        t.balance_after,

    const { period = 'month' } = options;        t.timestamp,

            u.name as user_name,

    const { data, error } = await supabase.rpc('get_user_transaction_stats', {        u.email as user_email,

      p_user_id: userId,        v.vehicle_no,

      p_period: period        tg.name as toll_gate_name

    });      FROM transactions t

      JOIN users u ON t.user_id = u.id

    if (error) {      LEFT JOIN vehicles v ON t.vehicle_id = v.id

      console.error('Error fetching user transaction stats:', error);      LEFT JOIN toll_gates tg ON t.toll_gate_id = tg.id

      throw error;      WHERE 1=1

    }    `;

    

    return data || {    const params = [];

      total_spent: 0,    let paramCount = 0;

      total_recharged: 0,    

      transaction_count: 0,    if (type) {

      avg_toll_amount: 0,      paramCount++;

      pending_amount: 0      queryText += ` AND t.type = $${paramCount}`;

    };      params.push(type);

  }    }

    

  /**    paramCount++;

   * Cancel transaction    queryText += ` ORDER BY t.timestamp DESC LIMIT $${paramCount}`;

   * @param {string} transactionId - Transaction ID    params.push(limit);

   * @param {string} reason - Cancellation reason    

   * @returns {Promise<Object>} - Cancelled transaction    paramCount++;

   */    queryText += ` OFFSET $${paramCount}`;

  static async cancel(transactionId, reason = 'Cancelled by system') {    params.push(offset);

    return await this.updateStatus(transactionId, 'cancelled', {

      metadata: { cancellation_reason: reason }    const result = await query(queryText, params);

    });    return result.rows;

  }  }



  /**  /**

   * Retry failed transaction   * Get transaction volume by toll gate

   * @param {string} transactionId - Failed transaction ID   * @param {Object} options - Query options

   * @returns {Promise<Object>} - Updated transaction   * @param {string} options.startDate - Filter from date

   */   * @param {string} options.endDate - Filter to date

  static async retryFailed(transactionId) {   * @returns {Promise<Array>} - Array of toll gate transaction volumes

    return await this.updateStatus(transactionId, 'pending');   */

  }  static async getTollGateVolume({ startDate = null, endDate = null } = {}) {

    let queryText = `

  /**      SELECT 

   * Get toll transactions for a journey        tg.id as toll_gate_id,

   * @param {string} journeyId - Journey ID        tg.name as toll_gate_name,

   * @returns {Promise<Array>} - Array of toll transactions for the journey        COUNT(t.id) as total_crossings,

   */        COALESCE(SUM(t.amount), 0) as total_revenue,

  static async getByJourneyId(journeyId) {        COALESCE(AVG(t.amount), 0) as avg_toll_amount

    const { data, error } = await supabase      FROM toll_gates tg

      .from('transactions')      LEFT JOIN transactions t ON tg.id = t.toll_gate_id AND t.type = 'deduction'

      .select(`    `;

        *,    

        vehicles (    const params = [];

          id,    let paramCount = 0;

          plate_number,    

          vehicle_type    if (startDate) {

        )      paramCount++;

      `)      queryText += ` AND t.timestamp >= $${paramCount}`;

      .eq('journey_id', journeyId)      params.push(startDate);

      .order('created_at', { ascending: false });    }

    

    if (error) {    if (endDate) {

      console.error('Error fetching journey transactions:', error);      paramCount++;

      throw error;      queryText += ` AND t.timestamp <= $${paramCount}`;

    }      params.push(endDate);

    }

    return data || [];    

  }    queryText += ` GROUP BY tg.id, tg.name ORDER BY total_crossings DESC`;

}

    const result = await query(queryText, params);

module.exports = Transaction;    return result.rows;
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