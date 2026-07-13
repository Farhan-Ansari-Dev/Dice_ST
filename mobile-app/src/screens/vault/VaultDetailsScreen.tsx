import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import Badge from '../../components/common/Badge';

const CERT = {
  number: 'CM/L-7654321', authority: 'Bureau of Indian Standards', product: 'Electronic Equipment',
  standard: 'IS 13252 (Part 1)', issued: '15 Mar 2024', expiry: '14 Mar 2026',
  manufacturer: 'TechCorp Industries', address: 'Plot 42, Electronics City',
  model: 'XC-9000 Series', voltage: '220-240V', current: '5A', frequency: '50Hz',
};

const VaultDetailsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  
  const docName = route.params?.docName || 'Document Details';

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const rows = [
    { label: 'Certificate No.', value: CERT.number },
    { label: 'Issuing Authority', value: CERT.authority },
    { label: 'Product', value: CERT.product },
    { label: 'Standard', value: CERT.standard },
    { label: 'Model No.', value: CERT.model },
    { label: 'Manufacturer', value: CERT.manufacturer },
    { label: 'Address', value: CERT.address },
    { label: 'Input Voltage', value: CERT.voltage },
    { label: 'Valid Until', value: CERT.expiry },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{docName}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('VaultDownload')} style={styles.actionBtn}>
          <Ionicons name="download-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <LinearGradient colors={['#1A1560','#6C63FF','#00D4FF']} style={styles.heroBanner} start={{x:0,y:0}} end={{x:1,y:1}}>
          <View style={styles.heroInner}>
            <Ionicons name="shield-checkmark" size={48} color="#FFFFFF" />
            <Text style={styles.heroTitle}>{docName}</Text>
            <View style={styles.heroBadgeWrap}>
              <Badge label="Valid & Active" variant="success" size="md" />
            </View>
            <Text style={styles.heroCertNo}>{CERT.number}</Text>
          </View>
        </LinearGradient>

        <View style={[styles.card, Shadows.sm]}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF','#F7F8FC']} style={styles.cardInner}>
            <Text style={styles.sectionTitle}>Document Properties</Text>
            {rows.map((r, i) => (
              <View key={i} style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border }]}>
                <Text style={styles.rowLabel}>{r.label}</Text>
                <Text style={styles.rowValue}>{r.value}</Text>
              </View>
            ))}
          </LinearGradient>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionCard, Shadows.sm]} onPress={() => navigation.navigate('VaultQR')}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.actionCardGrad}>
              <Ionicons name="qr-code" size={22} color="#FFFFFF" />
              <Text style={styles.actionCardText}>Verify QR</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionCard, Shadows.sm]} onPress={() => navigation.navigate('VaultShare')}>
            <LinearGradient colors={[colors.secondary, colors.secondaryDark]} style={styles.actionCardGrad}>
              <Ionicons name="share-social" size={22} color="#FFFFFF" />
              <Text style={styles.actionCardText}>Share</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDark },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? colors.bgCardLight : colors.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  actionBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? colors.bgCardLight : colors.border, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  heroBanner: { borderRadius: BorderRadius.xl, padding: 28, alignItems: 'center', marginBottom: 20 },
  heroInner: { alignItems: 'center', gap: 8 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginTop: 8 },
  heroCertNo: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  heroBadgeWrap: { marginTop: 6, alignSelf: 'center' },
  card: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, marginBottom: 16 },
  cardInner: { padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  row: { paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  rowLabel: { fontSize: 13, color: colors.textTertiary, flex: 1 },
  rowValue: { fontSize: 13, color: colors.textPrimary, fontWeight: '500', flex: 1.5, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  actionCard: { flex: 1, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  actionCardGrad: { padding: 16, alignItems: 'center', gap: 8, flexDirection: 'row', justifyContent: 'center' },
  actionCardText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});
export default VaultDetailsScreen;
