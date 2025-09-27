const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const Vehicle = require('../models/Vehicle');

const { asyncErrorHandler, NotFoundError, ValidationError } = require('../middleware/errorHandler');

/**
 * Get wallet balance for the authenticated user
 * GET /api/wallet/balance
 */
const getBalance = asyncErrorHandler(async (req, res) => {
  const userId = req.user.id;

  const wallet = await Wallet.findByUserId(userId);
  
  if (!wallet) {
    throw new NotFoundError('Wallet not found');
  }

  res.json({
    balance: parseFloat(wallet.balance),
    balance_formatted: `₹${wallet.balance}`,
    last_updated: wallet.updated_at,
    user_id: userId
  });
});

/**
 * Get transaction history for the authenticated user
 * GET /api/wallet/transactions
 */
const getTransactions = asyncErrorHandler(async (req, res) => {
  const userId = req.user.id;
  const { 
    limit = 20, 
    offset = 0, 
    type = null,
    startDate = null,
    endDate = null,
    page = null
  } = req.query;

  // Convert page to offset if provided
  let actualOffset = parseInt(offset);
  if (page) {
    actualOffset = (parseInt(page) - 1) * parseInt(limit);
  }

  // Get transactions
  const transactionData = await Transaction.getUserTransactions(userId, {
    limit: parseInt(limit),
    offset: actualOffset,
    type,
    startDate: startDate ? new Date(startDate).toISOString() : null,
    endDate: endDate ? new Date(endDate).toISOString() : null
  });

  const transactions = transactionData.transactions || [];
  const pagination = transactionData.pagination || {};

  // Get wallet statistics
  const stats = await Wallet.getStats(userId);

  res.json({
    transactions: transactions.map(tx => ({
      id: tx.id,
      type: tx.type,
      amount: parseFloat(tx.amount),
      amount_formatted: `₹${tx.amount}`,
      balance_after: parseFloat(tx.balance_after || 0),
      timestamp: tx.created_at,
      details: tx.type === 'deduction' ? {
        vehicle_number: tx.vehicles?.plate_number,
        vehicle_type: tx.vehicle_type,
        toll_gate_name: tx.toll_gate_name,
        toll_gate_location: {
          lat: tx.toll_gate_lat ? parseFloat(tx.toll_gate_lat) : null,
          long: tx.toll_gate_long ? parseFloat(tx.toll_gate_long) : null
        }
      } : null
    })),
    stats: {
      current_balance: parseFloat(stats.current_balance),
      total_transactions: parseInt(stats.total_transactions),
      total_recharges: parseInt(stats.total_recharges),
      total_deductions: parseInt(stats.total_deductions),
      total_credited: parseFloat(stats.total_credited),
      total_debited: parseFloat(stats.total_debited),
      last_recharge: stats.last_recharge,
      last_deduction: stats.last_deduction
    },
    pagination: {
      ...pagination,
      page: page ? parseInt(page) : Math.floor(actualOffset / parseInt(limit)) + 1
    }
  });
});

/**
 * Get daily transaction summary for the user
 * GET /api/wallet/daily-summary
 */
const getDailySummary = asyncErrorHandler(async (req, res) => {
  const userId = req.user.id;
  const { days = 30 } = req.query;

  const dailySummary = await Transaction.getDailySummary(userId, parseInt(days));

  res.json({
    period_days: parseInt(days),
    daily_summary: dailySummary.map(day => ({
      date: day.transaction_date,
      total_transactions: parseInt(day.total_transactions),
      recharges: parseInt(day.recharges),
      deductions: parseInt(day.deductions),
      total_recharged: parseFloat(day.total_recharged),
      total_spent: parseFloat(day.total_spent),
      net_change: parseFloat(day.total_recharged) - parseFloat(day.total_spent)
    }))
  });
});

/**
 * Get wallet statistics for different time periods
 * GET /api/wallet/stats
 */
