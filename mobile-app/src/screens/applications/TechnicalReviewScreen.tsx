import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import Badge, { getStatusVariant } from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { formatDate } from '../../utils/formatters';

const TR_DATA: any = {
  trNo: '',
  appNo: '',
  certType: '',
  product: '',
  status: '',
  stage: '',
  reviewDate: '',
  reviewedBy: '',
  assignedOfficer: '',
  labName: '',
  labReportNo: '',
  testDate: '',
  findings: [],
  queries: [],
  summary: '',
};

const STATUS_COLORS: Record<string, string> = {
  pass: '#10B981',
  fail: '#EF4444',
  pending: '#F59E0B',
};

const TechnicalReviewScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'summary' | 'findings' | 'queries'>('summary');
  const [responses, setResponses] = useState<Record<string, string>>({});

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const passCount = TR_DATA.findings.filter((f: any) => f.status === 'pass').length;
  const failCount = TR_DATA.findings.filter((f: any) => f.status === 'fail').length;
  const pendingCount = TR_DATA.findings.filter((f: any) => f.status === 'pending').length;
  const openQueries = TR_DATA.queries.filter((q: any) => q.status === 'open').length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={isDark ? [colors.bgDark, '#0C0D14'] : ['#F0F4FF', '#E8ECF4']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{TR_DATA.trNo}</Text>
          <Text style={styles.headerSub}>{TR_DATA.certType} · {TR_DATA.product}</Text>
        </View>
        <Badge label={TR_DATA.status.replace(/_/g, ' ')} variant={getStatusVariant(TR_DATA.status)} size="sm" dot />
      </View>

      {/* Hero Stats */}
      <LinearGradient
        colors={['rgba(108,99,255,0.25)', 'rgba(0,212,255,0.12)']}
        style={styles.hero}
      >
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroStage}>{TR_DATA.stage}</Text>
            <Text style={styles.heroMeta}>
              Reviewed by {TR_DATA.reviewedBy}
            </Text>
          </View>
        </View>
        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: '#10B981' }]}>{passCount}</Text>
            <Text style={styles.statLabel}>Passed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: '#EF4444' }]}>{failCount}</Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: '#F59E0B' }]}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.error }]}>{openQueries}</Text>
            <Text style={styles.statLabel}>Queries</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tab bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabRow}
      >
        {(['summary', 'findings', 'queries'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'summary' ? 'Summary' : tab === 'findings' ? `Findings (${TR_DATA.findings.length})` : `Queries (${TR_DATA.queries.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* ── SUMMARY TAB ── */}
        {activeTab === 'summary' && (
          <>
            {/* Review details */}
            <View style={[styles.card, Shadows.sm]}>
              <LinearGradient
                colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
                style={styles.cardInner}
              >
                <Text style={styles.cardTitle}>Review Details</Text>
                {[
                  { label: 'TR Number', value: TR_DATA.trNo },
                  { label: 'Application No', value: TR_DATA.appNo },
                  { label: 'Certification', value: TR_DATA.certType },
                  { label: 'Lab Name', value: TR_DATA.labName },
                  { label: 'Lab Report No', value: TR_DATA.labReportNo },
                  { label: 'Test Date', value: formatDate(TR_DATA.testDate) },
                  { label: 'Review Date', value: formatDate(TR_DATA.reviewDate) },
                  { label: 'Assigned Officer', value: TR_DATA.assignedOfficer },
                ].map((row, i) => (
                  <View key={i} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{row.label}</Text>
                    <Text style={styles.detailValue}>{row.value}</Text>
                  </View>
                ))}
              </LinearGradient>
            </View>

            {/* Summary remarks */}
            <View style={[styles.card, Shadows.sm]}>
              <LinearGradient
                colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
                style={styles.cardInner}
              >
                <View style={styles.summaryHeader}>
                  <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                  <Text style={styles.cardTitle}>Committee Summary</Text>
                </View>
                <Text style={styles.summaryText}>{TR_DATA.summary}</Text>
              </LinearGradient>
            </View>

            {/* Quick findings bar */}
            <View style={[styles.card, Shadows.sm]}>
              <LinearGradient
                colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
                style={styles.cardInner}
              >
                <Text style={styles.cardTitle}>Clause Results</Text>
                {TR_DATA.findings.map((f: any) => (
                  <View key={f.id} style={styles.findingRow}>
                    <View style={[styles.findingDot, { backgroundColor: STATUS_COLORS[f.status] }]} />
                    <Text style={styles.findingClause} numberOfLines={1}>{f.clause}</Text>
                    <Text style={[styles.findingResult, { color: STATUS_COLORS[f.status] }]}>{f.result}</Text>
                  </View>
                ))}
              </LinearGradient>
            </View>
          </>
        )}

        {/* ── FINDINGS TAB ── */}
        {activeTab === 'findings' && (
          <View style={[styles.card, Shadows.sm]}>
            <LinearGradient
              colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
              style={styles.cardInner}
            >
              <Text style={styles.cardTitle}>Clause-wise Findings</Text>
              {TR_DATA.findings.map((f: any, i: any) => (
                <View
                  key={f.id}
                  style={[
                    styles.findingCard,
                    { borderLeftColor: STATUS_COLORS[f.status] },
                    i > 0 && { marginTop: 12 },
                  ]}
                >
                  <View style={styles.findingCardTop}>
                    <Text style={styles.findingClauseTitle}>{f.clause}</Text>
                    <View style={[styles.resultBadge, { backgroundColor: `${STATUS_COLORS[f.status]}20` }]}>
                      <Text style={[styles.resultBadgeText, { color: STATUS_COLORS[f.status] }]}>
                        {f.result}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.findingRemarks}>{f.remarks}</Text>
                  {f.status === 'fail' && (
                    <View style={styles.failAlert}>
                      <Ionicons name="warning-outline" size={14} color="#EF4444" />
                      <Text style={styles.failAlertText}>Corrective action required</Text>
                    </View>
                  )}
                </View>
              ))}
            </LinearGradient>
          </View>
        )}

        {/* ── QUERIES TAB ── */}
        {activeTab === 'queries' && (
          <>
            {TR_DATA.queries.map((q: any) => (
              <View key={q.id} style={[styles.card, Shadows.sm]}>
                <LinearGradient
                  colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
                  style={styles.cardInner}
                >
                  <View style={styles.queryHeader}>
                    <View style={[styles.queryIdBadge, { backgroundColor: `${colors.primary}20` }]}>
                      <Text style={[styles.queryId, { color: colors.primary }]}>{q.id}</Text>
                    </View>
                    <Badge
                      label={q.status}
                      variant={q.status === 'resolved' ? 'success' : 'warning'}
                      size="sm"
                    />
                  </View>

                  <Text style={styles.queryQuestion}>{q.question}</Text>

                  <View style={styles.queryMeta}>
                    <Ionicons name="person-outline" size={12} color={colors.textTertiary} />
                    <Text style={styles.queryMetaText}>{q.raisedBy} · {formatDate(q.date)}</Text>
                  </View>

                  {q.status === 'resolved' ? (
                    <View style={styles.resolvedBox}>
                      <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                      <Text style={styles.resolvedText}>{q.response}</Text>
                    </View>
                  ) : (
                    <View style={styles.replyBox}>
                      <Text style={styles.replyLabel}>Your Response</Text>
                      <TextInput
                        style={[styles.replyInput, { color: colors.textPrimary, borderColor: colors.border }]}
                        placeholder="Type your response here..."
                        placeholderTextColor={colors.textTertiary}
                        multiline
                        numberOfLines={3}
                        value={responses[q.id] ?? ''}
                        onChangeText={(t) => setResponses((prev) => ({ ...prev, [q.id]: t }))}
                      />
                      <TouchableOpacity
                        style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                        onPress={() => Alert.alert('Response Submitted', 'Your response has been sent to the BIS committee.')}
                      >
                        <Ionicons name="send" size={14} color="#fff" />
                        <Text style={styles.submitBtnText}>Submit Response</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </LinearGradient>
              </View>
            ))}
          </>
        )}

        <Button
          title="Contact Review Officer"
          onPress={() => navigation.navigate('Communication')}
          variant="outline"
          fullWidth
          icon={<Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.primary} />}
          style={{ marginTop: 8 }}
        />
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      gap: 12,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: 12,
      backgroundColor: isDark ? colors.bgCardLight : colors.border,
      alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
    headerSub: { fontSize: 12, color: colors.textTertiary, marginTop: 1 },
    hero: {
      marginHorizontal: 20, borderRadius: BorderRadius.lg,
      padding: 16, marginBottom: 12,
    },
    heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
    heroIcon: {
      width: 40, height: 40, borderRadius: 12,
      backgroundColor: `${colors.primary}20`,
      alignItems: 'center', justifyContent: 'center',
    },
    heroStage: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    heroMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    statRow: { flexDirection: 'row', justifyContent: 'space-around' },
    statItem: { alignItems: 'center' },
    statNum: { fontSize: 22, fontWeight: '800' },
    statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    statDivider: { width: 1, height: 32, backgroundColor: colors.border, alignSelf: 'center' },
    tabScroll: { maxHeight: 48 },
    tabRow: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
    tab: {
      paddingHorizontal: 16, paddingVertical: 8,
      borderRadius: BorderRadius.full, borderWidth: 1, borderColor: colors.border,
    },
    tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    tabText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
    tabTextActive: { color: '#FFFFFF', fontWeight: '600' },
    content: { paddingHorizontal: 20, paddingTop: 16 },
    card: {
      borderRadius: BorderRadius.lg, overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
      marginBottom: 16,
    },
    cardInner: { padding: 16 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 14 },
    summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    summaryText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
    detailRow: {
      flexDirection: 'row', justifyContent: 'space-between',
      paddingVertical: 9, borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border,
    },
    detailLabel: { fontSize: 13, color: colors.textTertiary },
    detailValue: { fontSize: 13, color: colors.textPrimary, fontWeight: '500', flex: 1, textAlign: 'right' },
    // Clause results bar
    findingRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingVertical: 8, borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border,
    },
    findingDot: { width: 8, height: 8, borderRadius: 4 },
    findingClause: { flex: 1, fontSize: 12, color: colors.textSecondary },
    findingResult: { fontSize: 12, fontWeight: '700' },
    // Finding cards
    findingCard: {
      borderLeftWidth: 3, borderRadius: BorderRadius.md,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F7F8FC',
      padding: 12,
    },
    findingCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
    findingClauseTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.textPrimary },
    resultBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
    resultBadgeText: { fontSize: 11, fontWeight: '700' },
    findingRemarks: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
    failAlert: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      marginTop: 8, backgroundColor: 'rgba(239,68,68,0.1)',
      padding: 8, borderRadius: BorderRadius.sm,
    },
    failAlertText: { fontSize: 12, color: '#EF4444', fontWeight: '600' },
    // Query cards
    queryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    queryIdBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
    queryId: { fontSize: 12, fontWeight: '700' },
    queryQuestion: { fontSize: 14, color: colors.textPrimary, fontWeight: '500', lineHeight: 20, marginBottom: 8 },
    queryMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
    queryMetaText: { fontSize: 11, color: colors.textTertiary },
    resolvedBox: {
      flexDirection: 'row', gap: 8, alignItems: 'flex-start',
      backgroundColor: 'rgba(16,185,129,0.1)', padding: 10, borderRadius: BorderRadius.md,
    },
    resolvedText: { flex: 1, fontSize: 13, color: '#10B981', lineHeight: 18 },
    replyBox: { gap: 8 },
    replyLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
    replyInput: {
      borderWidth: 1, borderRadius: BorderRadius.md,
      padding: 10, fontSize: 13, minHeight: 80,
      textAlignVertical: 'top',
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F7F8FC',
    },
    submitBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, paddingVertical: 10, borderRadius: BorderRadius.md,
    },
    submitBtnText: { fontSize: 13, color: '#FFFFFF', fontWeight: '700' },
  });

export default TechnicalReviewScreen;
