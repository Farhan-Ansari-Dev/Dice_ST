import { Schema, model, Document, Types } from 'mongoose';

export interface IAIConversation extends Document {
  user_id: Types.ObjectId;
  // 'customer' = the consumer mobile assistant (/ai/chat); 'admin' = the internal
  // staff Admin Assistant (/admin-ai/chat). Kept in ONE collection with a
  // discriminator so the two histories never mix. Absent ⇒ 'customer' (legacy rows).
  scope: 'customer' | 'admin';
  messages: any[];
  created_at: Date;
  updated_at: Date;
}

const AIConversationSchema = new Schema<IAIConversation>(
  {
    user_id:  { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    scope:    { type: String, enum: ['customer', 'admin'], default: 'customer', index: true },
    messages: [{ type: Schema.Types.Mixed }],
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);
AIConversationSchema.index({ user_id: 1, scope: 1, updated_at: -1 });

export const AIConversation = model<IAIConversation>('AIConversation', AIConversationSchema);
