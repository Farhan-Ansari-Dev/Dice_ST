import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, STORAGE_KEYS } from '../utils/constants';

class ApiService {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN).catch(() => null);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(this.client(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
            if (!refreshToken) {
              // No refresh token stored — the session cannot be recovered.
              throw Object.assign(new Error('no_refresh_token'), { response: { status: 401 } });
            }
            const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
            const newToken = data.accessToken;
            if (data.refreshToken) {
              await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
            }
            await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, newToken);
            this.refreshSubscribers.forEach((cb) => cb(newToken));
            this.refreshSubscribers = [];
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            this.refreshSubscribers = [];
            // Only a definitive auth failure (invalid/revoked/absent refresh token)
            // means the session is unrecoverable. On a transient error (offline /
            // 5xx) keep the session so an online retry can still succeed.
            const status = (refreshError as any)?.response?.status;
            if (status === 401 || status === 403) {
              // Reset ALL auth state and route back to Login. Previously only the
              // access token was deleted, leaving the app "authenticated" with a dead
              // token — a silent 401 loop with no way back to Login (P1). Loaded
              // lazily to avoid the api → authService → authStore import cycle.
              try {
                const { useAuthStore } = await import('../store/authStore');
                await useAuthStore.getState().logout();
              } catch {
                await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN).catch(() => {});
                await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN).catch(() => {});
                await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA).catch(() => {});
              }
            }
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  async uploadFile<T>(url: string, formData: FormData, onProgress?: (progress: number) => void): Promise<T> {
    const response = await this.client.post<T>(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        }
      },
    });
    return response.data;
  }
}

export const api = new ApiService();
export default api;
