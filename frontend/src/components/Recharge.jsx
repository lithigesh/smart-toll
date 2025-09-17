import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_ENDPOINTS } from '../config/config';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Card } from './ui/Card';

const Recharge = ({ onSuccess, onCancel }) => {
  const { token } = useAuth();
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('amount'); // 'amount' | 'processing' | 'success'

  // Predefined amount options
  const quickAmounts = [100, 200, 500, 1000, 2000, 5000];

  const validateAmount = (value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      return 'Please enter a valid amount';
    }
    if (numValue < 1) {
      return 'Minimum recharge amount is ₹1';
    }
    if (numValue > 50000) {
      return 'Maximum recharge amount is ₹50,000';
    }
    return '';
  };

  const handleAmountChange = (value) => {
    setAmount(value);
    setError('');
  };

  const initializeRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    const validationError = validateAmount(amount);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError('');
    setStep('processing');

    try {
      // Check if Razorpay is loaded
      const razorpayLoaded = await initializeRazorpay();
      if (!razorpayLoaded) {
        throw new Error('Failed to load payment gateway');
      }

      // Create payment order
      const orderResponse = await fetch(API_ENDPOINTS.payment.createOrder, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: parseFloat(amount) })
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.message || 'Failed to create payment order');
      }

      const orderData = await orderResponse.json();

      // Initialize Razorpay payment
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Smart Toll System',
        description: `Wallet Recharge - ₹${amount}`,
        order_id: orderData.orderId,
        handler: async (response) => {
          await verifyPayment(response);
        },
        prefill: {
          name: '',
          email: '',
          contact: ''
        },
        notes: orderData.notes,
        theme: {
          color: '#3B82F6'
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false);
            setStep('amount');
            setError('Payment cancelled');
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();

    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed. Please try again.');
      setIsLoading(false);
      setStep('amount');
    }
  };

  const verifyPayment = async (paymentData) => {
    try {
      const verifyResponse = await fetch(API_ENDPOINTS.payment.verify, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          razorpay_order_id: paymentData.razorpay_order_id,
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_signature: paymentData.razorpay_signature
        })
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.message || 'Payment verification failed');
      }

      const verifyData = await verifyResponse.json();
      
      setStep('success');
      setIsLoading(false);
      
      // Call success callback with the new balance
      setTimeout(() => {
        onSuccess && onSuccess({
          amount: parseFloat(amount),
          newBalance: verifyData.new_balance,
          rechargeId: verifyData.recharge_id,
          transactionId: verifyData.transaction_id
        });
      }, 2000);

    } catch (err) {
      console.error('Payment verification error:', err);
      setError(err.message || 'Payment verification failed');
      setIsLoading(false);
      setStep('amount');
    }
  };

  const renderAmountStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Recharge Wallet</h2>
        <p className="text-gray-600">Add money to your Smart Toll wallet</p>
      </div>

      {/* Quick Amount Buttons */}
      <div>
        <Label className="text-sm font-medium text-gray-700 mb-3 block">
          Quick Select
        </Label>
        <div className="grid grid-cols-3 gap-3">
          {quickAmounts.map((quickAmount) => (
            <Button
              key={quickAmount}
              variant="outline"
              className="h-12 text-sm font-medium"
              onClick={() => handleAmountChange(quickAmount.toString())}
            >
              ₹{quickAmount}
            </Button>
          ))}
        </div>
      </div>

      {/* Custom Amount Input */}
      <div>
        <Label htmlFor="amount" className="text-sm font-medium text-gray-700 mb-2 block">
          Enter Amount
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
            ₹
          </span>
          <Input
            id="amount"
            type="number"
            placeholder="0"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className={`pl-8 h-12 text-lg ${error ? 'border-red-500' : ''}`}
            min="1"
            max="50000"
            step="1"
          />
        </div>
        {error && (
          <p className="text-red-500 text-sm mt-2">{error}</p>
        )}
        <p className="text-gray-500 text-xs mt-2">
          Minimum: ₹1 | Maximum: ₹50,000
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          className="flex-1"
          onClick={handlePayment}
          disabled={isLoading || !amount || validateAmount(amount)}
        >
          {isLoading ? 'Processing...' : `Pay ₹${amount || '0'}`}
        </Button>
      </div>
    </div>
  );

  const renderProcessingStep = () => (
    <div className="text-center space-y-4">
      <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
      <h2 className="text-xl font-semibold text-gray-900">Processing Payment</h2>
      <p className="text-gray-600">
        Please complete the payment in the popup window
      </p>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 text-sm">
          Don't close this window until payment is complete
        </p>
      </div>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="text-center space-y-4">
      <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-gray-900">Payment Successful!</h2>
      <p className="text-gray-600">
        ₹{amount} has been added to your wallet
      </p>
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-green-800 text-sm">
          Your wallet will be updated shortly
        </p>
      </div>
    </div>
  );

  return (
    <Card className="w-full max-w-md mx-auto p-6">
      {step === 'amount' && renderAmountStep()}
      {step === 'processing' && renderProcessingStep()}
      {step === 'success' && renderSuccessStep()}
    </Card>
  );
};

export default Recharge;