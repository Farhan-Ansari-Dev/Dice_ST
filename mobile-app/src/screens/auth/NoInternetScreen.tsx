import React, { useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const NoInternetScreen: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
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
          <LinearGradient colors={[colors.warning, colors.warningDark]} style={styles.iconCircle}>
            <Ionicons name="wifi-outline" size={52} color="#FFFFFF" />
          </LinearGradient>
          <View style={[styles.slashLine, { transform: [{ rotate: '-45deg' }] }]} />
        </View>

        <Text style={styles.title}>No Internet Connection</Text>
        <Text style={styles.description}>
          Check your connection and try again. Make sure you're connected to Wi-Fi or have mobile data enabled.
        </Text>

        <View style={[styles.tipsCard, Shadows.sm]}>
          <LinearGradient
            colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
            style={styles.tipsCardInner}
          >
            <Text style={styles.tipsTitle}>Troubleshooting Tips</Text>
            {[
              'Turn Wi-Fi off and on again',
              'Check if airplane mode is enabled',
              'Try switching between Wi-Fi and mobile data',
              'Restart your router if on Wi-Fi',
            ].map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <View style={[styles.tipDot, { backgroundColor: colors.warning }]} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </LinearGradient>
        </View>

        <TouchableOpacity
          style={[styles.retryBtn, Shadows.md]}
          onPress={onRetry}
          activeOpacity={0.85}
        >
          <LinearGradient colors={[colors.warning, colors.warningDark]} style={styles.retryBtnGradient}>
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
            <Text style={styles.retryBtnText}>Retry</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    illustrationArea: { alignItems: 'center', justifyContent: 'center', marginBottom: 36, position: 'relative' },
    iconCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.warning,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 12,
    },
    slashLine: {
      position: 'absolute',
      width: 120,
      height: 4,
      backgroundColor: colors.error,
      borderRadius: 2,
    },
    title: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: 12 },
    description: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
    tipsCard: {
      width: '100%',
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
      marginBottom: 28,
    },
    tipsCardInner: { padding: 16 },
    tipsTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
    tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
    tipDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
    tipText: { fontSize: 13, color: colors.textSecondary, flex: 1, lineHeight: 20 },
    retryBtn: { width: '100%', borderRadius: BorderRadius.lg, overflow: 'hidden' },
    retryBtnGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      gap: 8,
    },
    retryBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  });

export default NoInternetScreen;
