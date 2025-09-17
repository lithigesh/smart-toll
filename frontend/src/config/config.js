// Environment configuration
const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
};

// API endpoints
export const API_ENDPOINTS = {
  auth: {
    register: `${config.apiBaseUrl}/auth/register`,
    login: `${config.apiBaseUrl}/auth/login`,
    logout: `${config.apiBaseUrl}/auth/logout`,
    profile: `${config.apiBaseUrl}/auth/profile`,
    refresh: `${config.apiBaseUrl}/auth/refresh`,
    changePassword: `${config.apiBaseUrl}/auth/change-password`
  },
  wallet: {
    balance: `${config.apiBaseUrl}/wallet/balance`,
    transactions: `${config.apiBaseUrl}/wallet/transactions`,
    dailySummary: `${config.apiBaseUrl}/wallet/daily-summary`,
    stats: `${config.apiBaseUrl}/wallet/stats`,
    lowBalanceAlert: `${config.apiBaseUrl}/wallet/low-balance-alert`
  },
  payment: {
    createOrder: `${config.apiBaseUrl}/payment/create-order`,
    verify: `${config.apiBaseUrl}/payment/verify`,
    history: `${config.apiBaseUrl}/payment/history`,
    details: `${config.apiBaseUrl}/payment`
  },
  tollPassages: {
    user: `${config.apiBaseUrl}/toll/passages/user`,
    vehicle: `${config.apiBaseUrl}/toll/passages/vehicle`,
    recent: `${config.apiBaseUrl}/toll/passages/recent`,
    stats: `${config.apiBaseUrl}/toll/passages/stats`
  },
  health: `${config.apiBaseUrl}/health`,
  home: config.apiBaseUrl.replace('/api', '/')
};

export default config;