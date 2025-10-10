import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Eye, CreditCard, TrendingUp } from 'lucide-react';
import BorderlessTable from '../components/BorderlessTable';
import { API_ENDPOINTS } from '../config/config';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all'
  });

  useEffect(() => {
    fetchTransactions();
  }, [pagination.page, searchTerm, filters]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const queryParams = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        ...filters
      });

      const response = await fetch(`${API_ENDPOINTS.admin.searchTransactions}?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data = await response.json();
      setTransactions(data.data || []);
      setPagination(prev => ({
        ...prev,
        total: data.total || 0
      }));
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getTransactionTypeColor = (type) => {
    const types = {
      'toll': 'bg-red-100 text-red-800',
      'toll_payment': 'bg-red-100 text-red-800',
      'recharge': 'bg-green-100 text-green-800',
      'refund': 'bg-blue-100 text-blue-800'
    };
    return types[type?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    const statuses = {
      'completed': 'bg-green-100 text-green-800',
      'success': 'bg-green-100 text-green-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'failed': 'bg-red-100 text-red-800',
      'insufficient_balance': 'bg-red-100 text-red-800',
      'cancelled': 'bg-gray-100 text-gray-800'
    };
    return statuses[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const totalAmount = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const successfulTransactions = transactions.filter(tx => tx.status?.toLowerCase() === 'completed');

  const columns = [
    {
      key: 'id',
      header: 'Transaction ID',
      width: '12%',
      render: (transaction) => (
        <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
          #{transaction.id || 'N/A'}
        </span>
      )
    },
    {
      key: 'user',
      header: 'User',
      width: '15%',
      render: (transaction) => (
        <div>
          <div className="font-medium">{transaction.user_name || 'N/A'}</div>
          <div className="text-sm text-muted-foreground">ID: {transaction.user_id || 'N/A'}</div>
        </div>
      )
    },
    {
      key: 'vehicle',
      header: 'Vehicle',
      width: '12%',
      render: (transaction) => (
        <div>
          <div className="font-medium">{transaction.vehicle_number || 'N/A'}</div>
          <div className="text-sm text-muted-foreground">{transaction.device_id || 'N/A'}</div>
        </div>
      )
    },
    {
      key: 'type',
      header: 'Type',
      width: '10%',
      render: (transaction) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTransactionTypeColor(transaction.type)}`}>
          {transaction.type || 'Unknown'}
        </span>
      )
    },
    {
      key: 'amount',
      header: 'Amount',
      width: '10%',
      render: (transaction) => (
        <div>
          <span className="font-semibold text-lg">₹{transaction.amount || 0}</span>
          {transaction.distance_km && (
            <div className="text-sm text-muted-foreground">{transaction.distance_km}km</div>
          )}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      width: '10%',
      render: (transaction) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
          {transaction.status || 'Unknown'}
        </span>
      )
    },
    {
      key: 'payment_method',
      header: 'Method',
      width: '12%',
      render: (transaction) => (
        <span className="text-sm">{transaction.payment_method || 'N/A'}</span>
      )
    },
    {
      key: 'created_at',
      header: 'Date',
      width: '14%',
      render: (transaction) => (
        <div>
          <div className="text-sm">
            {transaction.created_at ? new Date(transaction.created_at).toLocaleDateString() : 'N/A'}
          </div>
          <div className="text-xs text-muted-foreground">
            {transaction.created_at ? new Date(transaction.created_at).toLocaleTimeString() : ''}
          </div>
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '10%',
      render: (transaction) => (
        <div className="flex items-center space-x-2">
          <button className="p-1 hover:bg-accent rounded transition-colors" title="View Details">
            <Eye className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Transactions Management</h1>
          <p className="text-muted-foreground mt-2">
            View and manage all transactions in the system
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center space-x-3">
            <CreditCard className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-card-foreground">{pagination.total}</p>
              <p className="text-sm text-muted-foreground">Total Transactions</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-card-foreground">₹{totalAmount.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Total Amount</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center space-x-3">
            <CreditCard className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-card-foreground">{successfulTransactions.length}</p>
              <p className="text-sm text-muted-foreground">Successful</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center space-x-3">
            <CreditCard className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-2xl font-bold text-card-foreground">
                {transactions.filter(tx => tx.type?.toLowerCase() === 'toll').length}
              </p>
              <p className="text-sm text-muted-foreground">Toll Payments</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by transaction ID, user name..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="px-3 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="toll">Toll</option>
              <option value="recharge">Recharge</option>
              <option value="refund">Refund</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <BorderlessTable
        columns={columns}
        data={transactions}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        emptyMessage="No transactions found"
      />
    </div>
  );
};

export default Transactions;