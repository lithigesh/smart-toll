// import { useState, useEffect } from 'react';
// import { useAuth } from '../hooks/useAuth';
// import { useNavigate } from 'react-router-dom';
// import { API_ENDPOINTS } from '../config/config';
// import Recharge from './Recharge';
// import { SidebarLayout } from '@/components/sidebar-layout';

// const Dashboard = () => {
//   const { user, logout, token } = useAuth();
//   const navigate = useNavigate();
//   const [walletBalance, setWalletBalance] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [showRecharge, setShowRecharge] = useState(false);
//   const [rechargeHistory, setRechargeHistory] = useState([]);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     fetchWalletData();
//   }, []);

//   const fetchWalletData = async () => {
//     try {
//       setLoading(true);
      
//       // Fetch wallet balance
//       const balanceResponse = await fetch(API_ENDPOINTS.wallet.balance, {
//         headers: {
//           'Authorization': `Bearer ${token}`
//         }
//       });

//       if (balanceResponse.ok) {
//         const balanceData = await balanceResponse.json();
//         setWalletBalance(balanceData.balance);
//       }

//       // Fetch recent recharge history
//       const historyResponse = await fetch(`${API_ENDPOINTS.payment.history}?limit=5`, {
//         headers: {
//           'Authorization': `Bearer ${token}`
//         }
//       });

//       if (historyResponse.ok) {
//         const historyData = await historyResponse.json();
//         setRechargeHistory(historyData.recharges || []);
//       }

//     } catch (err) {
//       console.error('Error fetching wallet data:', err);
//       setError('Failed to load wallet information');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleLogout = async () => {
//     await logout();
//     navigate('/login');
//   };

//   const handleRechargeSuccess = (rechargeData) => {
//     setWalletBalance(rechargeData.newBalance);
//     setShowRecharge(false);
//     fetchWalletData(); // Refresh data
//   };

//   const formatCurrency = (amount) => {
//     return new Intl.NumberFormat('en-IN', {
//       style: 'currency',
//       currency: 'INR'
//     }).format(amount);
//   };

//   const formatDate = (dateString) => {
//     return new Date(dateString).toLocaleDateString('en-IN', {
//       year: 'numeric',
//       month: 'short',
//       day: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit'
//     });
//   };

//   const getBalanceColor = () => {
//     if (walletBalance === null) return 'text-gray-500';
//     if (walletBalance < 100) return 'text-red-600';
//     if (walletBalance < 500) return 'text-yellow-600';
//     return 'text-green-600';
//   };

//   // if (loading) {
//   //   return (
//   //     <SidebarLayout>
//   //       <div className="flex items-center justify-center min-h-[60vh]">
//   //         <div className="text-center">
//   //           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
//   //           <p className="mt-4 text-gray-600">Loading dashboard...</p>
//   //         </div>
//   //       </div>
//   //     </SidebarLayout>
//   //   );
//   // }

//   if (error) {
//     return (
//       <SidebarLayout>
//         <div className="flex items-center justify-center min-h-[60vh]">
//           <div className="text-center">
//             <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
//               <div className="text-red-600 mb-4 text-lg font-medium">Error Loading Dashboard</div>
//               <p className="text-red-600 mb-4">{error}</p>
//               <button 
//                 onClick={() => window.location.reload()} 
//                 className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
//               >
//                 Retry
//               </button>
//             </div>
//           </div>
//         </div>
//       </SidebarLayout>
//     );
//   }

//   return (
//     <SidebarLayout>
//       <div className="space-y-6">
//         {/* Welcome Header */}
//         <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
//           <div className="flex items-center justify-between">
//             <div>
//               <h2 className="text-2xl font-bold mb-2">
//                 Welcome back, {user?.firstName} {user?.lastName}!
//               </h2>
//               <p className="text-blue-100">
//                 Manage your smart toll account and transactions
//               </p>
//             </div>
//             <div className="hidden md:block">
//               <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
//                 <div className="text-sm text-blue-100">Account Status</div>
//                 <div className="text-xl font-semibold">Active</div>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Stats Grid */}
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//           {/* Wallet Balance Card */}
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm font-medium text-gray-600 mb-1">Wallet Balance</p>
//                 <p className={`text-2xl font-bold ${getBalanceColor()}`}>
//                   {walletBalance !== null ? formatCurrency(walletBalance) : '₹0.00'}
//                 </p>
//               </div>
//               <div className="p-3 rounded-full bg-green-100">
//                 <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
//                 </svg>
//               </div>
//             </div>
//             <button
//               onClick={() => setShowRecharge(true)}
//               className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
//             >
//               Recharge Wallet
//             </button>
//           </div>

