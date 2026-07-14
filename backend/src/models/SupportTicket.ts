import { Document, model, Schema, Types } from 'mongoose';

export interface ISupportTicket extends Document {
  user_id: Types.ObjectId;
  org_id?: Types.ObjectId;
  ticket_number: string;
  subject: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  source: 'support_center' | 'live_chat';
  created_at: Date;
  updated_at: Date;
}

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    org_id: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    ticket_number: { type: String, required: true, unique: true, index: true },
    subject: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 4000 },
    category: { type: String, required: true },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open', index: true },
    source: { type: String, enum: ['support_center', 'live_chat'], required: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

SupportTicketSchema.index({ user_id: 1, created_at: -1 });

export const SupportTicket = model<ISupportTicket>('SupportTicket', SupportTicketSchema);
