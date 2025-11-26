import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/Dashboard';
import OfficerDashboard from './pages/OfficerDashboard';

// Role-based protected route component
const RoleProtectedRoute = ({ children, allowedRoles }) => {
    const { user } = useAuth();
    
    if (!user) {
        return <Navigate to="/auth/login" replace />;
    }
    
    if (!allowedRoles.includes(user.role)) {
        return <Navigate to={user.role === 'OFFICER' ? '/officer/dashboard' : '/dashboard'} replace />;
    }
    
    return children;
};

const AppRoutes = () => {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/auth/login" replace />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <RoleProtectedRoute allowedRoles={['CITIZEN']}>
                <Dashboard />
              </RoleProtectedRoute>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/officer/dashboard" 
          element={
            <ProtectedRoute>
              <RoleProtectedRoute allowedRoles={['OFFICER', 'ADMIN']}>
                <OfficerDashboard />
              </RoleProtectedRoute>
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
};

export default App;