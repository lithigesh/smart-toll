#!/usr/bin/env node

/**
 * Test Supabase connectivity using both methods
 */

require('dotenv').config();

async function testSupabaseClient() {
  console.log('🔍 Testing Supabase Client Connection\n');
  
  // Test 1: Supabase Client
  console.log('1️⃣ Testing Supabase Client:');
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    
    // Test a simple query
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);
    
    if (error) {
      console.log(`   ❌ Client Error: ${error.message}`);
    } else {
      console.log(`   ✅ Client Connection: SUCCESS`);
      console.log(`   📊 Data: ${JSON.stringify(data)}`);
    }
    
  } catch (clientError) {
    console.log(`   ❌ Client Setup Error: ${clientError.message}`);
  }
  
  // Test 2: Raw SQL via Supabase
  console.log('\n2️⃣ Testing Raw SQL via Supabase:');
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data, error } = await supabase.rpc('version');
    
    if (error) {
      console.log(`   ❌ RPC Error: ${error.message}`);
      
      // Try a simple select
      const { data: selectData, error: selectError } = await supabase
        .from('pg_stat_activity')
        .select('*')
        .limit(1);
        
      if (selectError) {
        console.log(`   ❌ Select Error: ${selectError.message}`);
      } else {
        console.log(`   ✅ Select Success: ${selectData ? 'Data found' : 'No data'}`);
      }
    } else {
      console.log(`   ✅ RPC Success: ${data}`);
    }
    
  } catch (rpcError) {
    console.log(`   ❌ RPC Setup Error: ${rpcError.message}`);
  }
  
  // Test 3: Direct PostgreSQL with correct format
  console.log('\n3️⃣ Testing PostgreSQL Direct (Alternative Format):');
  
  const alternativeUrls = [
    'postgresql://postgres:HMwq2T4d-.wajM%3F@db.ftrtjmovhndrntmpaxih.supabase.co:5432/postgres',
    'postgresql://postgres:HMwq2T4d-.wajM%3F@ftrtjmovhndrntmpaxih.supabase.co:6543/postgres'
  ];
  
  for (const url of alternativeUrls) {
    console.log(`\n   Testing: ${url.replace(/:.+@/, ':***@')}`);
    
    try {
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: url,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000
      });
      
      const client = await pool.connect();
      const result = await client.query('SELECT NOW() as time');
      
      console.log(`   ✅ Success: ${result.rows[0].time}`);
      console.log(`   🎯 WORKING CONNECTION STRING FOUND!`);
      
      client.release();
      await pool.end();
      break;
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
  }
  
  console.log('\n📝 Summary:');
  console.log('   • Supabase project is accessible via web endpoint');
  console.log('   • Direct PostgreSQL connections are failing');
  console.log('   • This suggests database access restrictions or incorrect credentials');
  console.log('   • Check your Supabase dashboard for connection details');
  console.log('   • Verify that direct database access is enabled');
}

testSupabaseClient().catch(console.error);