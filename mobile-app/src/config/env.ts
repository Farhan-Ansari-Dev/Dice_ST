import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Environment configuration.
 * Values are read from app.json extra → pulled in via expo-constants.
 * In development, falls back to local backend.
 */

const isDev = __DEV__;

// Honour EXPO_PUBLIC_API_URL first (set as an EAS build secret or in eas.json
// `env` block). To switch the production app to your deployed backend, set
// EXPO_PUBLIC_API_URL=https://your-host.up.railway.app and rebuild.
const envApi =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ||
  (Constants.expoConfig?.extra?.apiUrl as string | undefined);

// Android emulator uses 10.0.2.2 to reach the host machine; iOS simulator can use localhost.
const LOCAL_HOST = Platform.OS === 'android' && !envApi ? 'http://10.0.2.2:5001' : 'http://localhost:5001';
const PROD_HOST  = 'https://api.sanyogconformity.com';

const apiHost = envApi || (isDev ? LOCAL_HOST : PROD_HOST);

// Google OAuth client IDs.
//
// These are PUBLIC identifiers (the confidential client *secret* lives only in
// the backend env) — they must be present at bundle time or GoogleSignin cannot
// mint an ID token. EXPO_PUBLIC_* vars are inlined by Metro from .env locally
// and from eas.json `env` in CI; both sources are kept in sync.
const GOOGLE_WEB_CLIENT_ID =
  (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID as string | undefined) ||
  (Constants.expoConfig?.extra?.googleWebClientId as string | undefined);

const GOOGLE_IOS_CLIENT_ID =
  (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID as string | undefined) ||
  (Constants.expoConfig?.extra?.googleIosClientId as string | undefined);

export const ENV = {
  API_URL:    `${apiHost}/api/v1`,
  SOCKET_URL: apiHost,

  GOOGLE_WEB_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,

  RAZORPAY_KEY_ID: Constants.expoConfig?.extra?.razorpayKeyId ?? 'rzp_test_placeholder',
  OPENAI_API_KEY:  Constants.expoConfig?.extra?.openaiKey ?? '',

  IS_DEV: isDev,
};

export default ENV;
