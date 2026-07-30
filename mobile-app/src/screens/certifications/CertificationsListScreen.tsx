import React, { useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import Badge, { getStatusVariant } from '../../components/common/Badge';
import SearchBar from '../../components/common/SearchBar';
import EmptyState from '../../components/common/EmptyState';
import ProgressBar from '../../components/common/ProgressBar';
import { formatDate } from '../../utils/formatters';
import { useDebounce } from '../../hooks/useDebounce';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';

const FILTERS = ['All', 'Active', 'In Review', 'Pending', 'Expired'];

const CertificationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [refreshing, setRefreshing] = useState(false);
  const [isActionSheetVisible, setActionSheetVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
  };

  const { data: certificationsData, isLoading, refetch } = useQuery({
    queryKey: ['certifications'],
    queryFn: async () => {
      const res = await api.get('/certifications') as any;
      return res?.data || [];
    }
  });

  const CERTIFICATIONS = useMemo(() => {
    if (!certificationsData) return [];
    return certificationsData.map((c: any) => ({
      id: c._id,
      name: c.cert_type,
      type: 'Certification',
      certificateNo: c.certificate_number,
      status: c.status,
      issuedDate: c.issue_date,
      expiryDate: c.expiry_date,
      productName: c.product_id?.name || c.cert_type,
      progress: c.status === 'approved' ? 100 : (c.status === 'in_review' ? 70 : 30),
      icon: 'shield-checkmark',
      gradient: [colors.primary, colors.primaryDark] as [string, string],
    }));
  }, [certificationsData, colors]);


  const filtered = CERTIFICATIONS.filter((cert: any) => {
    const matchesSearch =
      cert.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      cert.productName.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchesFilter =
      activeFilter === 'All' ||
      cert.status.replace(/_/g, ' ').toLowerCase() === activeFilter.toLowerCase();
    return matchesSearch && matchesFilter;
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
        <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu-outline" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Certifications</Text>
          <Text style={styles.headerSubtitle}>Your Compliance Command Center</Text>
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
            {/* Search */}
            <View style={styles.searchWrapper}>
              <SearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search certifications..."
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
                  onPress={() => handleFilterChange(filter)}
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
            icon="shield-outline"
            title="No certifications found"
            subtitle="Start a new application to get certified"
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.certCard, Shadows.md]}
            onPress={() => navigation.navigate('CertificationDetail', { id: item.id })}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#FFFFFF']}
              style={styles.certCardInner}
            >
              {/* Top Passbook Header */}
              <LinearGradient 
                colors={item.gradient} 
                start={{x:0, y:0}} 
                end={{x:1, y:1}} 
                style={styles.certCardHeader}
              >
                <View style={styles.certCardHeaderTop}>
                  <View style={styles.certIconCircle}>
                    <Ionicons name={item.icon as any} size={20} color={item.gradient[0]} />
                  </View>
                  <View style={styles.certBadgeWrapper}>
                    <Badge
                      label={item.status.replace('_', ' ').toUpperCase()}
                      variant="default"
                      size="sm"
                    />
                  </View>
                </View>
                <Text style={styles.certNameHeader} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.certTypeHeader} numberOfLines={1}>{item.type}</Text>
              </LinearGradient>

              {/* Details Body */}
              <View style={styles.certDetailsBody}>
                <View style={styles.certDetailRow}>
                  <View style={styles.certDetailBox}>
                    <Text style={styles.certDetailLabel}>PRODUCT</Text>
                    <Text style={styles.certDetailValue} numberOfLines={1}>{item.productName}</Text>
                  </View>
                  {item.certificateNo && (
                    <View style={styles.certDetailBox}>
                      <Text style={styles.certDetailLabel}>CERT NO.</Text>
                      <Text style={styles.certDetailValue}>{item.certificateNo}</Text>
                    </View>
                  )}
                </View>

                {/* Progress OR Dates */}
                {item.progress < 100 ? (
                  <View style={styles.progressSection}>
                    <View style={styles.progressLabels}>
                      <Text style={styles.progressLabelText}>Application Progress</Text>
                      <Text style={styles.progressPercent}>{item.progress}%</Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <LinearGradient 
                        colors={item.gradient} 
                        style={[styles.progressFill, { width: `${item.progress}%` }]} 
                        start={{x:0, y:0}} 
                        end={{x:1, y:0}} 
                      />
                    </View>
                  </View>
                ) : (
                  <View style={styles.certDatesRow}>
                    {item.issuedDate && (
                      <View style={styles.dateItem}>
                        <Text style={styles.dateLabel}>ISSUED ON</Text>
                        <Text style={styles.dateValue}>{formatDate(item.issuedDate)}</Text>
                      </View>
                    )}
                    {item.expiryDate && (
                      <View style={[styles.dateItem, { alignItems: 'flex-end' }]}>
                        <Text style={styles.dateLabel}>EXPIRES ON</Text>
                        <Text style={[styles.dateValue, item.status === 'expired' && { color: colors.error }]}>
                          {formatDate(item.expiryDate)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}
      />

      {/* Premium Floating Action Button */}
      <TouchableOpacity 
        style={[styles.fab, Shadows.lg]} 
        onPress={() => setActionSheetVisible(true)}
        activeOpacity={0.8}
      >
        <LinearGradient 
          colors={[colors.primary, colors.secondary]} 
          style={styles.fabGradient}
          start={{x:0, y:0}}
          end={{x:1, y:1}}
        >
          <Ionicons name="add" size={28} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Action Sheet Modal */}
      <Modal
        visible={isActionSheetVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setActionSheetVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setActionSheetVisible(false)}
        >
          <View style={styles.actionSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Start New Process</Text>
            
            <TouchableOpacity 
              style={[styles.sheetActionCard, { borderColor: 'rgba(108,99,255,0.2)', backgroundColor: isDark ? 'rgba(108,99,255,0.05)' : 'rgba(108,99,255,0.05)' }]} 
              onPress={() => { setActionSheetVisible(false); navigation.navigate('NewCertification'); }}
              activeOpacity={0.8}
            >
              <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.sheetIconBox} start={{x:0, y:0}} end={{x:1, y:1}}>
                <Ionicons name="ribbon-outline" size={22} color="#FFF" />
              </LinearGradient>
              <View style={styles.sheetActionTexts}>
                <Text style={styles.sheetActionTitle}>Certifications</Text>
                <Text style={styles.sheetActionDesc}>Apply for BIS, EPR, WPC, and more.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.sheetActionCard, { borderColor: 'rgba(0,212,255,0.2)', backgroundColor: isDark ? 'rgba(0,212,255,0.05)' : 'rgba(0,212,255,0.05)' }]} 
              onPress={() => { setActionSheetVisible(false); navigation.navigate('Testing'); }}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#00D4FF', '#007FFF']} style={styles.sheetIconBox} start={{x:0, y:0}} end={{x:1, y:1}}>
                <Ionicons name="flask-outline" size={22} color="#FFF" />
              </LinearGradient>
              <View style={styles.sheetActionTexts}>
                <Text style={styles.sheetActionTitle}>Testing</Text>
                <Text style={styles.sheetActionDesc}>Book lab tests and safety checks.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.sheetActionCard, { borderColor: 'rgba(255,165,2,0.2)', backgroundColor: isDark ? 'rgba(255,165,2,0.05)' : 'rgba(255,165,2,0.05)' }]} 
              onPress={() => { setActionSheetVisible(false); navigation.navigate('Inspection'); }}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#FFA502', '#FF6348']} style={styles.sheetIconBox} start={{x:0, y:0}} end={{x:1, y:1}}>
                <Ionicons name="search-outline" size={22} color="#FFF" />
              </LinearGradient>
              <View style={styles.sheetActionTexts}>
                <Text style={styles.sheetActionTitle}>Inspection</Text>
                <Text style={styles.sheetActionDesc}>Schedule factory or product inspections.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    menuBtn: {
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
    dashboardCard: {
      marginHorizontal: 20,
      marginBottom: 20,
      borderRadius: BorderRadius.xl,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
      overflow: 'hidden',
    },
    dashboardGradient: {
      padding: 20,
    },
    dashboardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 20,
    },
    healthRingOuter: {
      width: 70,
      height: 70,
      borderRadius: 35,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 4,
    },
    healthRingInner: {
      width: 62,
      height: 62,
      borderRadius: 31,
      backgroundColor: isDark ? '#141622' : '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    healthScore: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    healthPercent: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    dashboardTextInfo: {
      flex: 1,
    },
    dashboardTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    dashboardSub: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    dashboardMetrics: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
      borderRadius: BorderRadius.lg,
      padding: 14,
    },
    metricItem: {
      flex: 1,
      alignItems: 'center',
    },
    metricValue: {
      fontSize: 22,
      fontWeight: '900',
      color: colors.textPrimary,
      marginBottom: 2,
    },
    metricLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontWeight: '600',
    },
    metricDivider: {
      width: 1,
      height: 30,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    },
    alertBanner: {
      marginHorizontal: 20,
      marginBottom: 20,
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
    },
    alertGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
    },
    alertIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    alertContent: {
      flex: 1,
    },
    alertTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: '#FFFFFF',
      marginBottom: 2,
    },
    alertDesc: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.9)',
      lineHeight: 16,
    },
    searchWrapper: {
      marginBottom: 16,
      paddingHorizontal: 20,
    },
    filtersScroll: {
      height: 48,
      marginBottom: 12,
    },
    filtersRow: {
      paddingHorizontal: 16,
      gap: 8,
      alignItems: 'center',
    },
    filterChip: {
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: isDark ? colors.bgCard : '#FFFFFF',
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      overflow: 'hidden',
      position: 'relative',
    },
    filterChipActive: {
      borderColor: 'transparent',
    },
    filterText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    filterTextActive: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
    flatList: { flex: 1 },
    listContent: {
      paddingTop: 4,
      paddingBottom: 140,
      flexGrow: 1,
    },
    certCard: {
      marginHorizontal: 20,
      marginBottom: 16,
      borderRadius: BorderRadius.xl,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      overflow: 'hidden',
    },
    certCardInner: {
      flex: 1,
    },
    certCardHeader: {
      padding: 16,
      paddingBottom: 20,
    },
    certCardHeaderTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    certIconCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      ...Shadows.sm,
    },
    certBadgeWrapper: {
      backgroundColor: 'rgba(255,255,255,0.9)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: BorderRadius.full,
    },
    certNameHeader: {
      fontSize: 18,
      fontWeight: '800',
      color: '#FFFFFF',
      marginBottom: 4,
    },
    certTypeHeader: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.85)',
      fontWeight: '500',
    },
    certDetailsBody: {
      padding: 16,
    },
    certDetailRow: {
      flexDirection: 'row',
      gap: 16,
      marginBottom: 16,
    },
    certDetailBox: {
      flex: 1,
    },
    certDetailLabel: {
      fontSize: 10,
      color: colors.textTertiary,
      fontWeight: '700',
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    certDetailValue: {
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    certDatesRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
    },
    dateItem: {},
    dateLabel: {
      fontSize: 10,
      color: colors.textTertiary,
      fontWeight: '700',
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    dateValue: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '700',
    },
    progressSection: {
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
    },
    progressLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    progressLabelText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    progressPercent: {
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: '800',
    },
    progressTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
    },
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 20,
      width: 64,
      height: 64,
      borderRadius: 32,
      overflow: 'hidden',
    },
    fabGradient: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    actionSheet: {
      backgroundColor: isDark ? colors.bgDark : '#FFFFFF',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
      alignItems: 'center',
    },
    sheetHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
      marginBottom: 20,
    },
    sheetTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 24,
      alignSelf: 'flex-start',
    },
    sheetActionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      marginBottom: 12,
      width: '100%',
    },
    sheetIconBox: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    sheetActionTexts: {
      flex: 1,
    },
    sheetActionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    sheetActionDesc: {
      fontSize: 13,
      color: colors.textSecondary,
    },
  });

export default CertificationsScreen;
