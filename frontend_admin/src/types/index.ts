// Admin Types
export interface Admin {
  username: string;
  role: 'admin';
}

export interface AuthState {
  admin: Admin | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// User Types
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

// Vehicle Types
export interface Vehicle {
  id: string;
  user_id: string;
  vehicle_number: string;
  vehicle_type: string;
  vehicle_name?: string;
  rfid_tag?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user?: User;
}

// Transaction Types (Toll Deductions)
export interface Transaction {
  id: string;
  user_id: string;
  vehicle_id: string;
  amount: number;
  type: 'toll' | 'toll_payment';
  status: 'pending' | 'completed' | 'failed';
  description?: string;
  toll_location?: string;
  distance_km?: number;
  created_at: string;
  user?: User;
  vehicle?: Vehicle;
}

// Toll Transaction Types
export interface TollTransaction {
  id: string;
  vehicle_id: string;
  toll_amount: number;
  toll_location?: string;
  entry_time?: string;
  exit_time?: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  vehicle?: Vehicle;
}

// Analytics Types
export interface Analytics {
  totalUsers: number;
  totalVehicles: number;
  totalTransactions: number;
  totalRevenue: number;
  recentTransactions: Transaction[];
  recentUsers: User[];
}

// Vehicle Type Rate
export interface VehicleTypeRate {
  id: string;
  vehicle_type: string;
  rate: number;
  description?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
