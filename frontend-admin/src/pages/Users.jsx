import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Eye, Edit, Trash2 } from 'lucide-react';
import BorderlessTable from '../components/BorderlessTable';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all'
  });

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, searchTerm, filters]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const queryParams = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        ...filters
      });

      const response = await fetch(`http://localhost:3001/api/admin/search/users?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.data || []);
      setPagination(prev => ({
        ...prev,
        total: data.total || 0
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
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
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const columns = [
    {
      key: 'id',
      header: 'User ID',
      width: '10%',
      render: (user) => (
        <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
          {user.id}
        </span>
      )
    },
    {
      key: 'name',
      header: 'Name',
      width: '20%',
      render: (user) => (
        <div>
          <div className="font-medium">{user.name || 'N/A'}</div>
          <div className="text-sm text-muted-foreground">{user.email || 'N/A'}</div>
        </div>
      )
    },
    {
      key: 'phone',
      header: 'Phone',
      width: '15%',
      render: (user) => (
        <span className="text-sm">{user.phone || 'N/A'}</span>
      )
    },
    {
      key: 'wallet_balance',
      header: 'Wallet Balance',
      width: '15%',
      render: (user) => (
        <span className="font-semibold text-green-600">
          ₹{user.wallet_balance || 0}
        </span>
      )
    },
    {
      key: 'created_at',
      header: 'Joined Date',
      width: '15%',
      render: (user) => (
        <span className="text-sm">
          {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      width: '10%',
      render: (user) => (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Active
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '15%',
      render: (user) => (
        <div className="flex items-center space-x-2">
          <button className="p-1 hover:bg-accent rounded transition-colors" title="View">
            <Eye className="h-4 w-4" />
          </button>
          <button className="p-1 hover:bg-accent rounded transition-colors" title="Edit">
            <Edit className="h-4 w-4" />
          </button>
          <button className="p-1 hover:bg-destructive/10 text-destructive rounded transition-colors" title="Delete">
            <Trash2 className="h-4 w-4" />
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
          <h1 className="text-3xl font-bold text-foreground">Users Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage all registered users in the system
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
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
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="px-3 py-2 border border-border rounded-lg bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <BorderlessTable
        columns={columns}
        data={users}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        emptyMessage="No users found"
      />
    </div>
  );
};

export default Users;