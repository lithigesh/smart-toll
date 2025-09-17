const {
  createOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  fetchPayment,
  fetchOrder,
  paiseToRupees,
  rupeesToPaise
} = require('../config/razorpay');

const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Recharge = require('../models/Recharge');
const Transaction = require('../models/Transaction');

const { withTransaction, withRetry } = require('../config/db');
const { asyncErrorHandler, ValidationError, PaymentError, ConflictError } = require('../middleware/errorHandler');

/**
 * Create Razorpay order for payment
 * POST /api/payment/create-order
 */
const createPaymentOrder = asyncErrorHandler(async (req, res) => {
  const { amount } = req.body;
  const userId = req.user.id;

  // Validate amount
  if (amount < 1 || amount > 50000) {
    throw new ValidationError('Amount must be between ₹1 and ₹50,000');
  }

  // Generate unique receipt ID
  const receipt = `order_${userId}_${Date.now()}`;

  // Create Razorpay order
  const order = await createOrder({
    amount: amount, // Amount in rupees
    receipt: receipt,
    notes: {
      user_id: userId,
      user_email: req.user.email,
      purpose: 'wallet_recharge'
    }
  });

  // Store pending order details (optional - for verification later)
  // You could store this in Redis or a pending_orders table
  
  res.json({
    orderId: order.id,
    amount: order.amount, // Amount in paise
    amountInRupees: paiseToRupees(order.amount),
    currency: order.currency,
    receipt: order.receipt,
    keyId: process.env.RAZORPAY_KEY_ID,
    notes: order.notes,
    created_at: order.created_at
  });
});

/**
 * Verify payment and update wallet
 * POST /api/payment/verify
 */
const verifyPayment = asyncErrorHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const userId = req.user.id;

  // Verify signature
  const isValidSignature = verifyPaymentSignature({
    order_id: razorpay_order_id,
    payment_id: razorpay_payment_id,
    signature: razorpay_signature
  });

  if (!isValidSignature) {
    throw new PaymentError('Invalid payment signature');
  }

  // Fetch payment details from Razorpay
  const payment = await fetchPayment(razorpay_payment_id);
  
  if (payment.status !== 'captured') {
    throw new PaymentError(`Payment not captured. Status: ${payment.status}`);
  }

  // Fetch order details
  const order = await fetchOrder(razorpay_order_id);
  const amountInRupees = paiseToRupees(order.amount);

  // Process payment in a transaction with retry logic
  const result = await withRetry(async () => {
    return await withTransaction(async (client) => {
      // Check for idempotency - prevent double processing
      const existingRecharge = await Recharge.findByPaymentIdInTransaction(client, razorpay_payment_id);
      
      if (existingRecharge) {
        // Payment already processed
        const wallet = await Wallet.findByUserId(userId);
        return {
          alreadyProcessed: true,
          recharge: existingRecharge,
          newBalance: wallet.balance
        };
      }

      // Create recharge record
      const recharge = await Recharge.createInTransaction(client, {
        user_id: userId,
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
        amount: amountInRupees,
        status: 'captured'
      });

      // Credit wallet
      const updatedWallet = await Wallet.credit(client, userId, amountInRupees);

      // Create transaction record
      const transaction = await Transaction.createInTransaction(client, {
        user_id: userId,
        vehicle_id: null,
        toll_gate_id: null,
        type: 'recharge',
        amount: amountInRupees,
        balance_after: updatedWallet.balance
      });

      return {
        alreadyProcessed: false,
        recharge,
        transaction,
        newBalance: updatedWallet.balance
      };
    });
  });

  if (result.alreadyProcessed) {
    return res.json({
      success: true,
      message: 'Payment already processed',
      recharge_id: result.recharge.id,
      new_balance: parseFloat(result.newBalance),
      amount_credited: parseFloat(result.recharge.amount)
    });
  }

  res.json({
    success: true,
    message: 'Payment verified and wallet credited successfully',
    recharge_id: result.recharge.id,
    transaction_id: result.transaction.id,
    new_balance: parseFloat(result.newBalance),
    amount_credited: amountInRupees,
    payment_details: {
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      amount: amountInRupees,
      currency: payment.currency,
      method: payment.method,
      captured_at: payment.captured_at
    }
  });
});

/**
 * Handle Razorpay webhooks
 * POST /api/payment/webhook
 */
