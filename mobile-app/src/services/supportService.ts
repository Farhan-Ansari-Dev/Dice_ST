/**
 * Support tickets and live chat.
 *
 * Live chat and tickets are one conversation: a chat is a ticket with
 * source='live_chat'. Messages persist server-side and reach the Admin Panel,
 * replacing the previous local-only message array that went nowhere.
 */
import api from './api';
import socketService from './socketService';

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface TicketMessage {
  _id: string;
  ticket_id: string;
  sender_id: { _id: string; name: string; email?: string; role?: string } | string;
  sender_role: 'user' | 'staff';
  body: string;
  attachments: Array<{ name: string; url: string; mime?: string }>;
  read_by: string[];
  created_at: string;
}

export interface SupportTicket {
  _id: string;
  ticket_number: string;
  subject: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: TicketStatus;
  source: 'support_center' | 'live_chat';
  created_at: string;
  updated_at: string;
  messageCount?: number;
  unreadCount?: number;
  lastMessage?: { body: string; at: string } | null;
}

const supportService = {
  createTicket: async (input: {
    subject: string; description: string;
    category?: string; priority?: string;
    source?: 'support_center' | 'live_chat';
  }): Promise<SupportTicket> => {
    const res = await api.post<{ success: boolean; data: SupportTicket }>('/support-tickets', input);
    return res.data;
  },

  myTickets: async (): Promise<SupportTicket[]> => {
    const res = await api.get<{ success: boolean; data: SupportTicket[] }>('/support-tickets/mine');
    return Array.isArray(res.data) ? res.data : [];
  },

  getTicket: async (id: string): Promise<SupportTicket> => {
    const res = await api.get<{ success: boolean; data: SupportTicket }>(`/support-tickets/${id}`);
    return res.data;
  },

  getMessages: async (ticketId: string): Promise<TicketMessage[]> => {
    const res = await api.get<{ success: boolean; data: TicketMessage[] }>(`/support-tickets/${ticketId}/messages`);
    return Array.isArray(res.data) ? res.data : [];
  },

  sendMessage: async (ticketId: string, body: string): Promise<TicketMessage> => {
    const res = await api.post<{ success: boolean; data: TicketMessage }>(`/support-tickets/${ticketId}/messages`, { body });
    return res.data;
  },

  markRead: (ticketId: string) =>
    api.post<{ success: boolean }>(`/support-tickets/${ticketId}/read`, {}),

  // ── Realtime ──────────────────────────────────────────────────────────────
  joinTicket: (ticketId: string) => socketService.emit('join_ticket', ticketId),
  leaveTicket: (ticketId: string) => socketService.emit('leave_ticket', ticketId),
  sendTyping: (ticketId: string, userId: string, name?: string) =>
    socketService.emit('ticket:typing', { ticketId, userId, name }),

  onMessage: (cb: (m: TicketMessage) => void) => socketService.on('ticket:message', cb),
  onTyping: (cb: (p: { ticketId: string; userId: string; name?: string }) => void) =>
    socketService.on('ticket:typing', cb),
  onRead: (cb: (p: { ticketId: string; userId: string }) => void) =>
    socketService.on('ticket:read', cb),
  off: (event: string, cb?: (...args: any[]) => void) => socketService.off(event, cb),
};

export default supportService;
