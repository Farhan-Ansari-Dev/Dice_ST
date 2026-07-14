import { Document, model, Schema } from 'mongoose';

export interface IMeetingSlot extends Document {
  consultant_id: string;
  consultant_name: string;
  consultant_role: string;
  starts_at: Date;
  ends_at: Date;
  is_available: boolean;
  created_at: Date;
  updated_at: Date;
}

const MeetingSlotSchema = new Schema<IMeetingSlot>(
  {
    consultant_id: { type: String, required: true, index: true },
    consultant_name: { type: String, required: true, trim: true },
    consultant_role: { type: String, required: true, trim: true },
    starts_at: { type: Date, required: true, index: true },
    ends_at: { type: Date, required: true },
    is_available: { type: Boolean, default: true, index: true },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

MeetingSlotSchema.index({ consultant_id: 1, starts_at: 1 }, { unique: true });

export const MeetingSlot = model<IMeetingSlot>('MeetingSlot', MeetingSlotSchema);
