import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import ProgressBar from '../../components/common/ProgressBar';

const PROGRESS_ITEMS: any[] = [];

const CertificationProgressScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const totalCompleted = PROGRESS_ITEMS.reduce((s, i) => s + i.completed, 0);
  const totalItems = PROGRESS_ITEMS.reduce((s, i) => s + i.total, 0);
  const overallProgress = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Certification Progress</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Overall progress banner */}
        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={[styles.overallCard, Shadows.md]}>
          <Text style={styles.overallLabel}>OVERALL PROGRESS</Text>
          <Text style={styles.overallPercent}>{overallProgress}%</Text>
          <View style={styles.overallBar}>
            <View style={[styles.overallBarFill, { width: `${overallProgress}%` }]} />
          </View>
          <Text style={styles.overallSub}>BIS IS 13252 — SCS-2024-0042</Text>
        </LinearGradient>

        {PROGRESS_ITEMS.map((item) => {
          const progress = Math.round((item.completed / item.total) * 100);
          const isDone = item.completed === item.total;
          return (
            <View key={item.title} style={[styles.progressCard, Shadows.sm]}>
              <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.progressCardInner}>
                <View style={styles.progressTop}>
                  <View style={[styles.progressIcon, { backgroundColor: `${item.color}20` }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.progressTitle}>{item.title}</Text>
                    <Text style={styles.progressSub}>{item.completed} of {item.total} completed</Text>
                  </View>
                  {isDone ? (
                    <View style={[styles.doneBadge, { backgroundColor: `${colors.success}20` }]}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                    </View>
                  ) : item.completed > 0 ? (
                    <Text style={[styles.progressPct, { color: item.color }]}>{progress}%</Text>
                  ) : (
                    <View style={[styles.pendingBadge, { backgroundColor: `${colors.textTertiary}20` }]}>
                      <Text style={[styles.pendingText, { color: colors.textTertiary }]}>Pending</Text>
                    </View>
                  )}
                </View>
                <ProgressBar progress={progress} height={6} color={item.color} style={{ marginTop: 10 }} />
              </LinearGradient>
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
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.textPrimary },
    content: { paddingHorizontal: 20, paddingTop: 8 },
    overallCard: { borderRadius: BorderRadius.lg, padding: 20, marginBottom: 20 },
    overallLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5, marginBottom: 6 },
    overallPercent: { fontSize: 48, fontWeight: '900', color: '#FFFFFF', marginBottom: 8 },
    overallBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden', marginBottom: 10 },
    overallBarFill: { height: '100%', backgroundColor: '#FFFFFF', borderRadius: 4 },
    overallSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
    progressCard: { marginBottom: 12, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    progressCardInner: { padding: 16 },
    progressTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    progressIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    progressTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    progressSub: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
    doneBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    progressPct: { fontSize: 16, fontWeight: '800' },
    pendingBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full },
    pendingText: { fontSize: 11, fontWeight: '600' },
  });

export default CertificationProgressScreen;
