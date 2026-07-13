import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../utils/constants';
import { useNotificationStore } from '../store/notificationStore';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token: string) {
    if (this.socket?.connected) return;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('[Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (error: Error) => {
      console.warn('[Socket] Connection error:', error.message);
    });

    this.socket.on('notification', (data: any) => {
      const { addNotification } = useNotificationStore.getState();
      addNotification({
        id: data.id || Date.now().toString(),
        title: data.title,
        body: data.body,
        type: data.type || 'system',
        isRead: false,
        data: data.data,
        createdAt: new Date().toISOString(),
      });
    });

    this.socket.on('application:update', (data: any) => {
      console.log('[Socket] Application update:', data);
      // Trigger query invalidation through an event emitter or direct store update
    });

    this.socket.on('certification:update', (data: any) => {
      console.log('[Socket] Certification update:', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data?: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void) {
    this.socket?.off(event, callback);
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();
export default socketService;
