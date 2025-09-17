#!/usr/bin/env node

/**
 * Test Supabase Tables After Schema Creation
 * Run this after executing supabase-schema.sql in Supabase dashboard
 */

require('dotenv').config();
const { supabase, tableQuery } = require('./src/config/db');

async function testTables() {
  console.log('🔍 Testing Supabase Tables\n');
  
  try {
    // Test 1: Check if tables exist
    console.log('1️⃣ Checking table structure:');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['users', 'wallets', 'vehicles', 'toll_gates', 'transactions', 'recharges']);
    
    if (tablesError) {
      console.log(`   ❌ Error checking tables: ${tablesError.message}`);
    } else {
      console.log(`   ✅ Found ${tables.length} tables:`);
      tables.forEach(table => console.log(`      • ${table.table_name}`));
    }
    
    // Test 2: Check toll gates
    console.log('\n2️⃣ Testing toll gates:');
    const { data: tollGates, error: tollError } = await supabase
      .from('toll_gates')
      .select('*')
      .limit(5);
    
    if (tollError) {
      console.log(`   ❌ Error fetching toll gates: ${tollError.message}`);
    } else {
      console.log(`   ✅ Found ${tollGates.length} toll gates:`);
      tollGates.forEach(gate => 
        console.log(`      • ${gate.name}: ₹${gate.toll_amount}`)
      );
    }
    
    // Test 3: Check users
    console.log('\n3️⃣ Testing users:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('email, name, role')
      .limit(5);
    
    if (usersError) {
      console.log(`   ❌ Error fetching users: ${usersError.message}`);
    } else {
      console.log(`   ✅ Found ${users.length} users:`);
      users.forEach(user => 
        console.log(`      • ${user.name} (${user.email}) - ${user.role}`)
      );
    }
    
    // Test 4: Check wallets
    console.log('\n4️⃣ Testing wallets:');
    const { data: wallets, error: walletsError } = await supabase
      .from('wallets')
      .select(`
        balance,
        users(name, email)
      `);
    
    if (walletsError) {
      console.log(`   ❌ Error fetching wallets: ${walletsError.message}`);
    } else {
      console.log(`   ✅ Found ${wallets.length} wallets:`);
      wallets.forEach(wallet => 
        console.log(`      • ${wallet.users.name}: ₹${wallet.balance}`)
      );
    }
    
    // Test 5: Check vehicles
    console.log('\n5️⃣ Testing vehicles:');
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select(`
        license_plate,
        vehicle_type,
        make,
        model,
        users(name)
      `);
    
    if (vehiclesError) {
      console.log(`   ❌ Error fetching vehicles: ${vehiclesError.message}`);
    } else {
      console.log(`   ✅ Found ${vehicles.length} vehicles:`);
      vehicles.forEach(vehicle => 
        console.log(`      • ${vehicle.license_plate} (${vehicle.make} ${vehicle.model}) - ${vehicle.users.name}`)
      );
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
  
  console.log('\n📝 Instructions:');
  console.log('1. Go to: https://supabase.com/dashboard/project/ftrtjmovhndrntmpaxih/sql');
  console.log('2. Copy and paste the contents of supabase-schema.sql');
  console.log('3. Click "Run" to execute the schema');
  console.log('4. Run this test script again to verify tables are created');
  
  console.log('\n🏁 Table test completed!\n');
}

testTables().catch(console.error);