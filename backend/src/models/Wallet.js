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
  static async create(userId, initialBalance = 0) {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .insert({ user_id: userId, balance: initialBalance })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw new Error(`Error creating wallet: ${error.message}`);
    }
  }

  static async findByUserId(userId) {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data || null;
    } catch (error) {
      throw new Error(`Error finding wallet: ${error.message}`);
    }
  }

  static async getBalance(userId) {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data ? parseFloat(data.balance) : 0;
    } catch (error) {
      throw new Error(`Error getting balance: ${error.message}`);
    }
  }

  static async credit(userId, amount) {
    try {
      const { data: wallet, error: fetchError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const newBalance = parseFloat(wallet.balance) + parseFloat(amount);
      
      const { data: updatedWallet, error: updateError } = await supabase
        .from('wallets')
        .update({ 
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      return updatedWallet;
    } catch (error) {
      throw new Error(`Error crediting wallet: ${error.message}`);
    }
  }

  static async hasSufficientBalance(userId, amount) {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (!data) return false;
      
      return parseFloat(data.balance) >= parseFloat(amount);
    } catch (error) {
      throw new Error(`Error checking balance: ${error.message}`);
    }
  }
}

module.exports = Wallet;