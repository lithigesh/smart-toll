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

  // Generate unique receipt ID (max 40 chars for Razorpay)
  const timestamp = Date.now().toString(36); // Convert to base36 for shorter string
  const userIdShort = userId.toString().substring(0, 8); // First 8 chars of userId as string
  let receipt = `ord_${userIdShort}_${timestamp}`;
  
  // Validate receipt length
  if (receipt.length > 40) {
    console.warn(`Receipt too long: ${receipt} (${receipt.length} chars)`);
    // Fallback to even shorter format
    receipt = `${userIdShort}_${timestamp}`;
    console.log(`Using shorter receipt: ${receipt} (${receipt.length} chars)`);
  }
  
  console.log(`Generated receipt: ${receipt} (${receipt.length} chars)`);
  
  console.log(`Generated receipt: ${receipt} (${receipt.length} chars)`);

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

  console.log(`Processing payment verification for user ${userId}, amount: ${amountInRupees}`);

  // Ensure wallet exists before starting transaction
  let wallet = await Wallet.findByUserId(userId);
  console.log(`Wallet check result:`, wallet ? 'Found existing wallet' : 'No wallet found');
  
  if (!wallet) {
    console.log(`No wallet found for user ${userId}, creating one...`);
    try {
      wallet = await Wallet.create(userId, 0);
      console.log(`Wallet created successfully for user ${userId}:`, wallet);
    } catch (error) {
      console.error(`Failed to create wallet for user ${userId}:`, error);
      throw new PaymentError('Failed to initialize wallet for payment processing');
    }
  } else {
    console.log(`Using existing wallet for user ${userId}:`, { id: wallet.id, balance: wallet.balance });
  }

  // Check for idempotency - prevent double processing
  const existingRecharge = await Recharge.findByPaymentId(razorpay_payment_id);
  
  if (existingRecharge) {
    // Payment already processed
    const wallet = await Wallet.findByUserId(userId);
    return res.json({
      success: true,
      message: 'Payment already processed',
      recharge_id: existingRecharge.id,
      new_balance: parseFloat(wallet.balance),
      amount_credited: parseFloat(existingRecharge.amount)
    });
  }

  // Create recharge record
  const recharge = await Recharge.create({
    user_id: userId,
    razorpay_order_id: razorpay_order_id,
    razorpay_payment_id: razorpay_payment_id,
    amount: amountInRupees,
    status: 'paid'
  });

  // Credit wallet
  const newBalance = await Wallet.credit(userId, amountInRupees);

  res.json({
    success: true,
    message: 'Payment verified and wallet credited successfully',
    recharge_id: recharge.id,
    new_balance: parseFloat(newBalance),
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
  if (existingRecharge.status === 'paid') {
    console.log(`Payment ${paymentId} already paid`);
    return;
  }

  // Update recharge status
  await Recharge.updateStatus(existingRecharge.id, 'paid');

  // Credit wallet
  await Wallet.credit(existingRecharge.user_id, amountInRupees);

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

  console.log(`Fetching payment history for user ${userId} with params:`, { limit, offset, status });

  const recharges = await Recharge.getUserRecharges(userId, {
    limit: parseInt(limit),
    offset: parseInt(offset),
    status
  });

  console.log(`Found ${recharges.length} recharges for user ${userId}`);

  const response = {
    recharges: recharges.map(recharge => ({
      id: recharge.id,
      order_id: recharge.razorpay_order_id,
      payment_id: recharge.razorpay_payment_id,
      amount: parseFloat(recharge.amount),
      amount_formatted: `₹${recharge.amount}`,
      status: recharge.status,
      created_at: recharge.created_at
    })),
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset),
      has_more: recharges.length === parseInt(limit)
    }
  };

  console.log(`Sending payment history response for user ${userId}:`, {
    rechargeCount: response.recharges.length,
    stats: response.stats
  });

  res.json(response);
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
      order_id: recharge.razorpay_order_id,
      payment_id: recharge.razorpay_payment_id,
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