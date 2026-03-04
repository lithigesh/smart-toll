// Environment configuration for ESP32-based Smart Toll System
const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

export const API_ENDPOINTS = {
  apiBaseUrl,
  auth: {
    register: `${apiBaseUrl}/auth/register`,
    login: `${apiBaseUrl}/auth/login`,
    logout: `${apiBaseUrl}/auth/logout`,
    profile: `${apiBaseUrl}/auth/me`,
    updateProfile: `${apiBaseUrl}/auth/profile`,
    refresh: `${apiBaseUrl}/auth/refresh`,
    changePassword: `${apiBaseUrl}/auth/password`,
  },
  wallet: {
    balance: `${apiBaseUrl}/wallet/balance`,
    transactions: `${apiBaseUrl}/wallet/transactions`,
    stats: `${apiBaseUrl}/wallet/stats`,
    lowBalanceAlert: `${apiBaseUrl}/wallet/low-balance-alert`,
  },
  payment: {
    createOrder: `${apiBaseUrl}/payment/create-order`,
    verify: `${apiBaseUrl}/payment/verify`,
    history: `${apiBaseUrl}/payment/history`,
    details: `${apiBaseUrl}/payment`,
  },
  vehicles: {
    list: `${apiBaseUrl}/vehicles/user`,
    add: `${apiBaseUrl}/vehicles`,
    update: `${apiBaseUrl}/vehicles`,
    delete: `${apiBaseUrl}/vehicles`,
    details: `${apiBaseUrl}/vehicles`,
  },
  vehicle: {
    list: `${apiBaseUrl}/vehicles/user`,
    add: `${apiBaseUrl}/vehicles`,
    update: `${apiBaseUrl}/vehicles`,
    delete: `${apiBaseUrl}/vehicles`,
    details: `${apiBaseUrl}/vehicles`,
  },
  esp32: {
    process: `${apiBaseUrl}/esp32-toll/process`,
    tollTransactions: `${apiBaseUrl}/esp32-toll/transactions`,
  },
  health: `${apiBaseUrl}/../health`,
  home: apiBaseUrl.replace('/api', '/'),
};

export default { apiBaseUrl };
