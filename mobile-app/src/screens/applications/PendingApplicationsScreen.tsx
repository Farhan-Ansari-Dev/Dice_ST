import React, { useMemo } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import EmptyState from '../../components/common/EmptyState';
import { useApplicationsByBucket } from '../../hooks/useApplicationsByBucket';

const PendingApplicationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { items: PENDING, loading, refreshing, error, refresh } = useApplicationsByBucket('pending');
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Action</Text>
        <View style={{ width: 40 }} />
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
      <FlatList
        data={PENDING}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState icon={error ? 'cloud-offline-outline' : 'document-text-outline'} title={error ? 'Could not load' : 'No Pending Actions'} subtitle={error ?? 'All applications are up to date.'} />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View style={[styles.alertCard, { backgroundColor: `${colors.warning}15`, borderColor: `${colors.warning}30` }]}>
            <Ionicons name="alert-circle" size={18} color={colors.warning} />
            <Text style={[styles.alertText, { color: colors.warning }]}>{PENDING.length} applications waiting for your action</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.pendCard, Shadows.md]}>
            <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.pendCardInner}>
              <View style={styles.pendRow}>
                <View style={[styles.pendIcon, { backgroundColor: `${item.color}20` }]}>
                  <Ionicons name={item.icon} size={22} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pendName}>{item.name}</Text>
                  <Text style={styles.pendType}>{item.type} • {item.appId}</Text>
                </View>
              </View>
              <View style={[styles.actionCard, { backgroundColor: `${colors.warning}10`, borderColor: `${colors.warning}30` }]}>
                <Ionicons name="chevron-forward-circle" size={16} color={colors.warning} />
                <Text style={[styles.actionText, { color: colors.warning }]}>Action Required: {item.action}</Text>
              </View>
              <View style={styles.pendFooter}>
                <Text style={styles.dueText}>Due: {item.dueDate}</Text>
                <TouchableOpacity style={[styles.actBtn, { backgroundColor: `${colors.primary}20` }]} onPress={() => navigation.navigate('ApplicationDetail', { id: item.id })}>
                  <Text style={[styles.actBtnText, { color: colors.primary }]}>Take Action</Text>
                  <Ionicons name="arrow-forward" size={12} color={colors.primary} />
                </TouchableOpacity>
              </View>
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
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
    alertCard: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: 16 },
    alertText: { fontSize: 13, fontWeight: '600', flex: 1 },
    pendCard: { marginBottom: 12, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    pendCardInner: { padding: 16, gap: 12 },
    pendRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    pendIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    pendName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    pendType: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    actionCard: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: BorderRadius.md, borderWidth: 1 },
    actionText: { fontSize: 13, fontWeight: '600' },
    pendFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    dueText: { fontSize: 12, color: colors.textTertiary },
    actBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full },
    actBtnText: { fontSize: 12, fontWeight: '700' },
  });

export default PendingApplicationsScreen;
