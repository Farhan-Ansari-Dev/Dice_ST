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
    consultant_verification_enabled: boolean;
  };
  dynamicConfig: {
    banner_text: string;
    banner_color: string;
    referral_reward_value: number;
    announcement_title: string;
    announcement_body: string;
  };
  aiSettings: {
    provider: string;
    model: string;
    apiKey: string;
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
    consultant_verification_enabled: { type: Boolean, default: false },
  },
  dynamicConfig: {
    banner_text: { type: String, default: 'Welcome to DICE by Sanyog' },
    banner_color: { type: String, default: '#6C63FF' },
    referral_reward_value: { type: Number, default: 200 },
    announcement_title: { type: String, default: '' },
    announcement_body: { type: String, default: '' },
  },
  aiSettings: {
    provider: { type: String, default: 'nvidia' },
    model: { type: String, default: 'meta/llama-3.3-70b-instruct' },
    apiKey: { type: String, default: '' },
    // Vision-capable model; the chat model usually is not.
    visionModel: { type: String, default: '' },
    // Required for Azure OpenAI (per-resource endpoint) and a non-default Ollama host.
    baseUrl: { type: String, default: '' },
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
