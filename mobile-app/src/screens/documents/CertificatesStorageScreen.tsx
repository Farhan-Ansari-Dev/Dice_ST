import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import EmptyState from '../../components/common/EmptyState';

const CERTIFICATES: any[] = [];

const STATUS_CONFIG = {
  valid: { color: '#00C896', label: 'Valid', bg: '#00C89620' },
  expiring: { color: '#FF9500', label: 'Expiring', bg: '#FF950020' },
  expired: { color: '#FF3B30', label: 'Expired', bg: '#FF3B3020' },
  warning: { color: '#FFCC00', label: 'Due Soon', bg: '#FFCC0020' },
};

const CertificatesStorageScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [filter, setFilter] = useState<'all' | 'valid' | 'expiring' | 'expired'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => { setRefreshing(true); await new Promise(r => setTimeout(r, 800)); setRefreshing(false); };
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const filtered = filter === 'all' ? CERTIFICATES : CERTIFICATES.filter((c) => c.status === filter);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Certificates Storage</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        {[
          { label: 'Total', value: CERTIFICATES.length, color: colors.primary },
          { label: 'Valid', value: CERTIFICATES.filter((c) => c.status === 'valid').length, color: '#00C896' },
          { label: 'Expiring', value: CERTIFICATES.filter((c) => c.status === 'expiring' || c.status === 'warning').length, color: '#FF9500' },
          { label: 'Expired', value: CERTIFICATES.filter((c) => c.status === 'expired').length, color: '#FF3B30' },
        ].map((s) => (
          <View key={s.label} style={[styles.statCard, Shadows.sm, { borderTopColor: s.color, borderTopWidth: 3 }]}>
            <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.statCardInner}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </LinearGradient>
          </View>
        ))}
      </View>

      {/* Filter Row */}
      <View style={styles.filterRow}>
        {(['all', 'valid', 'expiring', 'expired'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && { backgroundColor: colors.primary }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterChipText, filter === f && { color: '#FFFFFF' }]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState icon="ribbon-outline" title="No Certificates Stored" subtitle="Your certificates will be stored here." />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        renderItem={({ item }) => {
          const cfg = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG];
          return (
            <View style={[styles.certCard, Shadows.md]}>
              <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.certCardInner}>
                <View style={styles.certRow}>
                  <View style={[styles.certIcon, { backgroundColor: `${cfg.color}20` }]}>
                    <Ionicons name="ribbon" size={22} color={cfg.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.certName}>{item.name}</Text>
                    <Text style={styles.certNo}>{item.certNo}</Text>
                    <Text style={styles.certProduct}>{item.product}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                      <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                    <Text style={styles.expiryText}>Exp: {item.expiry}</Text>
                    {item.daysLeft > 0 && (
                      <Text style={[styles.daysLeft, { color: cfg.color }]}>{item.daysLeft}d left</Text>
                    )}
                  </View>
                </View>
                <View style={styles.certActions}>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: `${colors.primary}15` }]}>
                    <Ionicons name="download-outline" size={14} color={colors.primary} />
                    <Text style={[styles.actionBtnText, { color: colors.primary }]}>Download</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: `${colors.success}15` }]}>
                    <Ionicons name="share-outline" size={14} color={colors.success} />
                    <Text style={[styles.actionBtnText, { color: colors.success }]}>Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: `${colors.warning}15` }]}>
                    <Ionicons name="qr-code-outline" size={14} color={colors.warning} />
                    <Text style={[styles.actionBtnText, { color: colors.warning }]}>QR</Text>
                  </TouchableOpacity>
                </View>
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
    statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 12 },
    statCard: { flex: 1, borderRadius: BorderRadius.md, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    statCardInner: { padding: 10, alignItems: 'center' },
    statValue: { fontSize: 20, fontWeight: '800' },
    statLabel: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },
    filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 12 },
    filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: BorderRadius.full, backgroundColor: isDark ? colors.bgCardLight : colors.border },
    filterChipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    listContent: { paddingHorizontal: 20, paddingBottom: 40 },
    certCard: { marginBottom: 12, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    certCardInner: { padding: 14 },
    certRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
    certIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    certName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    certNo: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    certProduct: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
    statusText: { fontSize: 10, fontWeight: '700' },
    expiryText: { fontSize: 11, color: colors.textTertiary },
    daysLeft: { fontSize: 11, fontWeight: '700' },
    certActions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border, paddingTop: 10 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 7, borderRadius: BorderRadius.md },
    actionBtnText: { fontSize: 12, fontWeight: '600' },
  });

export default CertificatesStorageScreen;
