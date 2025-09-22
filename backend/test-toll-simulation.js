// Test script to simulate vehicle toll processing
// Using built-in fetch (Node.js 18+)

const API_BASE_URL = 'http://localhost:5000/api';

// Test data
const testVehicleEvent = {
    license_plate: 'ABC123', // Using sample vehicle from populate_data.sql
    toll_gate_id: '11111111-1111-1111-1111-111111111111', // Using UUID from toll_gates table
    timestamp: new Date().toISOString()
};

const testLogin = {
    email: 'test@example.com',
    password: 'password123'
};

async function simulateTollEvent() {
    try {
        console.log('🚗 Starting toll simulation test...\n');

        // First, let's try to trigger the toll event without authentication (as it's a public endpoint)
        console.log('📡 Sending vehicle detection event:', testVehicleEvent);
        
        const tollResponse = await fetch(`${API_BASE_URL}/toll/event`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testVehicleEvent)
        });

        const tollResult = await tollResponse.json();
        console.log('\n📊 Toll processing result:');
        console.log('Status:', tollResponse.status);
        console.log('Response:', JSON.stringify(tollResult, null, 2));

        if (tollResult.success) {
            console.log('\n✅ Toll deduction successful!');
            console.log(`💰 Amount deducted: ₹${tollResult.data.wallet.amount_deducted}`);
            console.log(`💳 Remaining balance: ₹${tollResult.data.wallet.current_balance}`);
            console.log(`🎫 Transaction ID: ${tollResult.data.transaction.id}`);
            console.log(`🚗 Vehicle: ${tollResult.data.vehicle.license_plate} (${tollResult.data.vehicle.make} ${tollResult.data.vehicle.model})`);
            console.log(`🏁 Toll Gate: ${tollResult.data.toll_gate.name} - ${tollResult.data.toll_gate.location}`);
        } else {
            console.log('\n❌ Toll processing failed:');
            console.log('Error:', tollResult.message || tollResult.error);
            
            if (tollResult.error === 'insufficient_balance') {
                console.log('💸 Insufficient balance detected!');
                console.log(`Current balance: ₹${tollResult.data.current_balance}`);
                console.log(`Required amount: ₹${tollResult.data.required_amount}`);
                console.log(`Shortfall: ₹${tollResult.data.shortfall}`);
            }
        }

    } catch (error) {
        console.error('🔥 Error during toll simulation:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Test with different scenarios
async function runAllTests() {
    console.log('🧪 Running comprehensive toll simulation tests...\n');
    
    // Test 1: Normal toll event
    await simulateTollEvent();
    
    // Test 2: Non-existent vehicle
    console.log('\n\n🚫 Testing with non-existent vehicle...');
    const invalidVehicleEvent = {
        ...testVehicleEvent,
        license_plate: 'INVALID123'
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/toll/event`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(invalidVehicleEvent)
        });
        
        const result = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Run the test
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = { simulateTollEvent, runAllTests };