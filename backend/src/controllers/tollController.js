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

  console.log('🚧 Processing pending toll at gate:', {
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

/**
 * Get pending toll summary for a user
 * GET /api/toll/pending/:userId
 * This endpoint returns pending toll information for a user
 */
const getPendingTolls = asyncErrorHandler(async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    throw new ValidationError('userId is required');
  }

  try {
    console.log(`📋 Getting pending tolls for user ${userId}`);

    // Get pending toll summary using TollProcessingService
    const summary = await TollProcessingService.getPendingTollSummary(userId);

    res.json({
      success: true,
      message: `Found ${summary.pending_count} pending toll(s)`,
      data: {
        user_id: userId,
        summary,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error getting pending tolls:', error);
    throw error;
  }
});

/**
 * Simulate toll fare calculation
 * POST /api/toll/simulate
 * This endpoint calculates what toll would be charged for a given distance and vehicle
 */
const simulateTollFare = asyncErrorHandler(async (req, res) => {
  const { userId, vehicleId, distanceKm, vehicleType, tollRoadId } = req.body;

  if (!userId || !distanceKm || !vehicleType) {
    throw new ValidationError('userId, distanceKm, and vehicleType are required');
  }

  try {
    console.log(`🧮 Simulating toll fare for ${distanceKm}km, ${vehicleType}`);

    // Simulate toll processing
    const simulation = await TollProcessingService.simulateTollProcessing({
      userId,
      vehicleId: vehicleId || null,
      distanceKm: parseFloat(distanceKm),
      vehicleType,
      tollRoadId: tollRoadId || 'default-road'
    });

    res.json({
      success: true,
      message: 'Toll fare simulation completed',
      data: {
        input_parameters: {
          userId,
          vehicleId,
          distanceKm: parseFloat(distanceKm),
          vehicleType,
          tollRoadId
        },
        simulation,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error simulating toll fare:', error);
    throw error;
  }
});

/**
 * Get toll processing statistics
 * GET /api/toll/stats/:userId?
 * This endpoint returns toll processing statistics for a user or overall
 */
const getTollStats = asyncErrorHandler(async (req, res) => {
  const { userId } = req.params;
  const { startDate, endDate } = req.query;

  try {
    console.log(`📊 Getting toll statistics for ${userId || 'all users'}`);

    const dateRange = {};
    if (startDate) dateRange.start_date = startDate;
    if (endDate) dateRange.end_date = endDate;

    // Get processing statistics
    const stats = await TollProcessingService.getProcessingStats(userId, dateRange);

    res.json({
      success: true,
      message: 'Toll statistics retrieved successfully',
      data: {
        user_id: userId || 'all',
        date_range: dateRange,
        statistics: stats,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error getting toll stats:', error);
    throw error;
  }
});

/**
 * Cancel pending toll transactions (admin function)
 * POST /api/toll/cancel-pending
 * This endpoint cancels pending toll transactions
 */
const cancelPendingTolls = asyncErrorHandler(async (req, res) => {
  const { transactionIds, reason } = req.body;

  if (!transactionIds || !Array.isArray(transactionIds)) {
    throw new ValidationError('transactionIds array is required');
  }

  try {
    console.log(`❌ Cancelling ${transactionIds.length} pending tolls`);

    // Cancel pending tolls using TollProcessingService
    const cancellationResult = await TollProcessingService.cancelPendingTolls(
      transactionIds,
      reason || 'Cancelled via API'
    );

    res.json({
      success: true,
      message: `Cancelled ${cancellationResult.cancelled_count} of ${transactionIds.length} toll(s)`,
      data: {
        cancellation_result: cancellationResult,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error cancelling pending tolls:', error);
    throw error;
  }
});

/**
 * Get active journeys (admin/monitoring function)
 * GET /api/toll/active-journeys
 * This endpoint returns all active journeys for monitoring
 */
const getActiveJourneys = asyncErrorHandler(async (req, res) => {
  try {
    console.log('🚗 Getting active journeys');

    // Get active journeys from GeofencingService
    const activeJourneys = await GeofencingService.getActiveJourneys();

    res.json({
      success: true,
      message: `Found ${activeJourneys.length} active journey(s)`,
      data: {
        active_journeys: activeJourneys,
        count: activeJourneys.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error getting active journeys:', error);
    throw error;
  }
});

/**
 * Cancel an active journey (emergency function)
 * POST /api/toll/cancel-journey
 * This endpoint cancels an active journey
 */
const cancelActiveJourney = asyncErrorHandler(async (req, res) => {
  const { journeyId, reason } = req.body;

  if (!journeyId) {
    throw new ValidationError('journeyId is required');
  }

  try {
    console.log(`❌ Cancelling journey ${journeyId}`);

    // Cancel journey using GeofencingService
    const cancelledJourney = await GeofencingService.cancelJourney(
      journeyId,
      reason || 'Cancelled via API'
    );

    res.json({
      success: true,
      message: 'Journey cancelled successfully',
      data: {
        cancelled_journey: cancelledJourney,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error cancelling journey:', error);
    throw error;
  }
});

/**
 * Test endpoint for toll gate detection
 * POST /api/toll/test-gate-detection
 * This endpoint simulates vehicle detection at toll gate
 */
const testTollGateDetection = asyncErrorHandler(async (req, res) => {
  const { license_plate, toll_gate_id, detection_type } = req.body;

  if (!license_plate || !toll_gate_id) {
    throw new ValidationError('license_plate and toll_gate_id are required');
  }

  console.log('🧪 Testing toll gate detection:', {
    license_plate: license_plate.toUpperCase(),
    toll_gate_id,
    detection_type: detection_type || 'payment_gate'
  });

  try {
    // This would simulate the vehicle detection system
    // In production, this would be triggered by ANPR cameras or RFID readers

    const result = {
      detection_successful: true,
      vehicle_identified: true,
      license_plate: license_plate.toUpperCase(),
      toll_gate_id,
      detection_type: detection_type || 'payment_gate',
      timestamp: new Date().toISOString(),
      next_action: 'process_pending_tolls',
      message: 'Vehicle detected at toll gate. Ready to process pending tolls.'
    };

    res.json({
      success: true,
      message: 'Toll gate detection test completed',
      data: result
    });

  } catch (error) {
    console.error('Error in toll gate detection test:', error);
    throw error;
  }
});

module.exports = {
  processPendingToll,
  getPendingTolls,
  simulateTollFare,
  getTollStats,
  cancelPendingTolls,
  getActiveJourneys,
  cancelActiveJourney,
  testTollGateDetection
};