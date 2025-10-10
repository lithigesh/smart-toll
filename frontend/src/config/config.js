// Environment configuration for ESP32-based Smart Toll System
const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
};

// API endpoints updated for ESP32 architecture
export const API_ENDPOINTS = {
  apiBaseUrl: config.apiBaseUrl,
  auth: {
    register: `${config.apiBaseUrl}/auth/register`,
    login: `${config.apiBaseUrl}/auth/login`,
    logout: `${config.apiBaseUrl}/auth/logout`,
    profile: `${config.apiBaseUrl}/auth/me`,
    updateProfile: `${config.apiBaseUrl}/auth/profile`,
    refresh: `${config.apiBaseUrl}/auth/refresh`,
    changePassword: `${config.apiBaseUrl}/auth/password`
  },
  wallet: {
    balance: `${config.apiBaseUrl}/wallet/balance`,
    transactions: `${config.apiBaseUrl}/wallet/transactions`,
    stats: `${config.apiBaseUrl}/wallet/stats`,
    lowBalanceAlert: `${config.apiBaseUrl}/wallet/low-balance-alert`
  },
  payment: {
    createOrder: `${config.apiBaseUrl}/payment/create-order`,
    verify: `${config.apiBaseUrl}/payment/verify`,
    history: `${config.apiBaseUrl}/payment/history`,
    details: `${config.apiBaseUrl}/payment`
  },
  vehicles: {
    list: `${config.apiBaseUrl}/vehicles/user`,
    add: `${config.apiBaseUrl}/vehicles`,
    update: `${config.apiBaseUrl}/vehicles`,
    delete: `${config.apiBaseUrl}/vehicles`,
    details: `${config.apiBaseUrl}/vehicles`
  },
  vehicle: {
    list: `${config.apiBaseUrl}/vehicles/user`,
    add: `${config.apiBaseUrl}/vehicles`,
    update: `${config.apiBaseUrl}/vehicles`,
    delete: `${config.apiBaseUrl}/vehicles`,
    details: `${config.apiBaseUrl}/vehicles`
  },
  esp32: {
    process: `${config.apiBaseUrl}/esp32-toll/process`,
    tollTransactions: `${config.apiBaseUrl}/esp32-toll/transactions`
  },
  health: `${config.apiBaseUrl}/../health`,
  home: config.apiBaseUrl.replace('/api', '/')
};

export default config;