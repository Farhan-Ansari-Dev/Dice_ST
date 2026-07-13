import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const USER_TYPES = [
  {
    id: 'manufacturer',
    title: 'Manufacturer',
    description: 'I manufacture products that require BIS, ISI, or other mandatory certifications.',
    icon: 'construct' as const,
    gradient: ['#6C63FF', '#4F46E5'] as [string, string],
  },
  {
    id: 'exporter',
    title: 'Exporter / Importer',
    description: 'I export or import goods and need compliance certifications for international trade.',
    icon: 'airplane' as const,
    gradient: ['#00C896', '#00A87E'] as [string, string],
  },
  {
    id: 'consultant',
    title: 'Consultant',
    description: 'I provide compliance consulting services to businesses seeking certifications.',
    icon: 'briefcase' as const,
    gradient: ['#F59E0B', '#D97706'] as [string, string],
  },
  {
    id: 'enterprise',
    title: 'Enterprise',
    description: 'Large organization managing multiple product lines and complex compliance portfolios.',
    icon: 'business' as const,
    gradient: ['#EF4444', '#DC2626'] as [string, string],
  },
];

const UserTypeSelectionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [selected, setSelected] = useState<string | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 2600, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  const handleSelect = (typeId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelected(typeId);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerEyebrow}>STEP 1 OF 6</Text>
          <Text style={styles.headerTitle}>Select your role</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.heroCard, Shadows.lg]}>
          <LinearGradient
            colors={isDark ? ['rgba(108,99,255,0.22)', 'rgba(0,212,255,0.12)'] : ['#FFFFFF', '#F6F8FF']}
            style={styles.heroCardInner}
          >
            <View style={styles.heroTopRow}>
              <View style={styles.heroIconWrap}>
                <Animated.View
                  style={{
                    transform: [
                      {
                        scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }),
                      },
                    ],
                  }}
                >
                  <LinearGradient colors={colors.gradientPrimary} style={styles.heroIcon}>
                    <Ionicons name="sparkles" size={24} color="#FFFFFF" />
                  </LinearGradient>
                </Animated.View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>Personalize compliance for the right business path</Text>
                <Text style={styles.subtitle}>
                  Pick the account type that best matches how you work. We will tailor recommendations, workflows, and dashboards from there.
                </Text>
              </View>
            </View>

            <View style={styles.heroStatsRow}>
              {[
                { label: 'Smart setup', value: '1 min' },
                { label: 'Guided flow', value: '6 steps' },
                { label: 'Best fit', value: 'Auto tuned' },
              ].map((item) => (
                <View key={item.label} style={styles.heroStatChip}>
                  <Text style={styles.heroStatValue}>{item.value}</Text>
                  <Text style={styles.heroStatLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </View>

        <View style={styles.cardGrid}>
          {USER_TYPES.map((type) => {
            const isSelected = selected === type.id;
            return (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeCard,
                  Shadows.md,
                  isSelected && styles.typeCardSelected,
                ]}
                onPress={() => handleSelect(type.id)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
                  style={styles.typeCardInner}
                >
                  <View style={styles.typeCardHeader}>
                    <LinearGradient colors={type.gradient} style={styles.typeIcon}>
                      <Ionicons name={type.icon} size={28} color="#FFFFFF" />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.typeTitle}>{type.title}</Text>
                      <Text style={styles.typeDesc}>{type.description}</Text>
                    </View>
                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                    </View>
                  </View>
                  <View style={styles.typeFooter}>
                    <View style={styles.typeTag}>
                      <Text style={styles.typeTagText}>{type.id === 'consultant' ? 'Service provider' : 'Compliance owner'}</Text>
                    </View>
                    <Text style={styles.typeFooterText}>{isSelected ? 'Selected' : 'Tap to choose'}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.continueBtn, Shadows.md, !selected && styles.continueBtnDisabled]}
          onPress={() => selected && navigation.reset({ index: 0, routes: [{ name: 'MainTabs' as any }] })}
          activeOpacity={selected ? 0.85 : 1}
        >
          <LinearGradient
            colors={selected ? [colors.primary, colors.primaryDark] : [colors.bgCardLight, colors.bgCardLight]}
            style={styles.continueBtnGradient}
          >
            <Text style={[styles.continueBtnText, !selected && { color: colors.textTertiary }]}>
              Continue
            </Text>
            <Ionicons name="arrow-forward" size={18} color={selected ? '#FFFFFF' : colors.textTertiary} />
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      gap: 12,
    },
    headerEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: colors.textTertiary, marginBottom: 4 },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? colors.bgCardLight : colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { flex: 1, fontSize: 24, fontWeight: '800', color: colors.textPrimary },
    content: { paddingHorizontal: 20, paddingTop: 8 },
    heroCard: { marginBottom: 20, borderRadius: BorderRadius.xl, overflow: 'hidden' },
    heroCardInner: { padding: 18, gap: 16 },
    heroTopRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
    heroIconWrap: { width: 60, alignItems: 'center', justifyContent: 'center' },
    heroIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    heroTitle: { fontSize: 18, lineHeight: 26, fontWeight: '800', color: colors.textPrimary, marginBottom: 6 },
    subtitle: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
    heroStatsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    heroStatChip: { flexGrow: 1, minWidth: 96, paddingVertical: 10, paddingHorizontal: 12, borderRadius: BorderRadius.lg, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border },
    heroStatValue: { fontSize: 13, fontWeight: '800', color: colors.textPrimary, marginBottom: 2 },
    heroStatLabel: { fontSize: 11, color: colors.textTertiary },
    cardGrid: { gap: 14, marginBottom: 28 },
    typeCard: {
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
    },
    typeCardSelected: {
      borderColor: colors.primary,
    },
    typeCardInner: { padding: 18, gap: 12 },
    typeCardHeader: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
    typeIcon: {
      width: 56,
      height: 56,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },
    typeTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    typeDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
    radioCircle: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    radioCircleSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    typeFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    typeTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full, backgroundColor: isDark ? 'rgba(108,99,255,0.14)' : 'rgba(108,99,255,0.1)' },
    typeTagText: { fontSize: 11, fontWeight: '700', color: colors.primary },
    typeFooterText: { fontSize: 12, color: colors.textTertiary, fontWeight: '600' },
    continueBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
    continueBtnDisabled: { opacity: 0.6 },
    continueBtnGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      gap: 8,
    },
    continueBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  });

export default UserTypeSelectionScreen;
