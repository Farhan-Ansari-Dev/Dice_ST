import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, BorderRadius, Shadows } from '../../theme';

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  visible: boolean;
  title: string;
  message?: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (title: string, message?: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors, isDark } = useTheme();
  const [toast, setToast] = useState<ToastState>({ visible: false, title: '', type: 'info' });
  const anim = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    });
  }, [anim]);

  const showToast = useCallback((title: string, message?: string, type: ToastType = 'info') => {
    if (hideTimer.current) clearTimeout(hideTimer.current);

    setToast({ visible: true, title, message, type });
    Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }).start();

    hideTimer.current = setTimeout(() => {
      hideToast();
    }, 2200);
  }, [anim, hideToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  const tone = toast.type === 'error'
    ? { icon: 'alert-circle', bg: isDark ? '#3A1E22' : '#FFEDEE', border: colors.error, text: colors.error }
    : toast.type === 'success'
      ? { icon: 'checkmark-circle', bg: isDark ? '#1D342A' : '#EAFBF2', border: colors.success, text: colors.success }
      : { icon: 'information-circle', bg: isDark ? '#1F2A3A' : '#EEF4FF', border: colors.primary, text: colors.primary };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast.visible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            Shadows.md,
            {
              backgroundColor: tone.bg,
              borderColor: tone.border,
              opacity: anim,
              transform: [
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-24, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Ionicons name={tone.icon as any} size={18} color={tone.text} style={{ marginTop: 1 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{toast.title}</Text>
            {!!toast.message && <Text style={[styles.message, { color: colors.textSecondary }]}>{toast.message}</Text>}
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    top: 52,
    left: 16,
    right: 16,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 10,
    zIndex: 1000,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 1,
  },
  message: {
    fontSize: 12,
    lineHeight: 16,
  },
});
