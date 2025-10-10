const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

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
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.phone = data.phone;
    this.password = data.password;
    this.is_verified = data.is_verified || false;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Static methods
  static async create(userData) {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert([{
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          password: hashedPassword,
          is_verified: false
        }])
        .select()
        .single();

      if (userError) throw userError;

      // Create wallet for the user
      const { error: walletError } = await supabase
        .from('wallets')
        .insert([{
          user_id: user.id,
          balance: 0.00
        }]);

      if (walletError) throw walletError;

      return new User(user);
    } catch (error) {
      throw new Error(`Error creating user: ${error.message}`);
    }
  }

  static async findByEmail(email) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows found
        throw error;
      }
      
      return new User(data);
    } catch (error) {
      throw new Error(`Error finding user by email: ${error.message}`);
    }
  }

  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows found
        throw error;
      }
      
      return new User(data);
    } catch (error) {
      throw new Error(`Error finding user by ID: ${error.message}`);
    }
  }

  static async findByPhone(phone) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phone)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows found
        throw error;
      }
      
      return new User(data);
    } catch (error) {
      throw new Error(`Error finding user by phone: ${error.message}`);
    }
  }

  // Instance methods
  async validatePassword(password) {
    try {
      return await bcrypt.compare(password, this.password);
    } catch (error) {
      throw new Error(`Error validating password: ${error.message}`);
    }
  }

  async update(updateData) {
    try {
      // If password is being updated, hash it
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }

      const { data, error } = await supabase
        .from('users')
        .update({ ...updateData, updated_at: new Date() })
        .eq('id', this.id)
        .select()
        .single();

      if (error) throw error;
      
      // Update current instance
      Object.assign(this, data);
      return this;
    } catch (error) {
      throw new Error(`Error updating user: ${error.message}`);
    }
  }

  // Get user's wallet
  async getWallet() {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', this.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Create wallet if it doesn't exist
          const { data: newWallet, error: createError } = await supabase
            .from('wallets')
            .insert([{ user_id: this.id, balance: 0.00 }])
            .select()
            .single();
          
          if (createError) throw createError;
          return newWallet;
        }
        throw error;
      }
      
      return data;
    } catch (error) {
      throw new Error(`Error getting user wallet: ${error.message}`);
    }
  }

  // Get user's vehicles
  async getVehicles() {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', this.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(`Error getting user vehicles: ${error.message}`);
    }
  }

  // Get user's toll transaction history
  async getTollHistory(limit = 10) {
    try {
      const { data, error } = await supabase.rpc('get_user_toll_history', {
        p_user_id: this.id,
        p_limit: limit
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      throw new Error(`Error getting toll history: ${error.message}`);
    }
  }

  // Serialize for JSON response (exclude sensitive data)
  toJSON() {
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}

module.exports = User;