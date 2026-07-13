import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import Badge, { getStatusVariant } from '../../components/common/Badge';
import SearchBar from '../../components/common/SearchBar';
import { formatDate } from '../../utils/formatters';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';

const ShipmentScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data: shipmentsData, isLoading, refetch } = useQuery({
    queryKey: ['shipments'],
    queryFn: async () => {
      try {
        const res = await api.get('/shipments') as any;
        return res?.data || [];
      } catch (e) {
        return [];
      }
    }
  });

  const SHIPMENTS = useMemo(() => {
    if (!shipmentsData) return [];
    return shipmentsData.map((s: any) => ({
      id: s._id,
      trackingNo: s.tracking_number,
      product: s.product_name || 'Product',
      status: s.status,
      origin: s.origin || 'Warehouse',
      destination: s.destination || 'Port',
      eta: s.eta || s.expected_delivery_date,
      bol: s.bol || 'N/A',
      customsStatus: s.customs_status || 'pending',
    }));
  }, [shipmentsData]);

  const STATUS_CONFIG: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = useMemo(() => ({
    in_transit: { label: 'In Transit', color: colors.secondary, icon: 'boat' },
    customs_clearance: { label: 'Customs', color: colors.warning, icon: 'document-text' },
    delivered: { label: 'Delivered', color: colors.success, icon: 'checkmark-circle' },
    pending: { label: 'Pending', color: colors.textSecondary, icon: 'time' },
  }), [colors]);

  const filtered = SHIPMENTS.filter((s: typeof SHIPMENTS[0]) =>
    s.trackingNo.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    s.product.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

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

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shipment Tracking</Text>
      </View>

      {/* Map placeholder */}
      <LinearGradient
        colors={['rgba(0,212,255,0.12)', 'rgba(108,99,255,0.08)']}
        style={styles.mapPlaceholder}
      >
        <View style={styles.mapContent}>
          <Ionicons name="map" size={40} color={colors.secondary} />
          <Text style={styles.mapText}>Live Tracking Map</Text>
          <Text style={styles.mapSub}>{SHIPMENTS.length} active shipments being tracked</Text>
        </View>
      </LinearGradient>

      <View style={styles.searchWrapper}>
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Track shipment..." />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {filtered.map((shipment: typeof SHIPMENTS[0]) => {
          const statusCfg = STATUS_CONFIG[shipment.status] ?? STATUS_CONFIG.pending;
          return (
            <View key={shipment.id} style={[styles.shipCard, Shadows.sm]}>
              <LinearGradient
                colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
                style={styles.shipCardInner}
              >
                <View style={styles.shipCardTop}>
                  <LinearGradient
                    colors={[statusCfg.color + '30', statusCfg.color + '10']}
                    style={styles.shipIconWrapper}
                  >
                    <Ionicons name={statusCfg.icon} size={22} color={statusCfg.color} />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.shipTracking}>{shipment.trackingNo}</Text>
                    <Text style={styles.shipProduct}>{shipment.product}</Text>
                  </View>
                  <Badge label={statusCfg.label} variant={getStatusVariant(shipment.status)} size="sm" dot />
                </View>

                <View style={styles.routeRow}>
                  <View style={styles.routePoint}>
                    <Ionicons name="radio-button-on" size={12} color={colors.secondary} />
                    <Text style={styles.routeText}>{shipment.origin}</Text>
                  </View>
                  <View style={styles.routeArrow}>
                    <View style={styles.routeLine} />
                    <Ionicons name="airplane" size={14} color={colors.primary} />
                    <View style={styles.routeLine} />
                  </View>
                  <View style={styles.routePoint}>
                    <Ionicons name="location" size={12} color={colors.success} />
                    <Text style={styles.routeText}>{shipment.destination}</Text>
                  </View>
                </View>

                <View style={styles.shipFooter}>
                  <View style={styles.shipMeta}>
                    <Ionicons name="calendar-outline" size={12} color={colors.textTertiary} />
                    <Text style={styles.shipMetaText}>ETA: {formatDate(shipment.eta)}</Text>
                  </View>
                  <View style={styles.shipMeta}>
                    <Ionicons name="document-outline" size={12} color={colors.textTertiary} />
                    <Text style={styles.shipMetaText}>BOL: {shipment.bol}</Text>
                  </View>
                  <Badge label={shipment.customsStatus} variant={getStatusVariant(shipment.customsStatus)} size="sm" />
                </View>
              </LinearGradient>
            </View>
          );
        })}
        <View style={{ height: 100 }} />
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
    addBtn: { padding: 8 },
    mapPlaceholder: {
      marginHorizontal: 20,
      height: 140,
      borderRadius: BorderRadius.xl,
      marginBottom: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(0,212,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    mapContent: { alignItems: 'center', gap: 4 },
    mapText: { fontSize: 14, fontWeight: '700', color: colors.secondary },
    mapSub: { fontSize: 12, color: colors.textTertiary },
    searchWrapper: { paddingHorizontal: 20, marginBottom: 12 },
    listContent: { paddingHorizontal: 20 },
    shipCard: { marginBottom: 12, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    shipCardInner: { padding: 16 },
    shipCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
    shipIconWrapper: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    shipTracking: { fontSize: 13, fontWeight: '700', color: colors.primary },
    shipProduct: { fontSize: 14, color: colors.textPrimary, marginTop: 2 },
    routeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
    routePoint: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
    routeText: { fontSize: 11, color: colors.textSecondary, flex: 1 },
    routeArrow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    routeLine: { width: 20, height: 1, backgroundColor: colors.border },
    shipFooter: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
    shipMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    shipMetaText: { fontSize: 11, color: colors.textTertiary },
  });

export default ShipmentScreen;
