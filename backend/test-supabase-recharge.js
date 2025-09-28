// Test script to verify Supabase recharge queries
require('dotenv').config();

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

async function testRechargeQueries() {
  console.log('Testing Supabase Recharge queries...\n');

  try {
    // Test 1: Check if we can connect to Supabase
    console.log('1. Testing Supabase connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('recharges')
      .select('count(*)')
      .limit(1);
    
    if (connectionError) {
      console.error('❌ Connection failed:', connectionError);
      return;
    }
    console.log('✅ Supabase connection successful');

    // Test 2: Count total recharges
    console.log('\n2. Counting total recharges...');
    const { data: allRecharges, error: countError } = await supabase
      .from('recharges')
      .select('*');
    
    if (countError) {
      console.error('❌ Error counting recharges:', countError);
      return;
    }
    console.log(`✅ Found ${allRecharges.length} total recharges`);

    // Test 3: Get all users to find a test user
    console.log('\n3. Getting users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email');
    
    if (usersError) {
      console.error('❌ Error getting users:', usersError);
      return;
    }
    console.log(`✅ Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`   - User ${user.id}: ${user.name} (${user.email})`);
    });

    // Test 4: Check recharges for each user
    console.log('\n4. Checking recharges per user...');
    for (const user of users) {
      const { data: userRecharges, error: userRechargesError } = await supabase
        .from('recharges')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (userRechargesError) {
        console.error(`❌ Error getting recharges for user ${user.id}:`, userRechargesError);
        continue;
      }
      
      console.log(`   - User ${user.id} (${user.name}): ${userRecharges.length} recharges`);
      if (userRecharges.length > 0) {
        console.log(`     Latest recharge: ₹${userRecharges[0].amount} (${userRecharges[0].status}) at ${userRecharges[0].created_at}`);
        
        // Show all recharges for this user
        userRecharges.forEach((recharge, index) => {
          console.log(`     ${index + 1}. ID: ${recharge.id}, Amount: ₹${recharge.amount}, Status: ${recharge.status}, Created: ${recharge.created_at}`);
        });
      }
    }

    // Test 5: Test the getUserRecharges method logic
    if (users.length > 0) {
      const testUserId = users[0].id;
      console.log(`\n5. Testing getUserRecharges logic for user ${testUserId}...`);
      
      const { data: testRecharges, error: testError } = await supabase
        .from('recharges')
        .select('id, user_id, gateway_order_id, gateway_payment_id, amount, status, created_at')
        .eq('user_id', testUserId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (testError) {
        console.error('❌ Error in getUserRecharges test:', testError);
        return;
      }
      
      console.log(`✅ getUserRecharges test successful: ${testRecharges.length} records`);
      testRecharges.forEach((recharge, index) => {
        console.log(`   ${index + 1}. ₹${recharge.amount} - ${recharge.status} - ${recharge.created_at}`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testRechargeQueries().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});