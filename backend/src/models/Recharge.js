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
  static async create({ user_id, razorpay_order_id, razorpay_payment_id, amount, status = 'pending' }) {
    try {
      const { data, error } = await supabase
        .from('recharges')
        .insert({
          user_id,
          razorpay_order_id,
          razorpay_payment_id,
          amount,
          status
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error creating recharge: ${error.message}`);
    }
  }

  static async findByPaymentId(paymentId) {
    try {
      const { data, error } = await supabase
        .from('recharges')
        .select('*')
        .eq('razorpay_payment_id', paymentId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data || null;
    } catch (error) {
      throw new Error(`Error finding recharge by payment ID: ${error.message}`);
    }
  }

  static async findByOrderId(orderId) {
    try {
      const { data, error } = await supabase
        .from('recharges')
        .select('*')
        .eq('razorpay_order_id', orderId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data || null;
    } catch (error) {
      throw new Error(`Error finding recharge by order ID: ${error.message}`);
    }
  }

  static async updateStatus(id, status) {
    try {
      const { data, error } = await supabase
        .from('recharges')
        .update({ 
          status, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error updating recharge status: ${error.message}`);
    }
  }

  static async getUserRecharges(userId, { limit = 20, offset = 0, status = null } = {}) {
    try {
      let query = supabase
        .from('recharges')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(`Error fetching user recharges: ${error.message}`);
    }
  }


}

module.exports = Recharge;