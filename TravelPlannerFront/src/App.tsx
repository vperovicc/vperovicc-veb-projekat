import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { Layout } from './components/Layout';

// Core Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import { CreateTravelPlan } from './pages/CreateTravelPlan';
import { PlanDetail } from './pages/PlanDetail';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Gateways */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Core App Protected Routes nested within the custom layout frame */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Aligned route pattern to match Dashboard navigation selectors */}
          <Route path="/travel-plans/create" element={
            <ProtectedRoute>
              <Layout>
                <CreateTravelPlan />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Dynamic route path parsing specific expedition journal indices */}
          <Route path="/travel-plans/:id" element={
            <ProtectedRoute>
              <Layout>
                <PlanDetail />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Admin Restricted Matrix */}
          <Route path="/admin" element={
            <AdminRoute>
              <Layout>
                <div className="p-8 bg-parchment-dark border-2 border-sepia"><h2>Admin Control Deck</h2></div>
              </Layout>
            </AdminRoute>
          } />

          {/* Fallback routing logic */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;