import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/config';
import Recharge from './Recharge';

const Dashboard = () => {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const [walletBalance, setWalletBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRecharge, setShowRecharge] = useState(false);
  const [rechargeHistory, setRechargeHistory] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      
      // Fetch wallet balance
      const balanceResponse = await fetch(API_ENDPOINTS.wallet.balance, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setWalletBalance(balanceData.balance);
      }

      // Fetch recent recharge history
      const historyResponse = await fetch(`${API_ENDPOINTS.payment.history}?limit=5`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleRechargeSuccess = (rechargeData) => {
    setWalletBalance(rechargeData.newBalance);
    setShowRecharge(false);
    fetchWalletData(); // Refresh data
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

  const getBalanceColor = () => {
    if (walletBalance === null) return 'text-gray-500';
    if (walletBalance < 100) return 'text-red-600';
    if (walletBalance < 500) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-xl p-8 shadow-lg">
        <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-4xl font-bold text-slate-800 mb-2">
              Smart Toll Dashboard
            </h1>
            <p className="text-slate-500">
              Welcome back, {user?.firstName} {user?.lastName}!
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded-lg cursor-pointer text-sm font-medium hover:bg-red-600 transition-colors"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
            <h3 className="text-gray-700 mb-2 text-lg font-semibold">
              Account Information
            </h3>
            <div className="space-y-1 text-gray-600">
              <p className="text-sm">
                <span className="font-medium">Email:</span> {user?.email}
              </p>
              <p className="text-sm">
                <span className="font-medium">Name:</span> {user?.firstName} {user?.lastName}
              </p>
              <p className="text-sm">
                <span className="font-medium">User ID:</span> {user?.id}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
            <h3 className="text-gray-700 mb-2 text-lg font-semibold">
              Toll Management
            </h3>
            <p className="text-gray-600 text-sm">
              Toll management features will be implemented here.
            </p>
          </div>

          <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
            <h3 className="text-gray-700 mb-2 text-lg font-semibold">
              Payment History
            </h3>
            <p className="text-gray-600 text-sm">
              Payment history and transaction details will be shown here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;