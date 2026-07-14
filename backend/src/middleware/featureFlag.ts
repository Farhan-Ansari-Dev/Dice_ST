import { Request, Response, NextFunction } from 'express';
import { RemoteConfig, IRemoteConfig } from '../models/RemoteConfig';

type FeatureFlagKey = keyof IRemoteConfig['featureFlags'];

/**
 * Middleware to check if a specific feature is enabled.
 *
 * @param flag The feature flag to check.
 */
export const requireFeature = (flag: FeatureFlagKey) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await RemoteConfig.getGlobalConfig();
      if (config.featureFlags[flag]) {
        return next();
      } else {
        // Return 404 to obscure the fact that the endpoint exists but is disabled.
        return res.status(404).json({ success: false, message: 'Not Found' });
      }
    } catch (error) {
      return next(error);
    }
  };
};
