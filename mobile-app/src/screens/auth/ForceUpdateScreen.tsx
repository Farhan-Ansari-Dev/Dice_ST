import React, { useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const ForceUpdateScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>
        <View style={[styles.heroCard, Shadows.lg]}>
          <LinearGradient
            colors={isDark ? ['rgba(108,99,255,0.22)', 'rgba(0,212,255,0.12)'] : ['#FFFFFF', '#F7F9FF']}
            style={styles.heroCardInner}
          >
            <View style={styles.illustrationArea}>
              <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.iconCircle}>
                <Ionicons name="cloud-download" size={48} color="#FFFFFF" />
              </LinearGradient>
            </View>

            <View style={[styles.versionBadge, { backgroundColor: `${colors.primary}20` }]}>
              <Text style={[styles.versionText, { color: colors.primary }]}>Version 3.0.0 Available</Text>
            </View>

            <Text style={styles.title}>A newer build is required</Text>
            <Text style={styles.description}>
              This release includes security fixes, smoother navigation, and improved compliance workflows. Update once to keep using the app.
            </Text>

            <View style={styles.metaRow}>
              {[
                { icon: 'shield-checkmark-outline' as const, label: 'Security' },
                { icon: 'flash-outline' as const, label: 'Speed' },
                { icon: 'layers-outline' as const, label: 'Design refresh' },
              ].map((item) => (
                <View key={item.label} style={styles.metaChip}>
                  <Ionicons name={item.icon} size={14} color={colors.primary} />
                  <Text style={styles.metaChipText}>{item.label}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </View>

        <View style={[styles.featuresCard, Shadows.md]}>
          <LinearGradient
            colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
            style={styles.featuresCardInner}
          >
            <Text style={styles.featuresTitle}>What's New in v3.0.0</Text>
            {[
              { icon: 'shield-checkmark' as const, text: 'Enhanced security with biometric authentication', color: colors.success },
              { icon: 'flash' as const, text: 'AI-powered compliance insights now 3x faster', color: colors.primary },
              { icon: 'document-text' as const, text: 'New document management with cloud sync', color: colors.secondary },
              { icon: 'bug' as const, text: 'Critical bug fixes and performance improvements', color: colors.warning },
            ].map((feature, i) => (
              <View key={i} style={styles.featureRow}>
                <View style={[styles.featureIconBg, { backgroundColor: `${feature.color}20` }]}>
                  <Ionicons name={feature.icon} size={16} color={feature.color} />
                </View>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </LinearGradient>
        </View>

        <TouchableOpacity
          style={[styles.updateBtn, Shadows.md]}
          onPress={() => Linking.openURL('https://play.google.com/store/apps/details?id=com.sanyog.conformity')}
          activeOpacity={0.85}
        >
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.updateBtnGradient}>
            <Ionicons name="cloud-download-outline" size={20} color="#FFFFFF" />
            <Text style={styles.updateBtnText}>Update Now</Text>
          </LinearGradient>
        </TouchableOpacity>

        <Text style={styles.footerText}>You cannot use the app without updating</Text>
      </View>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    heroCard: { width: '100%', borderRadius: BorderRadius.xl, overflow: 'hidden', marginBottom: 18 },
    heroCardInner: { padding: 18, alignItems: 'center' },
    illustrationArea: { alignItems: 'center', marginBottom: 18 },
    iconCircle: {
      width: 96,
      height: 96,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 12,
    },
    versionBadge: {
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: BorderRadius.full,
      marginBottom: 14,
    },
    versionText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
    title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: 12, lineHeight: 34 },
    description: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 18 },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 4 },
    metaChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.full, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    metaChipText: { fontSize: 11, fontWeight: '700', color: colors.textPrimary },
    featuresCard: {
      width: '100%',
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
      marginBottom: 24,
    },
    featuresCardInner: { padding: 16, gap: 4 },
    featuresTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
    featureIconBg: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    featureText: { fontSize: 13, color: colors.textSecondary, flex: 1, lineHeight: 18 },
    updateBtn: { width: '100%', borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: 16 },
    updateBtnGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      gap: 8,
    },
    updateBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
    footerText: { fontSize: 12, color: colors.textTertiary, textAlign: 'center' },
  });

export default ForceUpdateScreen;
