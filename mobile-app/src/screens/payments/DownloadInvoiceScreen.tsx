import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const DownloadInvoiceScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  // Get transaction from route params or use defaults
  const tx = route.params?.transaction ?? {
    id: '1', desc: 'BIS Application Fee', appNo: 'SCS-2024-0042',
    amount: 45000, status: 'paid', date: '2024-11-01', method: 'UPI',
  };

  const invoiceNo = `INV-${tx.appNo}-${tx.id}`;
  const gstAmount = Math.round(tx.amount * 0.18);
  const baseAmount = tx.amount - gstAmount;
  const invoiceDate = tx.date;

  const handleDownload = () => {
    Alert.alert(
      'Invoice Downloaded',
      `${invoiceNo}.pdf has been saved to your Downloads folder.`,
      [{ text: 'OK' }]
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `DICE by Sanyog — GST Invoice\nInvoice No: ${invoiceNo}\nAmount: ₹${tx.amount.toLocaleString('en-IN')}\nDate: ${invoiceDate}\n\nDownload from: https://www.sanyogconformity.com/invoices/${invoiceNo}`,
        title: `Invoice ${invoiceNo}`,
      });
    } catch {}
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>GST Invoice</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Invoice card */}
        <View style={[styles.invoiceCard, Shadows.md]}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#FAFBFF']} style={styles.invoiceCardInner}>

            {/* Company header */}
            <View style={styles.invoiceHeader}>
              <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.logoBox}>
                <Text style={styles.logoText}>SC</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.companyName}>Sanyog Conformity Solutions Pvt. Ltd.</Text>
                <Text style={styles.companyDetail}>GSTIN: 27AABCS1234A1Z5</Text>
                <Text style={styles.companyDetail}>www.sanyogconformity.com</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Invoice meta */}
            <View style={styles.metaRow}>
              <View style={styles.metaBlock}>
                <Text style={styles.metaLabel}>Invoice No.</Text>
                <Text style={styles.metaValue}>{invoiceNo}</Text>
              </View>
              <View style={styles.metaBlock}>
                <Text style={styles.metaLabel}>Date</Text>
                <Text style={styles.metaValue}>{invoiceDate}</Text>
              </View>
              <View style={styles.metaBlock}>
                <Text style={styles.metaLabel}>Payment</Text>
                <Text style={styles.metaValue}>{tx.method}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Bill To */}
            <Text style={styles.sectionLabel}>BILL TO</Text>
            <Text style={styles.billName}>Farhan Enterprises Pvt. Ltd.</Text>
            <Text style={styles.billDetail}>GSTIN: 27XXXXX0000X1Z5</Text>
            <Text style={styles.billDetail}>Mumbai, Maharashtra - 400001</Text>

            <View style={styles.divider} />

            {/* Line items */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCol, { flex: 2 }]}>Description</Text>
              <Text style={[styles.tableCol, { flex: 1, textAlign: 'right' }]}>HSN</Text>
              <Text style={[styles.tableCol, { flex: 1, textAlign: 'right' }]}>Amount</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>{tx.desc}</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>998313</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>₹{baseAmount.toLocaleString('en-IN')}</Text>
            </View>
            <Text style={styles.appRef}>Ref: {tx.appNo}</Text>

            <View style={styles.divider} />

            {/* Totals */}
            <View style={styles.totalsBox}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>₹{baseAmount.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>CGST (9%)</Text>
                <Text style={styles.totalValue}>₹{Math.round(gstAmount / 2).toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>SGST (9%)</Text>
                <Text style={styles.totalValue}>₹{Math.round(gstAmount / 2).toLocaleString('en-IN')}</Text>
              </View>
              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={[styles.totalLabel, styles.grandTotalLabel]}>Total Amount</Text>
                <Text style={[styles.totalValue, styles.grandTotalValue, { color: colors.primary }]}>
                  ₹{tx.amount.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            {/* Paid stamp */}
            <View style={[styles.paidStamp, { borderColor: colors.success }]}>
              <Text style={[styles.paidText, { color: colors.success }]}>PAID</Text>
            </View>

            {/* Footer */}
            <Text style={styles.invoiceFooter}>
              This is a computer-generated invoice. No signature required.{'\n'}
              For queries: billing@sanyogconformity.com
            </Text>
          </LinearGradient>
        </View>

        {/* Actions */}
        <TouchableOpacity style={[styles.downloadBtn, Shadows.sm]} onPress={handleDownload} activeOpacity={0.85}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.downloadBtnGrad}>
            <Ionicons name="download-outline" size={20} color="#FFFFFF" />
            <Text style={styles.downloadBtnText}>Download PDF</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareOutBtn} onPress={handleShare} activeOpacity={0.85}>
          <Ionicons name="share-social-outline" size={18} color={colors.primary} />
          <Text style={[styles.shareOutText, { color: colors.primary }]}>Share Invoice</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
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
    shareBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 60 },
    invoiceCard: { borderRadius: BorderRadius.xl, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    invoiceCardInner: { padding: 20 },
    invoiceHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    logoBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    logoText: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },
    companyName: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
    companyDetail: { fontSize: 11, color: colors.textTertiary },
    divider: { height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#E2E8F0', marginVertical: 14 },
    metaRow: { flexDirection: 'row', gap: 12 },
    metaBlock: { flex: 1 },
    metaLabel: { fontSize: 10, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
    metaValue: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
    sectionLabel: { fontSize: 10, color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
    billName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
    billDetail: { fontSize: 12, color: colors.textSecondary },
    tableHeader: { flexDirection: 'row', backgroundColor: isDark ? 'rgba(108,99,255,0.15)' : '#F0EEFF', borderRadius: 6, padding: 8, marginBottom: 6 },
    tableCol: { fontSize: 10, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase' },
    tableRow: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 6 },
    tableCell: { fontSize: 13, color: colors.textPrimary },
    appRef: { fontSize: 11, color: colors.textTertiary, paddingHorizontal: 8, marginBottom: 4 },
    totalsBox: { gap: 8 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
    totalLabel: { fontSize: 13, color: colors.textSecondary },
    totalValue: { fontSize: 13, color: colors.textPrimary, fontWeight: '500' },
    grandTotalRow: { borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0', paddingTop: 8, marginTop: 4 },
    grandTotalLabel: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
    grandTotalValue: { fontSize: 16, fontWeight: '900' },
    paidStamp: { alignSelf: 'flex-end', borderWidth: 2, borderRadius: 6, paddingHorizontal: 16, paddingVertical: 4, marginTop: 12, transform: [{ rotate: '-12deg' }] },
    paidText: { fontSize: 20, fontWeight: '900', letterSpacing: 4 },
    invoiceFooter: { fontSize: 10, color: colors.textTertiary, textAlign: 'center', marginTop: 16, lineHeight: 16 },
    downloadBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: 12 },
    downloadBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
    downloadBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
    shareOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderWidth: 1.5, borderColor: colors.primary, borderRadius: BorderRadius.lg, backgroundColor: `${colors.primary}10` },
    shareOutText: { fontSize: 15, fontWeight: '600' },
  });

export default DownloadInvoiceScreen;
