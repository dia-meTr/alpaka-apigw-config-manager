import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './components/MainLayout/MainLayout';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import ApiConfiguration from './pages/ApiConfiguration/ApiConfiguration';
import CreateApi from './pages/CreateApi/CreateApi';
import Approvals from './pages/Approvals/Approvals';
import ExecutionManagement from './pages/ExecutionManagement/ExecutionManagement';
import TeamsManagement from './pages/TeamsManagement/TeamsManagement';
import './App.css';

function Home() {
  return (
    <div className="app-content">
      <h2>Welcome to Alpaka</h2>
      <p>Select a team from the sidebar to view and manage APIs.</p>
      
      <div className="content-grid">
        <div className="content-card">
          <h3>Teams</h3>
          <p>Browse your teams and their APIs from the sidebar.</p>
        </div>
        <div className="content-card">
          <h3>APIs</h3>
          <p>Click on any API to view and edit its configuration.</p>
        </div>
        <div className="content-card">
          <h3>Create</h3>
          <p>Create new APIs for your team with the "Create API" option.</p>
        </div>
      </div>
    </div>
  );
}

// Redirect to home if already authenticated
function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        Loading...
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } 
      />
      <Route 
        path="/register" 
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        } 
      />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout>
              <Home />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/team/:teamId/api/create"
        element={
          <ProtectedRoute>
            <MainLayout>
              <CreateApi />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/team/:teamId/api/:apiId"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ApiConfiguration />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Super Manager routes */}
      <Route
        path="/approvals"
        element={
          <ProtectedRoute requiredRole="SuperManager">
            <MainLayout>
              <Approvals />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Gateway Editor routes */}
      <Route
        path="/execution"
        element={
          <ProtectedRoute requiredRole="GatewayEditor">
            <MainLayout>
              <ExecutionManagement />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teams"
        element={
          <ProtectedRoute requiredRole="GatewayEditor">
            <MainLayout>
              <TeamsManagement />
            </MainLayout>
          </ProtectedRoute>
        }
      />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
