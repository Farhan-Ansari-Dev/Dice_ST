import React, { useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius } from '../../theme';
import * as Haptics from 'expo-haptics';
import { useNotificationStore } from '../../store/notificationStore';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';

const BADGE_TABS = new Set<string>();

const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Home:           { active: 'home-outline',              inactive: 'home-outline' },
  Insights:       { active: 'newspaper',                 inactive: 'newspaper-outline' },
  Certifications: { active: 'shield-checkmark',          inactive: 'shield-checkmark-outline' },
  Identifier:     { active: 'scan',                      inactive: 'scan-outline' },
  Profile:        { active: 'person-outline',            inactive: 'person-outline' },
};

// Smooth spring — feels fluid, no bounce
const SPRING = { damping: 28, stiffness: 180, mass: 1.1 };

// ─── Single tab item ─────────────────────────────────────────────────────────
interface TabItemProps {
  route: any;
  index: number;
  totalTabs: number;
  activeAnim: SharedValue<number>;
  icons: { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap };
  label: string;
  unreadCount: number;
  onPress: () => void;
}

const TabItem: React.FC<TabItemProps> = ({
  route,
  index,
  totalTabs,
  activeAnim,
  icons,
  label,
  unreadCount,
  onPress,
}) => {
  const { colors, isDark } = useTheme();

  // 0 → 1 → 0 as the active pill slides through this tab
  const progress = useDerivedValue(() =>
    interpolate(
      activeAnim.value,
      [index - 1, index, index + 1],
      [0, 1, 0],
      Extrapolation.CLAMP,
    )
  );

  // Icon container: lift + scale tied to progress
  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(progress.value, [0, 1], [0.88, 1], Extrapolation.CLAMP) },
      { translateY: interpolate(progress.value, [0, 1], [2, -1], Extrapolation.CLAMP) },
    ],
  }));

  // Active icon fades IN as progress → 1
  const activeIconStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    position: 'absolute',
  }));

  // Inactive icon fades OUT as progress → 1
  const inactiveIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [1, 0], Extrapolation.CLAMP),
  }));

  // Label: brighter + slides up when active
  const labelAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.45, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [1.5, 0], Extrapolation.CLAMP) },
    ],
  }));

  // Pill background glow
  const pillStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0, 0.6, 1], Extrapolation.CLAMP),
    transform: [
      { scaleX: interpolate(progress.value, [0, 1], [0.7, 1], Extrapolation.CLAMP) },
      { scaleY: interpolate(progress.value, [0, 1], [0.85, 1], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <TouchableOpacity onPress={onPress} style={styles.tab} activeOpacity={0.8}>
      <View style={styles.tabContent}>

        {/* Icon stack */}
        <Animated.View style={[styles.iconWrapper, iconAnimStyle]}>

          {/* Gradient pill — fades + scales in */}
          <Animated.View style={[StyleSheet.absoluteFill, styles.pillAbsolute, pillStyle]}>
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.pillGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          </Animated.View>

          {/* Inactive icon (outline) */}
          <Animated.View style={inactiveIconStyle}>
            <Ionicons
              name={icons.inactive}
              size={route.name === 'Insights' || route.name === 'Identifier' ? 26 : 22}
              color={isDark ? colors.textTertiary : colors.textTertiary}
            />
          </Animated.View>

          {/* Active icon (filled, white) — crossfades over inactive */}
          <Animated.View style={activeIconStyle}>
            <Ionicons 
              name={icons.active} 
              size={route.name === 'Insights' || route.name === 'Identifier' ? 26 : 22} 
              color="#fff" 
            />
          </Animated.View>

          {/* Badge */}
          {BADGE_TABS.has(route.name) && unreadCount > 0 && (
            <View style={[
              styles.badge,
              {
                backgroundColor: colors.error,
                borderColor: isDark ? 'rgba(10,11,15,1)' : '#fff',
              },
            ]}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : String(unreadCount)}</Text>
            </View>
          )}
        </Animated.View>

        {/* Label */}
        <Animated.Text
          style={[styles.label, { color: colors.primary }, labelAnimStyle]}
          numberOfLines={1}
        >
          {label}
        </Animated.Text>

      </View>
    </TouchableOpacity>
  );
};

// ─── Certifications FAB Tab ──────────────────────────────────────────────────
const CertificationsFab: React.FC<{ onPress: () => void, isDark: boolean, colors: any }> = ({ onPress, isDark, colors }) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={{ alignItems: 'center', paddingTop: 8 }}>
      <View style={styles.fabShadowWrapper}>
        <View style={[styles.fabButton, { 
          backgroundColor: '#6366F1', 
          borderColor: isDark ? 'rgba(10,11,15,1)' : '#fff',
        }]}>
          <Ionicons name="shield-checkmark" size={34} color="#fff" />
        </View>
      </View>
      <Text style={[styles.fabLabel, { color: '#6366F1' }]}>Certifications</Text>
    </TouchableOpacity>
  );
};

// ─── Bottom tab bar ──────────────────────────────────────────────────────────
const BottomTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  // Single shared value drives ALL tab animations simultaneously
  const activeAnim = useSharedValue(state.index);

  useEffect(() => {
    activeAnim.value = withSpring(state.index, SPRING);
  }, [state.index]);

  const certRoute = state.routes.find(r => r.name === 'Certifications');
  const certIndex = state.routes.findIndex(r => r.name === 'Certifications');
  const onCertPress = () => {
    if (!certRoute) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const event = navigation.emit({
      type: 'tabPress',
      target: certRoute.key,
      canPreventDefault: true,
    });
    if (state.index !== certIndex && !event.defaultPrevented) {
      navigation.navigate(certRoute.name);
    }
  };

  return (
    <View style={{
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
      overflow: 'visible',
      backgroundColor: 'transparent',
      zIndex: 999,
      elevation: 20,
    }}>
      <LinearGradient
        colors={
          isDark
            ? ['rgba(18,20,26,0.98)', 'rgba(10,11,15,1)']
            : ['rgba(255,255,255,0.99)', 'rgba(240,242,248,1)']
        }
        style={{ paddingTop: 10, paddingBottom: insets.bottom || 10 }}
      >
        <View style={[styles.tabRow, { overflow: 'visible' }]}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label = String(options.tabBarLabel ?? options.title ?? route.name);
            const icons = TAB_ICONS[route.name] ?? { active: 'ellipse', inactive: 'ellipse-outline' };

            const onPress = () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (state.index !== index && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            if (route.name === 'Certifications') {
              return <View key={route.key} style={styles.fabContainer} />;
            }

            return (
              <TabItem
                key={route.key}
                route={route}
                index={index}
                totalTabs={state.routes.length}
                activeAnim={activeAnim}
                icons={icons as any}
                label={label}
                unreadCount={unreadCount}
                onPress={onPress}
              />
            );
          })}
        </View>
      </LinearGradient>
      
      {certRoute && (
        <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { alignItems: 'center' }]}>
          <CertificationsFab onPress={onCertPress} isDark={isDark} colors={colors} />
        </View>
      )}
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
  },
  tabContent: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  iconWrapper: {
    width: 44,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillAbsolute: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  pillGradient: {
    flex: 1,
    borderRadius: BorderRadius.md,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 11,
  },
  fabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  fabShadowWrapper: {
    position: 'absolute',
    top: -28,
    borderRadius: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  fabButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 6,
  },
  fabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 46,
  },
});

export default BottomTabBar;
