import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme, Typography, Shadows, BorderRadius, Spacing } from '../../theme';
import leadsService, { Lead, LeadStatus } from '../../services/leadsService';

const STATUS_META: Record<LeadStatus, { label: string; color: (c: any) => string; icon: any }> = {
  new:       { label: 'Received',   color: (c) => c.primary,  icon: 'time-outline' },
  contacted: { label: 'In Review',  color: (c) => c.warning,  icon: 'chatbubbles-outline' },
  qualified: { label: 'Qualified',  color: (c) => c.warning,  icon: 'checkmark-done-outline' },
  converted: { label: 'In Progress', color: (c) => c.success, icon: 'rocket-outline' },
  rejected:  { label: 'Closed',     color: (c) => c.error,    icon: 'close-circle-outline' },
};

export default function MyRequestsScreen() {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const navigation = useNavigation<any>();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      setLeads(await leadsService.mine());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.glassBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Requests</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.textSecondary} />
          <Text style={styles.emptyText}>Couldn’t load your requests.</Text>
          <TouchableOpacity onPress={load} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={leads}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const meta = STATUS_META[item.status] ?? STATUS_META.new;
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.service_name || item.product_description || 'Certification request'}</Text>
                  <View style={[styles.badge, { backgroundColor: meta.color(colors) + '20' }]}>
                    <Ionicons name={meta.icon} size={13} color={meta.color(colors)} />
                    <Text style={[styles.badgeText, { color: meta.color(colors) }]}>{meta.label}</Text>
                  </View>
                </View>
                {item.product_description ? <Text style={styles.cardSub}>Product: {item.product_description}</Text> : null}
                {item.target_markets?.length ? <Text style={styles.cardSub}>Market: {item.target_markets.join(', ')}</Text> : null}
                <Text style={styles.cardDate}>Submitted {new Date(item.created_at).toLocaleDateString()}</Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="receipt-outline" size={44} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No requests yet.</Text>
              <Text style={styles.emptySub}>Apply from a Hot Opportunity and track it here.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#0A0A0A' : '#F7F9FC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border },
  glassBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...Typography.h3, color: colors.textPrimary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: Spacing['4xl'], paddingHorizontal: Spacing.xl },
  listContent: { padding: Spacing.xl, flexGrow: 1 },
  card: { backgroundColor: colors.bgCard, padding: Spacing.lg, borderRadius: BorderRadius.xl, marginBottom: Spacing.md, ...Shadows.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xs },
  cardTitle: { ...Typography.body1, fontWeight: '700', color: colors.textPrimary, flex: 1, marginRight: Spacing.sm },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  badgeText: { ...Typography.caption, fontWeight: '700' },
  cardSub: { ...Typography.caption, color: colors.textSecondary, marginTop: 2 },
  cardDate: { ...Typography.caption, color: colors.textSecondary, marginTop: Spacing.sm, opacity: 0.7 },
  emptyText: { ...Typography.body1, color: colors.textSecondary, marginTop: Spacing.md, textAlign: 'center' },
  emptySub: { ...Typography.caption, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
  retryBtn: { marginTop: Spacing.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: colors.primary },
  retryText: { ...Typography.label, color: '#FFFFFF', fontWeight: '700' },
});