//           {/* Total Transactions */}
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm font-medium text-gray-600 mb-1">Total Transactions</p>
//                 <p className="text-2xl font-bold text-gray-900">{rechargeHistory.length}</p>
//                 <p className="text-xs text-gray-500 mt-1">This month</p>
//               </div>
//               <div className="p-3 rounded-full bg-blue-100">
//                 <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-6z" />
//                 </svg>
//               </div>
//             </div>
//           </div>

//           {/* Account Status */}
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//             <div className="flex items-center justify-between">
//               <div>
//                 <p className="text-sm font-medium text-gray-600 mb-1">Account Status</p>
//                 <p className="text-lg font-semibold text-green-600">Active</p>
//                 <p className="text-xs text-gray-500 mt-1">Verified Account</p>
//               </div>
//               <div className="p-3 rounded-full bg-green-100">
//                 <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
//                 </svg>
//               </div>
//             </div>
//           </div>

//           {/* Quick Actions */}
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//             <div className="flex items-center justify-between mb-4">
//               <div>
//                 <p className="text-sm font-medium text-gray-600 mb-1">Quick Actions</p>
//               </div>
//               <div className="p-3 rounded-full bg-purple-100">
//                 <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
//                 </svg>
//               </div>
//             </div>
//             <div className="space-y-2">
//               <button className="w-full text-left text-sm text-blue-600 hover:text-blue-800 font-medium">
//                 → View History
//               </button>
//               <button className="w-full text-left text-sm text-blue-600 hover:text-blue-800 font-medium">
//                 → Manage Vehicles
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* Account Information & Recent Activity */}
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//           {/* Account Information */}
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200">
//             <div className="px-6 py-4 border-b border-gray-200">
//               <h3 className="text-lg font-semibold text-gray-900 flex items-center">
//                 <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
//                 </svg>
//                 Account Information
//               </h3>
//             </div>
//             <div className="p-6 space-y-4">
//               <div className="flex justify-between items-center py-2">
//                 <span className="text-sm font-medium text-gray-600">Email</span>
//                 <span className="text-sm text-gray-900">{user?.email}</span>
//               </div>
//               <div className="flex justify-between items-center py-2">
//                 <span className="text-sm font-medium text-gray-600">Full Name</span>
//                 <span className="text-sm text-gray-900">{user?.firstName} {user?.lastName}</span>
//               </div>
//               <div className="flex justify-between items-center py-2">
//                 <span className="text-sm font-medium text-gray-600">User ID</span>
//                 <span className="text-sm text-gray-900 font-mono">{user?.id}</span>
//               </div>
//               <div className="flex justify-between items-center py-2">
//                 <span className="text-sm font-medium text-gray-600">Member Since</span>
//                 <span className="text-sm text-gray-900">2024</span>
//               </div>
//             </div>
//           </div>

