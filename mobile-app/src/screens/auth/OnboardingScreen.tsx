import React, { useRef, useState, useMemo, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, Dimensions, TouchableOpacity, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, BorderRadius } from '../../theme';
import { useAuthStore } from '../../store/authStore';

const { width } = Dimensions.get('window');

const OnboardingScreen: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const navigation = useNavigation<any>();
  const { setOnboardingDone } = useAuthStore();
  const { colors, isDark } = useTheme();

  const SLIDES = useMemo(() => [
    { id: '1', title: 'AI Quality Analyzer', subtitle: 'Instantly scan products and labels to get comprehensive safety, compliance, and quality insights.', icon: 'scan' as const, gradient: [colors.primary, colors.primaryDark] as [string, string] },
    { id: '2', title: 'Meet Dice AI', subtitle: 'Your personal compliance assistant. Get instant answers to complex regulatory queries anytime.', icon: 'sparkles' as const, gradient: [colors.secondary, colors.secondaryDark] as [string, string] },
    { id: '3', title: 'Market Access Engine', subtitle: 'Select your target markets and automatically discover the exact certifications required globally.', icon: 'globe' as const, gradient: [colors.success, colors.successDark] as [string, string] },
    { id: '4', title: 'Secure Document Vault', subtitle: 'Upload, manage, and verify all your compliance documents in one secure, encrypted space.', icon: 'shield-checkmark' as const, gradient: [colors.accent, colors.accentDark] as [string, string] },
  ], [colors]);

  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    ).start();
  }, [floatAnim, pulseAnim]);

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      handleGetStarted();
    }
  };

  const handleGetStarted = async () => { await setOnboardingDone(); navigation.replace('Login'); };
  const handleSkip = async () => { await setOnboardingDone(); navigation.replace('Login'); };

  return (
    <View style={styles.container}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0D0F1A'] : [colors.bgDark, '#E4E8F5']} style={StyleSheet.absoluteFill} />

      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(e) => setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={styles.iconWrapper}>
              {/* Outer Glow Pulses */}
              <Animated.View style={[styles.glowRingOuter, { borderColor: item.gradient[0] + '20', transform: [{ scale: pulseAnim }] }]} />
              <Animated.View style={[styles.glowRingMiddle, { borderColor: item.gradient[0] + '40', transform: [{ scale: pulseAnim }] }]} />
              <Animated.View style={[styles.glowRingInner, { backgroundColor: item.gradient[0] + '15', transform: [{ scale: pulseAnim }] }]} />
              
              {/* Main Floating Box */}
              <Animated.View style={{ transform: [{ translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -15] }) }] }}>
                <LinearGradient colors={item.gradient} style={styles.iconGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  {/* Glass Highlight */}
                  <LinearGradient colors={['rgba(255,255,255,0.4)', 'transparent']} style={styles.glassHighlight} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
                  <Ionicons name={item.icon} size={80} color="#ffffff" style={styles.iconShadow as any} />
                </LinearGradient>
              </Animated.View>
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
        )}
      />

      <View style={styles.dotsRow}>
        {SLIDES.map((_, index) => (
          <View key={index} style={[styles.dot, index === activeIndex && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={handleNext} activeOpacity={0.85}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.nextButton} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.nextButtonText}>{activeIndex === SLIDES.length - 1 ? 'Get Started' : 'Continue'}</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDark },
  skipButton: { position: 'absolute', top: 60, right: 24, zIndex: 10, paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.full, backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' },
  skipText: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  slide: { width, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 60, paddingBottom: 140 },
  iconWrapper: { position: 'relative', marginBottom: 60, alignItems: 'center', justifyContent: 'center', height: 260 },
  glowRingOuter: { position: 'absolute', width: 260, height: 260, borderRadius: 130, borderWidth: 1, borderStyle: 'dashed' },
  glowRingMiddle: { position: 'absolute', width: 220, height: 220, borderRadius: 110, borderWidth: 1 },
  glowRingInner: { position: 'absolute', width: 180, height: 180, borderRadius: 90 },
  iconGradient: { width: 140, height: 140, borderRadius: 40, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.3, shadowRadius: 30, elevation: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  glassHighlight: { position: 'absolute', top: 0, left: 0, right: 0, height: '50%' },
  iconShadow: { textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 10 },
  title: { fontSize: 30, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: 16, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', lineHeight: 26 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 32 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: isDark ? colors.border : colors.borderLight },
  dotActive: { width: 24, backgroundColor: colors.primary },
  buttonContainer: { paddingHorizontal: 24, paddingBottom: 50 },
  nextButton: { height: 56, borderRadius: BorderRadius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 10 },
  nextButtonText: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
});

export default OnboardingScreen;
