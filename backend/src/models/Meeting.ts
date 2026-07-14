import { Document, model, Schema, Types } from 'mongoose';

export type MeetingStatus = 'confirmed' | 'cancelled';

export interface IMeeting extends Document {
  user_id: Types.ObjectId;
  org_id?: Types.ObjectId;
  consultant_id: string;
  consultant_name: string;
  starts_at: Date;
  ends_at: Date;
  topic: string;
  status: MeetingStatus;
  meeting_url?: string;
  created_at: Date;
  updated_at: Date;
}

const MeetingSchema = new Schema<IMeeting>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    org_id: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    consultant_id: { type: String, required: true },
    consultant_name: { type: String, required: true },
    starts_at: { type: Date, required: true, index: true },
    ends_at: { type: Date, required: true },
    topic: { type: String, required: true, trim: true, maxlength: 160 },
    status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed', index: true },
    meeting_url: String,
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

MeetingSchema.index({ consultant_id: 1, starts_at: 1 }, { unique: true });

export const Meeting = model<IMeeting>('Meeting', MeetingSchema);