//           {/* Recent Activity */}
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200">
//             <div className="px-6 py-4 border-b border-gray-200">
//               <h3 className="text-lg font-semibold text-gray-900 flex items-center">
//                 <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
//                 </svg>
//                 Recent Activity
//               </h3>
//             </div>
//             <div className="p-6">
//               {rechargeHistory.length > 0 ? (
//                 <div className="space-y-4">
//                   {rechargeHistory.slice(0, 3).map((transaction, index) => (
//                     <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
//                       <div className="flex items-center">
//                         <div className="p-2 rounded-full bg-green-100 mr-3">
//                           <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
//                           </svg>
//                         </div>
//                         <div>
//                           <p className="text-sm font-medium text-gray-900">Wallet Recharge</p>
//                           <p className="text-xs text-gray-500">{formatDate(transaction.created_at)}</p>
//                         </div>
//                       </div>
//                       <span className="text-sm font-semibold text-green-600">
//                         +{formatCurrency(transaction.amount)}
//                       </span>
//                     </div>
//                   ))}
//                 </div>
//               ) : (
//                 <div className="text-center py-8">
//                   <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
//                   </svg>
//                   <p className="text-gray-500">No recent transactions</p>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* Quick Stats */}
//         <div className="bg-white rounded-xl shadow-sm border border-gray-200">
//           <div className="px-6 py-4 border-b border-gray-200">
//             <h3 className="text-lg font-semibold text-gray-900">Quick Overview</h3>
//           </div>
//           <div className="p-6">
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//               <div className="text-center">
//                 <div className="p-4 rounded-full bg-blue-100 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
//                   <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
//                   </svg>
//                 </div>
//                 <h4 className="font-semibold text-gray-900 mb-1">Toll Management</h4>
//                 <p className="text-sm text-gray-600">Manage your toll payments and travel routes efficiently</p>
//               </div>
              
//               <div className="text-center">
//                 <div className="p-4 rounded-full bg-green-100 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
//                   <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-6z" />
//                   </svg>
//                 </div>
//                 <h4 className="font-semibold text-gray-900 mb-1">Payment History</h4>
//                 <p className="text-sm text-gray-600">Track all your transactions and payment details</p>
//               </div>
              
//               <div className="text-center">
//                 <div className="p-4 rounded-full bg-purple-100 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
//                   <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
//                   </svg>
//                 </div>
//                 <h4 className="font-semibold text-gray-900 mb-1">Settings</h4>
//                 <p className="text-sm text-gray-600">Customize your account preferences and security</p>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Recharge Modal */}
//       {showRecharge && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
//             <div className="flex justify-between items-center mb-6">
//               <h3 className="text-xl font-bold text-gray-900">Recharge Wallet</h3>
//               <button 
//                 onClick={() => setShowRecharge(false)}
//                 className="text-gray-400 hover:text-gray-600 p-2"
//               >
//                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
//                 </svg>
//               </button>
//             </div>
//             <Recharge 
//               onSuccess={handleRechargeSuccess}
//               onCancel={() => setShowRecharge(false)}
//             />
//           </div>
//         </div>
//       )}
//     </SidebarLayout>
//   );
// };

