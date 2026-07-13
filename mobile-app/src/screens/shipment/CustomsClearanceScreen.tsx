import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const DOCS: any[] = [];

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  approved: { color: '#00C896', label: 'Approved' },
  pending: { color: '#FF9500', label: 'Pending' },
  na: { color: '#8A8FA3', label: 'N/A' },
};

const CustomsClearanceScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const statusTitle = 'Customs Status';
  const statusValue = '';
  const statusSub = '';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customs Clearance</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <LinearGradient colors={['#1A1560', '#6C63FF']} style={[styles.statusCard, Shadows.md]}>
          <Text style={styles.statusTitle}>{statusTitle}</Text>
          <Text style={styles.statusValue}>{statusValue}</Text>
          <Text style={styles.statusSub}>{statusSub}</Text>
        </LinearGradient>

        <Text style={styles.sectionTitle}>Document Checklist</Text>
        {DOCS.map((doc) => {
          const cfg = STATUS_CONFIG[doc.status];
          return (
            <View key={doc.name} style={[styles.docRow, Shadows.sm]}>
              <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.docRowInner}>
                <Ionicons name={doc.status === 'approved' ? 'checkmark-circle' : doc.status === 'pending' ? 'time-outline' : 'remove-circle-outline'} size={20} color={cfg.color} />
                <Text style={styles.docName}>{doc.name}</Text>
                <View style={[styles.statusTag, { backgroundColor: `${cfg.color}20` }]}>
                  <Text style={[styles.statusTagText, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </LinearGradient>
            </View>
          );
        })}

        <View style={[styles.dutyCard, Shadows.md]}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.dutyCardInner}>
            <Text style={styles.dutyTitle}>Customs Duty Estimate</Text>
            {[
              { label: 'Assessed Value', value: '' },
              { label: 'Basic Customs Duty', value: '' },
              { label: 'IGST', value: '' },
              { label: 'Total Payable', value: '' },
            ].map((r, i) => (
              <View key={r.label} style={[styles.dutyRow, i > 0 && { borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border }]}>
                <Text style={styles.dutyLabel}>{r.label}</Text>
                <Text style={[styles.dutyValue, i === 3 && { color: colors.primary, fontWeight: '800' }]}>{r.value}</Text>
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
    statusCard: { borderRadius: BorderRadius.lg, padding: 16, marginBottom: 20, gap: 4 },
    statusTitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5 },
    statusValue: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
    statusSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
    docRow: { marginBottom: 8, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    docRowInner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    docName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
    statusTagText: { fontSize: 11, fontWeight: '700' },
    dutyCard: { marginTop: 8, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    dutyCardInner: { padding: 16 },
    dutyTitle: { fontSize: 14, fontWeight: '800', color: colors.textPrimary, marginBottom: 12 },
    dutyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
    dutyLabel: { fontSize: 13, color: colors.textSecondary },
    dutyValue: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  });

export default CustomsClearanceScreen;