const handleWebhook = asyncErrorHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = req.body; // Should be raw body as string

  // Verify webhook signature
  const isValidSignature = verifyWebhookSignature(rawBody, signature);
  
  if (!isValidSignature) {
    console.error('Invalid webhook signature');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Parse webhook payload
  let payload;
  try {
    payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
  } catch (error) {
    console.error('Invalid webhook payload:', error);
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const { event, payload: eventPayload } = payload;

  console.log('Webhook received:', {
    event,
    payment_id: eventPayload.payment?.entity?.id,
    order_id: eventPayload.payment?.entity?.order_id
  });

  try {
    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(eventPayload.payment.entity);
        break;
      
      case 'payment.failed':
        await handlePaymentFailed(eventPayload.payment.entity);
        break;
      
      case 'order.paid':
        await handleOrderPaid(eventPayload.order.entity);
        break;
      
      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Handle payment.captured webhook
 */
const handlePaymentCaptured = async (payment) => {
  const { id: paymentId, order_id: orderId, amount } = payment;
  const amountInRupees = paiseToRupees(amount);

  // Find existing recharge record
  const existingRecharge = await Recharge.findByPaymentId(paymentId);
  
  if (!existingRecharge) {
    console.log(`No recharge record found for payment ${paymentId}`);
    return;
  }

  // Skip if already processed
  if (existingRecharge.status === 'captured') {
    console.log(`Payment ${paymentId} already captured`);
    return;
  }

  // Process the captured payment
  await withRetry(async () => {
    return await withTransaction(async (client) => {
      // Update recharge status
      await Recharge.updateStatusInTransaction(client, existingRecharge.id, 'captured');

      // Credit wallet if not already done
      const wallet = await Wallet.findByUserId(existingRecharge.user_id);
      await Wallet.credit(client, existingRecharge.user_id, amountInRupees);

      // Create transaction record if not exists
      const existingTransaction = await client.query(
        'SELECT id FROM transactions WHERE user_id = $1 AND type = $2 AND amount = $3 ORDER BY timestamp DESC LIMIT 1',
        [existingRecharge.user_id, 'recharge', amountInRupees]
      );

      if (existingTransaction.rows.length === 0) {
        const updatedWallet = await Wallet.findByUserId(existingRecharge.user_id);
        await Transaction.createInTransaction(client, {
          user_id: existingRecharge.user_id,
          vehicle_id: null,
          toll_gate_id: null,
          type: 'recharge',
          amount: amountInRupees,
          balance_after: updatedWallet.balance
        });
      }
    });
  });

  console.log(`Successfully processed captured payment ${paymentId}`);
};

/**
 * Handle payment.failed webhook
 */
const handlePaymentFailed = async (payment) => {
  const { id: paymentId, order_id: orderId } = payment;

  // Find existing recharge record
  const existingRecharge = await Recharge.findByPaymentId(paymentId);
  
  if (existingRecharge && existingRecharge.status !== 'failed') {
    // Update recharge status to failed
    await Recharge.updateStatus(existingRecharge.id, 'failed');
    console.log(`Marked payment ${paymentId} as failed`);
  }
};

/**
 * Handle order.paid webhook
 */
const handleOrderPaid = async (order) => {
  const { id: orderId, amount } = order;
  console.log(`Order ${orderId} paid with amount ${amount}`);
  // Additional order-level processing if needed
};

/**
 * Get payment history for user
 * GET /api/payment/history
 */
const getPaymentHistory = asyncErrorHandler(async (req, res) => {
  const userId = req.user.id;
  const { limit = 20, offset = 0, status } = req.query;

  const recharges = await Recharge.getUserRecharges(userId, {
    limit: parseInt(limit),
    offset: parseInt(offset),
    status
  });

  const stats = await Recharge.getUserStats(userId);

  res.json({
    recharges: recharges.map(recharge => ({
      id: recharge.id,
      order_id: recharge.order_id,
      payment_id: recharge.payment_id,
      amount: parseFloat(recharge.amount),
      amount_formatted: `₹${recharge.amount}`,
      status: recharge.status,
      created_at: recharge.created_at
    })),
    stats: {
      total_recharges: parseInt(stats.total_recharges),
      successful_recharges: parseInt(stats.successful_recharges),
      failed_recharges: parseInt(stats.failed_recharges),
      total_amount: parseFloat(stats.total_amount),
      average_amount: parseFloat(stats.average_amount),
      last_successful_recharge: stats.last_successful_recharge
    },
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset),
      has_more: recharges.length === parseInt(limit)
    }
  });
});

/**
 * Get payment details by ID
 * GET /api/payment/:paymentId
 */
const getPaymentDetails = asyncErrorHandler(async (req, res) => {
  const { paymentId } = req.params;
  const userId = req.user.id;

  // Find recharge record
  const recharge = await Recharge.findByPaymentId(paymentId);
  
  if (!recharge) {
    throw new ValidationError('Payment not found');
  }

  if (recharge.user_id !== userId) {
    throw new ValidationError('Access denied');
  }

  // Fetch details from Razorpay
  let razorpayPayment = null;
  try {
    razorpayPayment = await fetchPayment(paymentId);
  } catch (error) {
    console.warn('Could not fetch payment from Razorpay:', error.message);
  }

  res.json({
    recharge: {
      id: recharge.id,
      order_id: recharge.order_id,
      payment_id: recharge.payment_id,
      amount: parseFloat(recharge.amount),
      amount_formatted: `₹${recharge.amount}`,
      status: recharge.status,
      created_at: recharge.created_at
    },
    razorpay_details: razorpayPayment ? {
      method: razorpayPayment.method,
      currency: razorpayPayment.currency,
      captured: razorpayPayment.captured,
      captured_at: razorpayPayment.captured_at,
      bank: razorpayPayment.bank,
      wallet: razorpayPayment.wallet
    } : null
  });
});

module.exports = {
  createPaymentOrder,
  verifyPayment,
  handleWebhook,
  getPaymentHistory,
  getPaymentDetails
};