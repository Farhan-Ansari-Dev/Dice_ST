import React, { useRef, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Animated,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius } from '../../theme';

const { width } = Dimensions.get('window');

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string, string];
  accentGradient: [string, string];
}

const OnboardingTourScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const SLIDES: Slide[] = useMemo(() => [
    {
      id: '1',
      title: 'Manage All Certifications',
      subtitle: 'BIS, EPR, WPC, FSSAI, CE Marking — track every certification from a single powerful dashboard.',
      icon: 'shield-checkmark',
      gradient: ['#1A1560', '#6C63FF', '#00D4FF'],
      accentGradient: ['#6C63FF', '#9C56FF'],
    },
    {
      id: '2',
      title: 'AI-Powered Compliance',
      subtitle: 'Get intelligent insights, regulatory alerts and AI-driven recommendations tailored to your business.',
      icon: 'sparkles',
      gradient: ['#0A2540', '#00B4D8', '#90E0EF'],
      accentGradient: ['#00B4D8', '#0077B6'],
    },
    {
      id: '3',
      title: 'Track Applications',
      subtitle: 'Real-time status updates, document management and team collaboration — all in one place.',
      icon: 'document-text',
      gradient: ['#0B3D0B', '#2D9A27', '#8BC34A'],
      accentGradient: ['#2D9A27', '#1B6B17'],
    },
    {
      id: '4',
      title: 'Stay Updated',
      subtitle: 'Never miss a renewal deadline. Get proactive alerts and stay compliant with changing regulations.',
      icon: 'newspaper',
      gradient: ['#3B1A00', '#E67E22', '#F4A261'],
      accentGradient: ['#E67E22', '#C0392B'],
    },
  ], []);

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      navigation.replace('Login');
    }
  };

  const handleSkip = () => {
    navigation.replace('Login');
  };

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: slideAnim } } }],
    { useNativeDriver: false }
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const renderSlide = ({ item }: { item: Slide }) => (
    <View style={styles.slide}>
      <LinearGradient
        colors={item.gradient}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.iconContainer}>
        <LinearGradient colors={item.accentGradient} style={styles.iconGrad}>
          <Ionicons name={item.icon} size={72} color="#FFFFFF" />
        </LinearGradient>
        {/* Decorative rings */}
        <View style={styles.ring1} />
        <View style={styles.ring2} />
      </View>
      <View style={styles.textArea}>
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
      </View>
    </View>
  );

  const currentSlide = SLIDES[activeIndex];

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        renderItem={renderSlide}
        onScroll={onScroll}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={16}
      />

      {/* Controls overlay */}
      <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {/* Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                i === activeIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.9}>
            <LinearGradient colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.15)']} style={styles.nextBtnGrad}>
              {activeIndex === SLIDES.length - 1 ? (
                <>
                  <Text style={styles.nextBtnText}>Get Started</Text>
                  <Ionicons name="rocket-outline" size={18} color="#FFFFFF" />
                </>
              ) : (
                <>
                  <Text style={styles.nextBtnText}>Next</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    slide: { width, flex: 1, alignItems: 'center', justifyContent: 'center' },
    iconContainer: {
      width: 180,
      height: 180,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 40,
      position: 'relative',
    },
    iconGrad: {
      width: 140,
      height: 140,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    ring1: {
      position: 'absolute',
      width: 160,
      height: 160,
      borderRadius: 80,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    ring2: {
      position: 'absolute',
      width: 180,
      height: 180,
      borderRadius: 90,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    textArea: { paddingHorizontal: 40, alignItems: 'center' },
    slideTitle: { fontSize: 28, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', marginBottom: 16, lineHeight: 34 },
    slideSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 22 },
    controls: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 24,
      gap: 20,
    },
    dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: 'rgba(255,255,255,0.4)',
    },
    dotActive: {
      width: 24,
      backgroundColor: '#FFFFFF',
    },
    btnRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    skipBtn: { paddingHorizontal: 16, paddingVertical: 12 },
    skipText: { fontSize: 15, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
    nextBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
    nextBtnGrad: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 28,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
      borderRadius: BorderRadius.lg,
    },
    nextBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  });

export default OnboardingTourScreen;
