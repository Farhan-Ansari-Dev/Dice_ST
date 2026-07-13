import React, { useMemo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const MaintenanceScreen: React.FC = () => {
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
        <View style={styles.illustrationArea}>
          <LinearGradient colors={[colors.secondary, colors.secondaryDark]} style={styles.iconCircle}>
            <Ionicons name="construct" size={52} color="#FFFFFF" />
          </LinearGradient>
        </View>

        <Text style={styles.title}>Under Maintenance</Text>
        <Text style={styles.description}>
          We're currently performing scheduled maintenance to improve your experience. We'll be back shortly.
        </Text>

        <View style={[styles.etaCard, Shadows.md]}>
          <LinearGradient
            colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
            style={styles.etaCardInner}
          >
            <Text style={styles.etaLabel}>ESTIMATED COMPLETION</Text>
            <Text style={styles.etaTime}>2:00 AM IST</Text>
            <Text style={styles.etaDate}>December 20, 2024</Text>
          </LinearGradient>
        </View>

        <View style={[styles.infoCard, Shadows.sm]}>
          <LinearGradient
            colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
            style={styles.infoCardInner}
          >
            {[
              { icon: 'server-outline' as const, text: 'Database optimization in progress' },
              { icon: 'shield-checkmark-outline' as const, text: 'Security patches being applied' },
              { icon: 'rocket-outline' as const, text: 'Performance improvements being deployed' },
            ].map((item, i) => (
              <View key={i} style={styles.infoRow}>
                <View style={[styles.infoIconBg, { backgroundColor: `${colors.secondary}20` }]}>
                  <Ionicons name={item.icon} size={16} color={colors.secondary} />
                </View>
                <Text style={styles.infoText}>{item.text}</Text>
              </View>
            ))}
          </LinearGradient>
        </View>

        <Text style={styles.contactText}>
          For urgent support, contact{' '}
          <Text style={{ color: colors.primary, fontWeight: '600' }}>info@sanyogconformity.com</Text>
        </Text>
      </View>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    illustrationArea: { alignItems: 'center', marginBottom: 32 },
    iconCircle: {
      width: 100,
      height: 100,
      borderRadius: 30,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.secondary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 12,
    },
    title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: 12 },
    description: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
    etaCard: {
      width: '100%',
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
      marginBottom: 16,
    },
    etaCardInner: { padding: 20, alignItems: 'center' },
    etaLabel: { fontSize: 10, fontWeight: '700', color: colors.textTertiary, letterSpacing: 1.5, marginBottom: 8 },
    etaTime: { fontSize: 32, fontWeight: '800', color: colors.secondary, marginBottom: 4 },
    etaDate: { fontSize: 14, color: colors.textSecondary },
    infoCard: {
      width: '100%',
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
      marginBottom: 24,
    },
    infoCardInner: { padding: 16, gap: 12 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    infoIconBg: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    infoText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
    contactText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  });

export default MaintenanceScreen;
