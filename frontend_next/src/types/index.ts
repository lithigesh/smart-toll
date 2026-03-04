export interface User {
  id: string | number;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  created_at?: string;
}

export interface Vehicle {
  id: string | number;
  vehicle_number?: string;
  license_plate?: string;
  vehicle_type: string;
  device_id?: string;
  make?: string;
  model?: string;
  year?: number | string;
  color?: string;
  created_at: string;
}

export interface TollTransaction {
  id: string | number;
  device_id: string;
  vehicle_number?: string;
  distance_km: string | number;
  toll_amount: string | number;
  status: 'success' | 'failed' | 'processing';
  start_lat?: string | number;
  start_lon?: string | number;
  end_lat?: string | number;
  end_lon?: string | number;
  timestamp?: string;
  device_timestamp?: string;
  created_at?: string;
}

export interface Recharge {
  id: string | number;
  amount: string | number;
  status: 'paid' | 'pending' | 'failed';
  razorpay_order_id: string;
  created_at: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (userData: {
    name: string;
    email: string;
    password: string;
  }) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string>;
  updateProfile: (profileData: Partial<User>) => Promise<{ success: boolean; user?: User; error?: string }>;
  isAuthenticated: boolean;
}

export interface ThemeContextType {
  theme: 'light';
  toggleTheme: () => void;
  isDark: boolean;
  isLight: boolean;
}

export type VehicleFormData = {
  license_plate: string;
  vehicle_type: string;
  device_id: string;
  make: string;
  model: string;
  year: string;
  color: string;
};
