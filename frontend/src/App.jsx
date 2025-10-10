import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppLayout } from './components/Layout';
import ProtectedRoute from './pages/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Wallet from './pages/Wallet';
import Recharge from './pages/Recharge';
import History from './pages/History';
import Vehicles from './pages/Vehicles';
import AddVehicle from './pages/AddVehicle';
import EditVehicle from './pages/EditVehicle';
import Profile from './pages/Profile';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-background text-foreground">
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              
              {/* Protected routes with sidebar layout */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/wallet" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Wallet />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/recharge" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Recharge />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/history" element={
                <ProtectedRoute>
                  <AppLayout>
                    <History />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/vehicles" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Vehicles />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/vehicles/add" element={
                <ProtectedRoute>
                  <AppLayout>
                    <AddVehicle />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/vehicles/edit/:id" element={
                <ProtectedRoute>
                  <AppLayout>
                    <EditVehicle />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/profile" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Profile />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              {/* Catch all - redirect to dashboard */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
