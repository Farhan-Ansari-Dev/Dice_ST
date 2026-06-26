import { Schema, model, Document, Types } from 'mongoose';

export type PaymentStatus =
  | 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded' | 'partially_refunded';

export interface IPayment extends Document {
  org_id: Types.ObjectId;
  user_id: Types.ObjectId;

  // What this payment is for
  application_id?: Types.ObjectId;
  certification_id?: Types.ObjectId;
  description: string;
  purpose: 'application_fee' | 'expedited_fee' | 'renewal_fee' | 'subscription' | 'other';

  // Amounts (always in paise — smallest unit — to avoid float rounding)
  amount_paise: number;
  currency: 'INR' | 'USD' | 'AED' | 'EUR';
  
  // Breakdown
  consultancy_fee_paise?: number;
  gov_fee_paise?: number;
  lab_fee_paise?: number;
  tax_rate?: number; // e.g. 18 for GST, 0 for TDS/Intl
  
  tax_amount_paise: number;
  total_paise: number;

  status: PaymentStatus;

  // Razorpay
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  razorpay_refund_id?: string;
  method?: string;                        // "card", "upi", "netbanking", etc.

  // Reconciliation
  captured_at?: Date;
  failed_reason?: string;
  refunded_paise?: number;
  refunded_at?: Date;

  // Invoice
  invoice_number?: string;
  invoice_url?: string;                   // S3 key

  // Metadata
  metadata: Record<string, any>;
  ip?: string;

  created_at: Date;
  updated_at: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    org_id:  { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    application_id:   { type: Schema.Types.ObjectId, ref: 'Application', index: true },
    certification_id: { type: Schema.Types.ObjectId, ref: 'Certification' },
    description:      { type: String, required: true },
    purpose:          { type: String, enum: ['application_fee', 'expedited_fee', 'renewal_fee', 'subscription', 'other'], required: true, index: true },

    amount_paise: { type: Number, required: true },
    currency: { type: String, enum: ['INR', 'USD', 'AED', 'EUR'], required: true, default: 'INR' },
    
    consultancy_fee_paise: { type: Number },
    gov_fee_paise: { type: Number },
    lab_fee_paise: { type: Number },
    tax_rate: { type: Number },
    
    tax_amount_paise: { type: Number, required: true, default: 0 },
    total_paise: { type: Number, required: true },

    status: { type: String, enum: ['pending', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded'], default: 'pending', index: true },

    razorpay_order_id:   { type: String, unique: true, sparse: true },
    razorpay_payment_id: { type: String, sparse: true, index: true },
    razorpay_signature:  String,
    razorpay_refund_id:  String,
    method:              String,

    captured_at:    Date,
    failed_reason:  String,
    refunded_paise: Number,
    refunded_at:    Date,

    invoice_number: { type: String, unique: true, sparse: true },
    invoice_url:    String,

    metadata: { type: Schema.Types.Mixed, default: {} },
    ip:       String,
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

PaymentSchema.index({ org_id: 1, status: 1, created_at: -1 });
PaymentSchema.index({ application_id: 1, status: 1 });

export const Payment = model<IPayment>('Payment', PaymentSchema);
