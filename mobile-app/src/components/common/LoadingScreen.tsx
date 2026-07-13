import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, Typography } from '../../theme';

const LoadingScreen: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => {
  const { colors } = useTheme();
  const spinValue = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    Animated.loop(Animated.timing(spinValue, { toValue: 1, duration: 1200, useNativeDriver: true })).start();
  }, []);

  const spin = spinValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgDark, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ opacity: fadeIn, alignItems: 'center' }}>
        <Animated.View style={{ width: 64, height: 64, borderRadius: 32, overflow: 'hidden', marginBottom: 16, transform: [{ rotate: spin }] }}>
          <LinearGradient colors={[colors.primary, colors.secondary]} style={{ width: 64, height: 64, borderRadius: 32 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        </Animated.View>
        <Text style={{ fontSize: 28, fontWeight: '800', color: colors.primary, letterSpacing: 4, marginBottom: 8 }}>SCS</Text>
        <Text style={{ ...Typography.body2, color: colors.textSecondary }}>{message}</Text>
      </Animated.View>
    </View>
  );
};

export default LoadingScreen;
