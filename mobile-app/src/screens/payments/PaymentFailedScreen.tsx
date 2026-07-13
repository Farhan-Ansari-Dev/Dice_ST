import React, { useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const PaymentFailedScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.content}>
        <View style={styles.iconArea}>
          <LinearGradient colors={[colors.error, colors.errorDark]} style={styles.errorCircle}>
            <Ionicons name="close" size={52} color="#FFFFFF" />
          </LinearGradient>
        </View>

        <Text style={styles.title}>Payment Failed</Text>
        <Text style={styles.subtitle}>Your payment could not be processed. Please try again.</Text>

        <View style={[styles.reasonCard, { backgroundColor: `${colors.error}15`, borderColor: `${colors.error}30` }]}>
          <Ionicons name="alert-circle" size={18} color={colors.error} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.reasonTitle, { color: colors.error }]}>Reason</Text>
            <Text style={[styles.reasonText, { color: colors.textSecondary }]}>Transaction declined by bank. Insufficient funds or daily limit exceeded.</Text>
          </View>
        </View>

        <View style={[styles.infoCard, Shadows.sm]}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.infoCardInner}>
            <Text style={styles.infoTitle}>What you can try:</Text>
            {['Use a different payment method', 'Check your bank account balance', 'Try UPI or Net Banking instead', 'Contact your bank if issue persists'].map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <Ionicons name="checkmark-circle-outline" size={14} color={colors.textTertiary} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </LinearGradient>
        </View>

        <TouchableOpacity style={[styles.retryBtn, Shadows.md]} onPress={() => navigation.navigate('PaymentGateway')} activeOpacity={0.85}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.retryBtnGradient}>
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
            <Text style={styles.retryBtnText}>Try Again</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.supportBtn} onPress={() => navigation.navigate('SupportCenter')}>
          <Text style={[styles.supportBtnText, { color: colors.textSecondary }]}>Contact Support</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    iconArea: { marginBottom: 24 },
    errorCircle: { width: 100, height: 100, borderRadius: 30, alignItems: 'center', justifyContent: 'center', shadowColor: colors.error, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 12 },
    title: { fontSize: 26, fontWeight: '900', color: colors.textPrimary, textAlign: 'center', marginBottom: 8 },
    subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
    reasonCard: { width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: BorderRadius.lg, borderWidth: 1, marginBottom: 16 },
    reasonTitle: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
    reasonText: { fontSize: 13, lineHeight: 20 },
    infoCard: { width: '100%', borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, marginBottom: 20 },
    infoCardInner: { padding: 16 },
    infoTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
    tipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    tipText: { fontSize: 13, color: colors.textSecondary },
    retryBtn: { width: '100%', borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: 12 },
    retryBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
    retryBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
    supportBtn: { paddingVertical: 8 },
    supportBtnText: { fontSize: 14, fontWeight: '600' },
  });

export default PaymentFailedScreen;
