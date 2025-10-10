import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/config';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const Wallet = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [walletBalance, setWalletBalance] = useState(null);
  const [rechargeHistory, setRechargeHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchWalletData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch wallet balance
      const balanceResponse = await fetch(API_ENDPOINTS.wallet.balance, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setWalletBalance(balanceData.balance);
      }

      // Fetch recharge history
      const historyResponse = await fetch(API_ENDPOINTS.payment.history, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setRechargeHistory(historyData.recharges || []);
      }

    } catch (err) {
      console.error('Error fetching wallet data:', err);
      setError('Failed to load wallet information');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      paid: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      failed: 'bg-red-100 text-red-800 border-red-200'
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-md border ${statusStyles[status] || statusStyles.pending}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-border mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading wallet...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md border-destructive">
          <CardContent className="pt-6 text-center">
            <div className="text-destructive mb-4 text-lg font-medium">Error Loading Wallet</div>
            <p className="text-destructive mb-4">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="destructive"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-light tracking-tight">Wallet</h1>
        <p className="text-muted-foreground">
          Manage your wallet balance and view transaction history.
        </p>
      </div>

      {/* Wallet Balance Card */}
      <Card className="border hover:border-foreground transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              Current Balance
            </span>
            <div className="text-sm text-muted-foreground">
              Updated: {new Date().toLocaleDateString('en-IN')}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-light mb-6">
            {walletBalance !== null ? formatCurrency(walletBalance) : '₹0.00'}
          </div>
          <div className="flex gap-4">
            <Button 
              onClick={() => navigate('/recharge')}
              className="flex-1"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Recharge Wallet
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/history')}
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              View History
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Balance Status Alert */}
      {walletBalance !== null && walletBalance < 100 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <p className="font-medium text-orange-800">Low Balance Alert</p>
                <p className="text-sm text-orange-700">
                  Your wallet balance is low. Recharge now to avoid service interruption.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Recharge History */}
      <Card className="border hover:border-foreground transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Recent Recharge History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rechargeHistory.length > 0 ? (
            <div className="space-y-4">
              {rechargeHistory.map((recharge, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between py-4 border-b border-border last:border-0"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">Wallet Recharge</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(recharge.created_at)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Order: {recharge.razorpay_order_id}
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="font-medium">
                      {formatCurrency(recharge.amount)}
                    </div>
                    {getStatusBadge(recharge.status)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-muted-foreground mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-muted-foreground text-lg">No recharge history</p>
              <p className="text-sm text-muted-foreground mt-2">
                Your wallet recharges will appear here
              </p>
              <Button 
                className="mt-4"
                onClick={() => navigate('/recharge')}
              >
                Make Your First Recharge
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border hover:border-foreground transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Recharges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-light">
              {rechargeHistory.filter(r => r.status === 'paid').length}
            </div>
            <p className="text-xs text-muted-foreground">Successful payments</p>
          </CardContent>
        </Card>

        <Card className="border hover:border-foreground transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-light">
              {formatCurrency(
                rechargeHistory
                  .filter(r => r.status === 'paid')
                  .reduce((sum, r) => sum + parseFloat(r.amount), 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">Lifetime recharges</p>
          </CardContent>
        </Card>

        <Card className="border hover:border-foreground transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Recharge
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-light">
              {rechargeHistory.filter(r => r.status === 'paid').length > 0 
                ? formatCurrency(
                    rechargeHistory
                      .filter(r => r.status === 'paid')
                      .reduce((sum, r) => sum + parseFloat(r.amount), 0) /
                    rechargeHistory.filter(r => r.status === 'paid').length
                  )
                : '₹0.00'
              }
            </div>
            <p className="text-xs text-muted-foreground">Per transaction</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Wallet;