const getWalletStats = asyncErrorHandler(async (req, res) => {
  const userId = req.user.id;
  const { period = 'month' } = req.query;

  // Validate period
  const validPeriods = ['day', 'week', 'month', 'year'];
  if (!validPeriods.includes(period)) {
    throw new ValidationError('Invalid period. Must be one of: day, week, month, year');
  }

  // Get transaction statistics for the period
  const stats = await Transaction.getUserStats(userId, { period });

  // Get overall wallet stats
  const walletStats = await Wallet.getStats(userId);

  res.json({
    period,
    current_balance: parseFloat(walletStats.current_balance),
    period_stats: {
      total_transactions: parseInt(stats.total_transactions),
      total_recharges: parseInt(stats.total_recharges),
      total_deductions: parseInt(stats.total_deductions),
      total_recharged: parseFloat(stats.total_recharged),
      total_spent: parseFloat(stats.total_spent),
      avg_toll_amount: parseFloat(stats.avg_toll_amount),
      last_recharge: stats.last_recharge,
      last_toll_payment: stats.last_toll_payment
    },
    all_time_stats: {
      total_transactions: parseInt(walletStats.total_transactions),
      total_recharges: parseInt(walletStats.total_recharges),
      total_deductions: parseInt(walletStats.total_deductions),
      total_credited: parseFloat(walletStats.total_credited),
      total_debited: parseFloat(walletStats.total_debited),
      last_recharge: walletStats.last_recharge,
      last_deduction: walletStats.last_deduction
    }
  });
});

/**
 * Get low balance notification status
 * GET /api/wallet/low-balance-alert
 */
const getLowBalanceAlert = asyncErrorHandler(async (req, res) => {
  const userId = req.user.id;
  const { threshold = 100 } = req.query;

  const wallet = await Wallet.findByUserId(userId);
  
  if (!wallet) {
    throw new NotFoundError('Wallet not found');
  }

  const currentBalance = parseFloat(wallet.balance);
  const thresholdAmount = parseFloat(threshold);
  const isLowBalance = currentBalance < thresholdAmount;

  res.json({
    current_balance: currentBalance,
    threshold: thresholdAmount,
    is_low_balance: isLowBalance,
    alert_message: isLowBalance 
      ? `Your wallet balance is low (₹${currentBalance}). Please recharge to continue using toll services.`
      : null,
    suggested_recharge: isLowBalance 
      ? Math.max(200, Math.ceil((thresholdAmount - currentBalance + 100) / 100) * 100)
      : null
  });
});

/**
 * Deduct amount from user's wallet
 * POST /api/wallet/deduct
 */
const deduct = asyncErrorHandler(async (req, res) => {
  const userId = req.user.id;
  const { amount, description, vehicle_plate, transaction_id } = req.body;

  // Validate input
  if (!amount || amount <= 0) {
    throw new ValidationError('Amount must be positive');
  }

  if (!description) {
    throw new ValidationError('Description is required');
  }

  // Get current wallet balance
  const wallet = await Wallet.findByUserId(userId);
  if (!wallet) {
    throw new NotFoundError('Wallet not found');
  }

  const currentBalance = parseFloat(wallet.balance);
  const deductAmount = parseFloat(amount);

  // Check sufficient balance
  if (currentBalance < deductAmount) {
    throw new ValidationError(`Insufficient balance. Current: ₹${currentBalance}, Required: ₹${deductAmount}`);
  }

  // Perform deduction
  const newBalance = await Wallet.deduct(userId, deductAmount);

  // Create transaction record - simplified to avoid Transaction model issues
  try {
    // Try to create transaction record but don't fail if it doesn't work
    const transactionData = {
      user_id: userId,
      wallet_id: wallet.id,
      amount: deductAmount,
      type: 'deduction',
      description: description,
      status: 'completed',
      reference_id: transaction_id || null,
      metadata: {
        vehicle_plate: vehicle_plate || null,
        deduction_type: 'toll_payment',
        previous_balance: currentBalance,
        new_balance: newBalance
      }
    };

    const transaction = await Transaction.create(transactionData);
    
    res.json({
      success: true,
      message: 'Amount deducted successfully',
      data: {
        transaction_id: transaction.id,
        amount_deducted: deductAmount,
        previous_balance: currentBalance,
        new_balance: newBalance,
        description: description,
        transaction_reference: transaction_id || null
      }
    });
  } catch (transactionError) {
    console.warn('Failed to create transaction record:', transactionError.message);
    // Still return success since wallet deduction worked
    res.json({
      success: true,
      message: 'Amount deducted successfully (transaction record creation failed)',
      data: {
        transaction_id: null,
        amount_deducted: deductAmount,
        previous_balance: currentBalance,
        new_balance: newBalance,
        description: description,
        transaction_reference: transaction_id || null
      }
    });
  }
});

module.exports = {
  getBalance,
  getTransactions,
  getDailySummary,
  getWalletStats,
  getLowBalanceAlert,
  deduct
};