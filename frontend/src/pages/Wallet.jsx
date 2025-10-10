import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/config';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { RefreshCw } from 'lucide-react';

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
        <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-gray-900">Wallet</h1>
        <p className="text-gray-600">
          Manage your wallet balance and view transaction history.
        </p>
      </div>

      {/* Top Row - Wallet Balance and Stats Cards */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Wallet Balance Card */}
        <Card className="sm:col-span-2 lg:col-span-1 border border-gray-200 hover:border-gray-300 transition-colors bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <span className="text-sm sm:text-base">Current Balance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-light mb-4 text-gray-900">
              {walletBalance !== null ? formatCurrency(walletBalance) : '₹0.00'}
            </div>
            <Button 
              onClick={() => navigate('/recharge')}
              className="w-full bg-gray-900 hover:bg-black text-white"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="text-sm">Recharge Wallet</span>
            </Button>
          </CardContent>
        </Card>

        {/* Total Recharges Card */}
        <Card className="border border-gray-200 hover:border-gray-300 transition-colors bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Recharges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-light mb-2 text-gray-900">
              {rechargeHistory.filter(r => r.status === 'paid').length}
            </div>
            <p className="text-xs text-gray-500">Successful payments</p>
          </CardContent>
        </Card>

        {/* Total Amount Card */}
        <Card className="border border-gray-200 hover:border-gray-300 transition-colors bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-light mb-2 text-gray-900">
              {formatCurrency(
                rechargeHistory
                  .filter(r => r.status === 'paid')
                  .reduce((sum, r) => sum + parseFloat(r.amount), 0)
              )}
            </div>
            <p className="text-xs text-gray-500">Lifetime recharges</p>
          </CardContent>
        </Card>

        {/* Average Recharge Card */}
        <Card className="border border-gray-200 hover:border-gray-300 transition-colors bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Average Recharge
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-light mb-2 text-gray-900">
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
            <p className="text-xs text-gray-500">Per transaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Balance Status Alert */}
      {walletBalance !== null && walletBalance < 100 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-start sm:items-center gap-3">
              <svg className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5 sm:mt-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <p className="font-medium text-orange-800 text-sm sm:text-base">Low Balance Alert</p>
                <p className="text-sm text-orange-700 mt-1">
                  Your wallet balance is low. Recharge now to avoid service interruption.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Recharge History */}
      <Card className="border border-gray-200 hover:border-gray-300 transition-colors bg-white">
        <CardHeader>
          <CardTitle className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span className="text-gray-900 text-base sm:text-lg">Recent Recharge History</span>
            </div>
            <Button
              onClick={fetchWalletData}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rechargeHistory.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {rechargeHistory.map((recharge, index) => (
                <div 
                  key={index} 
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 sm:py-4 border-b border-gray-200 last:border-0 space-y-3 sm:space-y-0"
                >
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm sm:text-base">Wallet Recharge</p>
                      <p className="text-sm text-gray-600">
                        {formatDate(recharge.created_at)}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        Order: {recharge.razorpay_order_id}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:flex-col sm:items-end sm:text-right space-y-0 sm:space-y-2">
                    <div className="font-medium text-gray-900 text-sm sm:text-base">
                      {formatCurrency(recharge.amount)}
                    </div>
                    {getStatusBadge(recharge.status)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12 px-4">
              <svg className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-600 text-base sm:text-lg">No recharge history</p>
              <p className="text-sm text-gray-500 mt-2">
                Your wallet recharges will appear here
              </p>
              <Button 
                className="mt-4 bg-gray-900 hover:bg-black text-white w-full sm:w-auto"
                onClick={() => navigate('/recharge')}
              >
                Make Your First Recharge
              </Button>
            </div>
          )}
        </CardContent>
      </Card>


    </div>
  );
};

export default Wallet;