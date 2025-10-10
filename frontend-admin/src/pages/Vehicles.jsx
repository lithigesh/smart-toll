import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Eye, Edit, Car } from 'lucide-react';
import BorderlessTable from '../components/BorderlessTable';
import { API_ENDPOINTS } from '../config/config';

const Vehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    type: 'all'
  });

  useEffect(() => {
    fetchVehicles();
  }, [pagination.page, searchTerm, filters]);

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const queryParams = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        ...filters
      });

      const response = await fetch(`${API_ENDPOINTS.admin.searchVehicles}?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch vehicles');
      }

      const data = await response.json();
      setVehicles(data.data || []);
      setPagination(prev => ({
        ...prev,
        total: data.total || 0
      }));
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setVehicles([]);
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

  const getVehicleTypeColor = (type) => {
    const types = {
      'car': 'bg-blue-100 text-blue-800',
      'truck': 'bg-green-100 text-green-800',
      'bike': 'bg-purple-100 text-purple-800',
      'bus': 'bg-orange-100 text-orange-800'
    };
    return types[type?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const columns = [
    {
      key: 'license_plate',
      header: 'License Plate',
      width: '15%',
      render: (vehicle) => (
        <span className="font-mono text-sm bg-muted px-2 py-1 rounded font-semibold">
          {vehicle.license_plate || 'N/A'}
        </span>
      )
    },
    {
      key: 'owner',
      header: 'Owner Details',
      width: '25%',
      render: (vehicle) => (
        <div>
          <div className="font-medium">{vehicle.owner_name || 'N/A'}</div>
          <div className="text-sm text-muted-foreground">ID: {vehicle.user_id || 'N/A'}</div>
        </div>
      )
    },
    {
      key: 'vehicle_type',
      header: 'Type',
      width: '12%',
      render: (vehicle) => (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getVehicleTypeColor(vehicle.vehicle_type)}`}>
          {vehicle.vehicle_type || 'Unknown'}
        </span>
      )
    },
    {
      key: 'make_model',
      header: 'Make & Model',
      width: '20%',
      render: (vehicle) => (
        <div>
          <div className="font-medium">{vehicle.make || 'N/A'}</div>
          <div className="text-sm text-muted-foreground">{vehicle.model || 'N/A'}</div>
        </div>
      )
    },
    {
      key: 'year',
      header: 'Year',
      width: '8%',
      render: (vehicle) => (
        <span className="text-sm">{vehicle.year || 'N/A'}</span>
      )
    },
    {
      key: 'created_at',
      header: 'Registered',
      width: '12%',
      render: (vehicle) => (
        <span className="text-sm">
          {vehicle.created_at ? new Date(vehicle.created_at).toLocaleDateString() : 'N/A'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '8%',
      render: (vehicle) => (
        <div className="flex items-center space-x-2">
          <button className="p-1 hover:bg-accent rounded transition-colors" title="View">
            <Eye className="h-4 w-4" />
          </button>
          <button className="p-1 hover:bg-accent rounded transition-colors" title="Edit">
            <Edit className="h-4 w-4" />
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
          <h1 className="text-3xl font-bold text-foreground">Vehicles Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage all registered vehicles in the system
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
            <Car className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-card-foreground">{pagination.total}</p>
              <p className="text-sm text-muted-foreground">Total Vehicles</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center space-x-3">
            <Car className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-card-foreground">
                {vehicles.filter(v => v.vehicle_type?.toLowerCase() === 'car').length}
              </p>
              <p className="text-sm text-muted-foreground">Cars</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center space-x-3">
            <Car className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-2xl font-bold text-card-foreground">
                {vehicles.filter(v => v.vehicle_type?.toLowerCase() === 'truck').length}
              </p>
              <p className="text-sm text-muted-foreground">Trucks</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center space-x-3">
            <Car className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-2xl font-bold text-card-foreground">
                {vehicles.filter(v => ['bike', 'bus'].includes(v.vehicle_type?.toLowerCase())).length}
              </p>
              <p className="text-sm text-muted-foreground">Others</p>
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
              placeholder="Search by license plate, make, model..."
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
              <option value="car">Car</option>
              <option value="truck">Truck</option>
              <option value="bike">Bike</option>
              <option value="bus">Bus</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vehicles Table */}
      <BorderlessTable
        columns={columns}
        data={vehicles}
        loading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
        emptyMessage="No vehicles found"
      />
    </div>
  );
};

export default Vehicles;