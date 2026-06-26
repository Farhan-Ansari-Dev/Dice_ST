import React from 'react';
import { useAuth } from '../../hooks/useAuth'; // adjust import path as needed
import { Navigate, useLocation } from 'react-router-dom';
import { toast } from '../../store/toastStore';

/**
 * Higher‑order component that restricts access to a set of roles.
 * If the user does not have one of the allowed roles, they are redirected
 * to the login page (or any fallback) and a toast is shown.
 */
export function RequireRoles({ allowedRoles, children }: { allowedRoles: string[]; children: React.ReactNode }) {
  const auth = useAuth();
  const location = useLocation();

  if (!auth.user) {
    // Not logged in – send to login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(auth.user.role)) {
    toast.error('You do not have permission to view this page');
    // Optionally redirect to a safe page
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