// export default Dashboard;



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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      
      const balanceResponse = await fetch(API_ENDPOINTS.wallet.balance, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        setWalletBalance(balanceData.balance);
      }

      const historyResponse = await fetch(`${API_ENDPOINTS.payment.history}?limit=5`, {
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
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleRechargeSuccess = (rechargeData) => {
    setWalletBalance(rechargeData.newBalance);
    setShowRecharge(false);
    fetchWalletData();
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

  const menuItems = [
    { 
      name: 'Dashboard', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ), 
      active: true 
    },
    { 
      name: 'Wallet', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ), 
      active: false 
    },
    { 
      name: 'Transactions', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ), 
      active: false 
    },
    { 
      name: 'Vehicles', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ), 
      active: false 
    },
    { 
      name: 'History', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ), 
      active: false 
    },
    { 
      name: 'Settings', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ), 
      active: false 
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-md max-w-md">
          <div className="text-red-600 mb-4 text-lg font-medium">Error Loading Dashboard</div>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`bg-white shadow-lg transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      } flex flex-col`}>
        
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                ST
              </div>
              {!sidebarCollapsed && (
                <div className="ml-3">
                  <h1 className="text-lg font-bold text-gray-800">Smart Toll</h1>
                  <p className="text-xs text-gray-500">Dashboard</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg 
                className={`w-4 h-4 text-gray-600 transition-transform duration-300 ${
                  sidebarCollapsed ? 'rotate-180' : ''
                }`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {menuItems.map((item, index) => (
              <div key={index} className="group">
                <button
                  className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 ${
                    item.active 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                  } ${sidebarCollapsed ? 'justify-center' : ''}`}
                >
                  <div className={`${item.active ? 'text-blue-600' : 'text-gray-500'}`}>
                    {item.icon}
                  </div>
                  {!sidebarCollapsed && (
                    <span className="ml-3 font-medium text-sm">{item.name}</span>
                  )}
                </button>
                
                {/* Tooltip for collapsed state */}
                {sidebarCollapsed && (
                  <div className="absolute left-16 ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                    {item.name}
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-200">
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
              {user?.firstName?.charAt(0) || 'U'}
            </div>
            {!sidebarCollapsed && (
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                <button
                  onClick={handleLogout}
                  className="text-xs text-red-600 hover:text-red-800 mt-1"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome back, <span className="font-medium">{user?.firstName}!</span>
              </span>
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-5 5l-5-5h5v-5a7.5 7.5 0 00-15 0v5h5" />
                </svg>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-auto p-6">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 rounded-2xl p-8 text-white mb-8 relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-3xl font-bold mb-3">
                Welcome back, {user?.firstName}! 👋
              </h3>
              <p className="text-blue-100 text-lg">
                Manage your smart toll payments and track your journey
              </p>
            </div>
            <div className="absolute top-0 right-0 transform translate-x-16 translate-y-8">
              <div className="w-32 h-32 bg-white bg-opacity-10 rounded-full"></div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Wallet Balance Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 rounded-xl bg-green-100">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  BALANCE
                </span>
              </div>
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-600 mb-1">Wallet Balance</p>
                <p className={`text-3xl font-bold ${getBalanceColor()}`}>
                  {walletBalance !== null ? formatCurrency(walletBalance) : '₹0.00'}
                </p>
              </div>
              <button
                //onClick={() => setShowRecharge(true)}
                onClick={() => navigate('/recharge')}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 font-medium text-sm"
              >
                💳 Recharge Wallet
              </button>
            </div>

            {/* Total Transactions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 rounded-xl bg-blue-100">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-6z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  TOTAL
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Transactions</p>
                <p className="text-3xl font-bold text-gray-900">{rechargeHistory.length}</p>
                <p className="text-xs text-gray-500 mt-2">This month</p>
              </div>
            </div>

            {/* Account Status */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 rounded-xl bg-green-100">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  ACTIVE
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Account Status</p>
                <p className="text-2xl font-bold text-green-600">Active ✓</p>
                <p className="text-xs text-gray-500 mt-2">Verified Account</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 rounded-xl bg-purple-100">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                  ACTIONS
                </span>
              </div>
              <div className="space-y-3">
                <button className="w-full text-left text-sm text-blue-600 hover:text-blue-800 font-medium py-2 px-3 rounded-lg hover:bg-blue-50 transition-colors">
                  📊 View History
                </button>
                <button className="w-full text-left text-sm text-blue-600 hover:text-blue-800 font-medium py-2 px-3 rounded-lg hover:bg-blue-50 transition-colors">
                  🚗 Manage Vehicles
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Account Information */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Account Information
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Email</span>
                  <span className="text-sm text-gray-900 font-medium">{user?.email}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">Full Name</span>
                  <span className="text-sm text-gray-900 font-medium">{user?.firstName} {user?.lastName}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-sm font-medium text-gray-600">User ID</span>
                  <span className="text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">{user?.id}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-sm font-medium text-gray-600">Member Since</span>
                  <span className="text-sm text-gray-900 font-medium">2024</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Recent Activity
                </h3>
              </div>
              <div className="p-6">
                {rechargeHistory.length > 0 ? (
                  <div className="space-y-4">
                    {rechargeHistory.slice(0, 3).map((transaction, index) => (
                      <div key={index} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Wallet Recharge</p>
                            <p className="text-xs text-gray-500">{formatDate(transaction.created_at)}</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                          +{formatCurrency(transaction.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 font-medium">No recent transactions</p>
                    <p className="text-gray-400 text-sm mt-1">Your activity will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Recharge Modal */}
      {showRecharge && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl transform transition-all">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">💳 Recharge Wallet</h3>
              <button 
                onClick={() => setShowRecharge(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <Recharge 
              onSuccess={handleRechargeSuccess}
              onCancel={() => setShowRecharge(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;