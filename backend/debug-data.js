require('dotenv').config();
const { supabase } = require('./src/config/db');

async function debugDataFetch() {
    console.log('🔍 Debugging data fetch...\n');

    try {
        // Test basic connection
        console.log('1️⃣ Testing basic connection...');
        const { data: testData, error: testError } = await supabase
            .from('users')
            .select('count')
            .limit(1);
        
        if (testError) {
            console.log('❌ Connection error:', testError);
            return;
        }
        console.log('✅ Connection working\n');

        // Test users fetch
        console.log('2️⃣ Testing users fetch...');
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('id, email, name');
        
        if (usersError) {
            console.log('❌ Users error:', usersError);
        } else {
            console.log(`✅ Users: ${users?.length || 0} records`);
            users?.forEach(u => console.log(`   - ${u.name} (${u.email})`));
        }
        console.log();

        // Test vehicles fetch
        console.log('3️⃣ Testing vehicles fetch...');
        const { data: vehicles, error: vehiclesError } = await supabase
            .from('vehicles')
            .select('id, license_plate, user_id');
        
        if (vehiclesError) {
            console.log('❌ Vehicles error:', vehiclesError);
        } else {
            console.log(`✅ Vehicles: ${vehicles?.length || 0} records`);
            vehicles?.forEach(v => console.log(`   - ${v.license_plate}`));
        }
        console.log();

        // Test toll gates fetch
        console.log('4️⃣ Testing toll gates fetch...');
        const { data: tollGates, error: tollGatesError } = await supabase
            .from('toll_gates')
            .select('id, name, amount');
        
        if (tollGatesError) {
            console.log('❌ Toll gates error:', tollGatesError);
        } else {
            console.log(`✅ Toll gates: ${tollGates?.length || 0} records`);
            tollGates?.forEach(t => console.log(`   - ${t.name}: ₹${t.amount}`));
        }
        console.log();

        // If all successful, try inserting a test transaction
        if (!usersError && !vehiclesError && !tollGatesError && users?.length && vehicles?.length && tollGates?.length) {
            console.log('5️⃣ Testing transaction insertion...');
            
            const testTransaction = {
                user_id: users[0].id,
                vehicle_id: vehicles[0].id,
                toll_gate_id: tollGates[0].id,
                amount: 50.00,
                status: 'completed',
                transaction_type: 'toll_deduction',
                created_at: new Date().toISOString()
            };

            const { data: insertedTransaction, error: insertError } = await supabase
                .from('transactions')
                .insert([testTransaction])
                .select();

            if (insertError) {
                console.log('❌ Insert error:', insertError);
            } else {
                console.log('✅ Test transaction inserted successfully');
                console.log('   Transaction ID:', insertedTransaction[0]?.id);
                
                // Clean up test transaction
                await supabase
                    .from('transactions')
                    .delete()
                    .eq('id', insertedTransaction[0]?.id);
                console.log('✅ Test transaction cleaned up');
            }
        }

    } catch (error) {
        console.error('❌ Debug error:', error.message);
    }
}

debugDataFetch();