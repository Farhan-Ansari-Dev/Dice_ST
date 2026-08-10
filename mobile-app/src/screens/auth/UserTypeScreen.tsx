import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/common/ToastProvider';
import {
  BUSINESS_ROLES, INDUSTRIES, TARGET_MARKETS,
  ONBOARDING_CERTIFICATIONS, COMPANY_SIZES, BUSINESS_GOALS,
  BusinessRoleId, IndustryId, TargetMarketId,
  CertificationOBId, CompanySizeId, BusinessGoalId,
} from '../../utils/constants';

const { width } = Dimensions.get('window');

// How many target markets to show before "View More"
const MARKETS_INITIAL_COUNT = 6;
const ONBOARDING_DRAFT_KEY = 'scs_onboarding_draft';

// ── Step metadata ────────────────────────────────────────────────────────────
const STEPS = [
  { step: 1, title: 'What is your\nbusiness role?',    subtitle: 'Select the option that best describes your primary activity',        type: 'single' as const, icon: 'briefcase'       as const, accentColor: '#6C63FF' },
  { step: 2, title: 'Which industry\ndo you operate in?', subtitle: 'Select all that apply — AI uses this for targeted insights',        type: 'multi'  as const, icon: 'grid'            as const, accentColor: '#00D4FF' },
  { step: 3, title: 'Your target\nmarkets?',           subtitle: 'Where do you sell or plan to sell your products?',                   type: 'multi'  as const, icon: 'globe'           as const, accentColor: '#00C896' },
  { step: 4, title: 'Certifications\nyou need?',       subtitle: 'We will personalise your dashboard and recommendations',             type: 'multi'  as const, icon: 'shield-checkmark' as const, accentColor: '#FFB347' },
  { step: 5, title: 'How big is\nyour company?',       subtitle: 'Helps us calibrate pricing, complexity, and workflows',              type: 'single' as const, icon: 'business'        as const, accentColor: '#9B59B6' },
  { step: 6, title: 'What are your\nkey goals?',       subtitle: 'Pick everything you want to achieve with DICE',                      type: 'multi'  as const, icon: 'rocket'          as const, accentColor: '#FF6B6B' },
];

// ── Welcome gate content ─────────────────────────────────────────────────────
const WELCOME_POINTS = [
  { icon: 'sparkles'          as const, label: 'AI insights matched to your industry',   color: '#6C63FF' },
  { icon: 'shield-checkmark'  as const, label: 'Only the certifications you actually need', color: '#00C896' },
  { icon: 'globe'             as const, label: 'Market requirements for where you sell',  color: '#00D4FF' },
];

const welcomeStyle = StyleSheet.create({
  body:       { flex: 1, paddingHorizontal: 28, justifyContent: 'center' },
  badge:      { width: 66, height: 66, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginBottom: 26 },
  title:      { fontSize: 31, fontWeight: '800', letterSpacing: -0.6, marginBottom: 12 },
  subtitle:   { fontSize: 15, lineHeight: 23 },
  points:     { marginTop: 34, gap: 16 },
  point:      { flexDirection: 'row', alignItems: 'center', gap: 13 },
  pointIcon:  { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pointLabel: { fontSize: 14, fontWeight: '500', flex: 1 },
  footer:     { paddingHorizontal: 28, gap: 12 },
  cta:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 17, borderRadius: BorderRadius.xl },
  ctaText:    { color: '#fff', fontSize: 16, fontWeight: '700' },
  footnote:   { fontSize: 11.5, textAlign: 'center' },
});

