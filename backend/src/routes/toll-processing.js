const express = require('express');
const router = express.Router();
const TollProcessingService = require('../services/TollProcessingService');
const VehicleTollHistory = require('../models/VehicleTollHistory');
const Transaction = require('../models/Transaction');
const { authMiddleware } = require('../middleware/authMiddleware');

/**
 * POST /api/toll-processing/process
 * Manually process a toll charge (admin/testing endpoint)
 */
router.post('/process', authMiddleware, async (req, res) => {
  try {
    const {
      toll_history_id,
      distance_km,
      rate_per_km,
      zone_info
    } = req.body;

    if (!toll_history_id || !distance_km || !rate_per_km || !zone_info) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: toll_history_id, distance_km, rate_per_km, zone_info'
      });
    }

    // Get toll history to find vehicle and user
    const tollHistory = await VehicleTollHistory.getById(toll_history_id);
    if (!tollHistory) {
      return res.status(404).json({
        success: false,
        error: 'Toll history not found'
      });
    }

    const result = await TollProcessingService.processTollCharge({
      tollHistoryId: toll_history_id,
      userId: req.user.id, // Use authenticated user for testing
      vehicleId: tollHistory.vehicle_id,
      distanceKm: parseFloat(distance_km),
      ratePerKm: parseFloat(rate_per_km),
      zoneInfo: zone_info
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error processing toll charge:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process toll charge'
    });
  }
});

/**
 * POST /api/toll-processing/retry-pending
 * Retry pending toll payments for a user
 */
router.post('/retry-pending', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const retryResults = await TollProcessingService.retryPendingPayments(userId);

    const summary = {
      total: retryResults.length,
      successful: retryResults.filter(r => r.success).length,
      failed: retryResults.filter(r => !r.success).length,
      results: retryResults
    };

    res.json({
      success: true,
      data: summary,
      message: `Processed ${summary.successful} of ${summary.total} pending payments`
    });

  } catch (error) {
    console.error('Error retrying pending payments:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retry pending payments'
    });
  }
});

/**
 * GET /api/toll-processing/pending
 * Get pending toll payments for the authenticated user
 */
router.get('/pending', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const pendingTransactions = await Transaction.findByUserAndType(
      userId,
      'toll_charge_pending',
      { status: 'pending' }
    );

    const pendingPayments = pendingTransactions.map(transaction => ({
      id: transaction.id,
      amount: transaction.amount,
      created_at: transaction.created_at,
      description: transaction.description,
      metadata: transaction.metadata,
      zone_name: transaction.metadata?.zone_name,
      shortage: transaction.metadata?.shortage,
      toll_history_id: transaction.reference_id
    }));

    res.json({
      success: true,
      data: pendingPayments,
      count: pendingPayments.length,
      total_amount: pendingPayments.reduce((sum, payment) => sum + payment.amount, 0)
    });

  } catch (error) {
    console.error('Error fetching pending payments:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch pending payments'
    });
  }
});

/**
 * GET /api/toll-processing/pending/:user_id
 * Get pending toll payments for a specific user (admin only)
 */
router.get('/pending/:user_id', authMiddleware, async (req, res) => {
  try {
    const userId = req.params.user_id;

    // For security, only allow users to see their own pending payments
    // unless they have admin privileges
    if (userId !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const pendingTransactions = await Transaction.findByUserAndType(
      userId,
      'toll_charge_pending',
      { status: 'pending' }
    );

    const pendingPayments = pendingTransactions.map(transaction => ({
      id: transaction.id,
      amount: transaction.amount,
      created_at: transaction.created_at,
      description: transaction.description,
      metadata: transaction.metadata,
      zone_name: transaction.metadata?.zone_name,
      shortage: transaction.metadata?.shortage,
      toll_history_id: transaction.reference_id
    }));

    res.json({
      success: true,
      data: pendingPayments,
      count: pendingPayments.length,
      total_amount: pendingPayments.reduce((sum, payment) => sum + payment.amount, 0)
    });

  } catch (error) {
    console.error('Error fetching pending payments:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch pending payments'
    });
  }
});

/**
 * GET /api/toll-processing/stats
 * Get toll processing statistics
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameters: start_date, end_date'
      });
    }

    const stats = await TollProcessingService.getProcessingStats({
      startDate: start_date,
      endDate: end_date,
      userId: req.user.id
    });

    res.json({
      success: true,
      data: {
        start_date,
        end_date,
        user_id: req.user.id,
        ...stats
      }
    });

  } catch (error) {
    console.error('Error fetching processing stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch processing statistics'
    });
  }
});

/**
 * POST /api/toll-processing/force-process
 * Force process a toll charge (admin only)
 */
router.post('/force-process', authMiddleware, async (req, res) => {
  try {
    // Check if user has admin privileges
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { toll_history_id, reason } = req.body;

    if (!toll_history_id || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: toll_history_id, reason'
      });
    }

    const result = await TollProcessingService.forceProcessTollCharge({
      tollHistoryId: toll_history_id,
      adminUserId: req.user.id,
      reason: reason
    });

    res.json({
      success: true,
      data: result,
      message: 'Toll charge force processed successfully'
    });

  } catch (error) {
    console.error('Error force processing toll charge:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to force process toll charge'
    });
  }
});

/**
 * POST /api/toll-processing/calculate-fare
 * Calculate fare for a given distance and rate
 */
router.post('/calculate-fare', authMiddleware, async (req, res) => {
  try {
    const { distance_km, rate_per_km, options = {} } = req.body;

    if (!distance_km || !rate_per_km) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: distance_km, rate_per_km'
      });
    }

    if (distance_km < 0 || rate_per_km < 0) {
      return res.status(400).json({
        success: false,
        error: 'Distance and rate must be positive numbers'
      });
    }

    const DistanceCalculationService = require('../services/DistanceCalculationService');
    const fareCalculation = DistanceCalculationService.calculateFare(
      parseFloat(distance_km),
      parseFloat(rate_per_km),
      options
    );

    res.json({
      success: true,
      data: fareCalculation
    });

  } catch (error) {
    console.error('Error calculating fare:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate fare'
    });
  }
});

/**
 * GET /api/toll-processing/user-transactions
 * Get toll-related transactions for the authenticated user
 */
router.get('/user-transactions', authMiddleware, async (req, res) => {
  try {
    const { limit = 20, offset = 0, type = null } = req.query;
    const userId = req.user.id;

    let transactionTypes = ['toll_charge', 'toll_charge_pending'];
    if (type) {
      transactionTypes = [type];
    }

    const transactions = await Transaction.findByUser(userId, {
      types: transactionTypes,
      limit: parseInt(limit),
      offset: parseInt(offset),
      orderBy: 'created_at',
      orderDirection: 'desc'
    });

    res.json({
      success: true,
      data: transactions,
      count: transactions.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Error fetching user transactions:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch transactions'
    });
  }
});

module.exports = router;