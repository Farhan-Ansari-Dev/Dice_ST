import api from './api';

export interface Payment {
  _id: string;
  application_id?: string;
  invoice_number?: string;
  description: string;
  total_paise: number;
  currency: string;
  status: 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded' | 'partially_refunded';
  method?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  invoice_url?: string;
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

  getById: (id: string) =>
    api.get<{ data: Payment }>(`/payments/${id}`),

  getInvoice: (id: string) =>
    api.get<{ data: Payment }>(`/payments/${id}/invoice`),

  // Backend returns { success, invoice_url } (a short-lived signed S3 link).
  getInvoiceUrl: (id: string) =>
    api.get<{ invoice_url: string }>(`/payments/${id}/invoice`),

  getStats: () =>
    api.get<{ data: { total_paid: number; total_pending: number; monthly_trend: any[] } }>('/payments/stats'),
};

export default paymentsService;
