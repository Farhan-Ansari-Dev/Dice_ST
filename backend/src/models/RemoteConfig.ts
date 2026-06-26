import mongoose from 'mongoose';

export interface IRemoteConfig {
  version: string;
  featureFlags: {
    maintenance_mode: boolean;
    enable_ai_assistant: boolean;
    enable_ocr_scanning: boolean;
    enable_referral_rewards: boolean;
    enable_promotional_banners: boolean;
    enable_notifications: boolean;
  };
  dynamicConfig: {
    banner_text: string;
    banner_color: string;
    referral_reward_value: number;
    announcement_title: string;
    announcement_body: string;
  };
}

const remoteConfigSchema = new mongoose.Schema<IRemoteConfig>({
  version: { type: String, required: true, default: 'v1' },
  featureFlags: {
    maintenance_mode: { type: Boolean, default: false },
    enable_ai_assistant: { type: Boolean, default: true },
    enable_ocr_scanning: { type: Boolean, default: false },
    enable_referral_rewards: { type: Boolean, default: true },
    enable_promotional_banners: { type: Boolean, default: false },
    enable_notifications: { type: Boolean, default: true },
  },
  dynamicConfig: {
    banner_text: { type: String, default: 'Welcome to DICE by Sanyog' },
    banner_color: { type: String, default: '#6C63FF' },
    referral_reward_value: { type: Number, default: 200 },
    announcement_title: { type: String, default: '' },
    announcement_body: { type: String, default: '' },
  }
}, { timestamps: true });

// Ensure there is only ever one document for global config
remoteConfigSchema.statics.getGlobalConfig = async function() {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({ version: 'v1' });
  }
  return config;
};

export const RemoteConfig = mongoose.model<IRemoteConfig, mongoose.Model<IRemoteConfig> & { getGlobalConfig(): Promise<mongoose.Document<unknown, {}, IRemoteConfig> & IRemoteConfig> }>('RemoteConfig', remoteConfigSchema);
