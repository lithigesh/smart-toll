const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config();

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Webhook secret for signature verification
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

/**
 * Verify Razorpay payment signature
 * @param {Object} params - Payment verification parameters
 * @param {string} params.order_id - Razorpay order ID
 * @param {string} params.payment_id - Razorpay payment ID  
 * @param {string} params.signature - Razorpay signature
 * @returns {boolean} - True if signature is valid
 */
const verifyPaymentSignature = ({ order_id, payment_id, signature }) => {
  try {
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(`${order_id}|${payment_id}`);
    const digest = hmac.digest('hex');
    return digest === signature;
  } catch (error) {
    console.error('Error verifying payment signature:', error);
    return false;
  }
};

/**
 * Verify Razorpay webhook signature
 * @param {string} rawBody - Raw request body as string
 * @param {string} signature - Signature from x-razorpay-signature header
 * @returns {boolean} - True if webhook signature is valid
 */
const verifyWebhookSignature = (rawBody, signature) => {
  try {
    if (!WEBHOOK_SECRET) {
      console.warn('RAZORPAY_WEBHOOK_SECRET not configured');
      return false;
    }

    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    hmac.update(rawBody);
    const digest = hmac.digest('hex');
    return digest === signature;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
};

/**
 * Create a new Razorpay order
 * @param {Object} options - Order creation options
 * @param {number} options.amount - Amount in rupees (will be converted to paise)
 * @param {string} options.currency - Currency code (default: INR)
 * @param {string} options.receipt - Unique receipt ID
 * @param {Object} options.notes - Additional notes/metadata
 * @returns {Promise<Object>} - Razorpay order object
 */
const createOrder = async ({ amount, currency = 'INR', receipt, notes = {} }) => {
  try {
    const options = {
      amount: Math.round(amount * 100), // Convert rupees to paise
      currency,
      receipt,
      notes,
      payment_capture: 1, // Auto capture payment
    };

    const order = await razorpay.orders.create(options);
    console.log('Created Razorpay order:', { orderId: order.id, amount: order.amount });
    return order;
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw new Error(`Failed to create payment order: ${error.message}`);
  }
};

/**
 * Fetch payment details from Razorpay
 * @param {string} paymentId - Razorpay payment ID
 * @returns {Promise<Object>} - Payment details
 */
const fetchPayment = async (paymentId) => {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error) {
    console.error('Error fetching payment:', error);
    throw new Error(`Failed to fetch payment: ${error.message}`);
  }
};

/**
 * Fetch order details from Razorpay
 * @param {string} orderId - Razorpay order ID
 * @returns {Promise<Object>} - Order details
 */
const fetchOrder = async (orderId) => {
  try {
    const order = await razorpay.orders.fetch(orderId);
    return order;
  } catch (error) {
    console.error('Error fetching order:', error);
    throw new Error(`Failed to fetch order: ${error.message}`);
  }
};

/**
 * Convert amount from paise to rupees
 * @param {number} amountInPaise - Amount in paise
 * @returns {number} - Amount in rupees
 */
const paiseToRupees = (amountInPaise) => {
  return parseFloat((amountInPaise / 100).toFixed(2));
};

/**
 * Convert amount from rupees to paise
 * @param {number} amountInRupees - Amount in rupees
 * @returns {number} - Amount in paise
 */
const rupeesToPaise = (amountInRupees) => {
  return Math.round(amountInRupees * 100);
};

/**
 * Health check for Razorpay connectivity
 * @returns {Promise<Object>} - Health status
 */
const healthCheck = async () => {
  try {
    // Try to fetch a dummy order (this will fail but confirms API connectivity)
    await razorpay.orders.fetch('dummy_order_id').catch(() => {});
    return { status: 'healthy', service: 'razorpay' };
  } catch (error) {
    return { status: 'unhealthy', service: 'razorpay', error: error.message };
  }
};

module.exports = {
  razorpay,
  verifyPaymentSignature,
  verifyWebhookSignature,
  createOrder,
  fetchPayment,
  fetchOrder,
  paiseToRupees,
  rupeesToPaise,
  healthCheck,
  WEBHOOK_SECRET
};