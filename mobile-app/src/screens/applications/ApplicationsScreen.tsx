import React, { useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import Badge, { getStatusVariant } from '../../components/common/Badge';
import SearchBar from '../../components/common/SearchBar';
import ProgressBar from '../../components/common/ProgressBar';
import EmptyState from '../../components/common/EmptyState';
import { formatDate } from '../../utils/formatters';
import { useDebounce } from '../../hooks/useDebounce';

import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';

const FILTERS = ['All', 'Certifications', 'Inspection', 'Testing'];

const ApplicationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [activeFilter, setActiveFilter] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const KANBAN_COLUMNS = useMemo(() => [
    { id: 'submitted', label: 'Submitted', color: colors.primary },
    { id: 'under_review', label: 'In Review', color: colors.secondary },
    { id: 'additional_docs_required', label: 'Docs Required', color: colors.warning },
    { id: 'approved', label: 'Approved', color: colors.success },
    { id: 'rejected', label: 'Rejected', color: colors.error },
  ], [colors]);

  const { data: applicationsData, isLoading, refetch } = useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const res = await api.get('/applications') as any;
      return res?.data || [];
    }
  });

  const STATUS_PROGRESS: Record<string, number> = {
    draft: 5, submitted: 15, docs_review: 30, docs_required: 25,
    tech_review: 50, testing: 65, approval_pending: 80,
    approved: 95, cert_issued: 100, rejected: 100, on_hold: 0, cancelled: 0,
  };

  const APPLICATIONS = useMemo(() => {
    if (!applicationsData) return [];
    return applicationsData.map((a: any) => ({
      id: a._id,
      appNo: a.application_number,
      product: a.product_id?.name || a.cert_type,
      certType: a.cert_type,
      status: a.status,
      category: a.category || 'Certifications',
      progress: STATUS_PROGRESS[a.status] ?? 30,
      submittedDate: a.created_at || a.createdAt,
      assignedTo: a.primary_assignee?.name || a.assigned_to?.name,
    }));
  }, [applicationsData]);

  type UiApplication = (typeof APPLICATIONS)[number];

  const filtered = APPLICATIONS.filter((app: any) => {
    const matchesSearch =
      app.appNo.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      app.product.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      app.certType.toLowerCase().includes(debouncedSearch.toLowerCase());
    
    if (activeFilter === 'All') return matchesSearch;
    return matchesSearch && app.category === activeFilter;
  });

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu-outline" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Applications</Text>
          <Text style={styles.headerSubtitle}>{APPLICATIONS.length} total applications</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.viewToggle, viewMode === 'kanban' && styles.viewToggleActive]}
            onPress={() => setViewMode(viewMode === 'list' ? 'kanban' : 'list')}
          >
            <Ionicons
              name={viewMode === 'list' ? 'grid-outline' : 'list-outline'}
              size={18}
              color={viewMode === 'kanban' ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('NewApplication')}
          >
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.addButtonGradient}>
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'kanban' ? (
        /* Kanban View */
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.kanbanScroll}>
          {KANBAN_COLUMNS.map((col) => (
            <View key={col.id} style={styles.kanbanColumn}>
              <View style={styles.kanbanHeader}>
                <View style={[styles.kanbanDot, { backgroundColor: col.color }]} />
                <Text style={styles.kanbanTitle}>{col.label}</Text>
                <View style={[styles.kanbanCount, { backgroundColor: col.color + '30' }]}>
                  <Text style={[styles.kanbanCountText, { color: col.color }]}> 
                    {APPLICATIONS.filter((a: UiApplication) => a.status === col.id).length}
                  </Text>
                </View>
              </View>
              {APPLICATIONS.filter((a: UiApplication) => a.status === col.id).map((app: UiApplication) => (
                <TouchableOpacity
                  key={app.id}
                  style={styles.kanbanCard}
                  onPress={() => navigation.navigate('ApplicationDetail', { id: app.id })}
                >
                  <Text style={styles.kanbanAppNo}>{app.appNo}</Text>
                  <Text style={styles.kanbanProduct} numberOfLines={2}>{app.product}</Text>
                  <Text style={styles.kanbanCert}>{app.certType}</Text>
                  <ProgressBar progress={app.progress} height={3} color={col.color} style={{ marginTop: 10 }} />
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>
      ) : (
        /* List View */
        <FlatList
          ref={flatListRef}
          key={activeFilter}
          data={filtered}
          keyExtractor={(item) => item.id}
          style={styles.flatList}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
          ListHeaderComponent={
            <View>
              <View style={styles.searchWrapper}>
                <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Search applications..." />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersRow}
                style={styles.filtersScroll}
                contentInsetAdjustmentBehavior="never"
              >
                {FILTERS.map((filter) => (
                  <TouchableOpacity
                    key={filter}
                    onPress={() => handleFilterChange(filter)}
                    style={[styles.filterTab, activeFilter === filter && styles.filterTabActive]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterTabText, activeFilter === filter && styles.filterTabTextActive]}>
                      {filter}
                    </Text>
                    {activeFilter === filter && (
                      <View style={styles.filterTabIndicator}>
                        <LinearGradient
                          colors={[colors.primary, colors.primaryDark]}
                          style={StyleSheet.absoluteFill}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          }
          stickyHeaderIndices={[0]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="document-text-outline"
              title="No applications found"
              subtitle="Submit a new certification application to get started"
              actionLabel="New Application"
              onAction={() => navigation.navigate('NewApplication')}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.appCard, Shadows.md]}
              onPress={() => navigation.navigate('ApplicationDetail', { id: item.id })}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isDark ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.01)'] : ['#FFFFFF', '#F8FAFC']}
                style={styles.appCardInner}
              >
                {/* Top Row: Meta info & Status */}
                <View style={styles.appCardTop}>
                  <View style={styles.categoryTag}>
                    <Text style={styles.categoryTagText}>{item.category.toUpperCase()}</Text>
                  </View>
                  <View style={styles.statusBadgeWrapper}>
                    <Badge
                      label={item.status.replace(/_/g, ' ').toUpperCase()}
                      variant={getStatusVariant(item.status)}
                      size="sm"
                      dot
                    />
                  </View>
                </View>

                {/* Middle Row: Details */}
                <View style={styles.appCardDetails}>
                  <Text style={styles.appNo}>{item.appNo}</Text>
                  <Text style={styles.appProduct} numberOfLines={1}>{item.product}</Text>
                  <Text style={styles.appCertType}>{item.certType}</Text>
                </View>

                {/* Progress Bar with glow */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Progress</Text>
                    <Text style={styles.progressPercent}>{item.progress}%</Text>
                  </View>
                  <ProgressBar progress={item.progress} height={6} color={colors.primary} />
                </View>

                {/* Bottom Row: Footer metadata */}
                <View style={styles.appCardFooter}>
                  <View style={styles.appMetaGroup}>
                    <View style={styles.appMeta}>
                      <Ionicons name="calendar-clear-outline" size={14} color={colors.primary} />
                      <Text style={styles.appMetaText}>{formatDate(item.submittedDate)}</Text>
                    </View>
                    {item.assignedTo && (
                      <View style={[styles.appMeta, { marginLeft: 16 }]}>
                        <Ionicons name="person-circle-outline" size={16} color={colors.primary} />
                        <Text style={styles.appMetaText}>{item.assignedTo}</Text>
                      </View>
                    )}
                  </View>
                  {/* Action Button */}
                  <TouchableOpacity style={styles.viewBtn}>
                    <Text style={styles.viewBtnText}>Details</Text>
                    <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    menuBtn: {
      width: 40,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 12,
    },
    headerTitle: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
    headerSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    headerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    viewToggle: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? colors.bgCardLight : colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    viewToggleActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}20` },
    addButton: { borderRadius: 14, overflow: 'hidden' },
    addButtonGradient: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    searchWrapper: { marginBottom: 16 },
    filtersRow: { paddingHorizontal: 4, gap: 20, alignItems: 'center' },
    filterTab: {
      paddingBottom: 8,
      position: 'relative',
    },
    filterTabActive: {},
    filterTabText: { fontSize: 14, color: colors.textSecondary, fontWeight: '600', letterSpacing: 0.5 },
    filterTabTextActive: { color: colors.primary, fontWeight: '800' },
    filterTabIndicator: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 3,
      borderTopLeftRadius: 3,
      borderTopRightRadius: 3,
      overflow: 'hidden',
    },
    flatList: { flex: 1 },
    filtersScroll: { marginBottom: 12 },
    listContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 100, flexGrow: 1 },
    
    // Glassmorphic Card Styles
    appCard: {
      marginHorizontal: 20,
      marginBottom: 16,
      borderRadius: BorderRadius.xl,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      ...Shadows.md,
    },
    appCardInner: { padding: 0 },
    appCardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      borderStyle: 'dashed',
    },
    categoryTag: { backgroundColor: 'rgba(108,99,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    categoryTagText: { fontSize: 10, fontWeight: '800', color: colors.primary, letterSpacing: 1 },
    statusBadgeWrapper: { },
    appCardDetails: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
    appNo: { fontSize: 12, color: colors.textSecondary, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
    appProduct: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
    appCertType: { fontSize: 13, color: colors.textSecondary },
    progressContainer: { marginTop: 12, paddingHorizontal: 20 },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    progressLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
    progressPercent: { fontSize: 12, fontWeight: '800', color: colors.primary },
    appCardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      marginTop: 8,
      backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
    },
    appMetaGroup: { flexDirection: 'row', alignItems: 'center' },
    appMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    appMetaText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
    appAmountText: { fontSize: 16, color: colors.success, fontWeight: '800' },
    viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    viewBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
    // Kanban
    kanbanScroll: { paddingTop: 16 },
    kanbanColumn: {
      width: 220,
      marginLeft: 16,
      marginBottom: 20,
    },
    kanbanHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    kanbanDot: { width: 8, height: 8, borderRadius: 4 },
    kanbanTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    kanbanCount: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: BorderRadius.full,
    },
    kanbanCountText: { fontSize: 11, fontWeight: '700' },
    kanbanCard: {
      backgroundColor: isDark ? colors.bgCard : '#FFFFFF',
      borderRadius: BorderRadius.md,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
    },
    kanbanAppNo: { fontSize: 10, color: colors.primary, fontWeight: '600', marginBottom: 6 },
    kanbanProduct: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, lineHeight: 18 },
    kanbanCert: { fontSize: 11, color: colors.textTertiary, marginTop: 4 },
  });

export default ApplicationsScreen;
