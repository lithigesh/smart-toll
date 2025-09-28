import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/config';
import ThemeSelector from '../components/ThemeSelector';
import { Save, X, Car } from 'lucide-react';

const AddVehicle = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    license_plate: '',
    vehicle_type: 'car',
    make: '',
    model: '',
    year: '',
    color: ''
  });

  const vehicleTypes = [
    { value: 'car', label: 'Car', icon: '🚗' },
    { value: 'motorcycle', label: 'Motorcycle', icon: '🏍️' },
    { value: 'truck', label: 'Truck', icon: '🚛' },
    { value: 'bus', label: 'Bus', icon: '🚌' },
    { value: 'suv', label: 'SUV', icon: '🚙' },
    { value: 'van', label: 'Van', icon: '🚐' }
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 30 }, (_, i) => currentYear - i);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.license_plate.trim()) {
      setError('License plate is required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const requestData = {
        ...formData,
        license_plate: formData.license_plate.toUpperCase().trim(),
        year: formData.year ? parseInt(formData.year) : null
      };

      console.log('Sending request to:', API_ENDPOINTS.vehicles.add);
      console.log('Request data:', requestData);

      const response = await fetch(API_ENDPOINTS.vehicles.add, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        navigate('/vehicles');
      } else {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        setError(errorData.message || errorData.error || 'Failed to add vehicle');
      }
    } catch (err) {
      console.error('Error adding vehicle:', err);
      setError(err.message || 'Network error - please check if the server is running');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/vehicles')}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
              title="Go back"
            >
              <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Add New Vehicle</h1>
              <p className="text-sm text-muted-foreground">Register a new vehicle to your account</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeSelector />
            <div className="text-sm text-muted-foreground">
              Welcome, <span className="font-medium">{user?.name || user?.firstName}!</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-2xl mx-auto">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-destructive font-medium">{error}</p>
              </div>
            </div>
          )}

          <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
            <div className="px-6 py-4 bg-muted border-b border-border">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Car className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Vehicle Information</h2>
                  <p className="text-sm text-muted-foreground">Fill in the details for your vehicle</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* License Plate - Required */}
              <div>
                <label htmlFor="license_plate" className="block text-sm font-medium text-foreground mb-2">
                  License Plate *
                </label>
                <input
                  type="text"
                  id="license_plate"
                  name="license_plate"
                  value={formData.license_plate}
                  onChange={handleInputChange}
                  placeholder="e.g., TN01AB1234"
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              {/* Vehicle Type */}
              <div>
                <label htmlFor="vehicle_type" className="block text-sm font-medium text-foreground mb-2">
                  Vehicle Type
                </label>
                <select
                  id="vehicle_type"
                  name="vehicle_type"
                  value={formData.vehicle_type}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {vehicleTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Make and Model */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="make" className="block text-sm font-medium text-foreground mb-2">
                    Make
                  </label>
                  <input
                    type="text"
                    id="make"
                    name="make"
                    value={formData.make}
                    onChange={handleInputChange}
                    placeholder="e.g., Honda, Toyota, Ford"
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="model" className="block text-sm font-medium text-foreground mb-2">
                    Model
                  </label>
                  <input
                    type="text"
                    id="model"
                    name="model"
                    value={formData.model}
                    onChange={handleInputChange}
                    placeholder="e.g., Civic, Camry, Focus"
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              {/* Year and Color */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="year" className="block text-sm font-medium text-foreground mb-2">
                    Year
                  </label>
                  <select
                    id="year"
                    name="year"
                    value={formData.year}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select Year</option>
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="color" className="block text-sm font-medium text-foreground mb-2">
                    Color
                  </label>
                  <input
                    type="text"
                    id="color"
                    name="color"
                    value={formData.color}
                    onChange={handleInputChange}
                    placeholder="e.g., Red, Blue, Black"
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-4 pt-6 border-t border-border">
                <button
                  type="button"
                  onClick={() => navigate('/vehicles')}
                  className="inline-flex items-center px-6 py-3 rounded-lg border border-border bg-background text-foreground hover:bg-accent transition-colors"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Adding...' : 'Add Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AddVehicle;