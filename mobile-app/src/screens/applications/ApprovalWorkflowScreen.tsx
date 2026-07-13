import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const WORKFLOW_STAGES: any[] = [];

const ApprovalWorkflowScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const currentIndex = WORKFLOW_STAGES.findIndex((s) => s.status === 'current');
  const progress = Math.round((currentIndex / (WORKFLOW_STAGES.length - 1)) * 100);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Approval Workflow</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={[styles.progressBanner, Shadows.md]}>
          <Text style={styles.bannerLabel}>WORKFLOW PROGRESS</Text>
          <Text style={styles.bannerValue}>{progress}%</Text>
          <View style={styles.bannerBar}>
            <View style={[styles.bannerBarFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.bannerSub}>Stage {currentIndex + 1} of {WORKFLOW_STAGES.length}: {WORKFLOW_STAGES[currentIndex].stage}</Text>
        </LinearGradient>

        <View style={styles.workflowContainer}>
          {WORKFLOW_STAGES.map((stage, index) => {
            const isApproved = stage.status === 'approved';
            const isCurrent = stage.status === 'current';
            const isLast = index === WORKFLOW_STAGES.length - 1;
            return (
              <View key={stage.id} style={styles.stageRow}>
                <View style={styles.stageLeft}>
                  <View style={[styles.stageDot, {
                    backgroundColor: isApproved ? `${colors.success}20` : isCurrent ? `${colors.primary}20` : colors.bgCardLight,
                    borderColor: isApproved ? colors.success : isCurrent ? colors.primary : colors.border,
                    borderWidth: isCurrent ? 3 : 2,
                  }]}>
                    {isApproved ? (
                      <Ionicons name="checkmark" size={14} color={colors.success} />
                    ) : isCurrent ? (
                      <View style={[styles.currentPulse, { backgroundColor: colors.primary }]} />
                    ) : (
                      <Text style={[styles.stageNum, { color: colors.textTertiary }]}>{index + 1}</Text>
                    )}
                  </View>
                  {!isLast && (
                    <View style={[styles.stageLine, { backgroundColor: isApproved ? colors.success : isDark ? 'rgba(255,255,255,0.08)' : colors.border }]} />
                  )}
                </View>
                <View style={[styles.stageContent, Shadows.sm]}>
                  <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={[styles.stageCardInner, isCurrent && { borderWidth: 1, borderColor: colors.primary }]}>
                    <Text style={[styles.stageName, isCurrent && { color: colors.primary }]}>{stage.stage}</Text>
                    <Text style={styles.stageApprover}>Approver: {stage.approver}</Text>
                    <Text style={styles.stageDate}>{isApproved ? 'Approved: ' : isCurrent ? 'Started: ' : 'Expected: '}{stage.date}</Text>
                  </LinearGradient>
                </View>
              </View>
            );
          })}
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
    progressBanner: { borderRadius: BorderRadius.lg, padding: 20, marginBottom: 24 },
    bannerLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5, marginBottom: 6 },
    bannerValue: { fontSize: 40, fontWeight: '900', color: '#FFFFFF', marginBottom: 8 },
    bannerBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
    bannerBarFill: { height: '100%', backgroundColor: '#FFFFFF', borderRadius: 3 },
    bannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
    workflowContainer: { gap: 0 },
    stageRow: { flexDirection: 'row', gap: 12 },
    stageLeft: { alignItems: 'center', width: 36 },
    stageDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    currentPulse: { width: 12, height: 12, borderRadius: 6 },
    stageNum: { fontSize: 13, fontWeight: '700' },
    stageLine: { width: 2, flex: 1, marginTop: 4 },
    stageContent: { flex: 1, marginBottom: 12, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    stageCardInner: { padding: 12, borderRadius: BorderRadius.lg },
    stageName: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
    stageApprover: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    stageDate: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  });

export default ApprovalWorkflowScreen;
