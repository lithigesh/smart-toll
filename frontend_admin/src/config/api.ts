// API Configuration for Admin Panel
const API_BASE_URL = process.env.NODE_ENV === 'development'
  ? (process.env.NEXT_PUBLIC_LOCAL_API_BASE_URL || 'http://localhost:5000/api')
  : (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api');

export const API_ENDPOINTS = {
  admin: {
    login: `${API_BASE_URL}/admin/login`,
    verify: `${API_BASE_URL}/admin/verify`,
    analytics: `${API_BASE_URL}/admin/analytics`,
    users: `${API_BASE_URL}/admin/search/users`,
    userDetails: (userId: string) => `${API_BASE_URL}/admin/users/${userId}`,
    vehicles: `${API_BASE_URL}/admin/search/vehicles`,
    transactions: `${API_BASE_URL}/admin/search/transactions`,
    tollZones: `${API_BASE_URL}/admin/toll-zones`,
    vehicleRates: `${API_BASE_URL}/admin/vehicle-rates`,
    vehicleTypes: `${API_BASE_URL}/admin/vehicle-types`,
    updateUser: (userId: string) => `${API_BASE_URL}/admin/users/${userId}`,
    deleteUser: (userId: string) => `${API_BASE_URL}/admin/users/${userId}`,
    deleteVehicle: (vehicleId: string) => `${API_BASE_URL}/admin/search/vehicles/${vehicleId}`,
    deleteTransaction: (txId: string) => `${API_BASE_URL}/admin/search/transactions/${txId}`,
    updateTollZone: (zoneId: string | number) => `${API_BASE_URL}/admin/toll-zones/${zoneId}`,
    deleteTollZone: (zoneId: string | number) => `${API_BASE_URL}/admin/toll-zones/${zoneId}`,
  },
};

export default API_BASE_URL;