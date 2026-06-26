import { Schema, model, Document, Types } from 'mongoose';

export interface IAIConversation extends Document {
  user_id: Types.ObjectId;
  messages: any[];
  created_at: Date;
  updated_at: Date;
}

const AIConversationSchema = new Schema<IAIConversation>(
  {
    user_id:  { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    messages: [{ type: Schema.Types.Mixed }],
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const AIConversation = model<IAIConversation>('AIConversation', AIConversationSchema);
