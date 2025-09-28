import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/config';
import ThemeSelector from '../components/ThemeSelector';
import { Plus, Car, Edit, Trash2, RefreshCw } from 'lucide-react';

const Vehicles = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_ENDPOINTS.apiBaseUrl}/vehicles/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
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
  };

  const handleDeleteVehicle = async (vehicleId) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) {
      return;
    }

    try {
      const response = await fetch(`${API_ENDPOINTS.apiBaseUrl}/vehicles/${vehicleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setVehicles(vehicles.filter(vehicle => vehicle.id !== vehicleId));
      } else {
        setError('Failed to delete vehicle');
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
              <h1 className="text-2xl font-bold text-foreground">My Vehicles</h1>
              <p className="text-sm text-muted-foreground">Manage your registered vehicles</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={fetchVehicles}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
              title="Refresh vehicles"
            >
              <RefreshCw className={`w-4 h-4 text-foreground ${loading ? 'animate-spin' : ''}`} />
            </button>
            <ThemeSelector />
            <div className="text-sm text-muted-foreground">
              Welcome, <span className="font-medium">{user?.name || user?.firstName}!</span>
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
              onClick={fetchVehicles}
              className="mt-2 text-sm text-destructive hover:text-destructive/80 underline"
            >
              Try again
            </button>
          </div>
        )}

        <div className="max-w-6xl mx-auto">
          {/* Add Vehicle Button */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/vehicles/add')}
              className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all duration-200 font-medium shadow-sm"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add New Vehicle
            </button>
          </div>

          {/* Vehicles Grid */}
          {vehicles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.map((vehicle) => (
                <div key={vehicle.id} className="bg-card rounded-2xl shadow-sm border border-border p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-2xl">
                        {getVehicleTypeIcon(vehicle.vehicle_type)}
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground text-lg">
                          {vehicle.license_plate}
                        </h3>
                        <p className="text-sm text-muted-foreground capitalize">
                          {vehicle.vehicle_type || 'Vehicle'}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigate(`/vehicles/edit/${vehicle.id}`)}
                        className="p-2 rounded-lg hover:bg-accent transition-colors"
                        title="Edit vehicle"
                      >
                        <Edit className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => handleDeleteVehicle(vehicle.id)}
                        className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                        title="Delete vehicle"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {vehicle.make && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Make</span>
                        <span className="text-sm font-medium text-foreground">{vehicle.make}</span>
                      </div>
                    )}
                    {vehicle.model && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Model</span>
                        <span className="text-sm font-medium text-foreground">{vehicle.model}</span>
                      </div>
                    )}
                    {vehicle.year && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Year</span>
                        <span className="text-sm font-medium text-foreground">{vehicle.year}</span>
                      </div>
                    )}
                    {vehicle.color && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Color</span>
                        <span className="text-sm font-medium text-foreground capitalize">{vehicle.color}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-border">
                      <span className="text-sm text-muted-foreground">Added</span>
                      <span className="text-sm font-medium text-foreground">
                        {formatDate(vehicle.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Car className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">No vehicles found</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                You haven't added any vehicles yet. Add your first vehicle to get started with toll management.
              </p>
              <button
                onClick={() => navigate('/vehicles/add')}
                className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all duration-200 font-medium"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Your First Vehicle
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Vehicles;