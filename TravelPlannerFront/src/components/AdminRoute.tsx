import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rust"></div>
      </div>
    );
  }

  if (!user || !isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};