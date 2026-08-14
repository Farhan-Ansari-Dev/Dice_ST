import { Schema, model, Document, Types } from 'mongoose';

/**
 * Push device / AWS SNS endpoint record.
 *
 * One document per native push token (APNs on iOS, FCM on Android). This is the
 * source of truth for endpoint lifecycle and replaces the flat
 * `User.expo_push_tokens` array (kept temporarily for rollback — see migration).
 *
 * `deviceToken` is the natural key: a token maps to exactly one SNS endpoint, so
 * duplicate registrations upsert instead of creating a second endpoint.
 */
export interface IDevice extends Document {
  user_id: Types.ObjectId;
  platform: 'ios' | 'android';
  device_token: string;          // native APNs hex / FCM registration token
  sns_endpoint_arn?: string;     // set after CreatePlatformEndpoint
  enabled: boolean;              // false = user logged out OR endpoint disabled by SNS
  app_version?: string;
  device_name?: string;
  last_seen: Date;
  created_at: Date;
  updated_at: Date;
}

const DeviceSchema = new Schema<IDevice>(
  {
    user_id:  { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    platform: { type: String, enum: ['ios', 'android'], required: true },

    // Unique so a token belongs to exactly one endpoint; drives idempotent upsert.
    device_token: { type: String, required: true, unique: true },

    sns_endpoint_arn: { type: String },
    enabled:          { type: Boolean, default: true },
    app_version:      { type: String },
    device_name:      { type: String },
    last_seen:        { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Fetch a user's live devices at send time.
DeviceSchema.index({ user_id: 1, enabled: 1 });
// Reverse lookup for delivery-failure cleanup.
DeviceSchema.index({ sns_endpoint_arn: 1 });

export const Device = model<IDevice>('Device', DeviceSchema);
