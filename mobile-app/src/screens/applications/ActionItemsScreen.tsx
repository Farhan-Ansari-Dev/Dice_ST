import React, { useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import EmptyState from '../../components/common/EmptyState';
import { api } from '../../services/api';

const TITLES: Record<string, string> = {
  pending_certifications: 'Pending Certifications',
  pending_documents: 'Pending Documents',
  renewals: 'Renewals',
  expiring_certificates: 'Expiring Certificates',
  payment_reminders: 'Payment Reminders',
  notifications: 'Notifications',
};

const ActionItemsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const category = route.params?.category ?? '';
  const title = TITLES[category] ?? 'Action Items';
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const { data = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['action-required-items', category],
    queryFn: async () => {
      const response = await api.get<any>(`/analytics/action-required/items?category=${category}`);
      return response?.data ?? [];
    },
    enabled: Boolean(category),
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity accessibilityLabel="Go back" onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={22} color={colors.textPrimary} /></TouchableOpacity>
        <View style={{ flex: 1 }}><Text style={styles.headerTitle}>{title}</Text><Text style={styles.headerSub}>Live items from your account</Text></View>
        <TouchableOpacity accessibilityLabel="Refresh items" onPress={() => refetch()} style={styles.refreshBtn}><Ionicons name="refresh" size={20} color={colors.primary} /></TouchableOpacity>
      </View>
      {isLoading ? <View style={styles.loader}><ActivityIndicator color={colors.primary} /><Text style={styles.loaderText}>Loading live items...</Text></View> : (
        <FlatList
          data={data}
          keyExtractor={(item: any) => String(item.id)}
          contentContainerStyle={styles.content}
          refreshing={isFetching}
          onRefresh={refetch}
          ListEmptyComponent={<EmptyState icon="checkmark-circle-outline" title="All clear" subtitle={`There are no ${title.toLowerCase()} right now.`} />}
          renderItem={({ item }: any) => (
            <View style={[styles.itemCard, Shadows.sm]}>
              <View style={styles.itemIcon}><Ionicons name="alert-circle-outline" size={20} color={colors.primary} /></View>
              <View style={{ flex: 1 }}><Text style={styles.itemTitle}>{item.title}</Text><Text style={styles.itemSub}>{item.subtitle}</Text></View>
              <View style={styles.status}><Text style={styles.statusText}>{String(item.status).replaceAll('_', ' ')}</Text></View>
            </View>
          )}
        />
      )}
    </View>
  );
};

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDark },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? colors.bgCardLight : '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  refreshBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' }, headerSub: { color: colors.textTertiary, fontSize: 11, marginTop: 2 },
  content: { padding: 20, paddingBottom: 40, flexGrow: 1 }, loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }, loaderText: { color: colors.textSecondary, fontSize: 13 },
  itemCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: BorderRadius.lg, backgroundColor: isDark ? colors.bgCard : '#FFFFFF', marginBottom: 10 },
  itemIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: `${colors.primary}14`, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' }, itemSub: { color: colors.textTertiary, fontSize: 12, marginTop: 4 },
  status: { backgroundColor: `${colors.warning}18`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 }, statusText: { color: colors.warning, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
});

export default ActionItemsScreen;
