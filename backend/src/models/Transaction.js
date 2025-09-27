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
   * Create a new pending toll transaction
   * @param {Object} params - Transaction parameters
   * @param {string} params.user_id - User ID
   * @param {string} params.vehicle_id - Vehicle ID
   * @param {string} params.journey_id - Journey ID
   * @param {number} params.amount - Transaction amount
   * @param {string} params.description - Transaction description
   * @param {Object} params.metadata - Additional metadata
   * @returns {Promise<Object>} - Created transaction
   */
  static async createPendingToll({ user_id, vehicle_id, journey_id, amount, description, metadata }) {
    try {
      const transaction = {
        user_id,
        vehicle_id,
        journey_id,
        type: 'toll_charge',
        amount: parseFloat(amount),
        status: 'pending',
        description,
        metadata,
        transaction_date: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('transactions')
        .insert(transaction)
        .select()
        .single();

      if (error) {
        console.error('Error creating pending toll transaction:', error);
        throw new Error(`Failed to create pending toll transaction: ${error.message}`);
      }

      return data;

    } catch (error) {
      console.error('Error in createPendingToll:', error);
      throw error;
    }
  }

  /**
   * Process a pending toll (mark as completed and link to toll gate)
   * @param {string} transactionId - Transaction ID
   * @param {string} tollGateId - Toll gate ID
   * @returns {Promise<Object>} - Updated transaction
   */
  static async processPendingToll(transactionId, tollGateId) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update({
          status: 'completed',
          payment_method: 'wallet',
          payment_reference: tollGateId,
          processed_at: new Date().toISOString(),
          metadata: supabase.raw(`
            COALESCE(metadata, '{}')::jsonb || 
            '{"toll_gate_id": "${tollGateId}", "processed_via": "toll_gate"}'::jsonb
          `)
        })
        .eq('id', transactionId)
        .eq('status', 'pending')
        .select()
        .single();

      if (error) {
        console.error('Error processing pending toll:', error);
        throw new Error(`Failed to process pending toll: ${error.message}`);
      }

      if (!data) {
        throw new Error('Transaction not found or not in pending status');
      }

      return data;

    } catch (error) {
      console.error('Error in processPendingToll:', error);
      throw error;
    }
  }

  /**
   * Get pending toll transactions for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - Pending transactions
   */
  static async getPendingTolls(userId) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          vehicles(plate_number, vehicle_type),
          journeys(
            id,
            distance_km,
            entry_time,
            exit_time
          )
        `)
        .eq('user_id', userId)
        .eq('type', 'toll_charge')
        .eq('status', 'pending')
        .order('transaction_date', { ascending: true });

      if (error) {
        console.error('Error getting pending tolls:', error);
        throw new Error(`Failed to get pending tolls: ${error.message}`);
      }

      return data || [];

    } catch (error) {
      console.error('Error in getPendingTolls:', error);
      throw error;
    }
  }

  /**
   * Create a wallet recharge transaction
   * @param {Object} params - Recharge parameters
   * @param {string} params.user_id - User ID
   * @param {number} params.amount - Recharge amount
   * @param {string} params.payment_method - Payment method
   * @param {string} params.payment_reference - Payment reference ID
   * @param {Object} params.metadata - Additional metadata
   * @returns {Promise<Object>} - Created transaction
   */
  static async createRecharge({ user_id, amount, payment_method, payment_reference, metadata = {} }) {
    try {
      const transaction = {
        user_id,
        type: 'wallet_recharge',
        amount: parseFloat(amount),
        status: 'completed',
        payment_method,
        payment_reference,
        description: `Wallet recharge via ${payment_method}`,
        metadata,
        transaction_date: new Date().toISOString(),
        processed_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('transactions')
        .insert(transaction)
        .select()
        .single();

      if (error) {
        console.error('Error creating recharge transaction:', error);
        throw new Error(`Failed to create recharge transaction: ${error.message}`);
      }

      return data;

    } catch (error) {
      console.error('Error in createRecharge:', error);
      throw error;
    }
  }

  /**
   * Get transaction history for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Number of transactions to return
   * @param {number} options.offset - Number of transactions to skip
   * @param {string} options.type - Transaction type filter
   * @returns {Promise<Object>} - Transaction history with pagination
   */
  static async getHistory(userId, { limit = 50, offset = 0, type = null } = {}) {
    try {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          vehicles(plate_number, vehicle_type),
          journeys(
            id,
            distance_km,
            entry_time,
            exit_time
          )
        `, { count: 'exact' })
        .eq('user_id', userId)
        .order('transaction_date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error getting transaction history:', error);
        throw new Error(`Failed to get transaction history: ${error.message}`);
      }

      return {
        transactions: data || [],
        total: count || 0,
        limit,
        offset,
        has_more: count > offset + limit
      };

    } catch (error) {
      console.error('Error in getHistory:', error);
      throw error;
    }
  }

  /**
   * Find transaction by ID
   * @param {string} id - Transaction ID
   * @returns {Promise<Object|null>} - Transaction or null
   */
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          users(id, email, full_name),
          vehicles(plate_number, vehicle_type),
          journeys(
            id,
            distance_km,
            entry_time,
            exit_time,
            toll_roads(name)
          )
        `)
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error finding transaction:', error);
        throw new Error(`Failed to find transaction: ${error.message}`);
      }

      return data || null;

    } catch (error) {
      console.error('Error in findById:', error);
      throw error;
    }
  }

  /**
   * Cancel a pending transaction
   * @param {string} transactionId - Transaction ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} - Updated transaction
   */
  static async cancel(transactionId, reason = 'Cancelled by system') {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update({
          status: 'cancelled',
          processed_at: new Date().toISOString(),
          metadata: supabase.raw(`
            COALESCE(metadata, '{}')::jsonb || 
            '{"cancellation_reason": "${reason}"}'::jsonb
          `)
        })
        .eq('id', transactionId)
        .eq('status', 'pending')
        .select()
        .single();

      if (error) {
        console.error('Error cancelling transaction:', error);
        throw new Error(`Failed to cancel transaction: ${error.message}`);
      }

      if (!data) {
        throw new Error('Transaction not found or not in pending status');
      }

      return data;

    } catch (error) {
      console.error('Error in cancel:', error);
      throw error;
    }
  }

  /**
   * Get transaction statistics for a user
   * @param {string} userId - User ID
   * @param {Object} dateRange - Date range for statistics
   * @returns {Promise<Object>} - Transaction statistics
   */
  static async getStats(userId, dateRange = {}) {
    try {
      const { start_date, end_date } = dateRange;
      
      let query = supabase
        .from('transactions')
        .select('type, amount, status')
        .eq('user_id', userId);

      if (start_date) {
        query = query.gte('transaction_date', start_date);
      }
      
      if (end_date) {
        query = query.lte('transaction_date', end_date);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting transaction stats:', error);
        throw new Error(`Failed to get transaction stats: ${error.message}`);
      }

      const stats = {
        total_transactions: data.length,
        total_toll_charges: 0,
        total_recharges: 0,
        pending_amount: 0,
        completed_amount: 0,
        cancelled_amount: 0
      };

      data.forEach(transaction => {
        if (transaction.type === 'toll_charge') {
          stats.total_toll_charges += transaction.amount;
        } else if (transaction.type === 'wallet_recharge') {
          stats.total_recharges += transaction.amount;
        }

        if (transaction.status === 'pending') {
          stats.pending_amount += transaction.amount;
        } else if (transaction.status === 'completed') {
          stats.completed_amount += transaction.amount;
        } else if (transaction.status === 'cancelled') {
          stats.cancelled_amount += transaction.amount;
        }
      });

      return stats;

    } catch (error) {
      console.error('Error in getStats:', error);
      throw error;
    }
  }

  /**
   * Bulk process multiple pending transactions
   * @param {Array} transactionIds - Array of transaction IDs
   * @param {string} tollGateId - Toll gate ID
   * @returns {Promise<Object>} - Processing results
   */
  static async bulkProcessPending(transactionIds, tollGateId) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update({
          status: 'completed',
          payment_method: 'wallet',
          payment_reference: tollGateId,
          processed_at: new Date().toISOString(),
          metadata: supabase.raw(`
            COALESCE(metadata, '{}')::jsonb || 
            '{"toll_gate_id": "${tollGateId}", "processed_via": "toll_gate", "bulk_processed": true}'::jsonb
          `)
        })
        .in('id', transactionIds)
        .eq('status', 'pending')
        .select();

      if (error) {
        console.error('Error bulk processing transactions:', error);
        throw new Error(`Failed to bulk process transactions: ${error.message}`);
      }

      return {
        processed_count: data.length,
        processed_transactions: data
      };

    } catch (error) {
      console.error('Error in bulkProcessPending:', error);
      throw error;
    }
  }
}

module.exports = Transaction;