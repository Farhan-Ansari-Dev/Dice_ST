import api from './api';

export interface Payment {
  id: string;
  application_id?: string;
  application_number?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'overdue';
  payment_method?: string;
  transaction_id?: string;
  invoice_number: string;
  description: string;
  paid_at?: string;
  created_at: string;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
}

const paymentsService = {
  getAll: (params?: { page?: number; limit?: number }) =>
    api.get<{ data: Payment[]; pagination: any }>('/payments', { params }),

  createOrder: (applicationId: string, amount: number, description: string) =>
    api.post<{ data: { order: RazorpayOrder; payment: Payment } }>('/payments/create-order', {
      application_id: applicationId,
      amount,
      description,
    }),

  verifyPayment: (orderId: string, paymentId: string, signature: string) =>
    api.post<{ data: Payment; message: string }>('/payments/verify', {
      order_id: orderId,
      payment_id: paymentId,
      signature,
    }),

  getInvoice: (id: string) =>
    api.get<{ data: Payment }>(`/payments/${id}/invoice`),

  getStats: () =>
    api.get<{ data: { total_paid: number; total_pending: number; monthly_trend: any[] } }>('/payments/stats'),
};

export default paymentsService;
