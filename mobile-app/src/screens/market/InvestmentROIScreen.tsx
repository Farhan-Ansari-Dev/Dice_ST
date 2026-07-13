import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, Typography, Shadows, BorderRadius, Spacing } from '../../theme';
import Button from '../../components/common/Button';

export default function InvestmentROIScreen() {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const navigation = useNavigation();
  const [investment, setInvestment] = useState('');
  const [revenue, setRevenue] = useState('');
  const [roi, setRoi] = useState<number | null>(null);

  const calculateROI = () => {
    const inv = parseFloat(investment);
    const rev = parseFloat(revenue);
    if (!isNaN(inv) && !isNaN(rev) && inv > 0) {
      const profit = rev - inv;
      setRoi((profit / inv) * 100);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.glassBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Investment ROI</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Calculate Returns</Text>
          <Text style={styles.subText}>Estimate your break-even and profit margin.</Text>
          
          <Text style={styles.label}>Initial Investment (₹)</Text>
          <TextInput style={styles.input} placeholder="e.g., 500000" placeholderTextColor={colors.textSecondary} value={investment} onChangeText={setInvestment} keyboardType="numeric" />
          
          <Text style={styles.label}>Estimated Revenue (₹)</Text>
          <TextInput style={styles.input} placeholder="e.g., 800000" placeholderTextColor={colors.textSecondary} value={revenue} onChangeText={setRevenue} keyboardType="numeric" />
          
          <Button title="Calculate ROI" onPress={calculateROI} style={{ marginTop: Spacing.md }} />
        </View>

        {roi !== null && (
          <View style={[styles.resultCard, { backgroundColor: roi >= 0 ? colors.success + '15' : colors.error + '15' }]}>
            <Text style={styles.resultLabel}>Estimated ROI</Text>
            <Text style={[styles.resultValue, { color: roi >= 0 ? colors.success : colors.error }]}>
              {roi.toFixed(2)}%
            </Text>
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
  card: { backgroundColor: colors.surface, padding: Spacing.xl, borderRadius: BorderRadius['2xl'], ...Shadows.sm, marginBottom: Spacing.xl },
  sectionTitle: { ...Typography.h4, color: colors.textPrimary, marginBottom: Spacing.xs },
  subText: { ...Typography.body2, color: colors.textSecondary, marginBottom: Spacing.lg },
  label: { ...Typography.caption, color: colors.textPrimary, marginBottom: 4, marginLeft: 4 },
  input: { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.background, borderWidth: 1, borderColor: colors.border, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.lg, height: 56, marginBottom: Spacing.md, ...Typography.body1, color: colors.textPrimary },
  
  resultCard: { padding: Spacing.xl, borderRadius: BorderRadius.xl, alignItems: 'center', ...Shadows.sm },
  resultLabel: { ...Typography.body1, color: colors.textPrimary, marginBottom: Spacing.xs },
  resultValue: { ...Typography.h1, fontWeight: 'bold' },
});
