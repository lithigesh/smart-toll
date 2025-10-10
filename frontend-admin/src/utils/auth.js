/**
 * Clear admin authentication data and redirect to login
 */
export const clearAdminAuth = () => {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');
  window.location.href = '/admin/login';
};

/**
 * Validate JWT token format (basic check)
 */
export const isValidJWTFormat = (token) => {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  return parts.length === 3;
};

/**
 * Handle API errors and auto-logout on auth issues
 */
export const handleApiError = (response, error) => {
  if (response && (response.status === 400 || response.status === 401)) {
    console.log('Authentication error detected, clearing tokens...');
    clearAdminAuth();
    return;
  }
  throw error;
};