import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, Typography, Shadows, BorderRadius, Spacing } from '../../theme';
import Button from '../../components/common/Button';
import api from '../../services/api';

export default function ProductAnalyzerScreen() {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const navigation = useNavigation();
  const [hsCode, setHsCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const analyzeProduct = async () => {
    if (!hsCode.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post<any>('/ai/analyze-hs-code', { hsCode: hsCode.trim() });
      if (res?.success) {
        setResult(res.data);
      } else {
        Alert.alert('Analysis Failed', 'Could not parse response.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to reach AI service.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.glassBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Analyzer</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Enter HS Code</Text>
          <Text style={styles.subText}>Find global demand, tariffs, and compliance requirements for your product.</Text>
          
          <View style={styles.inputWrapper}>
            <Ionicons name="barcode-outline" size={20} color={colors.primary} />
            <TextInput
              style={styles.input}
              placeholder="e.g., 85414011 (Solar Panels)"
              placeholderTextColor={colors.textSecondary}
              value={hsCode}
              onChangeText={setHsCode}
              keyboardType="numeric"
            />
          </View>
          
          <Button title="Analyze Product" onPress={analyzeProduct} disabled={loading} />
        </View>

        {loading && (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
             <ActivityIndicator size="large" color={colors.primary} />
             <Text style={{ marginTop: 12, color: colors.textSecondary }}>AI is analyzing market data...</Text>
          </View>
        )}

        {result && (
          <View style={styles.resultContainer}>
            <View style={styles.resultHeader}>
              <Ionicons name="analytics" size={24} color={colors.success} />
              <Text style={styles.resultTitle}>Analysis Complete</Text>
            </View>

            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>Global Demand</Text>
              <Text style={[styles.resultValue, { color: colors.success }]}>{result.demand}</Text>
            </View>

            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>Avg. Profit Margin</Text>
              <Text style={styles.resultValue}>{result.profitMargin}</Text>
            </View>
            
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>Top Target Markets</Text>
              <Text style={styles.resultValue}>{result.topMarkets}</Text>
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
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.background, borderWidth: 1, borderColor: colors.border, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.lg, height: 56, marginBottom: Spacing.xl },
  input: { flex: 1, marginLeft: Spacing.sm, ...Typography.body1, color: colors.textPrimary },
  
  resultContainer: { marginTop: Spacing.md },
  resultHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  resultTitle: { ...Typography.h4, color: colors.textPrimary, marginLeft: Spacing.sm },
  resultCard: { backgroundColor: colors.surface, padding: Spacing.lg, borderRadius: BorderRadius.xl, marginBottom: Spacing.md, ...Shadows.sm },
  resultLabel: { ...Typography.caption, color: colors.textSecondary, marginBottom: 4 },
  resultValue: { ...Typography.h5, color: colors.textPrimary },
});
