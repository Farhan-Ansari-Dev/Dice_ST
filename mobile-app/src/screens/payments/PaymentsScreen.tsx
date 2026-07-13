import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import Badge, { getStatusVariant } from '../../components/common/Badge';
import BarChart from '../../components/charts/BarChart';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';

const PaymentsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'quotes' | 'transactions' | 'invoices'>('transactions');

  const { data: paymentsData, isLoading, refetch } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      try {
        const res = await api.get('/payments') as any;
        return res?.data || [];
      } catch (e) {
        return [];
      }
    }
  });

  const TRANSACTIONS = useMemo(() => {
    if (!paymentsData) return [];
    return paymentsData.map((p: any) => ({
      id: p._id,
      desc: p.description || 'Payment',
      appNo: p.reference_no || 'N/A',
      method: p.payment_method || 'Bank Transfer',
      date: p.created_at,
      amount: p.amount,
      status: p.status,
    }));
  }, [paymentsData]);

  const totalPaid = TRANSACTIONS.filter((t: typeof TRANSACTIONS[0]) => t.status === 'paid').reduce((s: number, t: typeof TRANSACTIONS[0]) => s + t.amount, 0);
  const totalPending = TRANSACTIONS.filter((t: typeof TRANSACTIONS[0]) => t.status !== 'paid').reduce((s: number, t: typeof TRANSACTIONS[0]) => s + t.amount, 0);
  const quotes = TRANSACTIONS.filter((t: typeof TRANSACTIONS[0]) => t.status === 'quote');
  const invoices = TRANSACTIONS.filter((t: typeof TRANSACTIONS[0]) => t.status === 'paid');
  const visibleTransactions = activeTab === 'quotes'
    ? quotes
    : activeTab === 'invoices'
      ? invoices
      : TRANSACTIONS.filter((t: typeof TRANSACTIONS[0]) => t.status !== 'quote');
  const settlementRate = totalPaid + totalPending > 0
    ? Math.round((totalPaid / (totalPaid + totalPending)) * 100)
    : 0;

  const handlePayNow = (transaction: typeof TRANSACTIONS[0]) => {
    Alert.alert('Pay Now', `Pay ${formatCurrency(transaction.amount)} for ${transaction.desc}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Pay', onPress: () => {
        navigation.navigate('PaymentGateway', { transactionId: transaction.id, amount: transaction.amount });
      } },
    ]);
  };

  const CHART_DATA = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month) => ({
      label: month,
      value: TRANSACTIONS
        .filter((transaction: typeof TRANSACTIONS[0]) => transaction.status === 'paid' && new Date(transaction.date).toLocaleString('en-US', { month: 'short' }) === month)
        .reduce((total: number, transaction: typeof TRANSACTIONS[0]) => total + transaction.amount / 1000, 0),
    }));
  }, [TRANSACTIONS]);

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
        <Text style={styles.headerTitle}>Payments</Text>
        <TouchableOpacity
          accessibilityLabel="Export payment statement"
          style={styles.downloadBtn}
          onPress={() => Alert.alert('Statement export', 'Your payment statement is being prepared.')}
        >
          <Ionicons name="download-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={[styles.overviewCard, Shadows.md]}>
          <View style={styles.overviewHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.overviewEyebrow}>FINANCIAL HEALTH</Text>
              <Text style={styles.overviewTitle}>Stay ahead of every compliance payment.</Text>
            </View>
            <View style={styles.overviewIcon}>
              <Ionicons name="wallet-outline" size={23} color="#FFFFFF" />
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${settlementRate}%` }]} />
          </View>
          <Text style={styles.progressText}>{settlementRate}% of recorded payments settled</Text>
        </LinearGradient>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <LinearGradient colors={[colors.success, colors.successDark]} style={[styles.summaryCard, Shadows.md]}>
            <View style={styles.summaryIconWrap}>
              <Ionicons name="checkmark" size={18} color={colors.success} />
            </View>
            <Text style={styles.summaryAmount} numberOfLines={1}>{formatCurrency(totalPaid)}</Text>
            <Text style={styles.summaryLabel} numberOfLines={1}>Total paid</Text>
          </LinearGradient>
          <LinearGradient colors={[colors.warning, colors.warningDark]} style={[styles.summaryCard, Shadows.md]}>
            <View style={styles.summaryIconWrap}>
              <Ionicons name="time" size={18} color={colors.warning} />
            </View>
            <Text style={styles.summaryAmount} numberOfLines={1}>{formatCurrency(totalPending)}</Text>
            <Text style={styles.summaryLabel} numberOfLines={1}>Outstanding</Text>
          </LinearGradient>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionCard, Shadows.sm]} onPress={() => navigation.navigate('PaymentMethods')}>
            <View style={[styles.actionIcon, { backgroundColor: `${colors.primary}18` }]}>
              <Ionicons name="card-outline" size={20} color={colors.primary} />
            </View>
            <Text style={styles.actionText}>Payment methods</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, Shadows.sm]} onPress={() => navigation.navigate('Quotations')}>
            <View style={[styles.actionIcon, { backgroundColor: `${colors.warning}1A` }]}>
              <Ionicons name="receipt-outline" size={20} color={colors.warning} />
            </View>
            <Text style={styles.actionText}>Review quotes</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Spend Chart */}
        <View style={[styles.chartCard, Shadows.sm]}>
          <LinearGradient
            colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
            style={styles.chartCardInner}
          >
            <View style={styles.chartHeading}>
              <View>
                <Text style={styles.chartTitle}>Spend trend</Text>
                <Text style={styles.chartSubtitle}>Settled payments by month (₹K)</Text>
              </View>
              <View style={styles.yearChip}><Text style={styles.yearChipText}>2026</Text></View>
            </View>
            <BarChart
              data={CHART_DATA}
              height={120}
              gradient={[colors.primary, colors.primaryDark]}
              showValues
            />
          </LinearGradient>
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          {(['quotes', 'transactions', 'invoices'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'transactions' ? 'Payments' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {visibleTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={32} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No {activeTab === 'transactions' ? 'payments' : activeTab} yet</Text>
            <Text style={styles.emptyText}>New activity will appear here as your applications progress.</Text>
          </View>
        ) : visibleTransactions.map((tx: typeof TRANSACTIONS[0]) => (
          <View key={tx.id} style={[styles.txCard, Shadows.sm]}>
            <LinearGradient
              colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
              style={styles.txCardInner}
            >
              <View style={styles.txRow}>
                <View style={[styles.txIcon, { backgroundColor: tx.status === 'paid' ? colors.success + '20' : colors.warning + '20' }]}>
                  <Ionicons
                    name={tx.status === 'paid' ? 'checkmark-circle' : 'time'}
                    size={20}
                    color={tx.status === 'paid' ? colors.success : colors.warning}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txDesc}>{tx.desc}</Text>
                  <Text style={styles.txApp}>{tx.appNo} • {tx.method}</Text>
                  <Text style={styles.txDate}>{formatDate(tx.date)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Text style={[styles.txAmount, tx.status !== 'paid' && { color: colors.warning }]}>
                    {formatCurrency(tx.amount)}
                  </Text>
                  <Badge label={tx.status} variant={getStatusVariant(tx.status)} size="sm" />
                </View>
              </View>
              {tx.status === 'paid' ? (
                <TouchableOpacity
                  style={styles.invoiceBtn}
                  onPress={() => navigation.navigate('DownloadInvoice', { id: tx.id, transaction: tx })}
                >
                  <Ionicons name="document-text-outline" size={14} color={colors.success} />
                  <Text style={[styles.invoiceBtnText, { color: colors.success }]}>Download GST Invoice</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.payNowBtn} onPress={() => handlePayNow(tx)}>
                  <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.payNowBtnGradient}>
                    <Text style={styles.payNowText}>Pay Now</Text>
                    <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </LinearGradient>
          </View>
        ))}
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
    downloadBtn: { padding: 8 },
    content: { paddingHorizontal: 20, paddingTop: 8 },
    overviewCard: { borderRadius: BorderRadius.lg, padding: 20, marginBottom: 16 },
    overviewHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 16, marginBottom: 18 },
    overviewEyebrow: { color: 'rgba(255,255,255,0.72)', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
    overviewTitle: { color: '#FFFFFF', fontSize: 19, fontWeight: '800', lineHeight: 25, marginTop: 6 },
    overviewIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
    progressTrack: { height: 7, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 7, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 7, backgroundColor: '#FFFFFF' },
    progressText: { color: 'rgba(255,255,255,0.78)', fontSize: 12, fontWeight: '600', marginTop: 8 },
    summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 20, width: '100%' },
    summaryCard: {
      flex: 1,
      minWidth: 0,
      minHeight: 140,
      borderRadius: BorderRadius.lg,
      padding: 15,
      justifyContent: 'space-between',
    },
    summaryIconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.84)' },
    summaryAmount: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0 },
    summaryLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.78)' },
    actionRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    actionCard: { flex: 1, minHeight: 62, padding: 10, borderRadius: BorderRadius.lg, backgroundColor: isDark ? colors.bgCard : '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 8 },
    actionIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    actionText: { flex: 1, color: colors.textPrimary, fontSize: 12, fontWeight: '700', lineHeight: 16 },
    chartCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, marginBottom: 20 },
    chartCardInner: { padding: 16 },
    chartTitle: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 12 },
    chartHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    chartSubtitle: { color: colors.textTertiary, fontSize: 11, marginTop: -8, marginBottom: 12 },
    yearChip: { backgroundColor: isDark ? colors.bgCardLight : '#EEF1F7', borderRadius: 9, paddingHorizontal: 9, paddingVertical: 5 },
    yearChipText: { color: colors.textSecondary, fontSize: 10, fontWeight: '700' },
    tabsRow: { flexDirection: 'row', backgroundColor: isDark ? colors.bgCard : '#F0F2F8', borderRadius: BorderRadius.md, padding: 4, marginBottom: 16 },
    tab: { flex: 1, paddingVertical: 10, borderRadius: BorderRadius.sm, alignItems: 'center' },
    tabActive: { backgroundColor: colors.primary },
    tabText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
    tabTextActive: { color: '#FFFFFF', fontWeight: '600' },
    txCard: { marginBottom: 12, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    txCardInner: { padding: 16 },
    txRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    txIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    txDesc: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    txApp: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    txDate: { fontSize: 11, color: colors.textTertiary, marginTop: 1 },
    txAmount: { fontSize: 15, fontWeight: '700', color: colors.success },
    payNowBtn: { marginTop: 12, borderRadius: BorderRadius.md, overflow: 'hidden' },
    invoiceBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingVertical: 8, paddingHorizontal: 12, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: 'rgba(0,200,150,0.3)', backgroundColor: 'rgba(0,200,150,0.08)' },
    invoiceBtnText: { fontSize: 13, fontWeight: '600' },
    payNowBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
    payNowText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
    emptyState: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24, borderRadius: BorderRadius.lg, backgroundColor: isDark ? colors.bgCard : '#FFFFFF' },
    emptyTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '700', marginTop: 10 },
    emptyText: { color: colors.textTertiary, fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 5 },
  });

export default PaymentsScreen;
