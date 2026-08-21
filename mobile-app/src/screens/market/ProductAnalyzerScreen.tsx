import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, Typography, Shadows, BorderRadius, Spacing } from '../../theme';
import Button from '../../components/common/Button';
import hsService, { ProductAnalysis, AnalysisStatus } from '../../services/hsService';
import leadsService from '../../services/leadsService';
import { useAuthStore } from '../../store/authStore';

const STATUS_META: Record<AnalysisStatus, { label: string; tone: 'success' | 'warning' | 'error' | 'info'; icon: any }> = {
  RESOLVED:            { label: 'Classified', tone: 'success', icon: 'checkmark-circle' },
  PROVIDED_MISMATCH:   { label: 'Possible mismatch', tone: 'warning', icon: 'alert-circle' },
  INVALID_FORMAT:      { label: 'Invalid HS format', tone: 'error', icon: 'close-circle' },
  AMBIGUOUS:           { label: 'Needs review', tone: 'warning', icon: 'help-circle' },
  NEEDS_MORE_INFO:     { label: 'More info needed', tone: 'info', icon: 'information-circle' },
  NO_VERIFIED_MATCH:   { label: 'No verified match', tone: 'info', icon: 'search' },
};

export default function ProductAnalyzerScreen() {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();

  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [hsCode, setHsCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProductAnalysis | null>(null);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [adoptedCode, setAdoptedCode] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);

  const toneColor = (tone: string) =>
    tone === 'success' ? colors.success : tone === 'warning' ? colors.warning : tone === 'error' ? colors.error : colors.primary;

  const analyze = async () => {
    if (!productName.trim() && !description.trim() && !hsCode.trim()) return;
    setLoading(true);
    setResult(null);
    setShowAlternatives(false);
    setAdoptedCode(null);
    try {
      const res = await hsService.analyze({
        productName: productName.trim() || undefined,
        productDescription: description.trim() || undefined,
        code: hsCode.trim() || undefined,
      });
      setResult(res);
    } catch (e: any) {
      Alert.alert('Analysis failed', e?.response?.data?.message || 'Could not reach the classification service.');
    } finally {
      setLoading(false);
    }
  };

  const useRecommended = () => {
    if (!result?.recommended) return;
    setHsCode(result.recommended.displayCode);
    setAdoptedCode(result.recommended.displayCode);
  };

  const requestExpertReview = async () => {
    if (!user?.email) {
      Alert.alert('Account email missing', 'Your account needs an email address to request an expert review.');
      return;
    }
    setReviewing(true);
    try {
      await leadsService.create({
        serviceId: 'hs_classification',
        serviceName: 'HS classification review',
        contactName: user.name || 'DICE Client',
        contactEmail: user.email,
        contactPhone: user.phone || undefined,
        companyName: user.companyName || undefined,
        productDescription: [productName, description].filter(Boolean).join(' — ') || result?.product || 'Product',
        notes: hsCode.trim() ? `User-provided HS code under review: ${hsCode.trim()}` : undefined,
        manualReview: true,
        source: 'product_analyzer',
      });
      Alert.alert('Expert review requested', 'Our specialists will review this classification. Track it under “My Requests”.', [
        { text: 'Track', onPress: () => navigation.navigate('MyRequests') },
        { text: 'OK' },
      ]);
    } catch (e: any) {
      Alert.alert('Could not submit', e?.response?.data?.message || 'Please try again.');
    } finally {
      setReviewing(false);
    }
  };

  const meta = result ? STATUS_META[result.status] : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.glassBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Analyzer</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Describe your product</Text>
          <Text style={styles.subText}>We classify it against DICE’s verified HS coverage. Add an HS code to check if it fits.</Text>

          <Text style={styles.label}>Product name</Text>
          <TextInput style={styles.input} placeholder="e.g., Wireless computer mouse" placeholderTextColor={colors.textSecondary} value={productName} onChangeText={setProductName} />

          <Text style={styles.label}>Description (optional)</Text>
          <TextInput style={[styles.input, styles.multiline]} placeholder="Function, technology, materials…" placeholderTextColor={colors.textSecondary} value={description} onChangeText={setDescription} multiline />

          <Text style={styles.label}>HS code (optional)</Text>
          <TextInput style={styles.input} placeholder="e.g., 8517.13" placeholderTextColor={colors.textSecondary} value={hsCode} onChangeText={setHsCode} keyboardType="numbers-and-punctuation" />

          <Button title="Analyze" onPress={analyze} loading={loading} disabled={loading} style={{ marginTop: Spacing.md }} />
        </View>

        {loading && (
          <View style={{ alignItems: 'center', marginTop: 32 }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: 12, color: colors.textSecondary }}>Classifying against verified HS data…</Text>
          </View>
        )}

        {result && meta && (
          <View style={{ marginTop: Spacing.md }}>
            {/* Status banner */}
            <View style={[styles.banner, { backgroundColor: toneColor(meta.tone) + '15', borderColor: toneColor(meta.tone) + '40' }]}>
              <Ionicons name={meta.icon} size={20} color={toneColor(meta.tone)} />
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <Text style={[styles.bannerTitle, { color: toneColor(meta.tone) }]}>{meta.label}</Text>
                <Text style={styles.bannerMsg}>{result.message}</Text>
              </View>
            </View>

            {/* Wrong-HS explanation */}
            {result.status === 'PROVIDED_MISMATCH' && result.providedCode?.mismatchReason ? (
              <View style={styles.reasonBox}>
                <Text style={styles.reasonLabel}>Why</Text>
                <Text style={styles.reasonText}>{result.providedCode.mismatchReason}</Text>
              </View>
            ) : null}

            {/* Clarification questions */}
            {result.clarification && result.clarification.length > 0 ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Help us classify</Text>
                {result.clarification.map((q, i) => (
                  <Text key={i} style={styles.clarify}>• {q}</Text>
                ))}
              </View>
            ) : null}

            {/* Recommended */}
            {result.recommended ? (
              <View style={styles.resultCard}>
                <View style={styles.recTop}>
                  <Text style={styles.recLabel}>{result.status === 'PROVIDED_MISMATCH' ? 'Recommended instead' : 'Recommended HS code'}</Text>
                  <View style={styles.verifiedTag}>
                    <Ionicons name="shield-checkmark" size={12} color={colors.success} />
                    <Text style={styles.verifiedText}>Verified · {result.recommended.source}</Text>
                  </View>
                </View>
                <Text style={styles.recCode}>{result.recommended.displayCode}</Text>
                <Text style={styles.recDesc}>{result.recommended.description}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.metaItem}>
                    Confidence:{' '}
                    <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                      {result.recommended.confidence != null ? `${Math.round(result.recommended.confidence * 100)}% (AI-assessed)` : 'Not evaluated'}
                    </Text>
                  </Text>
                </View>
                {result.recommended.reason ? <Text style={styles.recReason}>{result.recommended.reason}</Text> : null}

                {adoptedCode === result.recommended.displayCode ? (
                  <View style={styles.adopted}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={styles.adoptedText}>Using {adoptedCode}</Text>
                  </View>
                ) : (
                  <Button title="Use Recommended HS Code" onPress={useRecommended} style={{ marginTop: Spacing.md }} />
                )}
              </View>
            ) : null}

            {/* Alternatives */}
            {result.candidates.length > 1 ? (
              <View style={styles.card}>
                <TouchableOpacity style={styles.altHeader} onPress={() => setShowAlternatives((s) => !s)}>
                  <Text style={styles.sectionTitle}>Review Alternatives ({result.candidates.length})</Text>
                  <Ionicons name={showAlternatives ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                {showAlternatives &&
                  result.candidates.map((c) => (
                    <View key={c.code} style={styles.altRow}>
                      <Text style={styles.altCode}>{c.displayCode}</Text>
                      <Text style={styles.altDesc} numberOfLines={2}>{c.description}</Text>
                    </View>
                  ))}
              </View>
            ) : null}

            {/* Notes */}
            {result.marketNote ? <Text style={styles.note}>{result.marketNote}</Text> : null}
            <Text style={styles.note}>{result.coverageNote}</Text>

            {/* Actions */}
            {result.requiresManualReview || result.status === 'NO_VERIFIED_MATCH' ? (
              <Button title={reviewing ? 'Requesting…' : 'Request Expert Review'} onPress={requestExpertReview} loading={reviewing} disabled={reviewing} variant="secondary" style={{ marginTop: Spacing.md }} />
            ) : null}
            {adoptedCode ? (
              <Button title="Continue to Market Access" onPress={() => navigation.navigate('MarketAccessRoot')} style={{ marginTop: Spacing.md, marginBottom: Spacing.xl }} />
            ) : null}
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
  input: { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.bgCardLight, borderWidth: 1, borderColor: colors.border, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.lg, minHeight: 52, ...Typography.body1, color: colors.textPrimary },
  multiline: { minHeight: 84, textAlignVertical: 'top', paddingTop: Spacing.sm },
  banner: { flexDirection: 'row', alignItems: 'flex-start', padding: Spacing.lg, borderRadius: BorderRadius.xl, borderWidth: 1, marginBottom: Spacing.md },
  bannerTitle: { ...Typography.body1, fontWeight: '700' },
  bannerMsg: { ...Typography.body2, color: colors.textSecondary, marginTop: 2, lineHeight: 20 },
  reasonBox: { backgroundColor: colors.warning + '10', padding: Spacing.lg, borderRadius: BorderRadius.lg, marginBottom: Spacing.md },
  reasonLabel: { ...Typography.caption, color: colors.warning, fontWeight: '700', marginBottom: 4 },
  reasonText: { ...Typography.body2, color: colors.textPrimary, lineHeight: 20 },
  clarify: { ...Typography.body2, color: colors.textSecondary, marginTop: 6, lineHeight: 20 },
  resultCard: { backgroundColor: colors.bgCard, padding: Spacing.xl, borderRadius: BorderRadius['2xl'], ...Shadows.sm, marginBottom: Spacing.md, borderWidth: 1, borderColor: colors.success + '30' },
  recTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  recLabel: { ...Typography.caption, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase' },
  verifiedTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.success + '15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full },
  verifiedText: { ...Typography.caption, color: colors.success, fontWeight: '700' },
  recCode: { ...Typography.h1, color: colors.textPrimary, letterSpacing: 1 },
  recDesc: { ...Typography.body2, color: colors.textSecondary, marginTop: 4, lineHeight: 20 },
  metaRow: { marginTop: Spacing.md },
  metaItem: { ...Typography.caption, color: colors.textSecondary },
  recReason: { ...Typography.caption, color: colors.textSecondary, marginTop: Spacing.sm, fontStyle: 'italic' },
  adopted: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.md },
  adoptedText: { ...Typography.body2, color: colors.success, fontWeight: '700' },
  altHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  altRow: { paddingVertical: Spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, marginTop: Spacing.sm },
  altCode: { ...Typography.body1, fontWeight: '700', color: colors.primary },
  altDesc: { ...Typography.caption, color: colors.textSecondary, marginTop: 2 },
  note: { ...Typography.caption, color: colors.textSecondary, marginTop: Spacing.sm, lineHeight: 18 },
});
