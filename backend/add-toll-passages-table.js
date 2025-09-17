require('dotenv').config();
const { supabase } = require('./src/config/db');

async function addTollPassagesTable() {
    console.log('🚀 Adding toll_passages table to Supabase...\n');

    try {
        // Check if toll_passages table already exists
        const { data: existingTable, error: checkError } = await supabase
            .from('toll_passages')
            .select('id')
            .limit(1);

        if (!checkError) {
            console.log('✅ toll_passages table already exists');
            
            // Check current count
            const { count } = await supabase
                .from('toll_passages')
                .select('*', { count: 'exact', head: true });
            
            console.log(`📊 Current toll_passages records: ${count}`);
            return;
        }

        console.log('📝 Creating toll_passages table...');

        // SQL to create the toll_passages table
        const createTableSQL = `
            -- Create toll_passages table
            CREATE TABLE IF NOT EXISTS toll_passages (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
                toll_gate_id UUID NOT NULL REFERENCES toll_gates(id) ON DELETE CASCADE,
                charge DECIMAL(10,2) NOT NULL,
                balance_after DECIMAL(10,2) NOT NULL,
                passage_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            -- Create indexes for better performance
            CREATE INDEX IF NOT EXISTS idx_toll_passages_user_id ON toll_passages(user_id);
            CREATE INDEX IF NOT EXISTS idx_toll_passages_vehicle_id ON toll_passages(vehicle_id);
            CREATE INDEX IF NOT EXISTS idx_toll_passages_toll_gate_id ON toll_passages(toll_gate_id);
            CREATE INDEX IF NOT EXISTS idx_toll_passages_timestamp ON toll_passages(passage_timestamp);
        `;

        // Execute the SQL using RPC (if available) or handle manually
        console.log('⚠️  Please execute the following SQL in your Supabase SQL Editor:');
        console.log('🔗 Go to: https://supabase.com/dashboard/project/your-project/sql');
        console.log('\n📋 SQL to execute:');
        console.log('=' .repeat(50));
        console.log(createTableSQL);
        console.log('=' .repeat(50));

        // Try alternative approach - check table creation
        console.log('\n⏳ Waiting for table creation confirmation...');
        console.log('💡 After running the SQL above, run this script again to verify.');

        return false;

    } catch (error) {
        console.error('❌ Error checking/creating toll_passages table:', error.message);
        return false;
    }
}

// Run the table creation
addTollPassagesTable()
    .then((success) => {
        if (success !== false) {
            console.log('\n🎉 toll_passages table setup completed!');
        } else {
            console.log('\n⏸️  Please execute the SQL in Supabase dashboard and run this script again.');
        }
    })
    .catch(error => {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    });