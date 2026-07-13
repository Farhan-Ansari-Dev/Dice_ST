import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import EmptyState from '../../components/common/EmptyState';

const RENEWALS: any[] = [];

const URGENCY_CONFIG = {
  critical: { color: '#EF4444', label: 'Critical' },
  high: { color: '#F59E0B', label: 'Due Soon' },
  medium: { color: '#00D4FF', label: 'Upcoming' },
  low: { color: '#00C896', label: 'Valid' },
};

const RenewalCenterScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => { setRefreshing(true); await new Promise(r => setTimeout(r, 800)); setRefreshing(false); };
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Renewal Center</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={RENEWALS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState icon="refresh-circle-outline" title="No Renewals" subtitle="All certifications are valid." />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View style={styles.summaryRow}>
            {[
              { label: 'Critical', count: 1, color: '#EF4444' },
              { label: 'Due Soon', count: 1, color: '#F59E0B' },
              { label: 'Upcoming', count: 1, color: '#00D4FF' },
            ].map((s) => (
              <View key={s.label} style={[styles.summaryCard, Shadows.sm]}>
                <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.summaryCardInner}>
                  <Text style={[styles.summaryCount, { color: s.color }]}>{s.count}</Text>
                  <Text style={styles.summaryLabel}>{s.label}</Text>
                </LinearGradient>
              </View>
            ))}
          </View>
        }
        renderItem={({ item }) => {
          const config = URGENCY_CONFIG[item.urgency as keyof typeof URGENCY_CONFIG];
          return (
            <View style={[styles.renewalCard, Shadows.md, item.urgency === 'critical' && { borderColor: `${colors.error}40` }]}>
              <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.renewalCardInner}>
                <View style={styles.renewalRow}>
                  <View style={[styles.renewalIcon, { backgroundColor: `${config.color}20` }]}>
                    <Ionicons name={item.icon} size={22} color={config.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.renewalName}>{item.name}</Text>
                    <Text style={styles.renewalType}>{item.type}</Text>
                    <Text style={styles.expiryDate}>Expires: {item.expiryDate}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={[styles.daysCard, { backgroundColor: `${config.color}20` }]}>
                      <Text style={[styles.daysValue, { color: config.color }]}>{item.daysLeft}</Text>
                      <Text style={[styles.daysLabel, { color: config.color }]}>days</Text>
                    </View>
                  </View>
                </View>

                {(item.urgency === 'critical' || item.urgency === 'high') && (
                  <TouchableOpacity style={[styles.renewBtn, Shadows.sm]} onPress={() => navigation.navigate('NewApplication')} activeOpacity={0.85}>
                    <LinearGradient colors={[config.color, `${config.color}CC`]} style={styles.renewBtnGradient}>
                      <Ionicons name="refresh" size={14} color="#FFFFFF" />
                      <Text style={styles.renewBtnText}>Renew Now</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </LinearGradient>
            </View>
          );
        }}
      />
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? colors.bgCardLight : colors.border, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
    summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    summaryCard: { flex: 1, borderRadius: BorderRadius.md, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    summaryCardInner: { padding: 12, alignItems: 'center' },
    summaryCount: { fontSize: 22, fontWeight: '800' },
    summaryLabel: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    renewalCard: { marginBottom: 12, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    renewalCardInner: { padding: 16 },
    renewalRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    renewalIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    renewalName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    renewalType: { fontSize: 12, color: colors.textTertiary, marginTop: 1 },
    expiryDate: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    daysCard: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.md },
    daysValue: { fontSize: 20, fontWeight: '900' },
    daysLabel: { fontSize: 10, fontWeight: '600' },
    renewBtn: { borderRadius: BorderRadius.md, overflow: 'hidden' },
    renewBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 6 },
    renewBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  });

export default RenewalCenterScreen;
