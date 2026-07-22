/**
 * A message on a support ticket.
 *
 * Live chat and support tickets are the same conversation: a chat is a ticket
 * with source='live_chat'. Keeping messages in their own collection (rather
 * than an array on the ticket) keeps ticket documents small and lets a long
 * conversation paginate.
 */
import { Document, model, Schema, Types } from 'mongoose';

export interface ITicketMessage extends Document {
  ticket_id: Types.ObjectId;
  sender_id: Types.ObjectId;
  /** 'user' = the customer, 'staff' = admin/employee/support. */
  sender_role: 'user' | 'staff';
  body: string;
  attachments: Array<{ name: string; url: string; mime?: string; size_bytes?: number }>;
  /** Users who have seen this message — drives unread counts and read receipts. */
  read_by: Types.ObjectId[];
  created_at: Date;
  updated_at: Date;
}

const TicketMessageSchema = new Schema<ITicketMessage>(
  {
    ticket_id:   { type: Schema.Types.ObjectId, ref: 'SupportTicket', required: true, index: true },
    sender_id:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sender_role: { type: String, enum: ['user', 'staff'], required: true },
    body:        { type: String, required: true, trim: true, maxlength: 4000 },
    attachments: [{
      name:       { type: String, required: true },
      url:        { type: String, required: true },
      mime:       { type: String },
      size_bytes: { type: Number },
      _id: false,
    }],
    read_by: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

TicketMessageSchema.index({ ticket_id: 1, created_at: 1 });

export const TicketMessage = model<ITicketMessage>('TicketMessage', TicketMessageSchema);