// ── Step 1: Role Card (2-col grid) ───────────────────────────────────────────
const RoleCard: React.FC<{
  id: string; label: string; icon: string; color: string;
  selected: boolean; onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors']; isDark: boolean;
}> = ({ label, icon, color, selected, onPress, colors, isDark }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.82}
    style={cardStyle.wrap}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ selected }}
  >
    <LinearGradient
      colors={selected
        ? [color + '30', color + '18']
        : isDark
          ? [color + '18', color + '0C']
          : [color + '14', color + '08']}
      style={[
        cardStyle.card,
        { borderColor: selected ? color : color + '50', borderWidth: selected ? 2 : 1.5 },
      ]}
    >
      {/* Colored icon circle — always vivid */}
      <View style={[cardStyle.iconCircle, { backgroundColor: color + (selected ? '30' : '20') }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={[cardStyle.label, { color: selected ? color : (isDark ? colors.textPrimary : color + 'DD') }]} numberOfLines={2}>
        {label}
      </Text>
      {selected && (
        <View style={[cardStyle.tick, { backgroundColor: color }]}>
          <Ionicons name="checkmark" size={10} color="#fff" />
        </View>
      )}
    </LinearGradient>
  </TouchableOpacity>
);

const CARD_W = (width - 40 - 10) / 2;

const cardStyle = StyleSheet.create({
  wrap:       { width: CARD_W },
  card:       { borderRadius: BorderRadius.xl, paddingHorizontal: 14, paddingVertical: 16, minHeight: 96, alignItems: 'flex-start', gap: 8 },
  iconCircle: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  label:      { fontSize: 13, fontWeight: '700', lineHeight: 17, flexShrink: 1 },
  tick:       { position: 'absolute', top: 10, right: 10, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
});

// ── Single-select option row (step 5: company size) ──────────────────────────
const SingleOption: React.FC<{
  id: string; label: string; icon: string; color: string; desc?: string;
  selected: boolean; onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors']; isDark: boolean;
}> = ({ label, icon, color, desc, selected, onPress, colors, isDark }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.85}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityHint={desc}
    accessibilityState={{ selected }}
    style={[rowStyle.row, { backgroundColor: isDark ? colors.bgCard : '#FFFFFF', borderColor: selected ? color : (isDark ? 'rgba(255,255,255,0.07)' : colors.border), borderWidth: selected ? 2 : 1 }, Shadows.sm]}
  >
    <View style={[rowStyle.iconWrap, { backgroundColor: selected ? color + '22' : (isDark ? colors.bgCardLight : '#F0F2F8') }]}>
      <Ionicons name={icon as any} size={20} color={selected ? color : colors.textTertiary} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[rowStyle.label, { color: selected ? color : colors.textPrimary }]}>{label}</Text>
      {desc && <Text style={[rowStyle.desc, { color: colors.textTertiary }]}>{desc}</Text>}
    </View>
    <View style={[rowStyle.radio, { borderColor: selected ? color : colors.textTertiary, backgroundColor: selected ? color : 'transparent' }]}>
      {selected && <View style={rowStyle.radioInner} />}
    </View>
  </TouchableOpacity>
);

const rowStyle = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14, borderRadius: BorderRadius.xl, marginBottom: 10 },
  iconWrap:  { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  label:     { fontSize: 15, fontWeight: '600' },
  desc:      { fontSize: 11, marginTop: 2 },
  radio:     { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner:{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
});

// ── Multi-select chip (steps 2, 3, 4, 6) ────────────────────────────────────
const MultiChip: React.FC<{
  id: string; label: string; icon?: string; flag?: string; color: string; desc?: string;
  selected: boolean; onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors']; isDark: boolean; wide?: boolean;
}> = ({ label, icon, flag, color, desc, selected, onPress, colors, isDark, wide }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.85}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityHint={desc}
    accessibilityState={{ selected }}
    style={[chipStyle.chip, wide && chipStyle.chipWide, { backgroundColor: selected ? color + '18' : (isDark ? colors.bgCard : '#FFFFFF'), borderColor: selected ? color : (isDark ? 'rgba(255,255,255,0.07)' : colors.border), borderWidth: selected ? 2 : 1 }]}
  >
    {flag ? (
      <Text style={chipStyle.flag}>{flag}</Text>
    ) : icon ? (
      <View style={[chipStyle.iconWrap, { backgroundColor: selected ? color + '22' : (isDark ? colors.bgCardLight : '#EEF0FF') }]}>
        <Ionicons name={icon as any} size={16} color={selected ? color : colors.textTertiary} />
      </View>
    ) : null}
    <View style={{ flex: 1 }}>
      <Text style={[chipStyle.label, { color: selected ? color : colors.textPrimary }]}>{label}</Text>
      {desc && <Text style={[chipStyle.desc, { color: colors.textTertiary }]} numberOfLines={1}>{desc}</Text>}
    </View>
    {selected && (
      <View style={[chipStyle.tick, { backgroundColor: color }]}>
        <Ionicons name="checkmark" size={10} color="#fff" />
      </View>
    )}
  </TouchableOpacity>
);

