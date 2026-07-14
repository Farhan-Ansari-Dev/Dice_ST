import { RemoteConfig, IRemoteConfig } from '../models/RemoteConfig';

/**
 * Defines the structure for feature flags.
 * Add new flags here with a default value.
 */
export interface FeatureFlags {
  consultant_verification_enabled: boolean;
  // Add other feature flags here as needed
  // e.g., payments_enabled: boolean;
}

/**
 * Default values for all feature flags.
 * These are used if the configuration is not set in the database.
 */
const defaultFlags: FeatureFlags = {
  consultant_verification_enabled: false,
  // payments_enabled: false,
};

/**
 * Fetches the current feature flags from the database or returns defaults.
 * Caches the result for 1 minute to reduce DB queries.
 */
let configCache: FeatureFlags | null = null;
let cacheTimestamp = 0;

export async function getFeatureFlags(): Promise<FeatureFlags> {
  const now = Date.now();
  if (configCache && now - cacheTimestamp < 60000) {
    return configCache;
  }

  try {
    const remoteConfig = await RemoteConfig.getGlobalConfig();
    const flags = {
      ...defaultFlags,
      ...remoteConfig.featureFlags,
    };
    configCache = flags;
    cacheTimestamp = now;
    return flags;
  } catch (error) {
    console.error('Error fetching feature flags, using defaults:', error);
    return defaultFlags;
  }
}

/**
 * Updates one or more feature flags in the database.
 *
 * @param updates An object containing the feature flags to update.
 * @returns The updated remote config document.
 */
export async function updateFeatureFlags(updates: Partial<FeatureFlags>): Promise<IRemoteConfig> {
  const remoteConfig = await RemoteConfig.getGlobalConfig(); // Ensures config document exists

  // Build the update object with dot notation for nested fields
  const updateQuery: { [key: string]: any } = {};
  for (const key in updates) {
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      updateQuery[`featureFlags.${key}`] = updates[key as keyof FeatureFlags];
    }
  }

  remoteConfig.markModified('featureFlags');
  Object.assign(remoteConfig.featureFlags, updates);
  
  await remoteConfig.save();

  // Invalidate cache
  configCache = null;

  return remoteConfig;
}
