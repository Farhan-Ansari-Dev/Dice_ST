import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const LINE_ITEMS: any[] = [];

const InvoiceDetailsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const subtotal = LINE_ITEMS.reduce((s, i) => s + i.amount, 0);
  const gst = Math.round(subtotal * 0.18);
  const total = subtotal + gst;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoice Details</Text>
        <TouchableOpacity onPress={() => Alert.alert('Download', 'Invoice downloaded!')}>
          <Ionicons name="download-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Invoice Header */}
        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={[styles.invoiceHeader, Shadows.md]}>
          <View style={styles.invoiceHeaderRow}>
            <View>
              <Text style={styles.invoiceLabel}>INVOICE</Text>
              <Text style={styles.invoiceNumber}>#INV-2024-0042</Text>
            </View>
            <View style={[styles.paidBadge, { backgroundColor: 'rgba(0,200,150,0.25)' }]}>
              <Ionicons name="checkmark-circle" size={14} color="#00C896" />
              <Text style={[styles.paidText, { color: '#00C896' }]}>PAID</Text>
            </View>
          </View>
          <View style={styles.invoiceMeta}>
            <View>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaValue}>Dec 10, 2024</Text>
            </View>
            <View>
              <Text style={styles.metaLabel}>Due Date</Text>
              <Text style={styles.metaValue}>Dec 20, 2024</Text>
            </View>
            <View>
              <Text style={styles.metaLabel}>Application</Text>
              <Text style={styles.metaValue}>SCS-2024-0042</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Line Items */}
        <View style={[styles.itemsCard, Shadows.md]}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.itemsCardInner}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCol, { flex: 3 }]}>Description</Text>
              <Text style={[styles.tableCol, { width: 40, textAlign: 'center' }]}>Qty</Text>
              <Text style={[styles.tableCol, { width: 70, textAlign: 'right' }]}>Amount</Text>
            </View>
            {LINE_ITEMS.map((item, i) => (
              <View key={i} style={[styles.tableRow, i > 0 && styles.tableRowBorder]}>
                <Text style={[styles.tableDesc, { flex: 3 }]}>{item.description}</Text>
                <Text style={[styles.tableQty, { width: 40, textAlign: 'center' }]}>{item.qty}</Text>
                <Text style={[styles.tableAmount, { width: 70, textAlign: 'right' }]}>₹{item.amount.toLocaleString()}</Text>
              </View>
            ))}

            <View style={[styles.totalSection, { borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border }]}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>₹{subtotal.toLocaleString()}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>GST (18%)</Text>
                <Text style={styles.totalValue}>₹{gst.toLocaleString()}</Text>
              </View>
              <View style={[styles.totalRow, styles.grandTotal]}>
                <Text style={styles.grandTotalLabel}>Total Amount</Text>
                <Text style={[styles.grandTotalValue, { color: colors.primary }]}>₹{total.toLocaleString()}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <TouchableOpacity style={[styles.downloadBtn, Shadows.md]} onPress={() => Alert.alert('Download', 'PDF downloaded!')} activeOpacity={0.85}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.downloadBtnGradient}>
            <Ionicons name="document-outline" size={18} color="#FFFFFF" />
            <Text style={styles.downloadBtnText}>Download PDF</Text>
          </LinearGradient>
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
    content: { paddingHorizontal: 20, paddingTop: 8 },
    invoiceHeader: { borderRadius: BorderRadius.lg, padding: 20, marginBottom: 16 },
    invoiceHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    invoiceLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 2 },
    invoiceNumber: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', marginTop: 2 },
    paidBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full },
    paidText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
    invoiceMeta: { flexDirection: 'row', justifyContent: 'space-between' },
    metaLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 2 },
    metaValue: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
    itemsCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, marginBottom: 16 },
    itemsCardInner: { padding: 16 },
    tableHeader: { flexDirection: 'row', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border, marginBottom: 2 },
    tableCol: { fontSize: 11, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase' },
    tableRow: { flexDirection: 'row', paddingVertical: 10, alignItems: 'flex-start' },
    tableRowBorder: { borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border },
    tableDesc: { fontSize: 13, color: colors.textPrimary },
    tableQty: { fontSize: 13, color: colors.textSecondary },
    tableAmount: { fontSize: 13, color: colors.textPrimary, fontWeight: '500' },
    totalSection: { borderTopWidth: 1, paddingTop: 12, marginTop: 4, gap: 8 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
    totalLabel: { fontSize: 13, color: colors.textSecondary },
    totalValue: { fontSize: 13, color: colors.textPrimary, fontWeight: '500' },
    grandTotal: { paddingTop: 8, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border, marginTop: 4 },
    grandTotalLabel: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    grandTotalValue: { fontSize: 18, fontWeight: '900' },
    downloadBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
    downloadBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
    downloadBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  });

export default InvoiceDetailsScreen;
