import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, AppRole } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: AppRole;
  adminOnly?: boolean;
}

export function ProtectedRoute({ children, requiredRole, adminOnly }: ProtectedRouteProps) {
  const { isAuthenticated, loading, user, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check for admin-only routes
  if (adminOnly && !isAdmin) {
    return <Navigate to="/pos" replace />;
  }

  // Check for specific role requirement
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/pos" replace />;
  }

  return <>{children}</>;
}
