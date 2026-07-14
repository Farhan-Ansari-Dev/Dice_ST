export class Expo {
  static isExpoPushToken(token: string): boolean {
    return typeof token === 'string' && token.startsWith('ExponentPushToken');
  }
  chunkPushNotifications(messages: any[]): any[][] {
    return [messages];
  }
  async sendPushNotificationsAsync(messages: any[]): Promise<any[]> {
    return messages.map(() => ({ status: 'ok', id: 'mock-receipt-id' }));
  }
}

export type ExpoPushMessage = {
  to: string | string[];
  title?: string;
  body?: string;
  data?: Record<string, any>;
};

export type ExpoPushTicket = {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
};