const chipStyle = StyleSheet.create({
  chip:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: BorderRadius.xl, width: (width - 40 - 10) / 2, marginBottom: 0 },
  chipWide: { width: width - 40 },
  iconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  flag:     { fontSize: 22, width: 32, textAlign: 'center' },
  label:    { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  desc:     { fontSize: 10, marginTop: 2 },
  tick:     { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
});

// ── Main Screen ──────────────────────────────────────────────────────────────
const UserTypeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { setOnboardingProfile, user } = useAuthStore();
  const { showToast } = useToast();

  const firstName = user?.name?.trim().split(/\s+/)[0] ?? '';

  // Welcome gate — shown once before the wizard. Kept as a gate rather than a
  // STEPS entry because every step index here (canContinue, selectionCount,
  // skip rules) is positional; prepending a step would shift all of them.
  const [showWelcome, setShowWelcome] = useState(true);
  const [step, setStep] = useState(0);
  const [businessRole, setBusinessRole]         = useState<BusinessRoleId | null>(null);
  const [industries, setIndustries]             = useState<Set<IndustryId>>(new Set());
  const [targetMarkets, setTargetMarkets]       = useState<Set<TargetMarketId>>(new Set());
  const [certifications, setCertifications]     = useState<Set<CertificationOBId>>(new Set());
  const [companySize, setCompanySize]           = useState<CompanySizeId | null>(null);
  const [businessGoals, setBusinessGoals]       = useState<Set<BusinessGoalId>>(new Set());
  const [submitting, setSubmitting]             = useState(false);
  const [showAllMarkets, setShowAllMarkets]     = useState(false);

  const slideAnim    = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const styles      = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const currentStep = STEPS[step];
  const totalSteps  = STEPS.length;

  const animateToStep = (newStep: number) => {
    Animated.parallel([
      Animated.timing(progressAnim, { toValue: (newStep + 1) / totalSteps, duration: 350, useNativeDriver: false }),
      Animated.sequence([
        Animated.timing(slideAnim, { toValue: -20, duration: 120, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0,   duration: 220, useNativeDriver: true }),
      ]),
    ]).start();
    setStep(newStep);
  };

  const canContinue = (): boolean => {
    switch (step) {
      case 0: return businessRole !== null;
      case 1: return industries.size > 0;
      case 2: return targetMarkets.size > 0;
      case 3: return certifications.size > 0;
      case 4: return companySize !== null;
      case 5: return businessGoals.size > 0;
      default: return false;
    }
  };

  const handleContinue = async () => {
    if (!canContinue() || submitting) return;
    if (step < totalSteps - 1) {
      animateToStep(step + 1);
    } else {
      setSubmitting(true);
      try {
        await setOnboardingProfile({
          businessRole: businessRole!,
          industries: Array.from(industries),
          targetMarkets: Array.from(targetMarkets),
          interestedCertifications: Array.from(certifications),
          companySize: companySize!,
          businessGoals: Array.from(businessGoals),
        });
        await SecureStore.deleteItemAsync(ONBOARDING_DRAFT_KEY).catch(() => {});
        // On success the navigator swaps this screen for Main (isUserTypeDone),
        // so `submitting` is intentionally left set to avoid a flash of the CTA.
      } catch (e) {
        // Without this, a failed/slow save left the button stuck on
        // "Setting up your profile…" forever with no error and no retry.
        setSubmitting(false);
        showToast(
          'Setup Failed',
          'Could not save your profile. Please check your connection and try again.',
          'error',
        );
      }
    }
  };

  const handleBack = () => { if (step > 0) animateToStep(step - 1); };

  const toggleMulti = <T extends string>(set: Set<T>, setFn: (s: Set<T>) => void, id: T) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    setFn(next);
  };

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  useEffect(() => {
    Animated.timing(progressAnim, { toValue: 1 / totalSteps, duration: 600, useNativeDriver: false }).start();
  }, []);

  useEffect(() => {
    const loadDraft = async () => {
      const raw = await SecureStore.getItemAsync(ONBOARDING_DRAFT_KEY);
      if (!raw) return;

      // Resuming an interrupted run — go straight back to the wizard.
      setShowWelcome(false);

      try {
        const parsed = JSON.parse(raw) as {
          step?: number;
          businessRole?: BusinessRoleId | null;
          industries?: IndustryId[];
          targetMarkets?: TargetMarketId[];
          certifications?: CertificationOBId[];
          companySize?: CompanySizeId | null;
          businessGoals?: BusinessGoalId[];
        };

        if (typeof parsed.step === 'number' && parsed.step >= 0 && parsed.step < totalSteps) {
          setStep(parsed.step);
          progressAnim.setValue((parsed.step + 1) / totalSteps);
        }

        if (parsed.businessRole) setBusinessRole(parsed.businessRole);
        if (parsed.industries?.length) setIndustries(new Set(parsed.industries));
        if (parsed.targetMarkets?.length) setTargetMarkets(new Set(parsed.targetMarkets));
        if (parsed.certifications?.length) setCertifications(new Set(parsed.certifications));
        if (parsed.companySize) setCompanySize(parsed.companySize);
        if (parsed.businessGoals?.length) setBusinessGoals(new Set(parsed.businessGoals));

        showToast('Draft Restored', 'We restored your onboarding progress.', 'info');
      } catch {
        await SecureStore.deleteItemAsync(ONBOARDING_DRAFT_KEY).catch(() => {});
      }
    };

    loadDraft();
  }, [progressAnim, showToast, totalSteps]);

  useEffect(() => {
    const payload = {
      step,
      businessRole,
      industries: Array.from(industries),
      targetMarkets: Array.from(targetMarkets),
      certifications: Array.from(certifications),
      companySize,
      businessGoals: Array.from(businessGoals),
    };

    const timeout = setTimeout(() => {
      SecureStore.setItemAsync(ONBOARDING_DRAFT_KEY, JSON.stringify(payload)).catch(() => {});
    }, 240);

    return () => clearTimeout(timeout);
  }, [
    step,
    businessRole,
    industries,
    targetMarkets,
    certifications,
    companySize,
    businessGoals,
  ]);

  // Markets to display (first 6 or all)
  const visibleMarkets = showAllMarkets
    ? TARGET_MARKETS
    : TARGET_MARKETS.slice(0, MARKETS_INITIAL_COUNT);

  // Selection count for multi steps
  const selectionCount = [0, industries.size, targetMarkets.size, certifications.size, 0, businessGoals.size][step] ?? 0;

  if (showWelcome) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={isDark ? [colors.bgDark, '#0E0F1C'] : ['#F8F9FF', '#EEF0FB']}
          style={StyleSheet.absoluteFill}
        />
        <View style={welcomeStyle.body}>
          <LinearGradient colors={['#6C63FF', '#4D45CC']} style={welcomeStyle.badge}>
            <Ionicons name="layers" size={30} color="#fff" />
          </LinearGradient>

          <Text style={[welcomeStyle.title, { color: colors.textPrimary }]}>
            Welcome to DICE
          </Text>
          <Text style={[welcomeStyle.subtitle, { color: colors.textSecondary }]}>
            {firstName ? `${firstName}, let's` : "Let's"} set up your compliance workspace.
            Six quick questions so your dashboard, certifications, and AI insights
            arrive already tailored to your business.
          </Text>

          <View style={welcomeStyle.points}>
            {WELCOME_POINTS.map((point) => (
              <View key={point.label} style={welcomeStyle.point}>
                <View style={[welcomeStyle.pointIcon, { backgroundColor: point.color + '1F' }]}>
                  <Ionicons name={point.icon} size={17} color={point.color} />
                </View>
                <Text style={[welcomeStyle.pointLabel, { color: colors.textSecondary }]}>
                  {point.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[welcomeStyle.footer, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity
            onPress={() => setShowWelcome(false)}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel="Get started"
            accessibilityHint="Begins the onboarding questions"
          >
            <LinearGradient
              colors={['#6C63FF', '#4D45CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={welcomeStyle.cta}
            >
              <Text style={welcomeStyle.ctaText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
          <Text style={[welcomeStyle.footnote, { color: colors.textTertiary }]}>
            Takes about a minute · You can change these later in Profile
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={isDark ? [colors.bgDark, '#0E0F1C'] : ['#F8F9FF', '#EEF0FB']}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={[styles.headerBtn, { opacity: step === 0 ? 0 : 1 }]}
          disabled={step === 0}
          accessibilityRole="button"
          accessibilityLabel="Previous step"
          accessibilityHint="Returns to the previous onboarding step"
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <LinearGradient colors={['#6C63FF', '#4D45CC']} style={styles.logoChip}>
            <Ionicons name="layers" size={12} color="#fff" />
            <Text style={styles.logoChipText}>DICE</Text>
          </LinearGradient>
          <Text style={styles.stepCounter}>{step + 1} of {totalSteps}</Text>
        </View>
        <TouchableOpacity
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="Skip step"
          accessibilityHint="Skips this optional step"
          onPress={() => {
          if (step !== 0 && step !== 4) animateToStep(Math.min(step + 1, totalSteps - 1));
        }}>
          {step !== 0 && step !== 4 && <Text style={[styles.skipText, { color: colors.textTertiary }]}>Skip</Text>}
        </TouchableOpacity>
      </View>

      {/* ── Progress bar ── */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: currentStep.accentColor }]} />
      </View>

      {/* ── Step pill indicators ── */}
      <View style={styles.pillRow}>
        {STEPS.map((s, i) => (
          <View key={s.step} style={[styles.pill, {
            backgroundColor: i <= step ? currentStep.accentColor : (isDark ? 'rgba(255,255,255,0.08)' : '#D0D5E8'),
            width: i === step ? 22 : 7,
          }]} />
        ))}
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Animated.View style={[styles.headingSection, { transform: [{ translateY: slideAnim }] }]}>
          <View style={[styles.stepIconWrap, { backgroundColor: currentStep.accentColor + '18' }]}>
            <Ionicons name={currentStep.icon} size={22} color={currentStep.accentColor} />
          </View>
          <Text style={styles.stepTitle}>{currentStep.title}</Text>
          <Text style={styles.stepSubtitle}>{currentStep.subtitle}</Text>
        </Animated.View>

        {/* ── Step 1: Business Role — 2-column cards ── */}
        {step === 0 && (
          <View style={styles.cardGrid}>
            {BUSINESS_ROLES.map((role) => (
              <RoleCard
                key={role.id}
                {...role}
                selected={businessRole === role.id}
                onPress={() => setBusinessRole(role.id as BusinessRoleId)}
                colors={colors}
                isDark={isDark}
              />
            ))}
          </View>
        )}

        {/* ── Step 2: Industry — 2-col grid ── */}
        {step === 1 && (
          <View style={styles.grid2}>
            {INDUSTRIES.map((item) => (
              <MultiChip key={item.id} {...item}
                selected={industries.has(item.id as IndustryId)}
                onPress={() => toggleMulti(industries, setIndustries, item.id as IndustryId)}
                colors={colors} isDark={isDark}
              />
            ))}
          </View>
        )}

        {/* ── Step 3: Target Markets — 2-col + View More ── */}
        {step === 2 && (
          <>
            <View style={styles.grid2}>
              {visibleMarkets.map((item) => (
                <MultiChip key={item.id} {...item}
                  selected={targetMarkets.has(item.id as TargetMarketId)}
                  onPress={() => toggleMulti(targetMarkets, setTargetMarkets, item.id as TargetMarketId)}
                  colors={colors} isDark={isDark}
                />
              ))}
            </View>
            {TARGET_MARKETS.length > MARKETS_INITIAL_COUNT && (
              <TouchableOpacity
                onPress={() => setShowAllMarkets(!showAllMarkets)}
                style={[styles.viewMoreBtn, { borderColor: currentStep.accentColor + '50' }]}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={showAllMarkets ? 'Show fewer target markets' : 'Show more target markets'}
              >
                <Text style={[styles.viewMoreText, { color: currentStep.accentColor }]}>
                  {showAllMarkets ? 'Show Less' : `View More (${TARGET_MARKETS.length - MARKETS_INITIAL_COUNT} more)`}
                </Text>
                <Ionicons
                  name={showAllMarkets ? 'chevron-up' : 'chevron-down'}
                  size={14}
                  color={currentStep.accentColor}
                />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ── Step 4: Certifications — full-width ── */}
        {step === 3 && ONBOARDING_CERTIFICATIONS.map((cert) => (
          <MultiChip key={cert.id} {...cert}
            selected={certifications.has(cert.id as CertificationOBId)}
            onPress={() => toggleMulti(certifications, setCertifications, cert.id as CertificationOBId)}
            colors={colors} isDark={isDark} wide
          />
        ))}

        {/* ── Step 5: Company Size ── */}
        {step === 4 && COMPANY_SIZES.map((size) => (
          <SingleOption key={size.id} {...size}
            selected={companySize === size.id}
            onPress={() => setCompanySize(size.id as CompanySizeId)}
            colors={colors} isDark={isDark}
          />
        ))}

        {/* ── Step 6: Business Goals — 2-col ── */}
        {step === 5 && (
          <View style={styles.grid2}>
            {BUSINESS_GOALS.map((goal) => (
              <MultiChip key={goal.id} {...goal}
                selected={businessGoals.has(goal.id as BusinessGoalId)}
                onPress={() => toggleMulti(businessGoals, setBusinessGoals, goal.id as BusinessGoalId)}
                colors={colors} isDark={isDark}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* ── Sticky Footer — always visible ── */}
      <View style={[styles.stickyFooter, { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 24 }]}>
        {currentStep.type === 'multi' && (
          <Text style={[styles.selectionHint, { color: colors.textTertiary }]}>
            {selectionCount === 0 ? 'Select at least one to continue' : `${selectionCount} selected`}
          </Text>
        )}
        {step === 0 && (
          <Text style={[styles.selectionHint, { color: colors.textTertiary }]}>
            You can update this anytime in Settings
          </Text>
        )}

        <TouchableOpacity onPress={handleContinue} activeOpacity={canContinue() ? 0.85 : 1}
          accessibilityRole="button"
          accessibilityLabel={step === totalSteps - 1 ? 'Complete onboarding' : 'Continue to next step'}
          accessibilityState={{ disabled: !canContinue() || submitting, busy: submitting }}
          style={{ borderRadius: BorderRadius.lg, overflow: 'hidden' }}>
          <LinearGradient
            colors={canContinue()
              ? [currentStep.accentColor, currentStep.accentColor + 'DD']
              : (isDark ? ['#2A2D3E', '#1E2130'] : ['#D0D5E8', '#C0C8DC'])}
            style={styles.ctaBtn}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            {submitting ? (
              <Text style={styles.ctaBtnText}>Setting up your profile…</Text>
            ) : (
              <>
                <Text style={[styles.ctaBtnText, !canContinue() && { color: isDark ? colors.textTertiary : '#8896AB' }]}>
                  {step === totalSteps - 1 ? 'Get Started' : 'Continue'}
                </Text>
                <Ionicons
                  name={step === totalSteps - 1 ? 'rocket' : 'arrow-forward'}
                  size={17}
                  color={canContinue() ? '#fff' : (isDark ? colors.textTertiary : '#8896AB')}
                  style={{ marginLeft: 8 }}
                />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container:     { flex: 1, backgroundColor: colors.bgDark },

    header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
    headerBtn:     { width: 40, height: 36, alignItems: 'center', justifyContent: 'center' },
    headerCenter:  { flex: 1, alignItems: 'center', gap: 4 },
    logoChip:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
    logoChipText:  { fontSize: 11, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
    stepCounter:   { fontSize: 11, color: colors.textTertiary, fontWeight: '600' },
    skipText:      { fontSize: 13, fontWeight: '600' },

    progressTrack: { height: 3, backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#DDE1EE', marginHorizontal: 20, borderRadius: 2, overflow: 'hidden' },
    progressFill:  { height: 3, borderRadius: 2 },

    pillRow:       { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10, marginBottom: 4 },
    pill:          { height: 6, borderRadius: 3 },

    scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },

    headingSection:{ marginBottom: 20, marginTop: 8 },
    stepIconWrap:  { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    stepTitle:     { fontSize: 26, fontWeight: '800', color: colors.textPrimary, lineHeight: 33, letterSpacing: -0.5, marginBottom: 6 },
    stepSubtitle:  { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },

    // Step 1: 2-col card grid
    cardGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

    // Other steps: 2-col chip grid
    grid2:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

    // View More button (step 3)
    viewMoreBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 10, borderRadius: BorderRadius.lg, borderWidth: 1 },
    viewMoreText:  { fontSize: 13, fontWeight: '700' },

    // Sticky footer
    stickyFooter:  {
      paddingHorizontal: 20,
      paddingTop: 12,
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
      backgroundColor: isDark ? colors.bgDark : '#F8F9FF',
    },
    ctaBtn:        { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, borderRadius: BorderRadius.lg },
    ctaBtnText:    { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
    selectionHint: { fontSize: 12, fontWeight: '500', textAlign: 'center', paddingTop: 2 },
  });

export default UserTypeScreen;
