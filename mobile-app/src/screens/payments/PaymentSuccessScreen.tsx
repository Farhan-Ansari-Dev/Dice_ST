import React, { useMemo, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import { useVaultStore } from '../../store/vaultStore';

const PaymentSuccessScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const addDocument = useVaultStore(state => state.addDocument);

  useEffect(() => {
    // Automatically push the new certificate into the vault after purchase
    addDocument({
      name: 'BIS CRS Certification (New)',
      type: 'Certification',
      uploaded: true,
      dateAdded: new Date().toLocaleDateString()
    });
  }, [addDocument]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.content}>
        <View style={styles.iconArea}>
          <View style={styles.outerRing} />
          <View style={styles.innerRing} />
          <LinearGradient colors={[colors.success, colors.successDark]} style={styles.successCircle}>
            <Ionicons name="checkmark" size={52} color="#FFFFFF" />
          </LinearGradient>
        </View>

        <Text style={styles.title}>Payment Successful!</Text>
        <Text style={styles.subtitle}>Your payment has been processed successfully.</Text>

        <View style={[styles.detailsCard, Shadows.md]}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.detailsCardInner}>
            {[
              { label: 'Amount Paid', value: '₹0', bold: true },
              { label: 'Transaction ID', value: '', bold: false },
              { label: 'Payment Method', value: '', bold: false },
              { label: 'Date & Time', value: '', bold: false },
              { label: 'Invoice No.', value: '', bold: false },
            ].map((item, i) => (
              <View key={i} style={[styles.detailRow, i > 0 && { borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border }]}>
                <Text style={styles.detailLabel}>{item.label}</Text>
                <Text style={[styles.detailValue, item.bold && { color: colors.success, fontSize: 16 }]}>{item.value}</Text>
              </View>
            ))}
          </LinearGradient>
        </View>

        <TouchableOpacity style={[styles.receiptBtn, Shadows.md]} onPress={() => Alert.alert('Download', 'Receipt downloaded!')} activeOpacity={0.85}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.receiptBtnGradient}>
            <Ionicons name="download-outline" size={18} color="#FFFFFF" />
            <Text style={styles.receiptBtnText}>Download Receipt</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.goBack()}>
          <Text style={[styles.homeBtnText, { color: colors.primary }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
    iconArea: { alignItems: 'center', justifyContent: 'center', marginBottom: 24, position: 'relative' },
    outerRing: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 1, borderColor: `${colors.success}20` },
    innerRing: { position: 'absolute', width: 130, height: 130, borderRadius: 65, borderWidth: 2, borderColor: `${colors.success}30` },
    successCircle: { width: 100, height: 100, borderRadius: 30, alignItems: 'center', justifyContent: 'center', shadowColor: colors.success, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 12 },
    title: { fontSize: 26, fontWeight: '900', color: colors.textPrimary, textAlign: 'center', marginBottom: 8 },
    subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
    detailsCard: { width: '100%', borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, marginBottom: 20 },
    detailsCardInner: { padding: 4 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
    detailLabel: { fontSize: 13, color: colors.textSecondary },
    detailValue: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
    receiptBtn: { width: '100%', borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: 12 },
    receiptBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
    receiptBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
    homeBtn: { paddingVertical: 8 },
    homeBtnText: { fontSize: 14, fontWeight: '600' },
  });

export default PaymentSuccessScreen;
