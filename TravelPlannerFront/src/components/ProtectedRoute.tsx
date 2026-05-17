import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rust"></div>
      </div>
    );
  }

  if (!user) {
    // Redirect to login but save the current location to return to later
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};