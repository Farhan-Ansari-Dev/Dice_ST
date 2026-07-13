import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows, Spacing } from '../../theme';
import { CERTIFICATION_BODIES } from '../../utils/constants';

const { width } = Dimensions.get('window');

type CB = (typeof CERTIFICATION_BODIES)[number];

const StarRating: React.FC<{ rating: number; color: string }> = ({ rating, color }) => (
  <View style={{ flexDirection: 'row', gap: 2, alignItems: 'center' }}>
    {[1, 2, 3, 4, 5].map((star) => (
      <Ionicons
        key={star}
        name={rating >= star ? 'star' : rating >= star - 0.5 ? 'star-half' : 'star-outline'}
        size={12}
        color={color}
      />
    ))}
  </View>
);

const ExpandableSection: React.FC<{
  title: string;
  icon: string;
  color: string;
  children: React.ReactNode;
  isDark: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}> = ({ title, icon, color, children, isDark, colors }) => {
  const [open, setOpen] = useState(false);
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };
  return (
    <View style={{ marginTop: 10 }}>
      <TouchableOpacity
        onPress={toggle}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 8,
          gap: 8,
        }}
        activeOpacity={0.7}
      >
        <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: `${color}20`, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon as any} size={14} color={color} />
        </View>
        <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: colors.textPrimary }}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textTertiary} />
      </TouchableOpacity>
      {open && (
        <View style={{ paddingLeft: 36, paddingBottom: 4 }}>
          {children}
        </View>
      )}
    </View>
  );
};

const CBCard: React.FC<{
  cb: CB;
  colors: ReturnType<typeof useTheme>['colors'];
  isDark: boolean;
  onSelect: (cb: CB) => void;
}> = ({ cb, colors, isDark, onSelect }) => {
  const styles = useMemo(() => cardStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.card, Shadows.md]}>
      <LinearGradient
        colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
        style={styles.cardInner}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <LinearGradient colors={[cb.accentColor + '22', cb.accentColor + '11']} style={styles.cbIconWrap}>
            <Ionicons name={cb.logo as any} size={24} color={cb.accentColor} />
          </LinearGradient>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.cbName}>{cb.name}</Text>
              {cb.verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="shield-checkmark" size={10} color="#00C896" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
              {cb.featured && (
                <View style={styles.featuredBadge}>
                  <Text style={styles.featuredText}>FEATURED</Text>
                </View>
              )}
            </View>
            <Text style={styles.cbTagline} numberOfLines={1}>{cb.tagline}</Text>
          </View>
        </View>

        {/* Rating */}
        <View style={styles.ratingRow}>
          <StarRating rating={cb.rating} color="#FFB347" />
          <Text style={styles.ratingValue}>{cb.rating}</Text>
          <Text style={styles.reviewCount}>({cb.reviewCount.toLocaleString()} reviews)</Text>
        </View>

        {/* Key metrics */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricChip, { backgroundColor: `${cb.accentColor}15`, borderColor: `${cb.accentColor}30` }]}>
            <Ionicons name="time-outline" size={13} color={cb.accentColor} />
            <Text style={[styles.metricLabel, { color: cb.accentColor }]}>TAT</Text>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{cb.tat}</Text>
          </View>
          <View style={[styles.metricChip, { backgroundColor: `${colors.success}15`, borderColor: `${colors.success}30` }]}>
            <Ionicons name="cash-outline" size={13} color={colors.success} />
            <Text style={[styles.metricLabel, { color: colors.success }]}>Price</Text>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{cb.priceRange}</Text>
          </View>
        </View>

        {/* Scope pills */}
        <View style={styles.scopeRow}>
          <Text style={styles.scopeTitle}>Scope:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {cb.scope.map((s: string) => (
                <View key={s} style={[styles.scopePill, { backgroundColor: `${cb.accentColor}18` }]}>
                  <Text style={[styles.scopePillText, { color: cb.accentColor }]}>{s}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Expandable sections */}
        <ExpandableSection title="Services Offered" icon="briefcase" color={cb.accentColor} isDark={isDark} colors={colors}>
          {cb.services.map((s: string) => (
            <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 }}>
              <Ionicons name="checkmark-circle" size={13} color={colors.success} />
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>{s}</Text>
            </View>
          ))}
        </ExpandableSection>

        <ExpandableSection title="Key Strengths" icon="trophy" color="#FFB347" isDark={isDark} colors={colors}>
          {cb.strengths.map((s: string) => (
            <View key={s} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 5 }}>
              <Ionicons name="star" size={11} color="#FFB347" style={{ marginTop: 1 }} />
              <Text style={{ fontSize: 12, color: colors.textSecondary, flex: 1 }}>{s}</Text>
            </View>
          ))}
        </ExpandableSection>

        <ExpandableSection title="Required Documents" icon="document-text" color={colors.info} isDark={isDark} colors={colors}>
          {cb.documentation.map((d: string, i: number) => (
            <View key={d} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 }}>
              <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: `${colors.info}20`, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: colors.info }}>{i + 1}</Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>{d}</Text>
            </View>
          ))}
        </ExpandableSection>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', marginVertical: 14 }} />

        {/* "Go With This CB" CTA — at bottom of card */}
        <TouchableOpacity onPress={() => onSelect(cb)} activeOpacity={0.85}>
          <LinearGradient
            colors={['#00C896', '#00A07A']}
            style={styles.ctaButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="checkmark-circle" size={16} color="#fff" />
            <Text style={styles.ctaText}>Go With This CB  →</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};

const CBComparisonScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const handleSelect = (cb: CB) => {
    // Future: show confirmation + application flow
    navigation.navigate('CertificationsList');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Certification Bodies</Text>
          <Text style={styles.headerSub}>{CERTIFICATION_BODIES.length} verified partners</Text>
        </View>
        <TouchableOpacity style={styles.filterBtn}>
          <Ionicons name="options-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Info banner */}
      <View style={styles.infoBanner}>
        <LinearGradient colors={['#1A1560', '#6C63FF40']} style={styles.infoBannerGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <Ionicons name="information-circle" size={18} color={colors.primaryLight} />
          <Text style={styles.infoBannerText}>
            All CBs are NABL accredited & BIS empanelled. Tap{' '}
            <Text style={{ color: '#00C896', fontWeight: '700' }}>Go With This CB</Text>{' '}
            to start your application.
          </Text>
        </LinearGradient>
      </View>

      <View style={[styles.heroCard, Shadows.lg]}>
        <LinearGradient
          colors={isDark ? ['rgba(108,99,255,0.22)', 'rgba(0,212,255,0.12)'] : ['#FFFFFF', '#F7F9FF']}
          style={styles.heroCardInner}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconWrap}>
              <LinearGradient colors={colors.gradientPrimary} style={styles.heroIcon}>
                <Ionicons name="git-compare-outline" size={24} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Compare certification bodies with confidence</Text>
              <Text style={styles.heroSubtitle}>
                See service depth, turnaround time, and scope coverage at a glance. The recommended path stays visible without forcing the decision.
              </Text>
            </View>
          </View>

          <View style={styles.heroStatsRow}>
            {[
              { value: `${CERTIFICATION_BODIES.length}`, label: 'Verified partners' },
              { value: 'Fastest', label: 'Turnaround' },
              { value: '1 tap', label: 'Start with Sanyog' },
            ].map((item) => (
              <View key={item.label} style={styles.heroStatChip}>
                <Text style={styles.heroStatValue}>{item.value}</Text>
                <Text style={styles.heroStatLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
      >
        {/* Sanyog promo card — pinned at top as recommended option */}
        <TouchableOpacity style={[styles.sanyogCard, Shadows.lg]} activeOpacity={0.88}>
          <LinearGradient colors={['#1A1560', '#6C63FF', '#9B59B6']} style={styles.sanyogCardGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.sanyogHeader}>
              <View style={styles.sanyogIconWrap}>
                <Ionicons name="shield-checkmark" size={26} color="#fff" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.sanyogTitle}>Go with Sanyog</Text>
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>RECOMMENDED</Text>
                  </View>
                </View>
                <Text style={styles.sanyogSub}>We handle everything end-to-end</Text>
              </View>
            </View>
            <Text style={styles.sanyogDesc}>
              Sanyog manages your entire certification journey — CB selection, documentation, lab coordination, government liaison, and renewal reminders. Zero hassle.
            </Text>
            <View style={styles.sanyogFeatures}>
              {['Dedicated expert', 'Fastest TAT guaranteed', '100% success rate'].map((f) => (
                <View key={f} style={styles.sanyogFeatureRow}>
                  <Ionicons name="checkmark-circle" size={14} color="#00E5AD" />
                  <Text style={styles.sanyogFeatureText}>{f}</Text>
                </View>
              ))}
            </View>
            <View style={styles.sanyogCTA}>
              <Text style={styles.sanyogCTAText}>Start with Sanyog</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Divider between Sanyog card and CB list */}
        <View style={styles.sectionDivider}>
          <View style={styles.sectionDividerLine} />
          <Text style={styles.sectionDividerText}>Or choose a CB yourself</Text>
          <View style={styles.sectionDividerLine} />
        </View>

        {CERTIFICATION_BODIES.map((cb) => (
          <CBCard
            key={cb.id}
            cb={cb}
            colors={colors}
            isDark={isDark}
            onSelect={handleSelect}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const cardStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    card: {
      borderRadius: BorderRadius.xl,
      marginBottom: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
    },
    cardInner: { padding: 16 },
    ctaButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 44,
      borderRadius: BorderRadius.lg,
      marginBottom: 4,
    },
    ctaText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    cbIconWrap: {
      width: 50,
      height: 50,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cbName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    cbTagline: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    verifiedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: `${colors.success}18`,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: BorderRadius.full,
    },
    verifiedText: { fontSize: 9, color: colors.success, fontWeight: '700' },
    featuredBadge: {
      backgroundColor: '#FFB34720',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: BorderRadius.full,
    },
    featuredText: { fontSize: 9, color: '#FFB347', fontWeight: '700' },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 12,
    },
    ratingValue: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
    reviewCount: { fontSize: 11, color: colors.textTertiary },
    metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    metricChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
    },
    metricLabel: { fontSize: 10, fontWeight: '600' },
    metricValue: { fontSize: 11, fontWeight: '500', flex: 1, textAlign: 'right' },
    scopeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    scopeTitle: { fontSize: 11, color: colors.textTertiary, fontWeight: '600' },
    scopePill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: BorderRadius.full,
    },
    scopePillText: { fontSize: 10, fontWeight: '700' },
  });

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 14,
      gap: 12,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? colors.bgCard : colors.bgCardLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    headerSub: {
      fontSize: 11,
      color: colors.textTertiary,
      marginTop: 1,
    },
    filterBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: `${colors.primary}18`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoBanner: {
      marginHorizontal: 20,
      marginBottom: 16,
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
    },
    infoBannerGrad: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      padding: 12,
    },
    infoBannerText: {
      flex: 1,
      fontSize: 12,
      color: 'rgba(255,255,255,0.75)',
      lineHeight: 17,
    },
    heroCard: { marginHorizontal: 20, marginBottom: 16, borderRadius: BorderRadius.xl, overflow: 'hidden' },
    heroCardInner: { padding: 18, gap: 16 },
    heroTopRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
    heroIconWrap: { width: 54, alignItems: 'center', justifyContent: 'center' },
    heroIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    heroTitle: { fontSize: 18, lineHeight: 26, fontWeight: '800', color: colors.textPrimary, marginBottom: 6 },
    heroSubtitle: { fontSize: 13, lineHeight: 20, color: colors.textSecondary },
    heroStatsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    heroStatChip: { flexGrow: 1, minWidth: 92, paddingHorizontal: 12, paddingVertical: 10, borderRadius: BorderRadius.lg, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border },
    heroStatValue: { fontSize: 13, fontWeight: '800', color: colors.textPrimary, marginBottom: 2 },
    heroStatLabel: { fontSize: 11, color: colors.textTertiary },
    scrollContent: { paddingHorizontal: 20 },
    sanyogCard: {
      borderRadius: BorderRadius.xl,
      overflow: 'hidden',
      marginBottom: 16,
    },
    sanyogCardGrad: { padding: 20 },
    sanyogHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    sanyogIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sanyogTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
    recommendedBadge: {
      backgroundColor: '#00E5AD',
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: BorderRadius.full,
    },
    recommendedText: { fontSize: 8, fontWeight: '800', color: '#003322' },
    sanyogSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
    sanyogDesc: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.75)',
      lineHeight: 20,
      marginBottom: 14,
    },
    sanyogFeatures: { gap: 7, marginBottom: 16 },
    sanyogFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sanyogFeatureText: { fontSize: 13, color: '#fff', fontWeight: '500' },
    sanyogCTA: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: 'rgba(255,255,255,0.18)',
      height: 46,
      borderRadius: BorderRadius.lg,
    },
    sanyogCTAText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    sectionDivider: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginVertical: 20,
    },
    sectionDividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    },
    sectionDividerText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textTertiary,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
  });

export default CBComparisonScreen;
