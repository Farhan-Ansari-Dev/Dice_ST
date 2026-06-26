import { Schema, model, Document, Types } from 'mongoose';

export interface INotification extends Document {
  user_id: Types.ObjectId;
  type: string;                       // "cert_expiry", "doc_required", "comment_mention", etc.
  title: string;
  body: string;
  data?: Record<string, any>;         // deep-link context

  channels: Array<'in_app' | 'push' | 'email' | 'sms'>;
  delivered_channels: string[];       // which actually got delivered

  read_at?: Date;
  clicked_at?: Date;
  expires_at?: Date;

  // Source linkage for deep-link
  resource_type?: string;
  resource_id?: Types.ObjectId;

  created_at: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type:    { type: String, required: true, index: true },
    title:   { type: String, required: true },
    body:    { type: String, required: true },
    data:    { type: Schema.Types.Mixed },

    channels:           [String],
    delivered_channels: [String],

    read_at:    Date,
    clicked_at: Date,
    expires_at: Date,

    resource_type: String,
    resource_id:   Schema.Types.ObjectId,
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

NotificationSchema.index({ user_id: 1, read_at: 1, created_at: -1 });
// Auto-delete after 180 days
NotificationSchema.index({ created_at: 1 }, { expireAfterSeconds: 180 * 24 * 3600 });

export const Notification = model<INotification>('Notification', NotificationSchema);
