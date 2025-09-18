const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

/**
 * Supabase Database Connection
 * Provides a clean interface for database operations
 */

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

// Health check function
const healthCheck = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (error && error.code === 'PGRST116') {
      // Table exists but no data
      return { 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        connection: 'connected'
      };
    }
    
    if (error) throw error;
    
    return { 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      connection: 'connected'
    };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error.message,
      connection: 'failed'
    };
  }
};

// Connection status check
const checkConnection = () => {
  const hasUrl = !!process.env.SUPABASE_URL;
  const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  return {
    configured: hasUrl && hasKey,
    url: hasUrl ? 'configured' : 'missing',
    key: hasKey ? 'configured' : 'missing'
  };
};

module.exports = {
  supabase,
  healthCheck,
  checkConnection
};