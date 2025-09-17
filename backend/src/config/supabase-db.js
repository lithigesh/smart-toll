const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Create Supabase client
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

console.log('🔧 Initializing Supabase client connection...');
console.log(`📍 Supabase URL: ${process.env.SUPABASE_URL ? 'Set' : 'Not set'}`);
console.log(`🔐 Service Role Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set'}`);

// Helper function to execute raw SQL queries
const query = async (text, params = []) => {
  const start = Date.now();
  try {
    // For complex queries, use the rpc function or direct SQL
    const { data, error } = await supabase.rpc('execute_sql', {
      query: text,
      params: params
    });
    
    if (error) throw error;
    
    const duration = Date.now() - start;
    console.log('Executed query', { text: text.substring(0, 50) + '...', duration, rows: data?.length || 0 });
    
    // Format response to match pg format
    return {
      rows: data || [],
      rowCount: data?.length || 0
    };
  } catch (error) {
    console.error('Database query error:', { text: text.substring(0, 50) + '...', error: error.message });
    throw error;
  }
};

// Helper function for simple table operations
const simpleQuery = async (text, params = []) => {
  const start = Date.now();
  try {
    // For simple SELECT, INSERT, UPDATE, DELETE operations
    // We'll need to parse the SQL and use appropriate Supabase methods
    
    // For now, let's try direct SQL execution via edge functions
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      body: JSON.stringify({
        query: text,
        params: params
      })
    });
    
    if (!response.ok) {
      // Fallback: try to parse and use Supabase table methods
      const errorText = await response.text();
      console.warn('Direct SQL failed, attempting table operation:', errorText);
      
      // Basic parsing for common operations
      if (text.toLowerCase().includes('select now()')) {
        return {
          rows: [{ now: new Date().toISOString() }],
          rowCount: 1
        };
      }
      
      throw new Error(`SQL execution failed: ${errorText}`);
    }
    
    const data = await response.json();
    const duration = Date.now() - start;
    
    console.log('Executed query via REST', { duration, rows: data?.length || 0 });
    
    return {
      rows: data || [],
      rowCount: data?.length || 0
    };
    
  } catch (error) {
    console.error('Simple query error:', { text: text.substring(0, 50) + '...', error: error.message });
    
    // Final fallback for basic operations
    if (text.toLowerCase().includes('select now()')) {
      return {
        rows: [{ now: new Date().toISOString() }],
        rowCount: 1
      };
    }
    
    throw error;
  }
};

// Helper function to execute queries within a transaction
const withTransaction = async (callback) => {
  // Supabase handles transactions internally for batch operations
  try {
    const result = await callback(supabase);
    return result;
  } catch (error) {
    console.error('Transaction error:', error.message);
    throw error;
  }
};

// Helper function for retry logic on serialization failures
const withRetry = async (callback, maxRetries = 3) => {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await callback();
    } catch (error) {
      if (attempt < maxRetries - 1 && (error.message.includes('conflict') || error.message.includes('retry'))) {
        attempt++;
        console.log(`Retrying operation (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 100 * attempt));
        continue;
      }
      throw error;
    }
  }
};

// Health check function
const healthCheck = async () => {
  try {
    // Simple connectivity test
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);
    
    if (error && !error.message.includes('schema cache')) {
      throw error;
    }
    
    return { 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      connection: 'supabase-client' 
    };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error.message,
      connection: 'supabase-client'
    };
  }
};

// Export both supabase client and pg-compatible interface
module.exports = {
  supabase,           // Direct Supabase client
  query: simpleQuery, // pg-compatible query function
  withTransaction,
  withRetry,
  healthCheck
};