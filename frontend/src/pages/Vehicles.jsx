import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/config';
import { Plus, Car, Edit, Trash2, RefreshCw, Wifi, Calendar, Palette, Wrench, Hash, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';

const Vehicles = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchVehicles = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      console.log('Fetching vehicles from:', API_ENDPOINTS.vehicles.list);

      const response = await fetch(API_ENDPOINTS.vehicles.list, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('Vehicles data received:', data);
        setVehicles(data.vehicles || []);
      } else {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        setError(`Failed to fetch vehicles: ${response.status}`);
      }
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const handleDeleteVehicle = async (vehicleId) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) {
      return;
    }

    try {
      const deleteUrl = `${API_ENDPOINTS.vehicles.delete}/${vehicleId}`;
      console.log('🔍 Delete URL:', deleteUrl);
      console.log('🔍 Vehicle ID:', vehicleId);
      console.log('🔍 API_ENDPOINTS.vehicles.delete:', API_ENDPOINTS.vehicles.delete);
      
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('🔍 Delete response status:', response.status);
      console.log('🔍 Delete response URL:', response.url);

      if (response.ok) {
        setVehicles(vehicles.filter(vehicle => vehicle.id !== vehicleId));
        console.log('✅ Vehicle deleted successfully');
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Delete failed:', response.status, errorData);
        setError(`Failed to delete vehicle: ${response.status}`);
      }
    } catch (err) {
      console.error('Error deleting vehicle:', err);
      setError('Failed to delete vehicle');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getVehicleTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'car':
        return '🚗';
      case 'motorcycle':
      case 'bike':
        return '🏍️';
      case 'truck':
        return '🚛';
      case 'bus':
        return '🚌';
      default:
        return '🚗';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading vehicles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="space-y-3 md:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-light tracking-tight">My Vehicles</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Manage your registered vehicles
            </p>
          </div>
          <Button
            onClick={fetchVehicles}
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-red-700 font-medium text-sm sm:text-base">{error}</p>
                <button
                  onClick={fetchVehicles}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Vehicle Button */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => navigate('/vehicles/add')}
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-black transition-all duration-200 font-medium shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Vehicle
          </button>
        </div>

          {/* Vehicles Grid */}
          {vehicles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {vehicles.map((vehicle) => (
                <div key={vehicle.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-200">
                  {/* Header with vehicle type icon and actions */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center text-xl sm:text-2xl flex-shrink-0 shadow-sm">
                        {getVehicleTypeIcon(vehicle.vehicle_type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-gray-900 text-lg sm:text-xl truncate">
                          {vehicle.vehicle_number || vehicle.license_plate}
                        </h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </span>
                          <span className="text-sm text-gray-600 capitalize">
                            {vehicle.vehicle_type || 'Vehicle'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-1 sm:space-x-2 ml-2">
                      <button
                        onClick={() => navigate(`/vehicles/edit/${vehicle.id}`)}
                        className="p-2 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        title="Edit vehicle"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteVehicle(vehicle.id)}
                        className="p-2 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Delete vehicle"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Vehicle Details */}
                  <div className="space-y-3">
                    {/* Device ID */}
                    {vehicle.device_id && (
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Wifi className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-500 font-medium">Device ID</p>
                          <p className="text-sm font-mono text-gray-900 truncate">{vehicle.device_id}</p>
                        </div>
                      </div>
                    )}

                    {/* Vehicle Info Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {vehicle.make && (
                        <div className="flex items-center space-x-2">
                          <Wrench className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Make</p>
                            <p className="text-sm font-medium text-gray-900">{vehicle.make}</p>
                          </div>
                        </div>
                      )}
                      {vehicle.model && (
                        <div className="flex items-center space-x-2">
                          <Hash className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Model</p>
                            <p className="text-sm font-medium text-gray-900">{vehicle.model}</p>
                          </div>
                        </div>
                      )}
                      {vehicle.year && (
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Year</p>
                            <p className="text-sm font-medium text-gray-900">{vehicle.year}</p>
                          </div>
                        </div>
                      )}
                      {vehicle.color && (
                        <div className="flex items-center space-x-2">
                          <Palette className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Color</p>
                            <p className="text-sm font-medium text-gray-900 capitalize">{vehicle.color}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer with registration date */}
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-gray-500">
                          <Calendar className="w-4 h-4" />
                          <span className="text-xs">Registered {formatDate(vehicle.created_at)}</span>
                        </div>
                        <div className="text-xs text-gray-400">
                          ID: {vehicle.id}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 sm:py-16 px-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Car className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">No vehicles found</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto text-sm sm:text-base">
                You haven't added any vehicles yet. Add your first vehicle to get started with toll management.
              </p>
              <button
                onClick={() => navigate('/vehicles/add')}
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-black transition-all duration-200 font-medium"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Your First Vehicle
              </button>
            </div>
          )}
      </div>
    </div>
  );
};

export default Vehicles;