import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, Typography, Shadows, BorderRadius, Spacing } from '../../theme';
import Button from '../../components/common/Button';

export default function TradeTariffsScreen() {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const navigation = useNavigation();
  const [country, setCountry] = useState('');
  const [hsCode, setHsCode] = useState('');
  const [calculated, setCalculated] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.glassBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trade Tariffs</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Customs & Duties</Text>
          <Text style={styles.subText}>Check import/export duties for specific markets.</Text>
          
          <Text style={styles.label}>Target Country</Text>
          <TextInput style={styles.input} placeholder="e.g., UAE" placeholderTextColor={colors.textSecondary} value={country} onChangeText={setCountry} />
          
          <Text style={styles.label}>HS Code</Text>
          <TextInput style={styles.input} placeholder="e.g., 854140" placeholderTextColor={colors.textSecondary} value={hsCode} onChangeText={setHsCode} keyboardType="numeric" />
          
          <Button title="Check Tariffs" onPress={() => setCalculated(true)} style={{ marginTop: Spacing.md }} />
        </View>

        {calculated && (
          <View style={styles.resultCard}>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Basic Customs Duty (BCD)</Text>
              <Text style={styles.resultValue}>5.00%</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Social Welfare Surcharge</Text>
              <Text style={styles.resultValue}>10.00%</Text>
            </View>
            <View style={[styles.resultRow, { borderBottomWidth: 0, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }]}>
              <Text style={[styles.resultLabel, { fontWeight: 'bold' }]}>Effective Rate</Text>
              <Text style={[styles.resultValue, { color: colors.error, fontWeight: 'bold' }]}>5.50%</Text>
            </View>
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
  
  resultCard: { backgroundColor: colors.surface, padding: Spacing.xl, borderRadius: BorderRadius.xl, ...Shadows.sm },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  resultLabel: { ...Typography.body1, color: colors.textSecondary },
  resultValue: { ...Typography.body1, color: colors.textPrimary, fontWeight: '600' },
});
