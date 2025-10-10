import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { API_ENDPOINTS } from '../config/config';
import { ArrowDown, Calendar, CreditCard, RefreshCw, Car, MapPin } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const History = () => {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTransactionHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch ESP32 toll transactions
      const response = await fetch(`${API_ENDPOINTS.esp32.tollTransactions}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('ESP32 Transaction history response:', data);
        setTransactions(data.transactions || []);
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
  }, [token]);

  useEffect(() => {
    fetchTransactionHistory();
  }, [fetchTransactionHistory]);

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
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="space-y-3 md:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-light tracking-tight">Transaction History</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              View all your ESP32 toll transactions and journey details.
            </p>
          </div>
          <Button
            onClick={fetchTransactionHistory}
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-destructive font-medium">{error}</p>
                <Button
                  onClick={fetchTransactionHistory}
                  variant="link"
                  className="h-auto p-0 text-destructive hover:text-destructive/80"
                >
                  Try again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

              {/* Summary Cards */}
              <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="border hover:border-foreground transition-colors">
                  <CardHeader className="pb-3 md:pb-4">
                    <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                      Total Trips
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl md:text-2xl font-light">
                      {transactions.filter(t => t.status === 'success').length}
                    </div>
                    <p className="text-xs text-muted-foreground">Successful journeys</p>
                  </CardContent>
                </Card>

                <Card className="border hover:border-foreground transition-colors">
                  <CardHeader className="pb-3 md:pb-4">
                    <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                      Total Distance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl md:text-2xl font-light">
                      {(transactions
                        .filter(t => t.status === 'success')
                        .reduce((sum, t) => sum + parseFloat(t.distance_km || 0), 0)
                      ).toFixed(1)} km
                    </div>
                    <p className="text-xs text-muted-foreground">Kilometers traveled</p>
                  </CardContent>
                </Card>

                <Card className="border hover:border-foreground transition-colors sm:col-span-2 lg:col-span-1">
                  <CardHeader className="pb-3 md:pb-4">
                    <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">
                      Total Tolls Paid
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl md:text-2xl font-light">
                      {formatCurrency(transactions
                        .filter(t => t.status === 'success')
                        .reduce((sum, t) => sum + parseFloat(t.toll_amount || 0), 0)
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Amount deducted</p>
                  </CardContent>
                </Card>
              </div>

              {/* Transactions List */}
              <Card className="border">
                <CardHeader>
                  <CardTitle className="text-base md:text-lg font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4 md:w-5 md:h-5" />
                    Transactions History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <div className="text-center py-8 md:py-12">
                      <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-base md:text-lg font-medium mb-2">No Transactions Yet</h3>
                      <p className="text-sm md:text-base text-muted-foreground mb-4 md:mb-6">
                        Your toll transaction history will appear here once you start using the smart toll system.
                      </p>
                      <Button variant="outline" className="gap-2 w-full sm:w-auto">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Add Vehicle
                      </Button>
                    </div>
                  ) : (
              
              <div className="space-y-4">
                {transactions.map((transaction, index) => (
                  <div key={transaction.id || index} className="border border-border rounded-lg p-6 hover:border-foreground transition-colors">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {/* Status Icon */}
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          transaction.status === 'success' 
                            ? 'bg-green-50 text-green-600' 
                            : transaction.status === 'failed'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-yellow-50 text-yellow-600'
                        }`}>
                          {transaction.status === 'success' ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : transaction.status === 'failed' ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-foreground">Toll Journey</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(transaction.timestamp || transaction.device_timestamp || transaction.created_at)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-lg font-semibold text-foreground">
                          -{formatCurrency(transaction.toll_amount)}
                        </p>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          transaction.status === 'success' 
                            ? 'bg-green-100 text-green-800' 
                            : transaction.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {transaction.status === 'success' ? 'Completed' : 
                           transaction.status === 'failed' ? 'Failed' : 'Processing'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Transaction Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Device ID</p>
                        <p className="text-sm font-medium">{transaction.device_id}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Distance</p>
                        <p className="text-sm font-medium">{transaction.distance_km} km</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Vehicle</p>
                        <p className="text-sm font-medium">{transaction.vehicle_number || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Route</p>
                        <p className="text-sm font-medium">
                          {transaction.start_lat && transaction.start_lon 
                            ? `${transaction.start_lat.toFixed(4)}, ${transaction.start_lon.toFixed(4)}`
                            : 'N/A'
                          }
                        </p>
                      </div>
                    </div>
                    
                    {/* Additional Details */}
                    <div className="pt-4 border-t border-border/50">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Transaction ID:</span> {transaction.id}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <span className="font-medium">Processed:</span> {formatFullDate(transaction.timestamp || transaction.device_timestamp || transaction.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default History;