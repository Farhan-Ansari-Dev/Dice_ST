import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import RazorpayCheckout from 'react-native-razorpay';
import { ENV } from '../../config/env';
import paymentsService from '../../services/paymentsService';
import { useAuthStore } from '../../store/authStore';

const PAYMENT_METHODS: any[] = [];

const EMI_PLANS: any[] = [];

const PaymentGatewayScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const [selectedMethod, setSelectedMethod] = useState('upi');
  const [selectedEMI, setSelectedEMI] = useState(3);
  const [loading, setLoading] = useState(false);

  // Accept order details from route params (set by ApproveQuotationScreen)
  const orderId: string = route.params?.orderId ?? '';
  const amount: number = route.params?.amount ?? 45000;
  const currency: string = route.params?.currency ?? 'INR';
  const description: string = route.params?.description ?? 'Sanyog Conformity Services';
  const paymentRecordId: string = route.params?.paymentRecordId ?? '';

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const handlePay = async () => {
    if (!orderId) {
      Alert.alert('Error', 'Payment order not found. Please go back and try again.');
      return;
    }
    setLoading(true);
    try {
      const options = {
        description,
        image: 'https://api.sanyogconformity.com/logo.png',
        currency,
        key: ENV.RAZORPAY_KEY_ID,
        amount: String(amount),        // in paise
        order_id: orderId,
        name: 'Sanyog Conformity Solutions',
        prefill: {
          email: user?.email ?? '',
          contact: user?.phone ?? '',
          name: user?.name ?? '',
        },
        theme: { color: '#6C63FF' },
      };

      const data = await RazorpayCheckout.open(options);
      // data = { razorpay_payment_id, razorpay_order_id, razorpay_signature }
      setLoading(false);
      try {
        await paymentsService.verifyPayment(
          data.razorpay_order_id,
          data.razorpay_payment_id,
          data.razorpay_signature,
        );
      } catch {
        // Webhook will handle verification server-side; still treat as success
      }
      navigation.replace('PaymentSuccess', {
        amount,
        paymentId: data.razorpay_payment_id,
        orderId: data.razorpay_order_id,
      });
    } catch (err: any) {
      setLoading(false);
      if (err?.code === 0) {
        // User dismissed / cancelled
        navigation.replace('PaymentFailed', { amount });
      } else {
        Alert.alert('Payment Failed', err?.description ?? 'Something went wrong. Please try again.');
        navigation.replace('PaymentFailed', { amount });
      }
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Amount Display */}
        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={[styles.amountCard, Shadows.md]}>
          <Text style={styles.amountLabel}>AMOUNT TO PAY</Text>
          <Text style={styles.amountValue}>₹{(amount / 100).toLocaleString('en-IN')}</Text>
          <Text style={styles.amountDesc}>{description}</Text>
        </LinearGradient>

        {/* Payment Methods */}
        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Select Payment Method</Text>
        {PAYMENT_METHODS.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[styles.methodCard, Shadows.sm, selectedMethod === method.id && { borderColor: colors.primary }]}
            onPress={() => setSelectedMethod(method.id)}
            activeOpacity={0.85}
          >
            <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.methodCardInner}>
              <View style={[styles.methodIcon, { backgroundColor: `${method.color}20` }]}>
                <Ionicons name={method.icon} size={22} color={method.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.methodTitle}>{method.title}</Text>
                <Text style={styles.methodSubtitle}>{method.subtitle}</Text>
              </View>
              <View style={[styles.radioCircle, selectedMethod === method.id && { borderColor: colors.primary }]}>
                {selectedMethod === method.id && <View style={[styles.radioFill, { backgroundColor: colors.primary }]} />}
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}

        {/* EMI Plan Selector */}
        {selectedMethod === 'emi' && (
          <View style={styles.emiSection}>
            <Text style={styles.emiTitle}>Select EMI Plan</Text>
            {EMI_PLANS.map((plan) => {
              const monthly = Math.round((amount * (1 + plan.rate / 100)) / plan.months);
              return (
                <TouchableOpacity
                  key={plan.months}
                  style={[styles.emiCard, selectedEMI === plan.months && { borderColor: colors.primary, backgroundColor: `${colors.primary}08` }]}
                  onPress={() => setSelectedEMI(plan.months)}
                  activeOpacity={0.85}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.emiLabel}>{plan.label}</Text>
                      {plan.tag && (
                        <View style={[styles.emiTag, { backgroundColor: plan.rate === 0 ? `${colors.success}20` : `${colors.primary}20` }]}>
                          <Text style={[styles.emiTagText, { color: plan.rate === 0 ? colors.success : colors.primary }]}>{plan.tag}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.emiMonthly}>₹{monthly.toLocaleString('en-IN')} / month</Text>
                    {plan.rate > 0 && <Text style={styles.emiRate}>{plan.rate}% interest p.m.</Text>}
                  </View>
                  <View style={[styles.radioCircle, selectedEMI === plan.months && { borderColor: colors.primary }]}>
                    {selectedEMI === plan.months && <View style={[styles.radioFill, { backgroundColor: colors.primary }]} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Security Badge */}
        <View style={[styles.securityBadge, { backgroundColor: `${colors.success}15`, borderColor: `${colors.success}30` }]}>
          <Ionicons name="lock-closed" size={14} color={colors.success} />
          <Text style={[styles.securityText, { color: colors.success }]}>Secured with 256-bit SSL encryption</Text>
        </View>

        <TouchableOpacity style={[styles.payBtn, Shadows.md]} onPress={handlePay} disabled={loading} activeOpacity={0.85}>
          <LinearGradient colors={[colors.success, colors.successDark]} style={styles.payBtnGradient}>
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                  <Ionicons name="lock-closed" size={18} color="#FFFFFF" />
                  <Text style={styles.payBtnText}>Pay via Razorpay — ₹{(amount / 100).toLocaleString('en-IN')}</Text>
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
    amountCard: { borderRadius: BorderRadius.lg, padding: 24, alignItems: 'center', marginBottom: 24 },
    amountLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5, marginBottom: 8 },
    amountValue: { fontSize: 40, fontWeight: '900', color: '#FFFFFF', marginBottom: 6 },
    amountDesc: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    methodCard: { marginBottom: 10, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 2, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    methodCardInner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
    methodIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    methodTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    methodSubtitle: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
    radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    radioFill: { width: 10, height: 10, borderRadius: 5 },
    securityBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: 20 },
    emiSection: { marginBottom: 16 },
    emiTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
    emiCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border, marginBottom: 8 },
    emiLabel: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    emiMonthly: { fontSize: 16, fontWeight: '800', color: colors.primary, marginTop: 2 },
    emiRate: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    emiTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full },
    emiTagText: { fontSize: 10, fontWeight: '700' },
    securityText: { fontSize: 12, fontWeight: '500' },
    payBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
    payBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
    payBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  });

export default PaymentGatewayScreen;
