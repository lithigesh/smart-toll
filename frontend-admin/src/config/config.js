const API_BASE_URL = 'http://localhost:5000';

export const API_ENDPOINTS = {
  admin: {
    login: `${API_BASE_URL}/api/admin/login`,
    analytics: `${API_BASE_URL}/api/admin/analytics`,
    searchUsers: `${API_BASE_URL}/api/admin/search/users`,
    searchVehicles: `${API_BASE_URL}/api/admin/search/vehicles`,
    searchTransactions: `${API_BASE_URL}/api/admin/search/transactions`
  }
};

export default API_BASE_URL;