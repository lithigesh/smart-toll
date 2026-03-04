'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { API_ENDPOINTS } from '@/config/config';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card } from '@/components/ui/Card';
import { Wallet } from 'lucide-react';
import { AppLayout } from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayPaymentResponse) => void;
  prefill?: { name: string; email: string; contact: string };
  notes?: Record<string, string>;
  theme?: { color: string };
  modal?: { ondismiss?: () => void; escape?: boolean; backdropclose?: boolean };
  retry?: { enabled: boolean };
  timeout?: number;
  remember_customer?: boolean;
  image?: string;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (response: { error: { description?: string } }) => void) => void;
}

interface RazorpayPaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export default function RechargePage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <RechargeContent />
      </AppLayout>
    </ProtectedRoute>
  );
}

function RechargeContent() {
  const { token } = useAuth();
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'amount' | 'processing' | 'success'>('amount');

  const quickAmounts = [100, 200, 500, 1000, 2000, 5000];

  const validateAmount = (value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) return 'Please enter a valid amount';
    if (numValue < 1) return 'Minimum recharge amount is ₹1';
    if (numValue > 50000) return 'Maximum recharge amount is ₹50,000';
    return '';
  };

  const initializeRazorpay = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.Razorpay) {
        resolve(true);
        return;
      }
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
      const razorpayLoaded = await initializeRazorpay();
      if (!razorpayLoaded) throw new Error('Failed to load payment gateway');

      const orderResponse = await fetch(API_ENDPOINTS.payment.createOrder, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount: parseFloat(amount) }),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.message || 'Failed to create payment order');
      }

      const orderData = await orderResponse.json();

      const options: RazorpayOptions = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Smart Toll System',
        description: `Wallet Recharge - ₹${amount}`,
        order_id: orderData.orderId,
        handler: async (response) => {
          await verifyPayment(response);
        },
        prefill: { name: '', email: '', contact: '' },
        notes: orderData.notes,
        theme: { color: '#111827' },
        modal: {
          ondismiss: () => {
            setIsLoading(false);
            setStep('amount');
            setError('Payment cancelled by user');
          },
          escape: true,
          backdropclose: false,
        },
        retry: { enabled: true },
        timeout: 300,
        remember_customer: false,
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on('payment.failed', (response) => {
        setError(`Payment failed: ${response.error.description || 'Unknown error'}`);
        setIsLoading(false);
        setStep('amount');
      });

      razorpay.open();
    } catch (err) {
      setError((err as Error).message || 'Payment failed. Please try again.');
      setIsLoading(false);
      setStep('amount');
    }
  };

  const verifyPayment = async (paymentData: RazorpayPaymentResponse) => {
    try {
      setStep('processing');
      const verifyResponse = await fetch(API_ENDPOINTS.payment.verify, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          razorpay_order_id: paymentData.razorpay_order_id,
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_signature: paymentData.razorpay_signature,
        }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.message || 'Payment verification failed');
      }

      setStep('success');
      setIsLoading(false);
      setTimeout(() => router.push('/dashboard'), 3000);
    } catch (err) {
      setError((err as Error).message || 'Payment verification failed.');
      setIsLoading(false);
      setStep('amount');
    }
  };

  return (
    <div className="bg-slate-50 p-4 pt-8 pb-4">
      <div className="w-full max-w-md mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
            <Wallet className="h-8 w-8 text-gray-900" />
            Recharge Wallet
          </h1>
          <p className="text-gray-600 text-sm mt-1">Add money to your Smart Toll wallet securely</p>
        </div>

        <Card className="w-full p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm mb-4">
              {error}
            </div>
          )}

          {step === 'amount' && (
            <div className="space-y-6">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-3 block">Quick Select</Label>
                <div className="grid grid-cols-3 gap-3">
                  {quickAmounts.map((qa) => (
                    <Button
                      key={qa}
                      variant="outline"
                      className="h-12 text-sm font-medium"
                      onClick={() => { setAmount(qa.toString()); setError(''); }}
                    >
                      ₹{qa}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="amount" className="text-sm font-medium text-gray-700 mb-2 block">
                  Enter Amount
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">₹</span>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setError(''); }}
                    className={`pl-8 h-12 text-lg ${error ? 'border-red-500' : ''}`}
                    min="1"
                    max="50000"
                    step="1"
                  />
                </div>
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                <p className="text-gray-500 text-xs mt-2">Minimum: ₹1 | Maximum: ₹50,000</p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => router.push('/dashboard')} disabled={isLoading}>
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handlePayment}
                  disabled={isLoading || !amount || !!validateAmount(amount)}
                >
                  {isLoading ? 'Processing...' : `Pay ₹${amount || '0'}`}
                </Button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Processing Payment</h2>
              <p className="text-gray-600">Please complete the payment in the popup window</p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">Don&apos;t close this window until payment is complete</p>
              </div>
              <div className="text-xs text-gray-500">Powered by Razorpay - Secure Payment Gateway</div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Payment Successful!</h2>
              <p className="text-gray-600">₹{amount} has been added to your wallet</p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 text-sm">Your wallet balance will be updated shortly</p>
              </div>
              <div className="text-xs text-gray-500">You will be redirected to dashboard in a few seconds...</div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
