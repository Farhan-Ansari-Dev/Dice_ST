import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme, Typography, Shadows, BorderRadius, Spacing } from '../../theme';
import Button from '../../components/common/Button';
import { computeRoi, computeScenarios, RoiInputs, SCENARIOS, ScenarioKey } from '../../utils/roi';

const FIELDS: { key: keyof RoiInputs; label: string; hint?: string }[] = [
  { key: 'investment', label: 'Upfront investment (₹)' },
  { key: 'certificationCost', label: 'Certification / compliance cost (₹)', hint: 'You enter this — we never invent certification prices.' },
  { key: 'unitCost', label: 'Product cost per unit (₹)' },
  { key: 'logistics', label: 'Logistics cost (₹)' },
  { key: 'otherCosts', label: 'Other fixed costs (₹)' },
  { key: 'sellingPrice', label: 'Selling price per unit (₹)' },
  { key: 'units', label: 'Expected units' },
];

const fmt = (v: number | null, suffix = '') =>
  v == null ? '—' : `${Math.round(v).toLocaleString()}${suffix}`;

export default function InvestmentROIScreen() {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const contextProduct: string | undefined = route.params?.productName;
  const contextMarket: string | undefined = route.params?.market;

  const [raw, setRaw] = useState<Record<string, string>>({});
  const [computed, setComputed] = useState(false);

  const inputs: RoiInputs = useMemo(
    () => ({
      investment: parseFloat(raw.investment) || 0,
      certificationCost: parseFloat(raw.certificationCost) || 0,
      unitCost: parseFloat(raw.unitCost) || 0,
      logistics: parseFloat(raw.logistics) || 0,
      otherCosts: parseFloat(raw.otherCosts) || 0,
      sellingPrice: parseFloat(raw.sellingPrice) || 0,
      units: parseFloat(raw.units) || 0,
    }),
    [raw],
  );

  const result = useMemo(() => computeRoi(inputs), [inputs]);
  const scenarios = useMemo(() => computeScenarios(inputs), [inputs]);
  const canCompute = inputs.sellingPrice > 0 && inputs.units > 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.glassBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Investment ROI</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {contextProduct || contextMarket ? (
          <View style={styles.contextChip}>
            <Ionicons name="cube-outline" size={14} color={colors.primary} />
            <Text style={styles.contextText}>{[contextProduct, contextMarket].filter(Boolean).join(' · ')}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.tagRow}><Text style={styles.tag}>YOUR INPUTS</Text></View>
          <Text style={styles.subText}>Enter your own figures. Everything below is calculated from these — not verified market data.</Text>
          {FIELDS.map((f) => (
            <View key={f.key} style={{ marginTop: Spacing.sm }}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                value={raw[f.key] ?? ''}
                onChangeText={(t) => setRaw((r) => ({ ...r, [f.key]: t }))}
              />
              {f.hint ? <Text style={styles.hint}>{f.hint}</Text> : null}
            </View>
          ))}
          <Button title="Calculate ROI" onPress={() => setComputed(true)} disabled={!canCompute} style={{ marginTop: Spacing.lg }} />
          {!canCompute ? <Text style={styles.warn}>Enter at least a selling price and expected units.</Text> : null}
        </View>

        {computed && canCompute && (
          <>
            {/* Headline (Expected) */}
            <View style={[styles.card, { borderWidth: 1, borderColor: (result.netReturn >= 0 ? colors.success : colors.error) + '40' }]}>
              <View style={styles.tagRow}><Text style={styles.tag}>CALCULATED · EXPECTED</Text></View>
              <View style={styles.headlineRow}>
                <View>
                  <Text style={styles.headlineLabel}>ROI</Text>
                  <Text style={[styles.headlineValue, { color: result.netReturn >= 0 ? colors.success : colors.error }]}>
                    {result.roiPercent != null ? `${result.roiPercent.toFixed(1)}%` : '—'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.headlineLabel}>Net return</Text>
                  <Text style={[styles.headlineValue, { color: result.netReturn >= 0 ? colors.success : colors.error }]}>₹{fmt(result.netReturn)}</Text>
                </View>
              </View>

              <Line label="Revenue" value={`₹${fmt(result.revenue)}`} styles={styles} />
              <Line label="Variable cost" value={`₹${fmt(result.variableCost)}`} styles={styles} />
              <Line label="Fixed costs" value={`₹${fmt(result.fixedCosts)}`} styles={styles} />
              <Line label="Total costs" value={`₹${fmt(result.totalCosts)}`} styles={styles} />
              <Line label="Gross profit" value={`₹${fmt(result.grossProfit)}`} styles={styles} />
              <Line label="Net margin" value={result.marginPercent != null ? `${result.marginPercent.toFixed(1)}%` : '—'} styles={styles} />
              <Line label="Break-even units" value={fmt(result.breakEvenUnits)} styles={styles} />
              <Line label="Break-even revenue" value={result.breakEvenRevenue != null ? `₹${fmt(result.breakEvenRevenue)}` : '—'} styles={styles} />
            </View>

            {/* Scenarios */}
            <View style={styles.card}>
              <View style={styles.tagRow}><Text style={styles.tag}>SCENARIOS</Text></View>
              <Text style={styles.subText}>Assumptions applied to units and price (clearly labeled — not forecasts).</Text>
              <View style={styles.scHeader}>
                <Text style={[styles.scCell, styles.scHead, { flex: 1.3 }]}>Scenario</Text>
                <Text style={[styles.scCell, styles.scHead]}>ROI</Text>
                <Text style={[styles.scCell, styles.scHead]}>Net</Text>
                <Text style={[styles.scCell, styles.scHead]}>B/E units</Text>
              </View>
              {(Object.keys(SCENARIOS) as ScenarioKey[]).map((k) => {
                const s = SCENARIOS[k];
                const r = scenarios[k];
                return (
                  <View key={k} style={styles.scRow}>
                    <View style={{ flex: 1.3 }}>
                      <Text style={styles.scName}>{s.label}</Text>
                      <Text style={styles.scAssume}>×{s.unitsMult} units · ×{s.priceMult} price</Text>
                    </View>
                    <Text style={[styles.scCell, { color: r.netReturn >= 0 ? colors.success : colors.error }]}>{r.roiPercent != null ? `${r.roiPercent.toFixed(0)}%` : '—'}</Text>
                    <Text style={styles.scCell}>₹{fmt(r.netReturn)}</Text>
                    <Text style={styles.scCell}>{fmt(r.breakEvenUnits)}</Text>
                  </View>
                );
              })}
            </View>

            {/* Formulas */}
            <View style={styles.card}>
              <View style={styles.tagRow}><Text style={styles.tag}>FORMULAS</Text></View>
              <Text style={styles.formula}>Revenue = selling price × units</Text>
              <Text style={styles.formula}>Total costs = (unit cost × units) + fixed costs</Text>
              <Text style={styles.formula}>Net return = revenue − total costs</Text>
              <Text style={styles.formula}>ROI % = net return ÷ total investment × 100</Text>
              <Text style={styles.formula}>Break-even units = fixed costs ÷ (price − unit cost)</Text>
            </View>

            <Text style={styles.disclaimer}>These are calculations from your inputs, not verified market facts or guarantees.</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Line({ label, value, styles }: any) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={styles.lineValue}>{value}</Text>
    </View>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#0A0A0A' : '#F7F9FC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border },
  glassBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...Typography.h3, color: colors.textPrimary },
  content: { padding: Spacing.xl },
  contextChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.primary + '12', paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full, marginBottom: Spacing.md },
  contextText: { ...Typography.caption, color: colors.primary, fontWeight: '600' },
  card: { backgroundColor: colors.bgCard, padding: Spacing.xl, borderRadius: BorderRadius['2xl'], ...Shadows.sm, marginBottom: Spacing.md },
  tagRow: { marginBottom: Spacing.xs },
  tag: { ...Typography.caption, color: colors.primary, fontWeight: '700', letterSpacing: 0.5 },
  subText: { ...Typography.body2, color: colors.textSecondary, marginBottom: Spacing.sm },
  label: { ...Typography.caption, color: colors.textPrimary, marginBottom: 4, marginLeft: 4 },
  input: { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.bgCardLight, borderWidth: 1, borderColor: colors.border, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.lg, height: 48, ...Typography.body1, color: colors.textPrimary },
  hint: { ...Typography.caption, color: colors.textSecondary, marginTop: 3, marginLeft: 4, fontStyle: 'italic' },
  warn: { ...Typography.caption, color: colors.warning, marginTop: Spacing.sm, textAlign: 'center' },
  headlineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: Spacing.md },
  headlineLabel: { ...Typography.caption, color: colors.textSecondary },
  headlineValue: { ...Typography.h1, fontWeight: 'bold' },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border },
  lineLabel: { ...Typography.body2, color: colors.textSecondary },
  lineValue: { ...Typography.body2, color: colors.textPrimary, fontWeight: '600' },
  scHeader: { flexDirection: 'row', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  scRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  scCell: { flex: 1, ...Typography.caption, color: colors.textPrimary, textAlign: 'right' },
  scHead: { color: colors.textSecondary, fontWeight: '700' },
  scName: { ...Typography.body2, color: colors.textPrimary, fontWeight: '600' },
  scAssume: { ...Typography.caption, color: colors.textSecondary, marginTop: 2 },
  formula: { ...Typography.caption, color: colors.textSecondary, marginTop: 4, fontFamily: undefined },
  disclaimer: { ...Typography.caption, color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm, marginBottom: Spacing.xl, lineHeight: 18 },
});
