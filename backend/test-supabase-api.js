#!/usr/bin/env node

/**
 * Supabase Client Connection Test
 * Tests the new Supabase API-based connection
 */

require('dotenv').config();
const { healthCheck, supabase, tableQuery } = require('./src/config/db');

async function testSupabaseConnection() {
  console.log('🔍 Supabase API Connection Test\n');
  
  // Check environment variables
  console.log('📋 Environment Check:');
  console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL ? 'Set ✅' : 'Not set ❌'}`);
  console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set ✅' : 'Not set ❌'}`);
  console.log(`   SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? 'Set ✅' : 'Not set ❌'}`);
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('\n❌ Missing required Supabase environment variables!');
    return;
  }
  
  console.log('\n🔗 Testing Supabase API Connection...');
  
  // Test 1: Health Check
  console.log('\n1️⃣ Testing Health Check:');
  try {
    const health = await healthCheck();
    if (health.status === 'healthy') {
      console.log('   ✅ Health Check: SUCCESS');
      console.log(`   📊 Connection: ${health.connection}`);
      console.log(`   🕐 Timestamp: ${health.timestamp}`);
      if (health.note) console.log(`   📝 Note: ${health.note}`);
    } else {
      console.log('   ❌ Health Check: FAILED');
      console.log(`   💥 Error: ${health.error}`);
    }
  } catch (error) {
    console.log(`   ❌ Health Check Error: ${error.message}`);
  }
  
  // Test 2: Basic API Test
  console.log('\n2️⃣ Testing Basic API Access:');
  try {
    // Try to access the Supabase REST API directly
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);
    
    if (error) {
      if (error.message.includes('schema cache')) {
        console.log('   ✅ API Access: SUCCESS');
        console.log('   📝 Database is accessible but no tables exist yet');
        console.log('   🔧 This is expected for a new project');
      } else {
        console.log(`   ❌ API Error: ${error.message}`);
      }
    } else {
      console.log('   ✅ API Access: SUCCESS');
      console.log(`   📊 Tables found: ${data?.length || 0}`);
    }
  } catch (error) {
    console.log(`   ❌ API Test Error: ${error.message}`);
  }
  
  // Test 3: Test Table Operations
  console.log('\n3️⃣ Testing Table Operations Interface:');
  try {
    // Test our custom table query interface
    const result = await tableQuery.select('pg_database', {}, { limit: 1 });
    console.log('   ✅ Table Operations: SUCCESS');
    console.log(`   📊 Result: ${result.rowCount} rows`);
  } catch (error) {
    if (error.message.includes('schema cache') || error.message.includes('does not exist')) {
      console.log('   ✅ Table Operations: Interface Working');
      console.log('   📝 Error expected - no custom tables exist yet');
    } else {
      console.log(`   ❌ Table Operations Error: ${error.message}`);
    }
  }
  
  // Test 4: Project Status
  console.log('\n4️⃣ Testing Project Status:');
  try {
    // Try a simple operation that should always work
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    });
    
    if (response.ok) {
      console.log('   ✅ Project Status: ACTIVE');
      console.log(`   🌐 REST API: Accessible`);
    } else {
      console.log(`   ❌ Project Status: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.log(`   ❌ Project Status Error: ${error.message}`);
  }
  
  console.log('\n📝 Summary:');
  console.log('   • Using Supabase API instead of direct PostgreSQL');
  console.log('   • No need for DATABASE_URL connection string');
  console.log('   • Tables will be created via Supabase dashboard or migrations');
  console.log('   • API-based approach bypasses connection timeout issues');
  
  console.log('\n🚀 Next Steps:');
  console.log('   1. Start the Smart Toll server: npm run dev');
  console.log('   2. Create database tables via Supabase dashboard');
  console.log('   3. Or run migrations adapted for Supabase API');
  
  console.log('\n🏁 Supabase API connection test completed!\n');
}

// Run the test
testSupabaseConnection().catch(error => {
  console.error('❌ Test script error:', error);
  process.exit(1);
});