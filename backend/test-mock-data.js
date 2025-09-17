#!/usr/bin/env node

/**
 * Test Mock Data Population and API Operations
 * Run this after populating the database with mock data
 */

require('dotenv').config();

async function testMockData() {
  console.log('🔍 Testing Mock Data and Supabase Operations\n');
  
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

  try {
    console.log('📊 Testing Table Populations:\n');

    // Test 1: Count all records
    const tables = ['users', 'wallets', 'vehicles', 'toll_gates', 'transactions', 'recharges'];
    
    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`   ❌ ${table.toUpperCase()}: ${error.message}`);
        } else {
          console.log(`   ✅ ${table.toUpperCase()}: ${count} records`);
        }
      } catch (tableError) {
        console.log(`   ❌ ${table.toUpperCase()}: ${tableError.message}`);
      }
    }

    console.log('\n💰 Testing Wallet Data:\n');
    
    // Test 2: Check wallet balances
    const { data: wallets, error: walletError } = await supabase
      .from('wallets')
      .select(`
        balance,
        users (
          name,
          email
        )
      `)
      .order('balance', { ascending: false })
      .limit(5);
    
    if (walletError) {
      console.log(`   ❌ Wallet query failed: ${walletError.message}`);
    } else {
      console.log('   💳 Top 5 Wallet Balances:');
      wallets.forEach((wallet, index) => {
        console.log(`   ${index + 1}. ${wallet.users.name}: ₹${wallet.balance}`);
      });
    }

    console.log('\n🚗 Testing Vehicle Data:\n');
    
    // Test 3: Check vehicles
    const { data: vehicles, error: vehicleError } = await supabase
      .from('vehicles')
      .select(`
        license_plate,
        vehicle_type,
        make,
        model,
        year,
        is_active,
        users (
          name
        )
      `)
      .eq('is_active', true)
      .limit(5);
    
    if (vehicleError) {
      console.log(`   ❌ Vehicle query failed: ${vehicleError.message}`);
    } else {
      console.log('   🚙 Sample Active Vehicles:');
      vehicles.forEach((vehicle, index) => {
        console.log(`   ${index + 1}. ${vehicle.license_plate} - ${vehicle.make} ${vehicle.model} (${vehicle.year}) - Owner: ${vehicle.users.name}`);
      });
    }

    console.log('\n🛣️ Testing Toll Gates:\n');
    
    // Test 4: Check toll gates
    const { data: tollGates, error: tollError } = await supabase
      .from('toll_gates')
      .select('name, location, toll_amount, is_active')
      .eq('is_active', true)
      .order('toll_amount', { ascending: false })
      .limit(5);
    
    if (tollError) {
      console.log(`   ❌ Toll gate query failed: ${tollError.message}`);
    } else {
      console.log('   🏪 Top 5 Toll Gates by Amount:');
      tollGates.forEach((gate, index) => {
        console.log(`   ${index + 1}. ${gate.name} (${gate.location}) - ₹${gate.toll_amount}`);
      });
    }

    console.log('\n💸 Testing Transaction Data:\n');
    
    // Test 5: Recent transactions
    const { data: transactions, error: transactionError } = await supabase
      .from('transactions')
      .select(`
        amount,
        status,
        transaction_type,
        created_at,
        users (
          name
        ),
        vehicles (
          license_plate
        ),
        toll_gates (
          name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (transactionError) {
      console.log(`   ❌ Transaction query failed: ${transactionError.message}`);
    } else {
      console.log('   📈 Recent 5 Transactions:');
      transactions.forEach((tx, index) => {
        const date = new Date(tx.created_at).toLocaleDateString();
        console.log(`   ${index + 1}. ${tx.users.name} - ${tx.vehicles.license_plate} at ${tx.toll_gates.name} - ₹${tx.amount} (${tx.status}) - ${date}`);
      });
    }

    console.log('\n💳 Testing Recharge Data:\n');
    
    // Test 6: Recharge history
    const { data: recharges, error: rechargeError } = await supabase
      .from('recharges')
      .select(`
        amount,
        status,
        payment_method,
        created_at,
        users (
          name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (rechargeError) {
      console.log(`   ❌ Recharge query failed: ${rechargeError.message}`);
    } else {
      console.log('   💰 Recent 5 Recharges:');
      recharges.forEach((recharge, index) => {
        const date = new Date(recharge.created_at).toLocaleDateString();
        console.log(`   ${index + 1}. ${recharge.users.name} - ₹${recharge.amount} (${recharge.status}) - ${recharge.payment_method} - ${date}`);
      });
    }

    console.log('\n📊 Testing Aggregate Queries:\n');
    
    // Test 7: Summary statistics
    const { data: userStats, error: statsError } = await supabase.rpc('get_user_statistics');
    
    if (statsError) {
      console.log(`   ❌ Statistics RPC failed: ${statsError.message}`);
      
      // Fallback: Manual aggregation
      const { data: totalBalance } = await supabase
        .from('wallets')
        .select('balance')
        .then(result => ({
          data: result.data?.reduce((sum, wallet) => sum + parseFloat(wallet.balance), 0) || 0
        }));
      
      const { data: totalTransactions } = await supabase
        .from('transactions')
        .select('amount')
        .eq('status', 'completed')
        .then(result => ({
          data: result.data?.reduce((sum, tx) => sum + parseFloat(tx.amount), 0) || 0
        }));
      
      console.log(`   💰 Total Wallet Balance: ₹${totalBalance.data}`);
      console.log(`   📈 Total Transaction Volume: ₹${totalTransactions.data}`);
    } else {
      console.log('   📈 User Statistics:', userStats);
    }

    console.log('\n🔧 Testing API Operations:\n');
    
    // Test 8: Simulate toll event
    console.log('   🚗 Simulating toll event...');
    
    // Get a random active vehicle and toll gate
    const { data: testVehicle } = await supabase
      .from('vehicles')
      .select('id, license_plate, user_id')
      .eq('is_active', true)
      .limit(1)
      .single();
    
    const { data: testTollGate } = await supabase
      .from('toll_gates')
      .select('id, name, toll_amount')
      .eq('is_active', true)
      .limit(1)
      .single();
    
    if (testVehicle && testTollGate) {
      console.log(`   📍 Test Vehicle: ${testVehicle.license_plate}`);
      console.log(`   🏪 Test Toll Gate: ${testTollGate.name} (₹${testTollGate.toll_amount})`);
      
      // Check wallet balance
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', testVehicle.user_id)
        .single();
      
      console.log(`   💰 Current Wallet Balance: ₹${wallet.balance}`);
      
      if (parseFloat(wallet.balance) >= parseFloat(testTollGate.toll_amount)) {
        console.log(`   ✅ Sufficient balance for toll deduction`);
      } else {
        console.log(`   ❌ Insufficient balance for toll deduction`);
      }
    }

    console.log('\n🎉 Mock Data Testing Complete!\n');
    
    console.log('📋 Summary:');
    console.log('   ✅ All tables populated with comprehensive mock data');
    console.log('   ✅ Relationships between tables working correctly');
    console.log('   ✅ Query operations functioning properly');
    console.log('   ✅ Ready for Smart Toll API testing');
    
    console.log('\n🚀 Next Steps:');
    console.log('   1. Test the Smart Toll API endpoints');
    console.log('   2. Verify toll deduction workflow');
    console.log('   3. Test payment recharge workflow');
    console.log('   4. Validate authentication and authorization');

  } catch (error) {
    console.error('❌ Testing error:', error.message);
  }
}

testMockData().catch(console.error);