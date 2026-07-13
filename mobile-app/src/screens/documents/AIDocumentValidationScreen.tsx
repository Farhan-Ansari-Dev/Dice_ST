import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const AIDocumentValidationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [analyzed, setAnalyzed] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const startAnalysis = async () => {
    setAnalyzing(true);
    await new Promise(r => setTimeout(r, 2000));
    setAnalyzing(false);
    setAnalyzed(true);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Document Validator</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* AI Banner */}
        <LinearGradient colors={['#1A1560', '#6C63FF']} style={[styles.aiBanner, Shadows.md]}>
          <Ionicons name="scan" size={28} color="rgba(255,255,255,0.8)" />
          <View style={{ flex: 1 }}>
            <Text style={styles.aiBannerTitle}>AI-Powered Validation</Text>
            <Text style={styles.aiBannerSub}>Upload a document and our AI will analyze it instantly</Text>
          </View>
        </LinearGradient>

        {/* Upload Area */}
        <TouchableOpacity
          style={[styles.uploadArea, Shadows.sm, { borderColor: `${colors.primary}40` }]}
          onPress={() => Alert.alert('Upload', 'Select document to upload')}
          activeOpacity={0.7}
        >
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.uploadAreaInner}>
            <View style={[styles.uploadIcon, { backgroundColor: `${colors.primary}20` }]}>
              <Ionicons name="cloud-upload-outline" size={32} color={colors.primary} />
            </View>
            <Text style={styles.uploadTitle}>Upload Document</Text>
            <Text style={styles.uploadSubtitle}>PDF, JPG, PNG up to 10MB</Text>
            <View style={[styles.uploadBtn, { backgroundColor: `${colors.primary}20` }]}>
              <Text style={[styles.uploadBtnText, { color: colors.primary }]}>Browse Files</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {!analyzed ? (
          <TouchableOpacity style={[styles.analyzeBtn, Shadows.md, analyzing && { opacity: 0.7 }]} onPress={startAnalysis} disabled={analyzing} activeOpacity={0.85}>
            <LinearGradient colors={['#1A1560', '#6C63FF']} style={styles.analyzeBtnGradient}>
              <Ionicons name={analyzing ? 'hourglass' : 'scan'} size={18} color="#FFFFFF" />
              <Text style={styles.analyzeBtnText}>{analyzing ? 'Analyzing...' : 'Analyze Document'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>AI Analysis Results</Text>

            <View style={[styles.resultsCard, Shadows.md]}>
              <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.resultsCardInner}>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Document Type Detected</Text>
                  <Text style={styles.resultValue}>BIS Test Report</Text>
                </View>
                <View style={[styles.resultRow, styles.resultRowBorder]}>
                  <Text style={styles.resultLabel}>Validity Status</Text>
                  <View style={[styles.validBadge, { backgroundColor: `${colors.success}20` }]}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                    <Text style={[styles.validText, { color: colors.success }]}>Valid</Text>
                  </View>
                </View>
                <View style={[styles.resultRow, styles.resultRowBorder]}>
                  <Text style={styles.resultLabel}>Confidence Score</Text>
                  <Text style={[styles.resultValue, { color: colors.primary, fontSize: 18, fontWeight: '800' }]}>94%</Text>
                </View>

                <View style={styles.issuesSection}>
                  <Text style={styles.issuesTitle}>Issues Found</Text>
                  <View style={[styles.issueCard, { backgroundColor: `${colors.warning}15`, borderColor: `${colors.warning}30` }]}>
                    <Ionicons name="warning-outline" size={14} color={colors.warning} />
                    <Text style={[styles.issueText, { color: colors.textSecondary }]}>Lab accreditation certificate expiry date not clearly visible</Text>
                  </View>
                </View>

                <View style={styles.recommendationsSection}>
                  <Text style={styles.issuesTitle}>AI Recommendations</Text>
                  {['Verify NABL accreditation number', 'Ensure test date is within 90 days', 'Request clear signature from lab authority'].map((rec, i) => (
                    <View key={i} style={styles.recRow}>
                      <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
                      <Text style={styles.recText}>{rec}</Text>
                    </View>
                  ))}
                </View>
              </LinearGradient>
            </View>
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
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.textPrimary },
    content: { paddingHorizontal: 20, paddingTop: 8 },
    aiBanner: { borderRadius: BorderRadius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    aiBannerTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
    aiBannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    uploadArea: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 2, borderStyle: 'dashed', marginBottom: 16 },
    uploadAreaInner: { padding: 32, alignItems: 'center', gap: 10 },
    uploadIcon: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    uploadTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
    uploadSubtitle: { fontSize: 12, color: colors.textTertiary },
    uploadBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: BorderRadius.full },
    uploadBtnText: { fontSize: 13, fontWeight: '700' },
    analyzeBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: 16 },
    analyzeBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
    analyzeBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    resultsCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    resultsCardInner: { padding: 16 },
    resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
    resultRowBorder: { borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border },
    resultLabel: { fontSize: 13, color: colors.textSecondary },
    resultValue: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    validBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full },
    validText: { fontSize: 12, fontWeight: '700' },
    issuesSection: { paddingTop: 12, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border, gap: 8 },
    issuesTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
    issueCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: BorderRadius.md, borderWidth: 1 },
    issueText: { fontSize: 12, lineHeight: 18, flex: 1 },
    recommendationsSection: { paddingTop: 12, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border, marginTop: 4, gap: 6 },
    recRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    recText: { fontSize: 12, color: colors.textSecondary, lineHeight: 18, flex: 1 },
  });

export default AIDocumentValidationScreen;
