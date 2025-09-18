const { supabase } = require('./connection');

/**
 * Database Query Helpers
 * Simplified interface for common database operations
 */

class QueryHelper {
  /**
   * Get data from a table
   */
  static async select(tableName, options = {}) {
    try {
      let query = supabase.from(tableName).select(options.select || '*');
      
      // Apply filters
      if (options.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }
      
      // Apply single record
      if (options.single) {
        query = query.single();
      }
      
      // Apply limit
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      // Apply order
      if (options.order) {
        query = query.order(options.order.column, { 
          ascending: options.order.ascending ?? true 
        });
      }
      
      const { data, error } = await query;
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error(`Query error on ${tableName}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Insert data into a table
   */
  static async insert(tableName, data, options = {}) {
    try {
      let query = supabase.from(tableName).insert(data);
      
      if (options.select !== false) {
        query = query.select(options.select || '*');
      }
      
      if (options.single) {
        query = query.single();
      }
      
      const { data: result, error } = await query;
      
      if (error) throw error;
      
      return result;
    } catch (error) {
      console.error(`Insert error on ${tableName}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Update data in a table
   */
  static async update(tableName, updates, where = {}, options = {}) {
    try {
      let query = supabase.from(tableName).update(updates);
      
      // Apply where conditions
      Object.entries(where).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      if (options.select !== false) {
        query = query.select(options.select || '*');
      }
      
      if (options.single) {
        query = query.single();
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error(`Update error on ${tableName}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Delete data from a table
   */
  static async delete(tableName, where = {}) {
    try {
      let query = supabase.from(tableName).delete();
      
      // Apply where conditions
      Object.entries(where).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      
      const { error } = await query;
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error(`Delete error on ${tableName}:`, error.message);
      throw error;
    }
  }
}

module.exports = QueryHelper;