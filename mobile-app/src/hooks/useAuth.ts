import { useCallback } from 'react';
import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const { user, isAuthenticated, token, logout, updateUser } = useAuthStore();

  const refetchUser = useCallback(async () => {
    // In a real app, would fetch fresh user data from API
    console.log('Refetching user data');
  }, []);

  return {
    user,
    isAuthenticated,
    token,
    logout,
    updateUser,
    refetchUser,
  };
};
