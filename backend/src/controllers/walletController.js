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
  const transactions = await Transaction.getUserTransactions(userId, {
    limit: parseInt(limit),
    offset: actualOffset,
    type,
    startDate: startDate ? new Date(startDate).toISOString() : null,
    endDate: endDate ? new Date(endDate).toISOString() : null
  });

  // Get wallet statistics
  const stats = await Wallet.getStats(userId);

  res.json({
    transactions: transactions.map(tx => ({
      id: tx.id,
      type: tx.type,
      amount: parseFloat(tx.amount),
      amount_formatted: `₹${tx.amount}`,
      balance_after: parseFloat(tx.balance_after),
      timestamp: tx.timestamp,
      details: tx.type === 'deduction' ? {
        vehicle_number: tx.vehicle_no,
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
      limit: parseInt(limit),
      offset: actualOffset,
      page: page ? parseInt(page) : Math.floor(actualOffset / parseInt(limit)) + 1,
      has_more: transactions.length === parseInt(limit)
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

module.exports = {
  getBalance,
  getTransactions,
  getDailySummary,
  getWalletStats,
  getLowBalanceAlert
};