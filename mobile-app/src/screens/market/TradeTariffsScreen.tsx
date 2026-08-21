import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, Typography, Shadows, BorderRadius, Spacing } from '../../theme';
import Button from '../../components/common/Button';
import tradeService, { TradeTrafficResult } from '../../services/tradeService';

/**
 * Trade Traffic — import/export activity for a product/HS code and market.
 * Validates the product↔HS pairing (wrong-HS detection) and shows verified
 * trade data only. No fabricated tariffs/volumes.
 */
export default function TradeTariffsScreen() {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const navigation = useNavigation<any>();
  const [productName, setProductName] = useState('');
  const [hsCode, setHsCode] = useState('');
  const [market, setMarket] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TradeTrafficResult | null>(null);

  const check = async () => {
    if (!productName.trim() && !hsCode.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await tradeService.traffic({
        productName: productName.trim() || undefined,
        code: hsCode.trim() || undefined,
        market: market.trim() || undefined,
      });
      setResult(res);
    } catch (e: any) {
      Alert.alert('Trade lookup failed', e?.response?.data?.message || 'Could not reach the trade service.');
    } finally {
      setLoading(false);
    }
  };

  const isProblem = result && ['INVALID_HS', 'HS_MISMATCH', 'NO_HS'].includes(result.status);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.glassBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trade Traffic</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Import / export activity</Text>
          <Text style={styles.subText}>We validate the HS code against your product, then show verified trade traffic where it exists.</Text>

          <Text style={styles.label}>Product</Text>
          <TextInput style={styles.input} placeholder="e.g., Smartphone" placeholderTextColor={colors.textSecondary} value={productName} onChangeText={setProductName} />

          <Text style={styles.label}>HS code (optional)</Text>
          <TextInput style={styles.input} placeholder="e.g., 8517.13" placeholderTextColor={colors.textSecondary} value={hsCode} onChangeText={setHsCode} keyboardType="numbers-and-punctuation" />

          <Text style={styles.label}>Target market (ISO code)</Text>
          <TextInput style={styles.input} placeholder="e.g., IN, US" placeholderTextColor={colors.textSecondary} value={market} onChangeText={setMarket} autoCapitalize="characters" maxLength={3} />

          <Button title="Check Trade Traffic" onPress={check} loading={loading} disabled={loading} style={{ marginTop: Spacing.md }} />
        </View>

        {loading && (
          <View style={{ alignItems: 'center', marginTop: 32 }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: 12, color: colors.textSecondary }}>Validating HS and checking trade data…</Text>
          </View>
        )}

        {result && (
          <View style={{ marginTop: Spacing.md }}>
            {/* Wrong / unresolved HS */}
            {isProblem ? (
              <View style={[styles.banner, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '40' }]}>
                <Ionicons name="alert-circle" size={20} color={colors.warning} />
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <Text style={[styles.bannerTitle, { color: colors.warning }]}>
                    {result.status === 'HS_MISMATCH' ? 'HS Code may not match this product' : result.status === 'INVALID_HS' ? 'Invalid HS code' : 'HS code not determined'}
                  </Text>
                  <Text style={styles.bannerMsg}>{result.message}</Text>
                </View>
              </View>
            ) : null}

            {/* Recommended code (from analyzer) */}
            {result.hs?.recommended && (result.status === 'HS_MISMATCH' || result.status === 'NO_HS') ? (
              <View style={styles.recBox}>
                <Text style={styles.recLabel}>Recommended HS code</Text>
                <Text style={styles.recCode}>{result.hs.recommended.displayCode}</Text>
                <Text style={styles.recDesc}>{result.hs.recommended.description}</Text>
                <TouchableOpacity onPress={() => { setHsCode(result.hs.recommended!.displayCode); }}>
                  <Text style={styles.useLink}>Use this code →</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {result.requiresManualReview ? (
              <Button title="Request Expert Review" variant="secondary" onPress={() => navigation.navigate('ProductAnalyzer')} style={{ marginTop: Spacing.md }} />
            ) : null}

            {/* Needs market */}
            {result.status === 'NEEDS_MARKET' ? (
              <View style={styles.infoBox}>
                <Ionicons name="flag-outline" size={18} color={colors.primary} />
                <Text style={styles.infoText}>{result.message} HS code resolved: {result.hsCode}.</Text>
              </View>
            ) : null}

            {/* Verified data */}
            {result.status === 'OK' && result.data ? (
              <View style={styles.card}>
                <View style={styles.dataHead}>
                  <Text style={styles.sectionTitle}>Trade traffic — HS {result.hsCode} · {result.market}</Text>
                  <View style={styles.verifiedTag}><Text style={styles.verifiedText}>Verified</Text></View>
                </View>
                <Text style={styles.sourceLine}>Source: {result.data.source} · Period: {result.data.period}</Text>
                {result.data.records.map((r, i) => (
                  <View key={i} style={styles.recordRow}>
                    <Text style={styles.recordDir}>{r.direction === 'import' ? '↓ Import' : '↑ Export'}</Text>
                    <Text style={styles.recordMeta}>{r.period}{r.partner ? ` · ${r.partner}` : ''}</Text>
                    <Text style={styles.recordVal}>{r.valueUsd != null ? `$${r.valueUsd.toLocaleString()}` : r.quantity != null ? `${r.quantity} ${r.unit ?? ''}` : '—'}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Honest unavailable */}
            {result.status === 'UNAVAILABLE' ? (
              <View style={styles.card}>
                <View style={{ alignItems: 'center', paddingVertical: Spacing.lg }}>
                  <Ionicons name="analytics-outline" size={40} color={colors.textSecondary} />
                  <Text style={styles.unavailTitle}>Verified trade data unavailable</Text>
                  <Text style={styles.unavailSub}>{result.message}</Text>
                  {result.hsCode ? <Text style={styles.unavailMeta}>Classified as HS {result.hsCode}. We don’t show estimated or fabricated trade numbers.</Text> : null}
                </View>
              </View>
            ) : null}

            <Text style={styles.note}>{result.coverageNote}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#0A0A0A' : '#F7F9FC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border },
  glassBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...Typography.h3, color: colors.textPrimary },
  content: { padding: Spacing.xl },
  card: { backgroundColor: colors.bgCard, padding: Spacing.xl, borderRadius: BorderRadius['2xl'], ...Shadows.sm, marginBottom: Spacing.md },
  sectionTitle: { ...Typography.h4, color: colors.textPrimary, marginBottom: Spacing.xs },
  subText: { ...Typography.body2, color: colors.textSecondary, marginBottom: Spacing.lg },
  label: { ...Typography.caption, color: colors.textPrimary, marginBottom: 4, marginLeft: 4, marginTop: Spacing.sm },
  input: { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.bgCardLight, borderWidth: 1, borderColor: colors.border, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.lg, height: 52, ...Typography.body1, color: colors.textPrimary },
  banner: { flexDirection: 'row', alignItems: 'flex-start', padding: Spacing.lg, borderRadius: BorderRadius.xl, borderWidth: 1, marginBottom: Spacing.md },
  bannerTitle: { ...Typography.body1, fontWeight: '700' },
  bannerMsg: { ...Typography.body2, color: colors.textSecondary, marginTop: 2, lineHeight: 20 },
  recBox: { backgroundColor: colors.success + '10', padding: Spacing.lg, borderRadius: BorderRadius.xl, marginBottom: Spacing.md },
  recLabel: { ...Typography.caption, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase' },
  recCode: { ...Typography.h3, color: colors.textPrimary, marginTop: 4 },
  recDesc: { ...Typography.caption, color: colors.textSecondary, marginTop: 2 },
  useLink: { ...Typography.body2, color: colors.primary, fontWeight: '700', marginTop: Spacing.sm },
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: colors.primary + '10', padding: Spacing.md, borderRadius: BorderRadius.lg, marginBottom: Spacing.md },
  infoText: { ...Typography.caption, color: colors.textPrimary, flex: 1 },
  dataHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  verifiedTag: { backgroundColor: colors.success + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full },
  verifiedText: { ...Typography.caption, color: colors.success, fontWeight: '700' },
  sourceLine: { ...Typography.caption, color: colors.textSecondary, marginBottom: Spacing.md },
  recordRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  recordDir: { ...Typography.body2, color: colors.textPrimary, fontWeight: '600', width: 90 },
  recordMeta: { ...Typography.caption, color: colors.textSecondary, flex: 1 },
  recordVal: { ...Typography.body2, color: colors.textPrimary, fontWeight: '700' },
  unavailTitle: { ...Typography.h5, color: colors.textPrimary, marginTop: Spacing.md },
  unavailSub: { ...Typography.body2, color: colors.textSecondary, textAlign: 'center', marginTop: 4, lineHeight: 20 },
  unavailMeta: { ...Typography.caption, color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm },
  note: { ...Typography.caption, color: colors.textSecondary, marginTop: Spacing.sm, lineHeight: 18 },
});
