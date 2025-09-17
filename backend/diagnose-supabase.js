#!/usr/bin/env node

/**
 * Supabase Connection Diagnostics
 * This script tests different Supabase connection scenarios
 */

require('dotenv').config();

async function testSupabaseEndpoints() {
  console.log('🔍 Supabase Connection Diagnostics\n');
  
  const projectRef = 'ftrtjmovhndrntmpaxih';
  
  // Test different possible database hostnames
  const possibleHosts = [
    `db.${projectRef}.supabase.co`,           // Current (not working)
    `aws-0-us-west-1.pooler.supabase.com`,   // Pooler endpoint
    `${projectRef}.supabase.co`,              // Project endpoint
    `db.${projectRef}.supabase.com`,          // Alternative .com
  ];
  
  console.log('🌐 Testing Supabase Endpoints:');
  
  for (const host of possibleHosts) {
    console.log(`\n📍 Testing: ${host}`);
    
    try {
      // Use Node.js built-in DNS resolution
      const dns = require('dns').promises;
      const result = await dns.lookup(host);
      console.log(`   ✅ DNS Resolution: ${result.address}`);
      
      // Try to create a basic connection
      const { Pool } = require('pg');
      const testPool = new Pool({
        host: host,
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: 'HMwq2T4d-.wajM?',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 3000,
      });
      
      try {
        const client = await testPool.connect();
        console.log(`   ✅ Connection: SUCCESS`);
        
        const result = await client.query('SELECT NOW()');
        console.log(`   📊 Query Result: ${result.rows[0].now}`);
        
        client.release();
        await testPool.end();
        
        console.log(`   🎯 WORKING CONNECTION FOUND!`);
        console.log(`   🔧 Use this DATABASE_URL:`);
        console.log(`   postgresql://postgres:HMwq2T4d-.wajM%3F@${host}:5432/postgres`);
        
        break; // Stop testing once we find a working connection
        
      } catch (connError) {
        console.log(`   ❌ Connection: ${connError.message}`);
        await testPool.end();
      }
      
    } catch (dnsError) {
      console.log(`   ❌ DNS Resolution: ${dnsError.message}`);
    }
  }
  
  console.log('\n📝 Notes:');
  console.log('   • The SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY');
  console.log('     are NOT needed for direct PostgreSQL connections');
  console.log('   • Those are only needed if using @supabase/supabase-js client');
  console.log('   • Our backend uses direct PostgreSQL connection via "pg" package');
  
  console.log('\n🔧 If none work, try:');
  console.log('   1. Check Supabase dashboard for the correct connection string');
  console.log('   2. Ensure your project is not paused');
  console.log('   3. Check if pooler endpoint is enabled');
}

testSupabaseEndpoints().catch(console.error);