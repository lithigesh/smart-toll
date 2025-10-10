import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/config';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const Dashboard = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [walletBalance, setWalletBalance] = useState(null);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = useCallback(async () => {
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

      // Fetch vehicle count
      const vehiclesResponse = await fetch(API_ENDPOINTS.vehicles.list, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (vehiclesResponse.ok) {
        const vehiclesData = await vehiclesResponse.json();
        setVehicleCount(vehiclesData.vehicles?.length || 0);
      }

      // Fetch recent ESP32 toll transactions
      const transactionsResponse = await fetch(`${API_ENDPOINTS.esp32.tollTransactions}?limit=5`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setRecentTransactions(transactionsData.transactions || []);
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard information');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-border mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md border-destructive">
          <CardContent className="pt-6 text-center">
            <div className="text-destructive mb-4 text-lg font-medium">Error Loading Dashboard</div>
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
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="space-y-3 md:space-y-4">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-light tracking-tight">Dashboard</h1>
        <p className="text-sm md:text-base lg:text-lg text-muted-foreground">
          Welcome back, {user?.firstName || user?.name}!
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:gap-6 lg:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Wallet Balance */}
        <Card className="border hover:border-foreground transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 md:pb-4">
            <CardTitle className="text-xs md:text-sm font-medium">Wallet Balance</CardTitle>
            <span className="text-lg md:text-xl font-bold text-muted-foreground">₹</span>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl md:text-2xl lg:text-3xl font-light mb-1 md:mb-2">
              {walletBalance !== null ? formatCurrency(walletBalance) : '₹0.00'}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mb-4 md:mb-6">Available balance</p>
            <Button 
              className="w-full text-xs md:text-sm h-8 md:h-10" 
              onClick={() => navigate('/recharge')}
            >
              Recharge Wallet
            </Button>
          </CardContent>
        </Card>

        {/* Vehicle Count */}
        <Card className="border hover:border-foreground transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 md:pb-4">
            <CardTitle className="text-xs md:text-sm font-medium">Registered Vehicles</CardTitle>
            <svg className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl md:text-2xl lg:text-3xl font-light mb-1 md:mb-2">{vehicleCount}</div>
            <p className="text-xs md:text-sm text-muted-foreground">Total vehicles</p>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="border hover:border-foreground transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 md:pb-4">
            <CardTitle className="text-xs md:text-sm font-medium">Recent Transactions</CardTitle>
            <svg className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-6z" />
            </svg>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl md:text-2xl lg:text-3xl font-light mb-1 md:mb-2">{recentTransactions.length}</div>
            <p className="text-xs md:text-sm text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        {/* Account Status */}
        <Card className="border hover:border-foreground transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 md:pb-4">
            <CardTitle className="text-xs md:text-sm font-medium">Account Status</CardTitle>
            <svg className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xl md:text-2xl lg:text-3xl font-light mb-1 md:mb-2">Active</div>
            <p className="text-xs md:text-sm text-muted-foreground">Verified account</p>
          </CardContent>
        </Card>
      </div>

              {/* Bottom Section */}
              <div className="grid gap-4 md:gap-6 lg:gap-8 grid-cols-1 lg:grid-cols-2">
                {/* Recent ESP32 Transactions */}
                <Card className="border hover:border-foreground transition-colors">
                  <CardHeader className="pb-4 md:pb-6">
                    <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                      <svg className="h-4 w-4 md:h-5 md:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Recent ESP32 Toll Transactions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {recentTransactions.length > 0 ? (
                      <div className="space-y-4 md:space-y-6">
                        {recentTransactions.map((transaction, index) => (
                          <div key={index} className="flex items-center justify-between py-3 md:py-4 border-b border-border last:border-0">
                            <div className="flex items-center space-x-3 md:space-x-4">
                              <div className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 bg-muted rounded-lg flex items-center justify-center">
                                <svg className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-sm md:text-base font-medium">
                                  {transaction.distance_km}km journey
                                </p>
                                <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1">
                                  {formatDate(transaction.timestamp || transaction.device_timestamp || transaction.created_at)}
                                </p>
                              </div>
                            </div>
                            <span className="text-sm md:text-base font-medium">
                              -{formatCurrency(transaction.toll_amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 md:py-12">
                        <svg className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground mx-auto mb-4 md:mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-base md:text-lg text-muted-foreground mb-1 md:mb-2">No ESP32 transactions yet</p>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          Toll transactions from your ESP32 devices will appear here
                        </p>
                      </div>
                    )}
          </CardContent>
        </Card>

                {/* Quick Actions */}
                <Card className="border hover:border-foreground transition-colors">
                  <CardHeader className="pb-4 md:pb-6">
                    <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                      <svg className="h-4 w-4 md:h-5 md:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 md:space-y-4 pt-0">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start h-10 md:h-12 text-sm md:text-base"
                      onClick={() => navigate('/vehicles')}
                    >
                      <svg className="mr-2 md:mr-3 h-4 w-4 md:h-5 md:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Manage Vehicles
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start h-10 md:h-12 text-sm md:text-base"
                      onClick={() => navigate('/history')}
                    >
                      <svg className="mr-2 md:mr-3 h-4 w-4 md:h-5 md:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      View Transaction History
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start h-10 md:h-12 text-sm md:text-base"
                      onClick={() => navigate('/recharge')}
                    >
                      <span className="mr-2 md:mr-3 text-base md:text-lg font-bold">₹</span>
                      Recharge Wallet
                    </Button>
                  </CardContent>
                </Card>
              </div>
    </div>
  );
};

export default Dashboard;