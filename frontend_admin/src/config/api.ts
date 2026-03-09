// API Configuration for Admin Panel
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

export const API_ENDPOINTS = {
  admin: {
    login: `${API_BASE_URL}/admin/login`,
    verify: `${API_BASE_URL}/admin/verify`,
    analytics: `${API_BASE_URL}/admin/analytics`,
    users: `${API_BASE_URL}/admin/search/users`,
    vehicles: `${API_BASE_URL}/admin/search/vehicles`,
    transactions: `${API_BASE_URL}/admin/search/transactions`,
    vehicleRates: `${API_BASE_URL}/admin/vehicle-rates`,
    vehicleTypes: `${API_BASE_URL}/admin/vehicle-types`,
    updateUser: (userId: string) => `${API_BASE_URL}/admin/users/${userId}`,
  },
};

export default API_BASE_URL;