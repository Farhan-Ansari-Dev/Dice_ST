import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const PRODUCT_TYPES: any[] = [];
const TARGET_MARKETS: any[] = [];
const COMPANY_TYPES: any[] = [];

const RESULTS: any[] = [];

const CertificationEligibilityCheckerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [productType, setProductType] = useState('');
  const [hsCode, setHsCode] = useState('');
  const [market, setMarket] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [showResults, setShowResults] = useState(false);
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const renderDropdown = (label: string, selected: string, options: string[], onSelect: (v: string) => void) => (
    <View style={styles.dropdownGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, selected === opt && styles.chipSelected]}
            onPress={() => onSelect(opt)}
          >
            {selected === opt && (
              <LinearGradient colors={[colors.primary, colors.primaryDark]} style={StyleSheet.absoluteFill} />
            )}
            <Text style={[styles.chipText, selected === opt && { color: '#FFFFFF' }]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Eligibility Checker</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.formCard, Shadows.md]}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.formCardInner}>
            <Text style={styles.sectionTitle}>Product Details</Text>
            {renderDropdown('Product Type', productType, PRODUCT_TYPES, setProductType)}
            {renderDropdown('Target Market', market, TARGET_MARKETS, setMarket)}
            {renderDropdown('Company Type', companyType, COMPANY_TYPES, setCompanyType)}
          </LinearGradient>
        </View>

        <TouchableOpacity style={[styles.checkBtn, Shadows.md]} onPress={() => setShowResults(true)} activeOpacity={0.85}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.checkBtnGradient}>
            <Ionicons name="search" size={18} color="#FFFFFF" />
            <Text style={styles.checkBtnText}>Check Eligibility</Text>
          </LinearGradient>
        </TouchableOpacity>

        {showResults && (
          <>
            <View style={styles.resultsHeader}>
              <Text style={styles.sectionTitle}>Eligible Certifications</Text>
              <View style={[styles.resultsBadge, { backgroundColor: `${colors.success}20` }]}>
                <Text style={[styles.resultsCount, { color: colors.success }]}>{RESULTS.length} found</Text>
              </View>
            </View>
            {RESULTS.map((result) => (
              <View key={result.name} style={[styles.resultCard, Shadows.sm]}>
                <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.resultCardInner}>
                  <View style={styles.resultTop}>
                    <View style={[styles.resultIcon, { backgroundColor: `${result.color}20` }]}>
                      <Ionicons name="shield-checkmark" size={20} color={result.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultName}>{result.name}</Text>
                      <Text style={styles.resultBody}>{result.body}</Text>
                    </View>
                    <View style={styles.matchBadge}>
                      <Text style={[styles.matchText, { color: result.color }]}>{result.match}%</Text>
                    </View>
                  </View>
                  {result.mandatory && (
                    <View style={[styles.mandatoryTag, { backgroundColor: `${colors.error}15` }]}>
                      <Ionicons name="alert-circle" size={12} color={colors.error} />
                      <Text style={[styles.mandatoryText, { color: colors.error }]}>Mandatory</Text>
                    </View>
                  )}
                </LinearGradient>
              </View>
            ))}
          </>
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
    formCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, marginBottom: 16 },
    formCardInner: { padding: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 16 },
    dropdownGroup: { marginBottom: 16 },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    chipsRow: { gap: 8, paddingBottom: 4 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full, backgroundColor: isDark ? colors.bgCardLight : colors.bgCardLight, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border, overflow: 'hidden', position: 'relative' },
    chipSelected: { borderColor: colors.primary },
    chipText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
    checkBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: 20 },
    checkBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
    checkBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
    resultsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    resultsBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
    resultsCount: { fontSize: 12, fontWeight: '700' },
    resultCard: { marginBottom: 10, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    resultCardInner: { padding: 14 },
    resultTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    resultIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    resultName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    resultBody: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
    matchBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full, backgroundColor: isDark ? colors.bgCardLight : colors.bgCardLight },
    matchText: { fontSize: 13, fontWeight: '800' },
    mandatoryTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full, alignSelf: 'flex-start' },
    mandatoryText: { fontSize: 11, fontWeight: '700' },
  });

export default CertificationEligibilityCheckerScreen;
