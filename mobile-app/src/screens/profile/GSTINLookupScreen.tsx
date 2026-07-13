import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Clipboard,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

interface GSTINResult {
  gstin: string;
  companyName: string;
  registrationDate: string;
  status: 'Active' | 'Inactive' | 'Cancelled';
  state: string;
  businessType: string;
  tradeName: string;
  constitutionOfBusiness: string;
}

const MOCK_DB: Record<string, GSTINResult> = {};

const GSTINLookupScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [gstin, setGstin] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GSTINResult | null>(null);
  const [error, setError] = useState('');

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const handleVerify = async () => {
    const trimmed = gstin.trim().toUpperCase();
    if (trimmed.length !== 15) {
      setError('GSTIN must be exactly 15 characters.');
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    const found = MOCK_DB[trimmed] ?? null;
    setResult(found);
  };

  const handleCopyToProfile = () => {
    Alert.alert('Copied to Profile', `GSTIN ${result?.gstin} and company details saved to your profile.`);
  };

  const statusColor =
    result?.status === 'Active'
      ? colors.success
      : result?.status === 'Inactive'
      ? colors.warning
      : colors.error ?? '#FF5A5A';

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
        <Text style={styles.headerTitle}>GSTIN Lookup</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Verify any GSTIN number and fetch company details instantly.</Text>

        <View style={[styles.inputCard, Shadows.sm]}>
          <LinearGradient
            colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
            style={styles.inputCardInner}
          >
            <Text style={styles.inputLabel}>GSTIN Number</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={gstin}
                onChangeText={(t) => {
                  setGstin(t.toUpperCase());
                  setError('');
                  setResult(null);
                }}
                placeholder="e.g. 27AAACS0311C1Z5"
                placeholderTextColor={colors.textTertiary}
                maxLength={15}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {gstin.length > 0 && (
                <TouchableOpacity onPress={() => { setGstin(''); setResult(null); setError(''); }}>
                  <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.charCount}>
              <Text style={[styles.charCountText, gstin.length === 15 && { color: colors.success }]}>
                {gstin.length}/15
              </Text>
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </LinearGradient>
        </View>

        <TouchableOpacity
          style={[styles.verifyBtn, Shadows.primary, loading && styles.verifyBtnDisabled]}
          onPress={handleVerify}
          disabled={loading}
          activeOpacity={0.9}
        >
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.verifyBtnGrad}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="search-outline" size={18} color="#FFFFFF" />
                <Text style={styles.verifyBtnText}>Verify GSTIN</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {result && (
          <View style={[styles.resultCard, Shadows.md]}>
            <LinearGradient
              colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
              style={styles.resultCardInner}
            >
              <View style={styles.resultHeader}>
                <View style={styles.resultIconWrap}>
                  <Ionicons name="business" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultCompany}>{result.companyName}</Text>
                  <Text style={styles.resultTrade}>{result.tradeName}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.statusText, { color: statusColor }]}>{result.status}</Text>
                </View>
              </View>

              {[
                { label: 'GSTIN', value: result.gstin, mono: true },
                { label: 'Registration Date', value: result.registrationDate },
                { label: 'State', value: result.state },
                { label: 'Business Type', value: result.businessType },
                { label: 'Constitution', value: result.constitutionOfBusiness },
              ].map((row) => (
                <View key={row.label} style={styles.resultRow}>
                  <Text style={styles.resultLabel}>{row.label}</Text>
                  <Text style={[styles.resultValue, row.mono && styles.resultValueMono]}>{row.value}</Text>
                </View>
              ))}

              <TouchableOpacity style={[styles.copyBtn, Shadows.sm]} onPress={handleCopyToProfile}>
                <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.copyBtnGrad}>
                  <Ionicons name="copy-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.copyBtnText}>Copy to Profile</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}
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
    subtitle: { fontSize: 14, color: colors.textSecondary, lineHeight: 21, marginBottom: 20 },
    inputCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, marginBottom: 16 },
    inputCardInner: { padding: 16 },
    inputLabel: { fontSize: 12, fontWeight: '600', color: colors.textTertiary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border, borderRadius: BorderRadius.md, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8F9FC' },
    input: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.textPrimary, letterSpacing: 1.5 },
    charCount: { alignItems: 'flex-end', marginTop: 6 },
    charCountText: { fontSize: 11, color: colors.textTertiary },
    errorText: { fontSize: 12, color: colors.error ?? '#FF5A5A', marginTop: 4 },
    verifyBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: 20 },
    verifyBtnDisabled: { opacity: 0.7 },
    verifyBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
    verifyBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
    resultCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    resultCardInner: { padding: 16 },
    resultHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
    resultIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: `${colors.primary}20`, alignItems: 'center', justifyContent: 'center' },
    resultCompany: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    resultTrade: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 11, fontWeight: '700' },
    resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border },
    resultLabel: { fontSize: 13, color: colors.textTertiary },
    resultValue: { fontSize: 13, color: colors.textPrimary, fontWeight: '500', flex: 1, textAlign: 'right' },
    resultValueMono: { fontFamily: 'monospace', letterSpacing: 1 },
    copyBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginTop: 16 },
    copyBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13 },
    copyBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  });

export default GSTINLookupScreen;
