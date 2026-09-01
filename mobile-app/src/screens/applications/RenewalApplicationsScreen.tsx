import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import EmptyState from '../../components/common/EmptyState';
import certificationService, { Certification } from '../../services/certificationService';

interface RenewalCard {
  id: string;
  name: string;
  type: string;
  expiryDate: string;
  daysLeft: number | string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const RENEWABLE = new Set(['active', 'expiring_soon', 'expired']);

const toRenewalCard = (c: Certification): RenewalCard => {
  const productName = typeof c.product_id === 'object' ? c.product_id?.name : undefined;
  let daysLeft: number | string = '—';
  let color = '#22C55E';
  if (c.expiry_date) {
    const diff = Math.ceil((new Date(c.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    daysLeft = diff;
    color = diff < 0 ? '#EF4444' : diff < 30 ? '#EF4444' : diff < 90 ? '#F59E0B' : '#22C55E';
  }
  return {
    id: c._id,
    name: productName ?? c.cert_type ?? 'Certificate',
    type: c.cert_number ? `${c.cert_type} • ${c.cert_number}` : c.cert_type,
    expiryDate: c.expiry_date ? new Date(c.expiry_date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
    daysLeft,
    color,
    icon: 'ribbon-outline',
  };
};

const RenewalApplicationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [items, setItems] = useState<RenewalCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const res = await certificationService.getCertifications({ limit: 100 });
      const certs = (res?.data ?? []).filter((c) => RENEWABLE.has(c.status));
      certs.sort((a, b) => new Date(a.expiry_date ?? 0).getTime() - new Date(b.expiry_date ?? 0).getTime());
      setItems(certs.map(toRenewalCard));
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Could not load certificates.');
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(false); }, [load]);

  const handleRenew = useCallback(async (id: string) => {
    try {
      await certificationService.renew(id);
      Alert.alert('Renewal started', 'A renewal application has been created. Track it under My Work.');
      load(true);
    } catch (e: any) {
      Alert.alert('Could not start renewal', e?.response?.data?.message ?? 'Please try again.');
    }
  }, [load]);

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Renewal Applications</Text>
        <View style={{ width: 40 }} />
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState icon={error ? 'cloud-offline-outline' : 'refresh-circle-outline'} title={error ? 'Could not load' : 'No Renewals Due'} subtitle={error ?? 'Your certifications are all current.'} />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />
        }
        renderItem={({ item }) => (
          <View style={[styles.renewCard, Shadows.md]}>
            <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.renewCardInner}>
              <View style={styles.renewRow}>
                <View style={[styles.renewIcon, { backgroundColor: `${item.color}20` }]}>
                  <Ionicons name={item.icon} size={22} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.renewName}>{item.name}</Text>
                  <Text style={styles.renewType}>{item.type}</Text>
                  <Text style={styles.renewExpiry}>Expires: {item.expiryDate}</Text>
                </View>
                <View style={[styles.daysBadge, { backgroundColor: `${item.color}20` }]}>
                  <Text style={[styles.daysValue, { color: item.color }]}>{item.daysLeft}</Text>
                  <Text style={[styles.daysLabel, { color: item.color }]}>days</Text>
                </View>
              </View>
              <TouchableOpacity style={[styles.startRenewalBtn, Shadows.sm]} onPress={() => handleRenew(item.id)} activeOpacity={0.85}>
                <LinearGradient colors={[item.color, `${item.color}CC`]} style={styles.startRenewalBtnGradient}>
                  <Ionicons name="refresh" size={14} color="#FFFFFF" />
                  <Text style={styles.startRenewalText}>Start Renewal Process</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}
      />
      )}
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? colors.bgCardLight : colors.border, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.textPrimary },
    listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
    renewCard: { marginBottom: 12, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    renewCardInner: { padding: 16, gap: 12 },
    renewRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    renewIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    renewName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    renewType: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    renewExpiry: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    daysBadge: { padding: 8, borderRadius: BorderRadius.md, alignItems: 'center' },
    daysValue: { fontSize: 20, fontWeight: '900' },
    daysLabel: { fontSize: 10, fontWeight: '600' },
    startRenewalBtn: { borderRadius: BorderRadius.md, overflow: 'hidden' },
    startRenewalBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 6 },
    startRenewalText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  });

export default RenewalApplicationsScreen;
