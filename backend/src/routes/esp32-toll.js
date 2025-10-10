const express = require('express');
const router = express.Router();

// Import Supabase client
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

// Import auth middleware
const { authMiddleware } = require('../middleware/authMiddleware');

/**
 * @route   GET /api/esp32-toll/transactions
 * @desc    Get ESP32 toll transactions for authenticated user
 * @access  Private
 */
router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    console.log(`Fetching ESP32 transactions for user ${userId}, limit: ${limit}, offset: ${offset}`);

    // Query ESP32 toll transactions with vehicle information
    const { data: transactions, error } = await supabase
      .from('esp32_toll_transactions')
      .select(`
        *,
        vehicles (
          vehicle_number,
          vehicle_type
        )
      `)
      .eq('user_id', userId)
      .order('processed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching ESP32 transactions:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching transaction history'
      });
    }

    // Format transactions for frontend
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      device_id: transaction.device_id,
      start_lat: transaction.start_lat,
      start_lon: transaction.start_lon,
      distance_km: transaction.total_distance_km,
      toll_amount: transaction.toll_amount,
      status: transaction.status,
      created_at: transaction.processed_at,
      vehicle_number: transaction.vehicles?.vehicle_number || null,
      vehicle_type: transaction.vehicles?.vehicle_type || null,
      timestamp: transaction.device_timestamp || transaction.processed_at
    }));

    console.log(`Found ${formattedTransactions.length} ESP32 transactions for user ${userId}`);

    res.json({
      success: true,
      transactions: formattedTransactions,
      total: formattedTransactions.length
    });

  } catch (error) {
    console.error('Error in ESP32 transactions endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/esp32-toll/process
 * @desc    Process toll transaction from ESP32 device - SIMPLIFIED
 * @access  Public (device sends data directly)
 * 
 * Expected payload:
 * {
 *   "device_id": "ESP32_DEVICE_001",
 *   "start_lat": 11.0168,
 *   "start_lon": 76.9558,
 *   "total_distance_km": 15.5,
 *   "timestamp": "2025-10-10T10:30:00Z"
 * }
 */
router.post('/process', async (req, res) => {
  try {
    const { device_id, start_lat, start_lon, total_distance_km, timestamp } = req.body;

    // Validate required fields
    if (!device_id || start_lat === undefined || start_lon === undefined || !total_distance_km || !timestamp) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: device_id, start_lat, start_lon, total_distance_km, timestamp'
      });
    }

    // Validate coordinates
    if (start_lat < -90 || start_lat > 90 || start_lon < -180 || start_lon > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates'
      });
    }

    // Validate distance
    if (total_distance_km <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Distance must be greater than 0'
      });
    }

    console.log(`ESP32 Toll Request - Device: ${device_id}, Distance: ${total_distance_km}km, Timestamp: ${timestamp}`);

    // Parse and validate timestamp - handle different formats
    let parsedTimestamp;
    try {
      // Handle ESP32 format: "2025:10:10 21:52:01" -> "2025-10-10T21:52:01Z"
      let normalizedTimestamp;
      if (timestamp.includes(':') && timestamp.includes(' ')) {
        // ESP32 format with colons in date and space separator
        const parts = timestamp.split(' ');
        if (parts.length === 2) {
          const datePart = parts[0].replace(/:/g, '-'); // Only replace colons in date part
          const timePart = parts[1]; // Keep time part as is
          normalizedTimestamp = `${datePart}T${timePart}Z`;
        } else {
          normalizedTimestamp = timestamp;
        }
      } else {
        normalizedTimestamp = timestamp;
      }
      
      parsedTimestamp = new Date(normalizedTimestamp);
      
      // Fallback: try parsing original timestamp directly
      if (isNaN(parsedTimestamp.getTime())) {
        parsedTimestamp = new Date(timestamp);
      }
      
      // If still invalid, use current time
      if (isNaN(parsedTimestamp.getTime())) {
        console.warn(`Invalid timestamp format: ${timestamp}, using current time`);
        parsedTimestamp = new Date();
      }
    } catch (timestampError) {
      console.warn(`Error parsing timestamp: ${timestamp}, using current time`, timestampError);
      parsedTimestamp = new Date();
    }

    console.log(`Processed timestamp: ${parsedTimestamp.toISOString()}`);

    // Process the toll transaction using the database function
    const { data, error } = await supabase.rpc('process_esp32_toll', {
      p_device_id: device_id,
      p_start_lat: parseFloat(start_lat),
      p_start_lon: parseFloat(start_lon),
      p_total_distance_km: parseFloat(total_distance_km),
      p_device_timestamp: parsedTimestamp.toISOString()
    });

    if (error) {
      console.error('Database error processing toll:', error);
      return res.status(500).json({
        success: false,
        message: 'Database error processing toll transaction'
      });
    }

    const result = data[0];

    if (result.success) {
      console.log(`Toll processed successfully - Amount: ₹${result.toll_amount}, New Balance: ₹${result.new_balance}`);
      
      return res.json({
        success: true,
        message: result.message,
        data: {
          transaction_id: result.transaction_id,
          toll_amount: parseFloat(result.toll_amount),
          new_wallet_balance: parseFloat(result.new_balance),
          vehicle_id: result.vehicle_id,
          user_id: result.user_id
        }
      });
    } else {
      console.log(`Toll processing failed: ${result.message}`);
      
      return res.json({
        success: false,
        message: result.message,
        data: {
          transaction_id: result.transaction_id,
          toll_amount: parseFloat(result.toll_amount || 0),
          current_wallet_balance: parseFloat(result.new_balance || 0),
          vehicle_id: result.vehicle_id,
          user_id: result.user_id
        }
      });
    }

  } catch (error) {
    console.error('Error processing ESP32 toll transaction:', error);
    console.error('Request body:', req.body);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      debug: process.env.NODE_ENV === 'development' ? {
        timestamp: new Date().toISOString(),
        request_body: req.body
      } : undefined
    });
  }
});

module.exports = router;