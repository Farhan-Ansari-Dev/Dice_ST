import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const TIMELINE_STEPS: any[] = [];

const STATUS_CONFIG = {
  completed: { color: '#00C896', bg: 'rgba(0,200,150,0.15)', icon: 'checkmark' as const },
  current: { color: '#6C63FF', bg: 'rgba(108,99,255,0.15)', icon: 'ellipse' as const },
  upcoming: { color: '#8896AB', bg: 'rgba(136,150,171,0.12)', icon: 'ellipse-outline' as const },
};

const CertificationTimelineScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Certification Timeline</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.certInfoCard, Shadows.sm]}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.certInfoInner}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.certBadge}>
              <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.certInfoName}>BIS IS 13252 (Part 1)</Text>
              <Text style={styles.certInfoApp}>Application: SCS-2024-0042</Text>
            </View>
            <View style={[styles.progressBadge, { backgroundColor: `${colors.warning}20` }]}>
              <Text style={[styles.progressText, { color: colors.warning }]}>In Progress</Text>
            </View>
          </LinearGradient>
        </View>

        {TIMELINE_STEPS.map((step, index) => {
          const config = STATUS_CONFIG[step.status as keyof typeof STATUS_CONFIG];
          const isLast = index === TIMELINE_STEPS.length - 1;
          return (
            <View key={step.step} style={styles.timelineRow}>
              <View style={styles.timelineLeft}>
                <View style={[styles.stepCircle, { backgroundColor: config.bg, borderColor: config.color }]}>
                  <Ionicons name={config.icon} size={14} color={config.color} />
                </View>
                {!isLast && <View style={[styles.timelineLine, { backgroundColor: step.status === 'completed' ? '#00C896' : isDark ? 'rgba(255,255,255,0.08)' : colors.border }]} />}
              </View>
              <View style={[styles.timelineContent, Shadows.sm, { marginBottom: isLast ? 0 : 12 }]}>
                <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.timelineCardInner}>
                  <View style={styles.stepHeader}>
                    <View style={[styles.stepIconBg, { backgroundColor: `${config.color}20` }]}>
                      <Ionicons name={step.icon} size={16} color={config.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.stepTitle, step.status === 'current' && { color: config.color }]}>{step.title}</Text>
                      <Text style={styles.stepDate}>{step.date}</Text>
                    </View>
                  </View>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </LinearGradient>
              </View>
            </View>
          );
        })}
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
    certInfoCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, marginBottom: 24 },
    certInfoInner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    certBadge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    certInfoName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    certInfoApp: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
    progressBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
    progressText: { fontSize: 11, fontWeight: '700' },
    timelineRow: { flexDirection: 'row', gap: 12 },
    timelineLeft: { alignItems: 'center', width: 32 },
    stepCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    timelineLine: { width: 2, flex: 1, marginTop: 4 },
    timelineContent: { flex: 1, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, marginBottom: 12 },
    timelineCardInner: { padding: 14 },
    stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    stepIconBg: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    stepTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    stepDate: { fontSize: 11, color: colors.textTertiary, marginTop: 1 },
    stepDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  });

export default CertificationTimelineScreen;
