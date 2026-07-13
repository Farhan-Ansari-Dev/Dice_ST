import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const APP_VERSION = '1.0.0';
const BUILD = '2025.06';

const LINKS = [
  { icon: 'document-text-outline' as const,  label: 'Privacy Policy',      onPress: () => Linking.openURL('https://www.sanyogconformity.com/privacy/') },
  { icon: 'reader-outline' as const,         label: 'Terms & Conditions',   onPress: () => Linking.openURL('https://www.sanyogconformity.com/terms/') },
  { icon: 'globe-outline' as const,          label: 'Visit Website',        onPress: () => Linking.openURL('https://www.sanyogconformity.com') },
  {
    icon: 'mail-outline' as const,
    label: 'Contact Us',
    onPress: () =>
      Linking.openURL('mailto:info@sanyogconformity.com').catch(() =>
        Linking.openURL('https://www.sanyogconformity.com/contact/').catch(() => {})
      ),
  },
];

const AboutScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* App identity card */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.appCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.appIconWrapper}>
            <Text style={styles.appIconText}>DICE</Text>
          </View>
          <Text style={styles.appName}>DICE</Text>
          <Text style={styles.appTagline}>Digital India Compliance Engine</Text>
          <View style={styles.versionRow}>
            <View style={styles.versionChip}>
              <Text style={styles.versionChipText}>Version {APP_VERSION}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Description */}
        <View style={[styles.descCard, Shadows.sm]}>
          <LinearGradient
            colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
            style={styles.descCardInner}
          >
            <Text style={styles.descText}>
              DICE is India's first AI-powered compliance management platform. We simplify BIS, WPC, EPR, FSSAI, and 20+ regulatory certifications for businesses across India.
            </Text>
          </LinearGradient>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { value: '0', label: 'Certifications' },
            { value: '0', label: 'Businesses' },
            { value: '0%', label: 'Compliance Rate' },
          ].map((s) => (
            <LinearGradient
              key={s.label}
              colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
              style={[styles.statCard, Shadows.sm]}
            >
              <Text style={[styles.statValue, { color: colors.primary }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </LinearGradient>
          ))}
        </View>

        {/* Links */}
        <Text style={styles.sectionTitle}>Legal & Info</Text>
        <View style={[styles.linksCard, Shadows.sm]}>
          <LinearGradient
            colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
            style={styles.linksCardInner}
          >
            {LINKS.map((link, i) => (
              <TouchableOpacity
                key={link.label}
                style={[styles.linkRow, i < LINKS.length - 1 && styles.linkBorder]}
                onPress={link.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.linkIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <Ionicons name={link.icon} size={18} color={colors.primary} />
                </View>
                <Text style={styles.linkLabel}>{link.label}</Text>
                <Ionicons name="open-outline" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </LinearGradient>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>Dice by Sanyog Conformity Solutions Pvt Ltd.{'\n'}© 2025 All rights reserved.</Text>
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
    content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 60 },
    appCard: { borderRadius: BorderRadius.xl, padding: 28, alignItems: 'center', marginBottom: 16 },
    appIconWrapper: { width: 100, height: 100, borderRadius: 24, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginBottom: 16, padding: 8 },
    appIconText: { fontSize: 26, fontWeight: '900', color: colors.primaryDark, letterSpacing: 1.4 },
    appName: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', marginBottom: 4 },
    appTagline: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 14 },
    versionRow: { alignItems: 'center' },
    versionChip: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 5, borderRadius: BorderRadius.full },
    versionChipText: { fontSize: 12, color: '#FFFFFF', fontWeight: '600' },
    descCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    descCardInner: { padding: 16 },
    descText: { fontSize: 14, color: colors.textSecondary, lineHeight: 22, textAlign: 'center' },
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    statCard: { flex: 1, borderRadius: BorderRadius.lg, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    statValue: { fontSize: 20, fontWeight: '800' },
    statLabel: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    sectionTitle: { fontSize: 11, fontWeight: '700', color: colors.textTertiary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
    linksCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: 24, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    linksCardInner: { borderRadius: BorderRadius.lg },
    linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
    linkBorder: { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border },
    linkIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    linkLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.textPrimary },
    footer: { fontSize: 12, color: colors.textTertiary, textAlign: 'center', lineHeight: 18 },
  });

export default AboutScreen;
