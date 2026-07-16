import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import paymentsService from '../../services/paymentsService';

const SERVICES: any[] = [];

const ApproveQuotationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const [loading, setLoading] = useState(false);

  // Accept application_id from navigation params if available
  const applicationId: string = route.params?.applicationId ?? '';

  const subtotal = SERVICES.reduce((s, i) => s + i.amount, 0);
  const gst = Math.round(subtotal * 0.18);
  const total = subtotal + gst;
  const totalPaise = total * 100; // Razorpay uses paise

  const handleApproveAndPay = async () => {
    setLoading(true);
    try {
      const res = await paymentsService.createOrder(
        applicationId,
        totalPaise,
        'BIS IS 13252 + WPC Bundle Certification',
      );
      const { order, payment } = res.data;
      navigation.navigate('PaymentGateway', {
        orderId: order.id,
        amount: order.amount,       // already in paise
        currency: order.currency,
        description: 'BIS IS 13252 + WPC Bundle',
        paymentRecordId: payment._id,
      });
    } catch (err: any) {
      Alert.alert(
        'Failed to Create Order',
        err?.response?.data?.message ?? 'Could not create payment order. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Quotation</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.quoteCard, Shadows.md]}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.quoteCardInner}>
            <View style={styles.quoteTitle}>
              <Text style={styles.quoteName}>BIS IS 13252 + WPC Bundle</Text>
              <Text style={styles.quoteId}>QUO-2024-0092 • Dec 14, 2024</Text>
            </View>

            {SERVICES.map((service, i) => (
              <View key={i} style={[styles.serviceRow, i > 0 && styles.serviceRowBorder]}>
                <View style={[styles.serviceIcon, { backgroundColor: `${colors.primary}15` }]}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.serviceDesc}>{service.desc}</Text>
                </View>
                <Text style={styles.serviceAmount}>₹{service.amount.toLocaleString()}</Text>
              </View>
            ))}

            <View style={styles.totalsSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>₹{subtotal.toLocaleString()}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>GST @18%</Text>
                <Text style={styles.totalValue}>₹{gst.toLocaleString()}</Text>
              </View>
              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Total Payable</Text>
                <Text style={[styles.grandTotalAmount, { color: colors.primary }]}>₹{total.toLocaleString()}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <TouchableOpacity
          style={[styles.approveBtn, Shadows.md]}
          onPress={handleApproveAndPay}
          disabled={loading}
          activeOpacity={0.85}
        >
          <LinearGradient colors={[colors.success, colors.successDark]} style={styles.approveBtnGradient}>
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.approveBtnText}>Approve & Pay — ₹{total.toLocaleString()}</Text>
                </>
            }
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
    quoteCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, marginBottom: 16 },
    quoteCardInner: { padding: 16 },
    quoteTitle: { marginBottom: 16 },
    quoteName: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
    quoteId: { fontSize: 12, color: colors.textTertiary, marginTop: 4 },
    serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
    serviceRowBorder: { borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border },
    serviceIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    serviceName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
    serviceDesc: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    serviceAmount: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    totalsSection: { borderTopWidth: 2, borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border, paddingTop: 12, marginTop: 4, gap: 8 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
    totalLabel: { fontSize: 13, color: colors.textSecondary },
    totalValue: { fontSize: 13, color: colors.textPrimary },
    grandTotalRow: { paddingTop: 10, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border, marginTop: 4 },
    grandTotalLabel: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    grandTotalAmount: { fontSize: 20, fontWeight: '900' },
    approveBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
    approveBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
    approveBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  });

export default ApproveQuotationScreen;
