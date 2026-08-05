/**
 * featureFlags — programmatic access to RemoteConfig.featureFlags for services.
 *
 * The route middleware `requireFeature` gates HTTP endpoints; services need to
 * read a flag value inside business logic (e.g. "are workflow gates enforced?").
 * This reader adds a small TTL cache so a hot path (every transition) does not
 * hit MongoDB on each call. Flags are operational toggles, so a few seconds of
 * staleness is acceptable and intended.
 */
import { RemoteConfig, IRemoteConfig } from '../models/RemoteConfig';

export type FeatureFlag = keyof IRemoteConfig['featureFlags'];

const TTL_MS = 15_000;
let cache: { flags: IRemoteConfig['featureFlags']; at: number } | null = null;

/** Read all feature flags (cached). Falls back to all-off on any error. */
export async function getFeatureFlags(): Promise<IRemoteConfig['featureFlags']> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.flags;
  try {
    const config = await RemoteConfig.getGlobalConfig();
    cache = { flags: config.featureFlags, at: now };
    return config.featureFlags;
  } catch {
    // If config cannot be read, treat rollout flags as OFF (safe default).
    return (cache?.flags ?? ({} as IRemoteConfig['featureFlags']));
  }
}

/** True when the given flag is enabled. Safe default: false. */
export async function isFeatureEnabled(flag: FeatureFlag): Promise<boolean> {
  const flags = await getFeatureFlags();
  return Boolean(flags?.[flag]);
}

/** Test/ops hook: drop the cache so the next read reflects a just-changed flag. */
export function clearFeatureFlagCache(): void {
  cache = null;
}
