const Vehicle = require('../models/Vehicle');
const Wallet = require('../models/Wallet');
const TollGate = require('../models/TollGate');
const Transaction = require('../models/Transaction');
const Journey = require('../models/Journey');
const User = require('../models/User');
const GeofencingService = require('../services/GeofencingService');
const TollProcessingService = require('../services/TollProcessingService');

const { supabase } = require('../config/db');
const { asyncErrorHandler, NotFoundError, PaymentError, ValidationError } = require('../middleware/errorHandler');

/**
 * Process pending toll payment when vehicle reaches toll gate
 * POST /api/toll/process-pending
 * This endpoint processes pending toll payments when vehicle contacts toll gate
 */
const processPendingToll = asyncErrorHandler(async (req, res) => {
  const { license_plate, toll_gate_id, timestamp } = req.body;

  if (!license_plate || !toll_gate_id) {
    throw new ValidationError('license_plate and toll_gate_id are required');
  }

  console.log('� Processing pending toll at gate:', {
    license_plate: license_plate.toUpperCase(),
    toll_gate_id,
    timestamp: timestamp || new Date().toISOString()
  });

  try {
    // 1. Find vehicle and its owner
    const vehicle = await Vehicle.findByPlateNumber(license_plate.toUpperCase());
    if (!vehicle) {
      throw new NotFoundError(`Vehicle ${license_plate} is not registered in the system`);
    }

    // 2. Get toll gate information
    const tollGate = await TollGate.findById(toll_gate_id);
    if (!tollGate) {
      throw new NotFoundError(`Toll gate ${toll_gate_id} not found`);
    }

    console.log(`🎯 Processing tolls for user ${vehicle.user_id}, vehicle ${vehicle.id}`);

    // 3. Process pending tolls using GeofencingService
    const processingResult = await GeofencingService.processPendingTollAtGate({
      vehicleId: vehicle.id,
      tollGateId: toll_gate_id,
      userId: vehicle.user_id
    });

    // 4. Get updated wallet balance
    const wallet = await Wallet.findByUserId(vehicle.user_id);

    res.json({
      success: true,
      message: processingResult.success 
        ? `Processed ${processingResult.processed_count} pending toll(s)`
        : processingResult.message,
      data: {
        vehicle: {
          id: vehicle.id,
          license_plate: vehicle.plate_number,
          vehicle_type: vehicle.vehicle_type
        },
        toll_gate: {
          id: tollGate.id,
          name: tollGate.name,
          location: tollGate.location
        },
        processing_result: processingResult,
        wallet_balance: wallet ? wallet.balance : 0,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error processing pending toll:', error);
    
    if (error.message.includes('Insufficient')) {
      throw new PaymentError(error.message);
    }
    
    throw error;
  }
});

    if (tollGateError || !tollGate) {
      throw new NotFoundError(`Toll gate with ID ${toll_gate_id} not found`);
    }

    const charge = parseFloat(tollGate.toll_amount);

    // 3. Get current wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', vehicle.user_id)
      .single();

    if (walletError || !wallet) {
      throw new NotFoundError('Wallet not found for vehicle owner');
    }

    const currentBalance = parseFloat(wallet.balance);

    // 4. Check if user has sufficient balance
    if (currentBalance < charge) {
      // Insert a failed transaction record for audit
      const failedTransaction = await Transaction.create({
        user_id: vehicle.user_id,
        vehicle_id: vehicle.id,
        toll_gate_id: toll_gate_id,
        amount: charge,
        status: 'failed',
        transaction_type: 'toll_deduction'
      });

      return res.status(402).json({
        success: false,
        error: 'insufficient_balance',
        message: `Insufficient balance. Current: ₹${currentBalance}, Required: ₹${charge}`,
        data: {
          current_balance: currentBalance,
          required_amount: charge,
          shortfall: charge - currentBalance,
          vehicle: {
            license_plate: vehicle.license_plate,
            vehicle_type: vehicle.vehicle_type,
            model: vehicle.model
          },
          toll_gate: {
            name: tollGate.name,
            location: tollGate.location,
            amount: charge
          },
          transaction_id: failedTransaction.id
        },
        suggestions: [
          'Please recharge your wallet to continue',
          'Minimum recharge amount: ₹100',
          `Required top-up: ₹${Math.ceil(charge - currentBalance)}`
        ]
      });
    }

    // 5. Process successful toll deduction
    const newBalance = currentBalance - charge;

    // Update wallet balance
    const { error: updateError } = await supabase
      .from('wallets')
      .update({ 
        balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', vehicle.user_id);

    if (updateError) {
      throw new Error(`Failed to update wallet balance: ${updateError.message}`);
    }

    // Create transaction record
    const transaction = await Transaction.create({
      user_id: vehicle.user_id,
      vehicle_id: vehicle.id,
      toll_gate_id: toll_gate_id,
      amount: charge,
      status: 'completed',
      transaction_type: 'toll_deduction'
    });

    // Create toll passage record
    console.log('🔧 Creating toll passage with data:', {
      user_id: vehicle.user_id,
      vehicle_id: vehicle.id,
      toll_gate_id: toll_gate_id,
      charge: charge,
      balance_after: newBalance,
      passage_timestamp: timestamp || new Date().toISOString()
    });

    const tollPassage = await TollPassage.create({
      user_id: vehicle.user_id,
      vehicle_id: vehicle.id,
      toll_gate_id: toll_gate_id,
      charge: charge,
      balance_after: newBalance,
      passage_timestamp: timestamp || new Date().toISOString()
    });

    console.log('🔧 TollPassage.create() returned:', tollPassage);
    
    if (!tollPassage) {
      throw new Error('TollPassage.create() returned undefined or null');
    }

    console.log('✅ Toll crossing processed successfully:', {
      vehicle_license: vehicle.license_plate,
      toll_gate: tollGate.name,
      charge: charge,
      new_balance: newBalance,
      transaction_id: transaction.id,
      passage_id: tollPassage.id
    });

    return res.json({
      success: true,
      message: 'Toll deducted successfully',
      data: {
        transaction: {
          id: transaction.id,
          amount: charge,
          status: 'completed',
          remaining_balance: newBalance
        },
        toll_passage: {
          id: tollPassage.id,
          passage_timestamp: tollPassage.passage_timestamp
        },
        toll_gate: {
          name: tollGate.name,
          location: tollGate.location,
          amount: charge
        },
        vehicle: {
          license_plate: vehicle.license_plate,
          vehicle_type: vehicle.vehicle_type,
          model: vehicle.model
        },
        wallet: {
          previous_balance: currentBalance,
          current_balance: newBalance,
          amount_deducted: charge
        }
      }
    });

  } catch (error) {
    console.error('❌ Toll event processing error:', error);
    throw error;
  }
});

/**
 * Get toll passage history for authenticated user
 * GET /api/toll/history
 */
const getTollHistory = asyncErrorHandler(async (req, res) => {
  const userId = req.user.id;
  const { 
    page = 1, 
    limit = 10, 
    vehicle_id = null, 
    toll_gate_id = null,
    start_date = null,
    end_date = null 
  } = req.query;

  try {
    const result = await TollPassage.getByUserId(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      vehicleId: vehicle_id,
      tollGateId: toll_gate_id
    });

    // Get user statistics
    const stats = await TollPassage.getUserStats(userId, '30 days');

    res.json({
      success: true,
      data: {
        toll_passages: result.passages.map(passage => ({
          id: passage.id,
          charge: parseFloat(passage.charge),
          balance_after: parseFloat(passage.balance_after),
          passage_timestamp: passage.passage_timestamp,
          vehicle: {
            id: passage.vehicles.id,
            license_plate: passage.vehicles.license_plate,
            make: passage.vehicles.make,
            model: passage.vehicles.model,
            type: passage.vehicles.vehicle_type
          },
          toll_gate: {
            id: passage.toll_gates.id,
            name: passage.toll_gates.name,
            location: passage.toll_gates.location,
            amount: parseFloat(passage.toll_gates.toll_amount)
          }
        })),
        statistics: stats,
        pagination: result.pagination
      }
    });
  } catch (error) {
    throw error;
  }
});

/**
 * Get toll passage history for a specific vehicle
 * GET /api/toll/vehicle/:vehicleId/passages
 */
const getVehicleTollHistory = asyncErrorHandler(async (req, res) => {
  const { vehicleId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const userId = req.user.id;

  // Verify vehicle ownership
  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('id, user_id, license_plate, make, model')
    .eq('id', vehicleId)
    .single();

  if (vehicleError || !vehicle) {
    throw new NotFoundError('Vehicle not found');
  }

  if (vehicle.user_id !== userId) {
    throw new ValidationError('Access denied - vehicle does not belong to user');
  }

  const result = await TollPassage.getByVehicleId(vehicleId, {
    page: parseInt(page),
    limit: parseInt(limit)
  });

  res.json({
    success: true,
    data: {
      vehicle: {
        id: vehicle.id,
        license_plate: vehicle.license_plate,
        make: vehicle.make,
        model: vehicle.model
      },
      toll_passages: result.passages.map(passage => ({
        id: passage.id,
        charge: parseFloat(passage.charge),
        balance_after: parseFloat(passage.balance_after),
        passage_timestamp: passage.passage_timestamp,
        toll_gate: {
          id: passage.toll_gates.id,
          name: passage.toll_gates.name,
          location: passage.toll_gates.location,
          amount: parseFloat(passage.toll_gates.toll_amount)
        }
      })),
      pagination: result.pagination
    }
  });
});

/**
 * Get toll gate statistics and recent passages
 * GET /api/toll/gate/:tollGateId/passages
 */
const getTollGatePassages = asyncErrorHandler(async (req, res) => {
  const { tollGateId } = req.params;
  const { 
    page = 1, 
    limit = 10, 
    start_date = null, 
    end_date = null 
  } = req.query;

  // Check if toll gate exists
  const { data: tollGate, error: tollGateError } = await supabase
    .from('toll_gates')
    .select('id, name, location, toll_amount')
    .eq('id', tollGateId)
    .single();

  if (tollGateError || !tollGate) {
    throw new NotFoundError('Toll gate not found');
  }

  const result = await TollPassage.getByTollGateId(tollGateId, {
    page: parseInt(page),
    limit: parseInt(limit),
    startDate: start_date,
    endDate: end_date
  });

  res.json({
    success: true,
    data: {
      toll_gate: {
        id: tollGate.id,
        name: tollGate.name,
        location: tollGate.location,
        toll_amount: parseFloat(tollGate.toll_amount)
      },
      passages: result.passages.map(passage => ({
        id: passage.id,
        charge: parseFloat(passage.charge),
        balance_after: parseFloat(passage.balance_after),
        passage_timestamp: passage.passage_timestamp,
        user: {
          name: passage.users.name,
          email: passage.users.email
        },
        vehicle: {
          id: passage.vehicles.id,
          license_plate: passage.vehicles.license_plate,
          make: passage.vehicles.make,
          model: passage.vehicles.model,
          type: passage.vehicles.vehicle_type
        }
      })),
      pagination: result.pagination
    }
  });
});

/**
 * Get recent toll passages across all toll gates
 * GET /api/toll/recent-passages
 */
const getRecentPassages = asyncErrorHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const recentPassages = await TollPassage.getRecent(parseInt(limit));

  res.json({
    success: true,
    data: {
      recent_passages: recentPassages.map(passage => ({
        id: passage.id,
        charge: parseFloat(passage.charge),
        balance_after: parseFloat(passage.balance_after),
        passage_timestamp: passage.passage_timestamp,
        user: {
          name: passage.users.name,
          email: passage.users.email
        },
        vehicle: {
          license_plate: passage.vehicles.license_plate,
          make: passage.vehicles.make,
          model: passage.vehicles.model
        },
        toll_gate: {
          name: passage.toll_gates.name,
          location: passage.toll_gates.location
        }
      }))
    }
  });
});
module.exports = {
  handleTollEvent,
  getTollHistory,
  getVehicleTollHistory,
  getTollGatePassages,
  getRecentPassages
};