import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const APP_LOCK_KEY = 'scs_app_lock_pin';
const AUTO_LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

interface UseAppLockReturn {
  isLocked: boolean;
  hasPin: boolean;
  lockApp: () => void;
  unlockApp: (pin: string) => Promise<boolean>;
  setPin: (pin: string) => Promise<void>;
  clearPin: () => Promise<void>;
}

export function useAppLock(): UseAppLockReturn {
  const [isLocked, setIsLocked] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const backgroundTimeRef = useRef<number | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    // Check if PIN is set on mount
    SecureStore.getItemAsync(APP_LOCK_KEY).then((storedPin) => {
      if (storedPin) {
        setHasPin(true);
        setIsLocked(true);
      }
    });

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (
        appStateRef.current === 'active' &&
        (nextState === 'background' || nextState === 'inactive')
      ) {
        backgroundTimeRef.current = Date.now();
      }

      if (nextState === 'active' && backgroundTimeRef.current !== null) {
        const elapsed = Date.now() - backgroundTimeRef.current;
        if (elapsed >= AUTO_LOCK_TIMEOUT_MS) {
          SecureStore.getItemAsync(APP_LOCK_KEY).then((storedPin) => {
            if (storedPin) setIsLocked(true);
          });
        }
        backgroundTimeRef.current = null;
      }

      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, []);

  const lockApp = useCallback(() => {
    setIsLocked(true);
  }, []);

  const unlockApp = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const storedPin = await SecureStore.getItemAsync(APP_LOCK_KEY);
      if (storedPin === pin) {
        setIsLocked(false);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  const setPin = useCallback(async (pin: string): Promise<void> => {
    await SecureStore.setItemAsync(APP_LOCK_KEY, pin);
    setHasPin(true);
  }, []);

  const clearPin = useCallback(async (): Promise<void> => {
    await SecureStore.deleteItemAsync(APP_LOCK_KEY);
    setHasPin(false);
    setIsLocked(false);
  }, []);

  return { isLocked, hasPin, lockApp, unlockApp, setPin, clearPin };
}
