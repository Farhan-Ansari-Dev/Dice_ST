import api from './api';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../utils/constants';

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  action_url?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

const notificationsService = {
  getAll: (params?: { page?: number; limit?: number; unread?: boolean }) =>
    api.get<{ data: Notification[]; pagination: any }>('/notifications', { params }),

  markRead: (id: string) =>
    api.put<{ message: string }>(`/notifications/${id}/read`),

  markAllRead: () =>
    api.put<{ message: string }>('/notifications/read-all'),

  delete: (id: string) =>
    api.delete<{ message: string }>(`/notifications/${id}`),

  registerPushToken: async (token: string, platform: 'ios' | 'android', appVersion?: string) => {
    const saved = await SecureStore.getItemAsync(STORAGE_KEYS.PUSH_TOKEN).catch(() => null);
    if (saved === token) return; // already registered (token unchanged)
    const result = await api.post<{ message: string }>('/notifications/push-tokens', { token, platform, appVersion });
    await SecureStore.setItemAsync(STORAGE_KEYS.PUSH_TOKEN, token);
    return result;
  },

  unregisterPushToken: async () => {
    const token = await SecureStore.getItemAsync(STORAGE_KEYS.PUSH_TOKEN).catch(() => null);
    if (!token) return;
    await api.delete(`/notifications/push-tokens/${encodeURIComponent(token)}`);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.PUSH_TOKEN);
  },
};

export default notificationsService;
