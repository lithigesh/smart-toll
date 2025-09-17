require('dotenv').config();
const { supabase } = require('./src/config/db');
const fs = require('fs');

async function populateTransactionsAndRecharges() {
    console.log('🚀 Starting transaction and recharge data population...\n');

    try {
        // Read the SQL file
        const sqlContent = fs.readFileSync('./populate-transactions.sql', 'utf8');
        
        // Split the SQL into individual statements
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
            
            try {
                const { data, error } = await supabase.rpc('execute_sql', {
                    sql_query: statement
                });

                if (error) {
                    // Try direct query execution if RPC fails
                    const { data: directData, error: directError } = await supabase
                        .from('transactions')
                        .select('*')
                        .limit(1);
                    
                    if (directError) {
                        console.log(`⚠️  RPC not available, executing via direct operations...`);
                        // We'll populate using direct Supabase client operations instead
                        break;
                    }
                } else {
                    console.log(`✅ Statement ${i + 1} executed successfully`);
                }
            } catch (err) {
                console.log(`⚠️  Error with statement ${i + 1}: ${err.message}`);
                console.log('🔄 Switching to direct data insertion method...\n');
                break;
            }
        }

        // Alternative method: Direct data insertion using Supabase client
        await insertDataDirectly();

    } catch (error) {
        console.error('❌ Error reading SQL file:', error.message);
        await insertDataDirectly();
    }
}

async function insertDataDirectly() {
    console.log('📝 Inserting data using direct Supabase client operations...\n');

    try {
        // Get user and vehicle IDs
        const { data: users } = await supabase
            .from('users')
            .select('id, email');
        
        const { data: vehicles } = await supabase
            .from('vehicles')
            .select('id, license_plate, user_id');
            
        const { data: tollGates } = await supabase
            .from('toll_gates')
            .select('id, name, amount');

        if (!users || !vehicles || !tollGates) {
            throw new Error('Required data not found in database');
        }

        const johnDoe = users.find(u => u.email === 'john.doe@smarttoll.com');
        const admin = users.find(u => u.email === 'admin@smarttoll.com');

        // Insert transactions
        const transactions = [
            {
                user_id: johnDoe.id,
                vehicle_id: vehicles.find(v => v.license_plate === 'MH01AB1234')?.id,
                toll_gate_id: tollGates.find(t => t.name === 'Mumbai-Pune Express Entry')?.id,
                amount: 75.00,
                status: 'completed',
                transaction_type: 'toll_deduction',
                created_at: '2025-01-10 09:15:00'
            },
            {
                user_id: johnDoe.id,
                vehicle_id: vehicles.find(v => v.license_plate === 'MH01AB1234')?.id,
                toll_gate_id: tollGates.find(t => t.name === 'Eastern Express Highway')?.id,
                amount: 45.00,
                status: 'completed',
                transaction_type: 'toll_deduction',
                created_at: '2025-01-08 14:30:00'
            },
            {
                user_id: johnDoe.id,
                vehicle_id: vehicles.find(v => v.license_plate === 'MH02CD5678')?.id,
                toll_gate_id: tollGates.find(t => t.name === 'Bandra-Worli Sea Link')?.id,
                amount: 85.00,
                status: 'completed',
                transaction_type: 'toll_deduction',
                created_at: '2025-01-05 16:45:00'
            },
            {
                user_id: admin.id,
                vehicle_id: vehicles.find(v => v.license_plate === 'MH12EF9999')?.id,
                toll_gate_id: tollGates.find(t => t.name === 'Western Express Highway')?.id,
                amount: 35.00,
                status: 'completed',
                transaction_type: 'toll_deduction',
                created_at: '2025-01-03 11:20:00'
            },
            {
                user_id: johnDoe.id,
                vehicle_id: vehicles.find(v => v.license_plate === 'MH01AB1234')?.id,
                toll_gate_id: tollGates.find(t => t.name === 'Mumbai-Pune Express Exit')?.id,
                amount: 75.00,
                status: 'failed',
                transaction_type: 'toll_deduction',
                created_at: '2025-01-02 08:10:00'
            }
        ];

        const { data: insertedTransactions, error: transactionError } = await supabase
            .from('transactions')
            .insert(transactions)
            .select();

        if (transactionError) {
            console.error('❌ Error inserting transactions:', transactionError);
        } else {
            console.log(`✅ Inserted ${insertedTransactions.length} transactions`);
        }

        // Insert recharges
        const recharges = [
            {
                user_id: johnDoe.id,
                amount: 1000.00,
                status: 'completed',
                payment_method: 'razorpay',
                razorpay_order_id: 'order_test_001',
                razorpay_payment_id: 'pay_test_001',
                created_at: '2025-01-01 10:00:00'
            },
            {
                user_id: johnDoe.id,
                amount: 500.00,
                status: 'completed',
                payment_method: 'razorpay',
                razorpay_order_id: 'order_test_002',
                razorpay_payment_id: 'pay_test_002',
                created_at: '2024-12-20 15:30:00'
            },
            {
                user_id: admin.id,
                amount: 2000.00,
                status: 'completed',
                payment_method: 'razorpay',
                razorpay_order_id: 'order_test_003',
                razorpay_payment_id: 'pay_test_003',
                created_at: '2024-12-15 12:45:00'
            },
            {
                user_id: johnDoe.id,
                amount: 300.00,
                status: 'failed',
                payment_method: 'razorpay',
                razorpay_order_id: 'order_test_004',
                created_at: '2024-12-10 09:20:00'
            }
        ];

        const { data: insertedRecharges, error: rechargeError } = await supabase
            .from('recharges')
            .insert(recharges)
            .select();

        if (rechargeError) {
            console.error('❌ Error inserting recharges:', rechargeError);
        } else {
            console.log(`✅ Inserted ${insertedRecharges.length} recharges`);
        }

        // Update wallet balances based on transactions and recharges
        await updateWalletBalances();

        console.log('\n🎉 Data population completed successfully!');

    } catch (error) {
        console.error('❌ Error in direct data insertion:', error.message);
    }
}

async function updateWalletBalances() {
    console.log('\n💰 Updating wallet balances...');

    try {
        const { data: users } = await supabase
            .from('users')
            .select('id, email');

        for (const user of users) {
            // Calculate total recharges
            const { data: recharges } = await supabase
                .from('recharges')
                .select('amount')
                .eq('user_id', user.id)
                .eq('status', 'completed');

            // Calculate total transactions
            const { data: transactions } = await supabase
                .from('transactions')
                .select('amount')
                .eq('user_id', user.id)
                .eq('status', 'completed');

            const totalRecharges = recharges?.reduce((sum, r) => sum + r.amount, 0) || 0;
            const totalSpent = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
            const newBalance = totalRecharges - totalSpent;

            // Update wallet balance
            const { error } = await supabase
                .from('wallets')
                .update({ balance: newBalance })
                .eq('user_id', user.id);

            if (error) {
                console.error(`❌ Error updating wallet for ${user.email}:`, error);
            } else {
                console.log(`✅ Updated wallet for ${user.email}: ₹${newBalance}`);
            }
        }
    } catch (error) {
        console.error('❌ Error updating wallet balances:', error.message);
    }
}

// Run the population
populateTransactionsAndRecharges()
    .then(() => {
        console.log('\n🚀 Running verification test...\n');
        // Run the test script to verify
        require('./test-mock-data.js');
    })
    .catch(error => {
        console.error('❌ Population failed:', error.message);
        process.exit(1);
    });