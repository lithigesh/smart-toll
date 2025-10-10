import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, useParams } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/config';
import { Save, X, Car } from 'lucide-react';

const EditVehicle = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [fetchingVehicle, setFetchingVehicle] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    license_plate: '',
    vehicle_type: 'Car',
    device_id: '',
    make: '',
    model: '',
    year: '',
    color: ''
  });

  const vehicleTypes = [
    { value: 'Car', label: 'Car', icon: '🚗' },
    { value: 'Bike', label: 'Bike', icon: '🏍️' },
    { value: 'Truck', label: 'Truck', icon: '🚛' },
    { value: 'Bus', label: 'Bus', icon: '🚌' }
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 30 }, (_, i) => currentYear - i);

  const fetchVehicleDetails = useCallback(async () => {
    try {
      setFetchingVehicle(true);
      setError('');

      const response = await fetch(`${API_ENDPOINTS.vehicles.details}/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const vehicle = data.vehicle;
        
        setFormData({
          license_plate: vehicle.vehicle_number || vehicle.license_plate || '',
          vehicle_type: vehicle.vehicle_type || 'Car',
          device_id: vehicle.device_id || '',
          make: vehicle.make || '',
          model: vehicle.model || '',
          year: vehicle.year ? vehicle.year.toString() : '',
          color: vehicle.color || ''
        });
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to fetch vehicle details');
      }
    } catch (err) {
      console.error('Error fetching vehicle:', err);
      setError('Failed to load vehicle details');
    } finally {
      setFetchingVehicle(false);
    }
  }, [id, token]);

  useEffect(() => {
    fetchVehicleDetails();
  }, [fetchVehicleDetails]);

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

    if (!formData.device_id.trim()) {
      setError('Device ID is required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const requestData = {
        license_plate: formData.license_plate.toUpperCase().trim(),
        vehicle_type: formData.vehicle_type,
        device_id: formData.device_id.trim(),
        make: formData.make || null,
        model: formData.model || null,
        year: formData.year ? parseInt(formData.year) : null,
        color: formData.color || null
      };

      console.log('Updating vehicle:', requestData);

      const response = await fetch(`${API_ENDPOINTS.vehicles.update}/${id}`, {
        method: 'PUT',
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
        setError(errorData.message || errorData.error || 'Failed to update vehicle');
      }
    } catch (err) {
      console.error('Error updating vehicle:', err);
      setError(err.message || 'Network error - please check if the server is running');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingVehicle) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-border mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading vehicle details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/vehicles')}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="Go back"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Edit Vehicle</h1>
          <p className="text-gray-600 mt-1">Update your vehicle information</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-2">
                <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 font-medium text-sm sm:text-base">{error}</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Car className="w-5 h-5 text-gray-900" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Vehicle Information</h2>
                  <p className="text-sm text-gray-600 hidden sm:block">Update the details for your vehicle</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* License Plate - Required */}
              <div>
                <label htmlFor="license_plate" className="block text-sm font-medium text-gray-900 mb-2">
                  License Plate *
                </label>
                <input
                  type="text"
                  id="license_plate"
                  name="license_plate"
                  value={formData.license_plate}
                  onChange={handleInputChange}
                  placeholder="e.g., TN01AB1234"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors"
                  required
                />
              </div>

              {/* Device ID - Required */}
              <div>
                <label htmlFor="device_id" className="block text-sm font-medium text-gray-900 mb-2">
                  Device ID *
                </label>
                <input
                  type="text"
                  id="device_id"
                  name="device_id"
                  value={formData.device_id}
                  onChange={handleInputChange}
                  placeholder="e.g., ESP32_001, DEVICE_ABC123"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the unique ID of your ESP32 toll device
                </p>
              </div>

              {/* Vehicle Type */}
              <div>
                <label htmlFor="vehicle_type" className="block text-sm font-medium text-gray-900 mb-2">
                  Vehicle Type
                </label>
                <select
                  id="vehicle_type"
                  name="vehicle_type"
                  value={formData.vehicle_type}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors"
                >
                  {vehicleTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Make and Model */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="make" className="block text-sm font-medium text-gray-900 mb-2">
                    Make
                  </label>
                  <input
                    type="text"
                    id="make"
                    name="make"
                    value={formData.make}
                    onChange={handleInputChange}
                    placeholder="e.g., Honda, Toyota, Ford"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="model" className="block text-sm font-medium text-gray-900 mb-2">
                    Model
                  </label>
                  <input
                    type="text"
                    id="model"
                    name="model"
                    value={formData.model}
                    onChange={handleInputChange}
                    placeholder="e.g., Civic, Camry, Focus"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors"
                  />
                </div>
              </div>

              {/* Year and Color */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="year" className="block text-sm font-medium text-gray-900 mb-2">
                    Year
                  </label>
                  <select
                    id="year"
                    name="year"
                    value={formData.year}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors"
                  >
                    <option value="">Select Year</option>
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="color" className="block text-sm font-medium text-gray-900 mb-2">
                    Color
                  </label>
                  <input
                    type="text"
                    id="color"
                    name="color"
                    value={formData.color}
                    onChange={handleInputChange}
                    placeholder="e.g., Red, Blue, Black"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => navigate('/vehicles')}
                  className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors order-2 sm:order-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Updating...' : 'Update Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    
  );
};

export default EditVehicle;