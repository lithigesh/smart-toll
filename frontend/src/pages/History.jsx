import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { API_ENDPOINTS } from '../config/config';
import { ArrowDown, Calendar, CreditCard, RefreshCw } from 'lucide-react';
import ThemeSelector from '../components/ThemeSelector';

const History = () => {
  const { user, token } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTransactionHistory();
  }, []);

  const fetchTransactionHistory = async () => {
    try {
      setLoading(true);
      setError('');

      // Add cache-busting parameter to ensure fresh data
      const url = new URL(API_ENDPOINTS.payment.history);
      url.searchParams.append('t', Date.now().toString());

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-cache' // Prevent caching
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Transaction history response:', data); // Debug log
        setTransactions(data.recharges || []);
      } else {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        setError(`Failed to fetch transaction history: ${response.status}`);
      }
    } catch (err) {
      console.error('Error fetching transaction history:', err);
      setError('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

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

  const formatFullDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading transaction history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => window.history.back()}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
              title="Go back"
            >
              <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Transaction History</h1>
              <p className="text-sm text-muted-foreground">View all your recharge transactions</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={fetchTransactionHistory}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
              title="Refresh transactions"
            >
              <RefreshCw className={`w-4 h-4 text-foreground ${loading ? 'animate-spin' : ''}`} />
            </button>
            <ThemeSelector />
            <div className="text-sm text-muted-foreground">
              Welcome back, <span className="font-medium">{user?.firstName}!</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-destructive font-medium">{error}</p>
            </div>
            <button
              onClick={fetchTransactionHistory}
              className="mt-2 text-sm text-destructive hover:text-destructive/80 underline"
            >
              Try again
            </button>
          </div>
        )}

        <div className="max-w-4xl mx-auto">
          {/* Summary Card */}
          <div className="bg-card rounded-2xl shadow-sm border border-border p-6 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-2">Transaction Summary</h2>
                <p className="text-muted-foreground">Total transactions: {transactions.length}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Credited</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(transactions
                    .filter(transaction => transaction.status === 'paid')
                    .reduce((sum, transaction) => sum + (transaction.amount || 0), 0)
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Transactions List */}
          {transactions.length === 0 ? (
            <div className="bg-card rounded-2xl shadow-sm border border-border p-12 text-center">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Transactions Found</h3>
              <p className="text-muted-foreground">You haven't made any recharge transactions yet.</p>
            </div>
          ) : (
            <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
              <div className="px-6 py-4 bg-muted border-b border-border">
                <h3 className="text-lg font-semibold text-foreground flex items-center">
                  <Calendar className="w-5 h-5 text-primary mr-2" />
                  Recent Transactions
                </h3>
              </div>
              
              <div className="divide-y divide-border">
                {transactions.map((transaction, index) => (
                  <div key={transaction.id || index} className="p-6 hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {/* Status Icon */}
                        <div className="relative">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            transaction.status === 'paid' 
                              ? 'bg-green-100 dark:bg-green-900'
                              : transaction.status === 'failed'
                              ? 'bg-red-100 dark:bg-red-900'
                              : 'bg-yellow-100 dark:bg-yellow-900'
                          }`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              transaction.status === 'paid' 
                                ? 'bg-green-500'
                                : transaction.status === 'failed'
                                ? 'bg-red-500'
                                : 'bg-yellow-500'
                            }`}>
                              <ArrowDown className="w-3 h-3 text-white" />
                            </div>
                          </div>
                        </div>
                        
                        {/* Transaction Details */}
                        <div>
                          <h4 className="font-medium text-foreground">Wallet Recharge</h4>
                          <div className="flex items-center space-x-4 mt-1">
                            <p className="text-sm text-muted-foreground">
                              {formatDate(transaction.created_at)}
                            </p>
                            {transaction.payment_id && (
                              <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                                Online Payment
                              </span>
                            )}
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              transaction.status === 'paid' 
                                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                                : transaction.status === 'failed'
                                ? 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                                : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                            }`}>
                              {transaction.status === 'paid' ? 'Success' : transaction.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Amount */}
                      <div className="text-right">
                        <p className={`text-lg font-semibold ${
                          transaction.status === 'paid' 
                            ? 'text-green-600 dark:text-green-400'
                            : transaction.status === 'failed'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-yellow-600 dark:text-yellow-400'
                        }`}>
                          {transaction.status === 'paid' ? '+' : ''}
                          {formatCurrency(transaction.amount)}
                        </p>
                        {(transaction.payment_id || transaction.order_id) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            ID: {transaction.payment_id || transaction.order_id}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Additional Details */}
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Full Date:</span> {formatFullDate(transaction.created_at)}
                      </p>
                      {transaction.order_id && (
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="font-medium">Order ID:</span> {transaction.order_id}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="font-medium">Amount:</span> {transaction.amount_formatted || formatCurrency(transaction.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default History;