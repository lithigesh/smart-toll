#!/usr/bin/env node

/**
 * Database Connection Test Script
 * This script tests various connection scenarios to help debug database issues
 */

const { Pool } = require('pg');
require('dotenv').config();

async function testConnection() {
  console.log('🔍 Database Connection Test\n');
  
  // Check environment variables
  console.log('📋 Environment Check:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'Set ✅' : 'Not set ❌'}`);
  
  if (process.env.DATABASE_URL) {
    // Parse the URL to show details (without password)
    try {
      const url = new URL(process.env.DATABASE_URL);
      console.log(`   Host: ${url.hostname}`);
      console.log(`   Port: ${url.port}`);
      console.log(`   Database: ${url.pathname.slice(1)}`);
      console.log(`   Username: ${url.username}`);
      console.log(`   Password: ${url.password ? '[HIDDEN]' : 'Not set'}`);
      console.log(`   SSL: ${url.searchParams.get('sslmode') || 'default'}`);
    } catch (error) {
      console.log(`   ❌ Invalid URL format: ${error.message}`);
    }
  }
  
  console.log('\n🔗 Testing Connection...');
  
  // Test 1: Basic connection
  console.log('\n1️⃣ Testing basic connection:');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false, // Try without SSL first
    connectionTimeoutMillis: 5000,
  });
  
  try {
    const client = await pool.connect();
    console.log('   ✅ Basic connection successful!');
    
    // Test query
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    console.log(`   📊 Database time: ${result.rows[0].current_time}`);
    console.log(`   🗂️ Database version: ${result.rows[0].version}`);
    
    client.release();
    
  } catch (error) {
    console.log(`   ❌ Basic connection failed: ${error.message}`);
    console.log(`   🔍 Error code: ${error.code || 'Unknown'}`);
    
    // Test 2: Try with SSL
    console.log('\n2️⃣ Testing with SSL:');
    const sslPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });
    
    try {
      const sslClient = await sslPool.connect();
      console.log('   ✅ SSL connection successful!');
      
      const sslResult = await sslClient.query('SELECT NOW() as current_time');
      console.log(`   📊 Database time: ${sslResult.rows[0].current_time}`);
      
      sslClient.release();
      await sslPool.end();
      
    } catch (sslError) {
      console.log(`   ❌ SSL connection failed: ${sslError.message}`);
      console.log(`   🔍 SSL Error code: ${sslError.code || 'Unknown'}`);
    }
  }
  
  // Test 3: Alternative connection format
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase')) {
    console.log('\n3️⃣ Testing alternative Supabase connection:');
    
    try {
      const url = new URL(process.env.DATABASE_URL);
      const altPool = new Pool({
        host: url.hostname,
        port: url.port || 5432,
        database: url.pathname.slice(1) || 'postgres',
        user: url.username,
        password: url.password,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
      });
      
      const altClient = await altPool.connect();
      console.log('   ✅ Alternative connection successful!');
      
      const altResult = await altClient.query('SELECT NOW() as current_time');
      console.log(`   📊 Database time: ${altResult.rows[0].current_time}`);
      
      altClient.release();
      await altPool.end();
      
    } catch (altError) {
      console.log(`   ❌ Alternative connection failed: ${altError.message}`);
    }
  }
  
  await pool.end();
  
  console.log('\n📝 Troubleshooting Tips:');
  console.log('   • Check if your Supabase project is active');
  console.log('   • Verify the connection string from Supabase dashboard');
  console.log('   • Ensure your IP is allowlisted (if IP restrictions are enabled)');
  console.log('   • Try connecting from Supabase SQL Editor to verify project status');
  console.log('   • Check your internet connection');
  
  console.log('\n🏁 Connection test completed!\n');
}

// Run the test
testConnection().catch(error => {
  console.error('❌ Test script error:', error);
  process.exit(1);
});