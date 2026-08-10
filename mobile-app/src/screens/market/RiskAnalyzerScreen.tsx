import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, Typography, Shadows, BorderRadius, Spacing } from '../../theme';
import Button from '../../components/common/Button';
import api from '../../services/api';

export default function RiskAnalyzerScreen() {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const navigation = useNavigation();
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [risks, setRisks] = useState<any[]>([]);

  const analyzeRisks = async () => {
    if (!context.trim()) return;
    setLoading(true);
    setRisks([]);
    try {
      const res = await api.post<any>('/ai/analyze-risks', { context: context.trim() });
      if (res?.success && res.data) {
        setRisks(res.data);
      } else {
        Alert.alert('Analysis Failed', 'Could not parse response.');
      }
    } catch (error: any) {
      const errMsg = error.response?.data?.message || error.message || 'Unknown error';
      Alert.alert('Error', `Failed to reach AI service: ${errMsg}`);
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
        <Text style={styles.headerTitle}>Risk Analyzer</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Trade Context</Text>
          <Text style={styles.subText}>Enter a country or product to analyze current trade risks.</Text>
          
          <View style={styles.inputWrapper}>
            <Ionicons name="globe-outline" size={20} color={colors.primary} />
            <TextInput
              style={styles.input}
              placeholder="e.g., Exporting electronics to USA"
              placeholderTextColor={colors.textSecondary}
              value={context}
              onChangeText={setContext}
            />
          </View>
          
          <Button title="Analyze Risks" onPress={analyzeRisks} disabled={loading} />
        </View>

        {loading && (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
             <ActivityIndicator size="large" color={colors.primary} />
             <Text style={{ marginTop: 12, color: colors.textSecondary }}>AI is analyzing trade risks...</Text>
          </View>
        )}

        {risks.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: Spacing.md }]}>Identified Risks</Text>
            {risks.map((risk, index) => (
              <View key={index} style={styles.riskCard}>
                <View style={styles.riskTop}>
                  <Text style={styles.riskTitle}>{risk.title}</Text>
                  <View style={[styles.badge, { backgroundColor: risk.level === 'High' ? colors.error + '20' : risk.level === 'Medium' ? colors.warning + '20' : colors.success + '20' }]}>
                    <Text style={[styles.badgeText, { color: risk.level === 'High' ? colors.error : risk.level === 'Medium' ? colors.warning : colors.success }]}>{risk.level}</Text>
                  </View>
                </View>
                <Text style={styles.riskDesc}>{risk.desc}</Text>
              </View>
            ))}
          </>
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
  card: { backgroundColor: colors.bgCard, padding: Spacing.xl, borderRadius: BorderRadius['2xl'], ...Shadows.sm, marginBottom: Spacing.xl },
  sectionTitle: { ...Typography.h4, color: colors.textPrimary, marginBottom: Spacing.xs },
  subText: { ...Typography.body2, color: colors.textSecondary, marginBottom: Spacing.lg },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.bgCardLight, borderWidth: 1, borderColor: colors.border, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.lg, height: 56, marginBottom: Spacing.xl },
  input: { flex: 1, marginLeft: Spacing.sm, ...Typography.body1, color: colors.textPrimary },
  
  riskCard: { backgroundColor: colors.bgCard, padding: Spacing.lg, borderRadius: BorderRadius.xl, marginBottom: Spacing.md, ...Shadows.sm },
  riskTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  riskTitle: { ...Typography.h5, color: colors.textPrimary },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: BorderRadius.full },
  badgeText: { ...Typography.caption, fontWeight: 'bold' },
  riskDesc: { ...Typography.body2, color: colors.textSecondary },
});
