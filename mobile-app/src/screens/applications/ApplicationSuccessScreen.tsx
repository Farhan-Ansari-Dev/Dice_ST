import React, { useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const ApplicationSuccessScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.content}>
        {/* Success Animation Area */}
        <View style={styles.successArea}>
          <View style={styles.outerRing} />
          <View style={styles.innerRing} />
          <LinearGradient colors={[colors.success, colors.successDark]} style={styles.successIcon}>
            <Ionicons name="checkmark" size={52} color="#FFFFFF" />
          </LinearGradient>
        </View>

        <Text style={styles.title}>Application Submitted!</Text>
        <Text style={styles.subtitle}>Your application has been received and is being processed by our team.</Text>

        <View style={[styles.appIdCard, Shadows.md]}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.appIdCardInner}>
            <Text style={styles.appIdLabel}>APPLICATION ID</Text>
            <Text style={styles.appIdValue}>SCS-2024-0068</Text>
            <Text style={styles.appIdNote}>Save this ID for tracking your application</Text>
          </LinearGradient>
        </View>

        <View style={[styles.stepsCard, Shadows.sm]}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.stepsCardInner}>
            <Text style={styles.stepsTitle}>What happens next?</Text>
            {[
              { step: 1, text: 'Manager assigned within 2 hours' },
              { step: 2, text: 'Document review completed in 2-3 days' },
              { step: 3, text: 'Lab testing coordination initiated' },
              { step: 4, text: 'Government filing within 5-7 days' },
            ].map((item) => (
              <View key={item.step} style={styles.stepRow}>
                <View style={[styles.stepNum, { backgroundColor: `${colors.primary}20` }]}>
                  <Text style={[styles.stepNumText, { color: colors.primary }]}>{item.step}</Text>
                </View>
                <Text style={styles.stepText}>{item.text}</Text>
              </View>
            ))}
          </LinearGradient>
        </View>

        <TouchableOpacity
          style={[styles.viewBtn, Shadows.md]}
          onPress={() => navigation.navigate('ApplicationDetail', { id: 'new' })}
          activeOpacity={0.85}
        >
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.viewBtnGradient}>
            <Text style={styles.viewBtnText}>View Application</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.goBack()}>
          <Text style={[styles.homeBtnText, { color: colors.primary }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    successArea: { alignItems: 'center', justifyContent: 'center', marginBottom: 28, position: 'relative' },
    outerRing: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 1, borderColor: `${colors.success}20` },
    innerRing: { position: 'absolute', width: 130, height: 130, borderRadius: 65, borderWidth: 2, borderColor: `${colors.success}30` },
    successIcon: { width: 100, height: 100, borderRadius: 30, alignItems: 'center', justifyContent: 'center', shadowColor: colors.success, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 12 },
    title: { fontSize: 26, fontWeight: '900', color: colors.textPrimary, textAlign: 'center', marginBottom: 8 },
    subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
    appIdCard: { width: '100%', borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, marginBottom: 16 },
    appIdCardInner: { padding: 20, alignItems: 'center' },
    appIdLabel: { fontSize: 10, fontWeight: '700', color: colors.textTertiary, letterSpacing: 1.5, marginBottom: 8 },
    appIdValue: { fontSize: 24, fontWeight: '900', color: colors.primary, marginBottom: 6 },
    appIdNote: { fontSize: 12, color: colors.textTertiary, textAlign: 'center' },
    stepsCard: { width: '100%', borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, marginBottom: 20 },
    stepsCardInner: { padding: 16 },
    stepsTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
    stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
    stepNum: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    stepNumText: { fontSize: 12, fontWeight: '800' },
    stepText: { fontSize: 13, color: colors.textSecondary, flex: 1 },
    viewBtn: { width: '100%', borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: 12 },
    viewBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
    viewBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
    homeBtn: { paddingVertical: 8 },
    homeBtnText: { fontSize: 14, fontWeight: '600' },
  });

export default ApplicationSuccessScreen;
