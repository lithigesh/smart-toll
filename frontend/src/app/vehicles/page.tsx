'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { API_ENDPOINTS } from '@/config/config';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AppLayout } from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Vehicle } from '@/types';
import { Plus, Car, Edit, Trash2, RefreshCw, Wifi, Calendar, CheckCircle, X } from 'lucide-react';

interface FormData {
  license_plate: string;
  device_id: string;
  vehicle_type: string;
}

const EMPTY_FORM: FormData = { license_plate: '', device_id: '', vehicle_type: 'Car' };

const VEHICLE_TYPES = ['Car', 'Bike', 'Truck', 'Bus'];

function getVehicleTypeIcon(type?: string) {
  switch (type?.toLowerCase()) {
    case 'car': return '\u{1F697}';
    case 'motorcycle': case 'bike': return '\u{1F3CD}';
    case 'truck': return '\u{1F69B}';
    case 'bus': return '\u{1F68C}';
    default: return '\u{1F697}';
  }
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface VehicleModalProps {
  mode: 'add' | 'edit';
  initialData?: FormData;
  vehicleId?: string | number;
  token: string | null;
  onClose: () => void;
  onSaved: () => void;
}

function VehicleModal({ mode, initialData = EMPTY_FORM, vehicleId, token, onClose, onSaved }: VehicleModalProps) {
  const [formData, setFormData] = useState<FormData>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.license_plate.trim()) { setError('License plate is required'); return; }
    if (!formData.device_id.trim()) { setError('Device ID is required'); return; }

    setLoading(true);
    setError('');

    try {
      const url = mode === 'add'
        ? API_ENDPOINTS.vehicles.add
        : `${API_ENDPOINTS.vehicles.update}/${vehicleId}`;

      const response = await fetch(url, {
        method: mode === 'add' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          license_plate: formData.license_plate.trim().toUpperCase(),
          device_id: formData.device_id.trim(),
          vehicle_type: formData.vehicle_type,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        onSaved();
      } else {
        setError(data.error || data.message || `Failed to ${mode === 'add' ? 'add' : 'update'} vehicle`);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center">
              <Car className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">{mode === 'add' ? 'Add Vehicle' : 'Edit Vehicle'}</h2>
              <p className="text-xs text-gray-500">{mode === 'add' ? 'Register a new vehicle' : 'Update vehicle details'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
            )}

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                License Plate <span className="text-red-500">*</span>
              </label>
              <Input
                name="license_plate"
                value={formData.license_plate}
                onChange={handleChange}
                placeholder="e.g., MH12AB1234"
                required
                className="uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">
                Device ID <span className="text-red-500">*</span>
              </label>
              <Input
                name="device_id"
                value={formData.device_id}
                onChange={handleChange}
                placeholder="e.g., A4:C3:F0:1B:9E:7D"
                required
              />
              <p className="text-xs text-gray-400">MAC address of the ESP32 device (found on the device label)</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Vehicle Type</label>
              <select
                name="vehicle_type"
                value={formData.vehicle_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
              >
                {VEHICLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex gap-3">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {mode === 'add' ? 'Adding…' : 'Saving…'}
                </span>
              ) : (
                mode === 'add' ? 'Add Vehicle' : 'Save Changes'
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VehiclesPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <VehiclesContent />
      </AppLayout>
    </ProtectedRoute>
  );
}

function VehiclesContent() {
  const { token } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<null | 'add' | Vehicle>(null);

  const fetchVehicles = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(API_ENDPOINTS.vehicles.list, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        setVehicles(data.vehicles || []);
      } else {
        setError(`Failed to fetch vehicles: ${response.status}`);
      }
    } catch {
      setError('Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const handleDelete = async (vehicleId: string | number) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;
    try {
      const response = await fetch(`${API_ENDPOINTS.vehicles.delete}/${vehicleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        setVehicles(prev => prev.filter(v => v.id !== vehicleId));
      } else {
        setError('Failed to delete vehicle');
      }
    } catch {
      setError('Failed to delete vehicle');
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });

  const editInitialData = (v: Vehicle): FormData => ({
    license_plate: v.vehicle_number || v.license_plate || '',
    device_id: v.device_id || '',
    vehicle_type: v.vehicle_type || 'Car',
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Loading vehicles...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-light tracking-tight">My Vehicles</h1>
            <p className="text-sm md:text-base text-gray-500 mt-1">Manage your registered vehicles</p>
          </div>
          <Button onClick={fetchVehicles} disabled={loading} variant="outline" className="flex items-center gap-2 w-full sm:w-auto">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-red-700 font-medium text-sm">{error}</p>
                <button onClick={fetchVehicles} className="mt-1 text-sm text-red-600 hover:text-red-800 underline">Try again</button>
              </div>
            </div>
          </div>
        )}

        {/* Add button */}
        <div>
          <button
            onClick={() => setModal('add')}
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-black transition-all duration-200 font-medium shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add New Vehicle
          </button>
        </div>

        {/* Grid */}
        {vehicles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-200">
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
                        <span className="text-sm text-gray-600 capitalize">{vehicle.vehicle_type || 'Vehicle'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-1 ml-2">
                    <button
                      onClick={() => setModal(vehicle)}
                      className="p-2 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      title="Edit vehicle"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(vehicle.id)}
                      className="p-2 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Delete vehicle"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {vehicle.device_id && (
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <Wifi className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-500 font-medium">Device ID</p>
                        <p className="text-sm font-mono text-gray-900 truncate">{vehicle.device_id}</p>
                      </div>
                    </div>
                  )}
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span className="text-xs">Registered {formatDate(vehicle.created_at)}</span>
                      </div>
                      <div className="text-xs text-gray-400">ID: {vehicle.id}</div>
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
              You haven&apos;t added any vehicles yet. Add your first vehicle to get started with toll management.
            </p>
            <button
              onClick={() => setModal('add')}
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-black transition-all duration-200 font-medium"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Your First Vehicle
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal === 'add' && (
        <VehicleModal
          mode="add"
          token={token}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchVehicles(); }}
        />
      )}
      {modal !== null && modal !== 'add' && (
        <VehicleModal
          mode="edit"
          initialData={editInitialData(modal as Vehicle)}
          vehicleId={(modal as Vehicle).id}
          token={token}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); fetchVehicles(); }}
        />
      )}
    </>
  );
}
