require('dotenv').config();
const { supabase } = require('./src/config/db');

async function populateTransactionsAndRecharges() {
    console.log('🚀 Populating transactions and recharges with direct Supabase operations...\n');

    try {
        // First, get all the reference data we need
        console.log('📋 Fetching reference data...');
        
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, email, name');
        
        const { data: vehicles, error: vehiclesError } = await supabase
            .from('vehicles')
            .select('id, license_plate, user_id');
            
        const { data: tollGates, error: tollGatesError } = await supabase
            .from('toll_gates')
            .select('id, name, toll_amount');

        if (usersError || vehiclesError || tollGatesError) {
            throw new Error('Error fetching reference data');
        }

        console.log(`✅ Found ${users.length} users, ${vehicles.length} vehicles, ${tollGates.length} toll gates\n`);

        // Find specific users
        const johnDoe = users.find(u => u.email === 'john.doe@example.com');
        const admin = users.find(u => u.email === 'admin@smarttoll.com');

        if (!johnDoe || !admin) {
            throw new Error('Required users not found');
        }

        // Helper function to find IDs
        const findVehicleId = (licensePlate) => vehicles.find(v => v.license_plate === licensePlate)?.id;
        const findTollGateId = (name) => tollGates.find(t => t.name === name)?.id;

        // 1. Insert transactions
        console.log('💸 Inserting transaction records...');
        
        const transactions = [
            {
                user_id: johnDoe.id,
                vehicle_id: findVehicleId('MH01AB1234'),
                toll_gate_id: findTollGateId('Mumbai-Pune Express Entry'),
                amount: 75.00,
                status: 'completed',
                transaction_type: 'toll_deduction',
                created_at: '2025-01-15T09:15:00Z'
            },
            {
                user_id: johnDoe.id,
                vehicle_id: findVehicleId('MH01AB1234'),
                toll_gate_id: findTollGateId('Eastern Express Highway'),
                amount: 45.00,
                status: 'completed',
                transaction_type: 'toll_deduction',
                created_at: '2025-01-14T14:30:00Z'
            },
            {
                user_id: johnDoe.id,
                vehicle_id: findVehicleId('MH02CD5678'),
                toll_gate_id: findTollGateId('Bandra-Worli Sea Link'),
                amount: 85.00,
                status: 'completed',
                transaction_type: 'toll_deduction',
                created_at: '2025-01-13T16:45:00Z'
            },
            {
                user_id: admin.id,
                vehicle_id: findVehicleId('MH12EF9999'),
                toll_gate_id: findTollGateId('Western Express Highway'),
                amount: 35.00,
                status: 'completed',
                transaction_type: 'toll_deduction',
                created_at: '2025-01-12T11:20:00Z'
            },
            {
                user_id: johnDoe.id,
                vehicle_id: findVehicleId('MH01AB1234'),
                toll_gate_id: findTollGateId('Mumbai-Pune Express Exit'),
                amount: 75.00,
                status: 'failed',
                transaction_type: 'toll_deduction',
                created_at: '2025-01-11T08:10:00Z'
            },
            {
                user_id: johnDoe.id,
                vehicle_id: findVehicleId('MH02CD5678'),
                toll_gate_id: findTollGateId('Eastern Express Highway'),
                amount: 45.00,
                status: 'completed',
                transaction_type: 'toll_deduction',
                created_at: '2025-01-10T17:25:00Z'
            },
            {
                user_id: admin.id,
                vehicle_id: findVehicleId('MH12EF9999'),
                toll_gate_id: findTollGateId('Bandra-Worli Sea Link'),
                amount: 85.00,
                status: 'completed',
                transaction_type: 'toll_deduction',
                created_at: '2025-01-09T13:40:00Z'
            }
        ];

        const { data: insertedTransactions, error: transactionError } = await supabase
            .from('transactions')
            .insert(transactions)
            .select();

        if (transactionError) {
            console.error('❌ Error inserting transactions:', transactionError);
        } else {
            console.log(`✅ Successfully inserted ${insertedTransactions.length} transactions\n`);
        }

        // 2. Insert recharges
        console.log('💳 Inserting recharge records...');
        
        const recharges = [
            {
                user_id: johnDoe.id,
                amount: 1000.00,
                status: 'completed',
                payment_method: 'razorpay',
                order_id: 'order_test_001',
                payment_id: 'pay_test_001',
                created_at: '2025-01-01T10:00:00Z'
            },
            {
                user_id: johnDoe.id,
                amount: 500.00,
                status: 'completed',
                payment_method: 'razorpay',
                order_id: 'order_test_002',
                payment_id: 'pay_test_002',
                created_at: '2024-12-20T15:30:00Z'
            },
            {
                user_id: admin.id,
                amount: 2000.00,
                status: 'completed',
                payment_method: 'razorpay',
                order_id: 'order_test_003',
                payment_id: 'pay_test_003',
                created_at: '2024-12-15T12:45:00Z'
            },
            {
                user_id: admin.id,
                amount: 1500.00,
                status: 'completed',
                payment_method: 'razorpay',
                order_id: 'order_test_005',
                payment_id: 'pay_test_005',
                created_at: '2024-12-05T14:15:00Z'
            }
        ];

        const { data: insertedRecharges, error: rechargeError } = await supabase
            .from('recharges')
            .insert(recharges)
            .select();

        if (rechargeError) {
            console.error('❌ Error inserting recharges:', rechargeError);
        } else {
            console.log(`✅ Successfully inserted ${insertedRecharges.length} recharges\n`);
        }

        // 3. Update wallet balances
        console.log('💰 Updating wallet balances based on transactions and recharges...');
        
        for (const user of users) {
            // Get completed recharges
            const { data: userRecharges } = await supabase
                .from('recharges')
                .select('amount')
                .eq('user_id', user.id)
                .eq('status', 'completed');

            // Get completed transactions  
            const { data: userTransactions } = await supabase
                .from('transactions')
                .select('amount')
                .eq('user_id', user.id)
                .eq('status', 'completed');

            const totalRecharges = userRecharges?.reduce((sum, r) => sum + r.amount, 0) || 0;
            const totalSpent = userTransactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
            const newBalance = totalRecharges - totalSpent;

            // Update wallet
            const { error: walletError } = await supabase
                .from('wallets')
                .update({ balance: newBalance, updated_at: new Date().toISOString() })
                .eq('user_id', user.id);

            if (walletError) {
                console.error(`❌ Error updating wallet for ${user.name}:`, walletError);
            } else {
                console.log(`✅ Updated ${user.name}'s wallet: ₹${newBalance.toFixed(2)}`);
            }
        }

        console.log('\n🎉 Data population completed successfully!');
        
        // Verify the results
        const { data: finalTransactions } = await supabase
            .from('transactions')
            .select('*', { count: 'exact' });
            
        const { data: finalRecharges } = await supabase
            .from('recharges')
            .select('*', { count: 'exact' });

        console.log(`\n📊 Final Verification:`);
        console.log(`   📈 Transactions: ${finalTransactions?.length || 0} records`);
        console.log(`   💳 Recharges: ${finalRecharges?.length || 0} records`);

    } catch (error) {
        console.error('❌ Error in data population:', error.message);
        throw error;
    }
}

// Run the population
populateTransactionsAndRecharges()
    .then(() => {
        console.log('\n✨ Population completed! Running verification test...\n');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Population failed:', error.message);
        process.exit(1);
    });