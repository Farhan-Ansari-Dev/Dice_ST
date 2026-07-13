import React, { useMemo, useState } from 'react';
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
import SearchBar from '../../components/common/SearchBar';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import { formatDate } from '../../utils/formatters';
import { useDebounce } from '../../hooks/useDebounce';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';

const FILTERS = ['All', 'Pending', 'Scheduled', 'In Progress', 'Completed', 'Cancelled'];

const InspectionDashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = React.useRef<FlatList>(null);

  const { data: inspectionData, isLoading, refetch } = useQuery({
    queryKey: ['inspection-requests'],
    queryFn: async () => {
      try {
        const res = await api.get('/inspections') as any;
        return res?.data || [];
      } catch (e) {
        return [];
      }
    }
  });

  const INSPECTION_REQUESTS = useMemo(() => {
    if (!inspectionData) return [];
    return inspectionData.map((i: any) => ({
      id: i._id,
      inspectionNo: i.inspection_number,
      product: i.product_id?.name || i.product_name,
      type: i.inspection_type,
      status: i.status,
      progress: i.status === 'completed' ? 100 : (i.status === 'in_progress' ? 70 : (i.status === 'scheduled' ? 40 : 10)),
      submittedDate: i.createdAt,
      scheduledDate: i.scheduled_date,
      assignedTo: i.assigned_to?.name,
    }));
  }, [inspectionData]);

  const filtered = INSPECTION_REQUESTS.filter((req: any) => {
    const matchesSearch =
      req.inspectionNo.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      req.product.toLowerCase().includes(debouncedSearch.toLowerCase());
    
    if (activeFilter === 'All') return matchesSearch;
    return matchesSearch && req.status === activeFilter.toLowerCase().replace(' ', '_');
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={isDark ? [colors.bgDark, '#0B0D14'] : ['#F8F9FA', '#E2E8F0']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Inspection</Text>
          <Text style={styles.headerSubtitle}>Factory & product inspections</Text>
        </View>
      </View>

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
            {/* Stats Card */}
            <View style={[styles.statsCard, Shadows.lg]}>
              <LinearGradient
                colors={isDark ? ['#1A1C29', '#141622'] : ['#FFFFFF', '#F8FAFC']}
                style={styles.statsGradient}
              >
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{INSPECTION_REQUESTS.length}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.warning }]}>
                    {INSPECTION_REQUESTS.filter((i: any) => i.status === 'scheduled').length}
                  </Text>
                  <Text style={styles.statLabel}>Scheduled</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.success }]}>
                    {INSPECTION_REQUESTS.filter((i: any) => i.status === 'completed').length}
                  </Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
              </LinearGradient>
            </View>

            {/* Search */}
            <View style={styles.searchWrapper}>
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search inspections..."
              />
            </View>

            {/* Filters */}
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
                  onPress={() => setActiveFilter(filter)}
                  style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
                >
                  {activeFilter === filter ? (
                    <LinearGradient
                      colors={[colors.primary, colors.secondary]}
                      style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                  ) : null}
                  <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
                    {filter}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            title="No inspections scheduled"
            subtitle="Schedule a factory or product inspection"
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, Shadows.md]}
            onPress={() => navigation.navigate('InspectionDetail', { id: item.id })}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#FFFFFF']}
              style={styles.cardInner}
            >
              {/* Header */}
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <View style={styles.iconBox}>
                    <Ionicons name="search-outline" size={20} color={colors.warning} />
                  </View>
                  <View style={styles.headerTexts}>
                    <Text style={styles.inspectionNo}>{item.inspectionNo}</Text>
                    <Text style={styles.product} numberOfLines={1}>
                      {item.product}
                    </Text>
                  </View>
                </View>
                <Badge label={item.status.replace(/_/g, ' ').toUpperCase()} variant="default" size="sm" />
              </View>

              {/* Type & Progress */}
              <View style={styles.typeSection}>
                <Text style={styles.typeLabel}>{item.type.replace(/_/g, ' ').toUpperCase()}</Text>
              </View>

              {/* Progress */}
              <View style={styles.progressSection}>
                <View style={styles.progressLabel}>
                  <Text style={styles.progressText}>Progress</Text>
                  <Text style={styles.progressPercent}>{item.progress}%</Text>
                </View>
                <View style={styles.progressBar}>
                  <LinearGradient
                    colors={['#FFA502', '#FF6348']}
                    style={[styles.progressFill, { width: `${item.progress}%` }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                </View>
              </View>

              {/* Footer */}
              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.footerLabel}>Requested</Text>
                  <Text style={styles.footerValue}>{formatDate(item.submittedDate)}</Text>
                </View>
                {item.scheduledDate && (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.footerLabel}>Scheduled</Text>
                    <Text style={styles.footerValue}>{formatDate(item.scheduledDate)}</Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, Shadows.lg]}
        onPress={() => navigation.navigate('NewInspection')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#FFA502', '#FF6348']}
          style={styles.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="add" size={28} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgDark,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 24,
    },
    backBtn: {
      width: 40,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 26,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    headerSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    statsCard: {
      marginHorizontal: 20,
      marginBottom: 20,
      borderRadius: BorderRadius.xl,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
      overflow: 'hidden',
    },
    statsGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 22,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    statLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontWeight: '600',
    },
    statDivider: {
      width: 1,
      height: 30,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    },
    flatList: {
      flex: 1,
    },
    listContent: {
      paddingBottom: 100,
    },
    searchWrapper: {
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    filtersScroll: {
      marginBottom: 16,
    },
    filtersRow: {
      paddingHorizontal: 20,
      gap: 8,
    },
    filterChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    },
    filterChipActive: {
      backgroundColor: 'transparent',
    },
    filterText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    filterTextActive: {
      color: '#FFFFFF',
    },
    card: {
      marginHorizontal: 20,
      marginBottom: 12,
      borderRadius: BorderRadius.xl,
      overflow: 'hidden',
    },
    cardInner: {
      padding: 16,
      gap: 12,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerLeft: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    iconBox: {
      width: 44,
      height: 44,
      borderRadius: BorderRadius.md,
      backgroundColor: `${colors.warning}20`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTexts: {
      flex: 1,
    },
    inspectionNo: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    product: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    typeSection: {
      backgroundColor: isDark ? 'rgba(255,165,2,0.08)' : 'rgba(255,165,2,0.08)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: BorderRadius.md,
      alignSelf: 'flex-start',
    },
    typeLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.warning,
      letterSpacing: 0.3,
    },
    progressSection: {
      gap: 8,
    },
    progressLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    progressText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    progressPercent: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.warning,
    },
    progressBar: {
      height: 6,
      borderRadius: 3,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
    },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
    },
    footerLabel: {
      fontSize: 10,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      fontWeight: '600',
      marginBottom: 2,
    },
    footerValue: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    fab: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      overflow: 'hidden',
    },
    fabGradient: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default InspectionDashboardScreen;
