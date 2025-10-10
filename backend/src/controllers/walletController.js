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
    startDate = null,
    endDate = null,
    page = null
  } = req.query;

  // Convert page to offset if provided
  let actualOffset = parseInt(offset);
  if (page) {
    actualOffset = (parseInt(page) - 1) * parseInt(limit);
  }

  // Get transactions from esp32_toll_transactions table
  const transactions = await Transaction.getByUserId(userId, {
    limit: parseInt(limit),
    offset: actualOffset,
    startDate: startDate ? new Date(startDate).toISOString() : null,
    endDate: endDate ? new Date(endDate).toISOString() : null
  });

  res.json({
    transactions: transactions.map(tx => ({
      id: tx.id,
      device_id: tx.device_id,
      amount: parseFloat(tx.amount),
      toll_amount: parseFloat(tx.toll_amount),
      distance_km: parseFloat(tx.distance_km),
      timestamp: tx.created_at,
      amount_formatted: `₹${tx.toll_amount}`
    })),
    pagination: {
      total: transactions.length,
      limit: parseInt(limit),
      offset: actualOffset,
      page: page ? parseInt(page) : Math.floor(actualOffset / parseInt(limit)) + 1
    }
  });
});

/**
 * Get transaction statistics for the user
 * GET /api/wallet/stats
 */
const getTransactionStats = asyncErrorHandler(async (req, res) => {
  const userId = req.user.id;
  const { days = 30 } = req.query;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));

  const stats = await Transaction.getStats(userId, {
    start_date: startDate.toISOString(),
    end_date: new Date().toISOString()
  });

  res.json({
    period_days: parseInt(days),
    stats: {
      total_transactions: stats.total_transactions,
      total_toll_amount: parseFloat(stats.total_toll_amount),
      total_distance: parseFloat(stats.total_distance || 0),
      average_toll_per_km: stats.total_transactions > 0 
        ? parseFloat(stats.total_toll_amount) / parseFloat(stats.total_distance || 1)
        : 0
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
  getTransactionStats,
  getLowBalanceAlert
};