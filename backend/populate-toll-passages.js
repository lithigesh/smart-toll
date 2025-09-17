require('dotenv').config();
const { supabase } = require('./src/config/db');

async function populateTollPassages() {
    console.log('🚀 Populating toll_passages table with mock data...\n');

    try {
        // Check if toll_passages table exists
        const { data: existingTable, error: checkError } = await supabase
            .from('toll_passages')
            .select('id')
            .limit(1);

        if (checkError) {
            console.log('❌ toll_passages table does not exist. Please create it first.');
            console.log('💡 Run: node add-toll-passages-table.js');
            return false;
        }

        // Check if already populated
        const { count } = await supabase
            .from('toll_passages')
            .select('*', { count: 'exact', head: true });

        if (count > 0) {
            console.log(`✅ toll_passages table already has ${count} records`);
            return true;
        }

        console.log('📋 Fetching reference data...');
        
        // Get reference data
        const { data: users } = await supabase
            .from('users')
            .select('id, email, name');
        
        const { data: vehicles } = await supabase
            .from('vehicles')
            .select('id, license_plate, user_id');
            
        const { data: tollGates } = await supabase
            .from('toll_gates')
            .select('id, name, toll_amount');

        if (!users?.length || !vehicles?.length || !tollGates?.length) {
            throw new Error('Required reference data not found');
        }

        console.log(`✅ Found ${users.length} users, ${vehicles.length} vehicles, ${tollGates.length} toll gates\n`);

        // Find specific users
        const johnDoe = users.find(u => u.email === 'john.doe@example.com');
        const admin = users.find(u => u.email === 'admin@smarttoll.com');

        if (!johnDoe || !admin) {
            throw new Error('Required users not found');
        }

        // Helper functions
        const findVehicleId = (licensePlate) => vehicles.find(v => v.license_plate === licensePlate)?.id;
        const findTollGateId = (name) => tollGates.find(t => t.name === name)?.id;

        // Create realistic toll passages with decreasing balance
        console.log('💸 Creating toll passage records...');
        
        const tollPassages = [
            // Recent passages (John Doe)
            {
                user_id: johnDoe.id,
                vehicle_id: findVehicleId('MH01AB1234'),
                toll_gate_id: findTollGateId('Mumbai-Pune Express Entry'),
                charge: 75.00,
                balance_after: 925.00,
                passage_timestamp: '2025-01-15T09:15:00Z'
            },
            {
                user_id: johnDoe.id,
                vehicle_id: findVehicleId('MH01AB1234'),
                toll_gate_id: findTollGateId('Eastern Express Highway'),
                charge: 45.00,
                balance_after: 880.00,
                passage_timestamp: '2025-01-14T14:30:00Z'
            },
            {
                user_id: johnDoe.id,
                vehicle_id: findVehicleId('MH02CD5678'),
                toll_gate_id: findTollGateId('Bandra-Worli Sea Link'),
                charge: 85.00,
                balance_after: 795.00,
                passage_timestamp: '2025-01-13T16:45:00Z'
            },
            {
                user_id: johnDoe.id,
                vehicle_id: findVehicleId('MH02CD5678'),
                toll_gate_id: findTollGateId('Eastern Express Highway'),
                charge: 45.00,
                balance_after: 750.00,
                passage_timestamp: '2025-01-10T17:25:00Z'
            },
            {
                user_id: johnDoe.id,
                vehicle_id: findVehicleId('MH01AB1234'),
                toll_gate_id: findTollGateId('Western Express Highway'),
                charge: 35.00,
                balance_after: 715.00,
                passage_timestamp: '2025-01-08T11:20:00Z'
            },
            
            // Admin passages
            {
                user_id: admin.id,
                vehicle_id: findVehicleId('MH12EF9999'),
                toll_gate_id: findTollGateId('Western Express Highway'),
                charge: 35.00,
                balance_after: 3225.00,
                passage_timestamp: '2025-01-12T11:20:00Z'
            },
            {
                user_id: admin.id,
                vehicle_id: findVehicleId('MH12EF9999'),
                toll_gate_id: findTollGateId('Bandra-Worli Sea Link'),
                charge: 85.00,
                balance_after: 3140.00,
                passage_timestamp: '2025-01-09T13:40:00Z'
            },
            {
                user_id: admin.id,
                vehicle_id: findVehicleId('MH12EF9999'),
                toll_gate_id: findTollGateId('Mumbai-Pune Express Entry'),
                charge: 75.00,
                balance_after: 3065.00,
                passage_timestamp: '2025-01-05T08:15:00Z'
            },
            
            // Historical passages (older)
            {
                user_id: johnDoe.id,
                vehicle_id: findVehicleId('MH01AB1234'),
                toll_gate_id: findTollGateId('Mumbai-Pune Express Exit'),
                charge: 75.00,
                balance_after: 640.00,
                passage_timestamp: '2024-12-28T15:30:00Z'
            },
            {
                user_id: johnDoe.id,
                vehicle_id: findVehicleId('MH02CD5678'),
                toll_gate_id: findTollGateId('Western Express Highway'),
                charge: 35.00,
                balance_after: 605.00,
                passage_timestamp: '2024-12-25T10:45:00Z'
            },
            {
                user_id: admin.id,
                vehicle_id: findVehicleId('MH12EF9999'),
                toll_gate_id: findTollGateId('Eastern Express Highway'),
                charge: 45.00,
                balance_after: 2955.00,
                passage_timestamp: '2024-12-20T09:30:00Z'
            },
            {
                user_id: johnDoe.id,
                vehicle_id: findVehicleId('MH01AB1234'),
                toll_gate_id: findTollGateId('Bandra-Worli Sea Link'),
                charge: 85.00,
                balance_after: 520.00,
                passage_timestamp: '2024-12-18T14:20:00Z'
            }
        ];

        // Insert toll passages
        const { data: insertedPassages, error: insertError } = await supabase
            .from('toll_passages')
            .insert(tollPassages)
            .select();

        if (insertError) {
            console.error('❌ Error inserting toll passages:', insertError);
            throw insertError;
        }

        console.log(`✅ Successfully inserted ${insertedPassages.length} toll passages\n`);

        // Display summary
        console.log('📊 Toll Passages Summary:');
        console.log(`   💰 John Doe's passages: ${tollPassages.filter(p => p.user_id === johnDoe.id).length}`);
        console.log(`   🏢 Admin's passages: ${tollPassages.filter(p => p.user_id === admin.id).length}`);
        console.log(`   🚗 Vehicle MH01AB1234: ${tollPassages.filter(p => p.vehicle_id === findVehicleId('MH01AB1234')).length} passages`);
        console.log(`   🚙 Vehicle MH02CD5678: ${tollPassages.filter(p => p.vehicle_id === findVehicleId('MH02CD5678')).length} passages`);
        console.log(`   🚛 Vehicle MH12EF9999: ${tollPassages.filter(p => p.vehicle_id === findVehicleId('MH12EF9999')).length} passages`);

        const totalAmount = tollPassages.reduce((sum, p) => sum + p.charge, 0);
        console.log(`   💸 Total amount: ₹${totalAmount.toFixed(2)}\n`);

        return true;

    } catch (error) {
        console.error('❌ Error populating toll passages:', error.message);
        return false;
    }
}

// Run the population
populateTollPassages()
    .then((success) => {
        if (success) {
            console.log('🎉 Toll passages population completed successfully!');
            console.log('\n📝 Next steps:');
            console.log('   1. Test the new toll passage endpoints');
            console.log('   2. Update API documentation');
            console.log('   3. Test the complete toll deduction workflow');
        } else {
            console.log('❌ Toll passages population failed');
        }
    })
    .catch(error => {
        console.error('❌ Population failed:', error.message);
        process.exit(1);
    });