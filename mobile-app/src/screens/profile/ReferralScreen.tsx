import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Clipboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const REFERRAL_CODE = '';

const REFERRAL_HISTORY: any[] = [];

const HOW_IT_WORKS = [
  { step: '01', icon: 'share-social-outline' as const, title: 'Share Your Code', desc: 'Send your unique referral code to friends & colleagues.' },
  { step: '02', icon: 'person-add-outline' as const, title: 'Friend Signs Up', desc: 'Your friend creates a DICE account using your referral code.' },
  { step: '03', icon: 'wallet-outline' as const, title: 'You Both Earn', desc: 'You get ₹500 credit. Your friend gets ₹200 off their first plan.' },
];

const ReferralScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join DICE by Sanyog — India's leading compliance management app!\n\nUse my referral code ${REFERRAL_CODE} and get ₹200 off your first plan.\n\nDownload now: https://dicesanyog.app`,
        title: 'Join DICE by Sanyog',
      });
    } catch (e) {
      Alert.alert('Error', 'Unable to share at this time.');
    }
  };

  const handleCopy = () => {
    Clipboard.setString(REFERRAL_CODE);
    Alert.alert('Copied!', `Referral code ${REFERRAL_CODE} copied to clipboard.`);
  };

  const signedUp = REFERRAL_HISTORY.filter((r) => r.status === 'Signed Up').length;
  const totalEarned = signedUp * 500;

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
        <Text style={styles.headerTitle}>Referral Program</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Hero */}
        <View style={[styles.heroCard, Shadows.md]}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.heroGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="gift" size={40} color="rgba(255,255,255,0.3)" style={styles.heroIconBg} />
            <Text style={styles.heroLabel}>YOUR REFERRAL CODE</Text>
            <Text style={styles.heroCode}>{REFERRAL_CODE}</Text>
            <View style={styles.heroBtnRow}>
              <TouchableOpacity style={styles.heroBtn} onPress={handleCopy}>
                <Ionicons name="copy-outline" size={16} color={colors.primary} />
                <Text style={styles.heroBtnText}>Copy Code</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.heroBtn, styles.heroBtnShare]} onPress={handleShare}>
                <Ionicons name="share-social-outline" size={16} color="#FFFFFF" />
                <Text style={[styles.heroBtnText, { color: '#FFFFFF' }]}>Share</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Friends Referred', value: `${REFERRAL_HISTORY.length}`, icon: 'people-outline', color: colors.primary },
            { label: 'Total Earned', value: `₹${totalEarned.toLocaleString('en-IN')}`, icon: 'wallet-outline', color: colors.success },
            { label: 'Pending', value: `${REFERRAL_HISTORY.length - signedUp}`, icon: 'time-outline', color: colors.warning },
          ].map((stat) => (
            <View key={stat.label} style={[styles.statCard, Shadows.sm]}>
              <LinearGradient
                colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
                style={styles.statCardInner}
              >
                <View style={[styles.statIcon, { backgroundColor: `${stat.color}15` }]}>
                  <Ionicons name={stat.icon as any} size={16} color={stat.color} />
                </View>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </LinearGradient>
            </View>
          ))}
        </View>

        {/* How it works */}
        <Text style={styles.sectionTitle}>How It Works</Text>
        <View style={[styles.card, Shadows.sm]}>
          <LinearGradient
            colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
            style={styles.cardInner}
          >
            {HOW_IT_WORKS.map((step, idx) => (
              <View key={step.step}>
                {idx > 0 && <View style={styles.stepConnector} />}
                <View style={styles.stepRow}>
                  <View style={[styles.stepCircle, { backgroundColor: `${colors.primary}20` }]}>
                    <Ionicons name={step.icon} size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.stepTitleRow}>
                      <Text style={styles.stepNum}>{step.step}</Text>
                      <Text style={styles.stepTitle}>{step.title}</Text>
                    </View>
                    <Text style={styles.stepDesc}>{step.desc}</Text>
                  </View>
                </View>
              </View>
            ))}
          </LinearGradient>
        </View>

        {/* Referral History */}
        <Text style={styles.sectionTitle}>Referral History</Text>
        <View style={[styles.card, Shadows.sm]}>
          <LinearGradient
            colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
            style={styles.cardInner}
          >
            {REFERRAL_HISTORY.map((ref, idx) => (
              <View key={ref.id} style={[styles.historyRow, idx > 0 && styles.historyDivider]}>
                <View style={styles.historyAvatar}>
                  <Text style={styles.historyAvatarText}>{ref.name[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyName}>{ref.name}</Text>
                  <Text style={styles.historyDate}>{ref.date}</Text>
                </View>
                <View style={styles.historyRight}>
                  <Text
                    style={[
                      styles.historyReward,
                      ref.reward === 'Pending' ? { color: colors.warning } : { color: colors.success },
                    ]}
                  >
                    {ref.reward}
                  </Text>
                  <Text style={[styles.historyStatus, ref.status === 'Pending' ? { color: colors.warning } : { color: colors.success }]}>
                    {ref.status}
                  </Text>
                </View>
              </View>
            ))}
          </LinearGradient>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? colors.bgCardLight : colors.border, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    content: { paddingHorizontal: 20, paddingTop: 8 },
    heroCard: { borderRadius: BorderRadius.xl, overflow: 'hidden', marginBottom: 20 },
    heroGrad: { padding: 24, alignItems: 'center', position: 'relative' },
    heroIconBg: { position: 'absolute', top: 12, right: 16 },
    heroLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5, marginBottom: 8 },
    heroCode: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', letterSpacing: 3, marginBottom: 20 },
    heroBtnRow: { flexDirection: 'row', gap: 12 },
    heroBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', paddingHorizontal: 18, paddingVertical: 10, borderRadius: BorderRadius.full },
    heroBtnShare: { backgroundColor: 'rgba(255,255,255,0.2)' },
    heroBtnText: { fontSize: 13, fontWeight: '700', color: colors.primary },
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
    statCard: { flex: 1, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    statCardInner: { padding: 12, alignItems: 'center', gap: 4 },
    statIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
    statValue: { fontSize: 18, fontWeight: '800' },
    statLabel: { fontSize: 10, color: colors.textTertiary, textAlign: 'center' },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
    card: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, marginBottom: 24 },
    cardInner: { padding: 16 },
    stepRow: { flexDirection: 'row', gap: 14, paddingVertical: 12 },
    stepConnector: { height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border },
    stepCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    stepTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    stepNum: { fontSize: 11, fontWeight: '800', color: colors.primary },
    stepTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    stepDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    historyDivider: { borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border },
    historyAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: `${colors.primary}20`, alignItems: 'center', justifyContent: 'center' },
    historyAvatarText: { fontSize: 16, fontWeight: '700', color: colors.primary },
    historyName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    historyDate: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    historyRight: { alignItems: 'flex-end' },
    historyReward: { fontSize: 15, fontWeight: '800' },
    historyStatus: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  });

export default ReferralScreen;
