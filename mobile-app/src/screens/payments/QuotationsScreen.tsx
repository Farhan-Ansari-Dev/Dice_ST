import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity , RefreshControl} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import EmptyState from '../../components/common/EmptyState';

const QUOTATIONS: any[] = [];

const STATUS_CONFIG = {
  pending: { color: '#F59E0B', label: 'Pending Approval' },
  approved: { color: '#00C896', label: 'Approved' },
  expired: { color: '#8896AB', label: 'Expired' },
};

const QuotationsScreen: React.FC = () => {
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
        <Text style={styles.headerTitle}>Quotations</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={QUOTATIONS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState icon="receipt-outline" title="No Quotations" subtitle="Your quotation requests will appear here." />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        renderItem={({ item }) => {
          const config = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG];
          return (
            <TouchableOpacity style={[styles.quoteCard, Shadows.md]} onPress={() => navigation.navigate('ApproveQuotation', { id: item.id })} activeOpacity={0.85}>
              <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.quoteCardInner}>
                <View style={styles.quoteRow}>
                  <View style={[styles.quoteIcon, { backgroundColor: `${config.color}20` }]}>
                    <Ionicons name="receipt-outline" size={22} color={config.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.quoteTitle}>{item.title}</Text>
                    <Text style={styles.quoteMeta}>{item.items} services • {item.date}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={styles.quoteAmount}>₹{item.amount.toLocaleString()}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${config.color}20` }]}>
                      <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.quoteFooter}>
                  <Text style={styles.validTill}>Valid till: {item.validTill}</Text>
                  {item.status === 'pending' && (
                    <TouchableOpacity style={[styles.approveBtn, { backgroundColor: `${colors.success}20` }]} onPress={() => navigation.navigate('ApproveQuotation', { id: item.id })}>
                      <Text style={[styles.approveBtnText, { color: colors.success }]}>Approve</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>
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
    quoteCard: { marginBottom: 12, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    quoteCardInner: { padding: 16 },
    quoteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
    quoteIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    quoteTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    quoteMeta: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    quoteAmount: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
    statusText: { fontSize: 10, fontWeight: '700' },
    quoteFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    validTill: { fontSize: 12, color: colors.textTertiary },
    approveBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full },
    approveBtnText: { fontSize: 12, fontWeight: '700' },
  });

export default QuotationsScreen;
