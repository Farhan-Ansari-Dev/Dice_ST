import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

const OfflineBanner: React.FC = () => {
  const { isOffline } = useNetworkStatus();
  const translateY = useRef(new Animated.Value(-50)).current;
  const wasOffline = useRef(false);

  useEffect(() => {
    if (isOffline) {
      wasOffline.current = true;
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80 }).start();
    } else if (wasOffline.current) {
      Animated.timing(translateY, { toValue: -50, duration: 400, useNativeDriver: true }).start();
    }
  }, [isOffline]);

  if (!isOffline && !wasOffline.current) return null;

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY }] }]}>
      <Ionicons name="cloud-offline-outline" size={16} color="#FFFFFF" />
      <Text style={styles.text}>No internet connection — viewing cached data</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  text: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
});

export default OfflineBanner;
