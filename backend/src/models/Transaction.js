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
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.device_id = data.device_id;
    this.amount = data.amount;
    this.toll_amount = data.toll_amount;
    this.distance_km = data.distance_km;
    this.created_at = data.created_at;
  }

  /**
   * Get transaction history for a user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - User transactions
   */
  static async getByUserId(userId, options = {}) {
    try {
      const { limit = 50, offset = 0, startDate = null, endDate = null } = options;

      let query = supabase
        .from('esp32_toll_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) {
        console.error('Error getting user transactions:', error);
        throw new Error(`Failed to get user transactions: ${error.message}`);
      }

      return data || [];

    } catch (error) {
      console.error('Error in getByUserId:', error);
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
        .from('esp32_toll_transactions')
        .select('*')
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
   * Get transaction statistics for a user
   * @param {string} userId - User ID
   * @param {Object} dateRange - Date range for statistics
   * @returns {Promise<Object>} - Transaction statistics
   */
  static async getStats(userId, dateRange = {}) {
    try {
      const { start_date, end_date } = dateRange;
      
      let query = supabase
        .from('esp32_toll_transactions')
        .select('toll_amount')
        .eq('user_id', userId);

      if (start_date) {
        query = query.gte('created_at', start_date);
      }
      
      if (end_date) {
        query = query.lte('created_at', end_date);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting transaction stats:', error);
        throw new Error(`Failed to get transaction stats: ${error.message}`);
      }

      const stats = {
        total_transactions: data.length,
        total_toll_amount: 0,
        total_distance: 0
      };

      data.forEach(transaction => {
        stats.total_toll_amount += transaction.toll_amount || 0;
      });

      return stats;

    } catch (error) {
      console.error('Error in getStats:', error);
      throw error;
    }
  }
}

module.exports = Transaction;