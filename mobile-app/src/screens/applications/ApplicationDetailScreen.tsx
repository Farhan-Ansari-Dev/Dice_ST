import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import Badge, { getStatusVariant } from '../../components/common/Badge';
import Timeline from '../../components/common/Timeline';
import ProgressBar from '../../components/common/ProgressBar';
import Button from '../../components/common/Button';
import { formatDate, formatCurrency } from '../../utils/formatters';

const TEAM_MEMBERS: string[] = [];

const MOCK_TASKS: any[] = [];

const MOCK_APP: any = {
  id: '',
  appNo: '',
  certType: '',
  product: '',
  status: '',
  progress: 0,
  submittedDate: '',
  updatedDate: '',
  assignedTo: '',
  estimatedCompletion: '',
  amount: 0,
  paidAmount: 0,
  labName: '',
  timeline: [],
  documents: [],
  notes: [],
};

const ApplicationDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'timeline' | 'notes' | 'tasks'>('overview');
  const [tasks, setTasks] = useState(MOCK_TASKS);

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

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
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{MOCK_APP.appNo}</Text>
          <Text style={styles.headerSub}>{MOCK_APP.certType}</Text>
        </View>
        <Badge label={MOCK_APP.status.replace(/_/g, ' ')} variant={getStatusVariant(MOCK_APP.status)} size="sm" dot />
      </View>

      {/* Progress Hero */}
      <LinearGradient
        colors={['rgba(108,99,255,0.3)', 'rgba(0,212,255,0.15)']}
        style={styles.progressHero}
      >
        <View style={styles.progressHeroLeft}>
          <Text style={styles.progressHeroProduct}>{MOCK_APP.product}</Text>
          <Text style={styles.progressHeroMeta}>Updated {formatDate(MOCK_APP.updatedDate)}</Text>
        </View>
        <View style={styles.progressCircle}>
          <Text style={styles.progressPercent}>{MOCK_APP.progress}%</Text>
          <Text style={styles.progressLabel}>Complete</Text>
        </View>
      </LinearGradient>
      <ProgressBar progress={MOCK_APP.progress} height={6} color={colors.primary} style={{ marginHorizontal: 20, marginBottom: 16 }} />

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabRow}>
        {(['overview', 'documents', 'timeline', 'notes', 'tasks'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {activeTab === 'overview' && (
          <>
            <View style={[styles.card, Shadows.sm]}>
              <LinearGradient
                colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
                style={styles.cardInner}
              >
                <Text style={styles.cardTitle}>Application Details</Text>
                {[
                  { label: 'Application No', value: MOCK_APP.appNo },
                  { label: 'Product', value: MOCK_APP.product },
                  { label: 'Certification Type', value: MOCK_APP.certType },
                  { label: 'Testing Lab', value: MOCK_APP.labName },
                  { label: 'Assigned To', value: MOCK_APP.assignedTo },
                  { label: 'Submitted', value: formatDate(MOCK_APP.submittedDate) },
                  { label: 'Est. Completion', value: formatDate(MOCK_APP.estimatedCompletion) },
                ].map((item, i) => (
                  <View key={i} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{item.label}</Text>
                    <Text style={styles.detailValue}>{item.value}</Text>
                  </View>
                ))}
              </LinearGradient>
            </View>
            <View style={[styles.card, Shadows.sm]}>
              <LinearGradient
                colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
                style={styles.cardInner}
              >
                <Text style={styles.cardTitle}>Payment Summary</Text>
                <View style={styles.paymentRow}>
                  <View style={styles.paymentItem}>
                    <Text style={styles.paymentAmount}>{formatCurrency(MOCK_APP.amount)}</Text>
                    <Text style={styles.paymentLabel}>Total Amount</Text>
                  </View>
                  <View style={styles.paymentDivider} />
                  <View style={styles.paymentItem}>
                    <Text style={[styles.paymentAmount, { color: colors.success }]}>{formatCurrency(MOCK_APP.paidAmount)}</Text>
                    <Text style={styles.paymentLabel}>Amount Paid</Text>
                  </View>
                  <View style={styles.paymentDivider} />
                  <View style={styles.paymentItem}>
                    <Text style={[styles.paymentAmount, { color: colors.warning }]}>{formatCurrency(MOCK_APP.amount - MOCK_APP.paidAmount)}</Text>
                    <Text style={styles.paymentLabel}>Balance</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </>
        )}

        {activeTab === 'documents' && (
          <View style={[styles.card, Shadows.sm]}>
            <LinearGradient
              colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
              style={styles.cardInner}
            >
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Documents</Text>
                <TouchableOpacity style={styles.uploadBtn} onPress={() => Alert.alert('Upload', 'Document picker.')}>
                  <Ionicons name="cloud-upload-outline" size={16} color={colors.primary} />
                  <Text style={styles.uploadBtnText}>Upload</Text>
                </TouchableOpacity>
              </View>
              {MOCK_APP.documents.map((doc: any) => (
                <View key={doc.id} style={styles.docRow}>
                  <View style={styles.docIcon}>
                    <Ionicons name="document-text" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docName}>{doc.name}</Text>
                    <Text style={styles.docSize}>{doc.size}</Text>
                  </View>
                  <Badge label={doc.status} variant={getStatusVariant(doc.status)} size="sm" />
                  <TouchableOpacity style={styles.docDownload}>
                    <Ionicons name="download-outline" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))}
            </LinearGradient>
          </View>
        )}

        {activeTab === 'timeline' && (
          <View style={[styles.card, Shadows.sm]}>
            <LinearGradient
              colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
              style={styles.cardInner}
            >
              <Text style={styles.cardTitle}>Application Timeline</Text>
              <Timeline items={MOCK_APP.timeline} />
            </LinearGradient>
          </View>
        )}

        {activeTab === 'notes' && (
          <View style={[styles.card, Shadows.sm]}>
            <LinearGradient
              colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
              style={styles.cardInner}
            >
              <Text style={styles.cardTitle}>Updates & Notes</Text>
              {MOCK_APP.notes.map((note: any) => (
                <View key={note.id} style={styles.noteItem}>
                  <View style={styles.noteDot} />
                  <View style={styles.noteContent}>
                    <Text style={styles.noteText}>{note.text}</Text>
                    <View style={styles.noteMeta}>
                      <Text style={styles.noteAuthor}>{note.author}</Text>
                      <Text style={styles.noteDate}>{formatDate(note.date)}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </LinearGradient>
          </View>
        )}

        {activeTab === 'tasks' && (
          <View style={[styles.card, Shadows.sm]}>
            <LinearGradient
              colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
              style={styles.cardInner}
            >
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Team Tasks</Text>
                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={() => {
                    Alert.alert(
                      'Assign Task',
                      'Select team member to assign a new task:',
                      [
                        ...TEAM_MEMBERS.map((member) => ({
                          text: member,
                          onPress: () =>
                            Alert.alert('Task Assigned', `New task assigned to ${member}`),
                        })),
                        { text: 'Cancel', style: 'cancel' },
                      ]
                    );
                  }}
                >
                  <Ionicons name="person-add-outline" size={14} color={colors.primary} />
                  <Text style={styles.uploadBtnText}>Assign Task</Text>
                </TouchableOpacity>
              </View>
              {tasks.map((task) => {
                const statusColor =
                  task.status === 'completed'
                    ? colors.success
                    : task.status === 'in_progress'
                    ? colors.primary
                    : colors.warning;
                const statusLabel =
                  task.status === 'completed'
                    ? 'Done'
                    : task.status === 'in_progress'
                    ? 'In Progress'
                    : 'Pending';
                return (
                  <View key={task.id} style={styles.taskRow}>
                    <TouchableOpacity
                      style={[
                        styles.taskCheckbox,
                        task.status === 'completed' && { backgroundColor: colors.success, borderColor: colors.success },
                      ]}
                      onPress={() =>
                        setTasks((prev) =>
                          prev.map((t) =>
                            t.id === task.id
                              ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' }
                              : t
                          )
                        )
                      }
                    >
                      {task.status === 'completed' && (
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.taskName,
                          task.status === 'completed' && styles.taskNameDone,
                        ]}
                      >
                        {task.name}
                      </Text>
                      <View style={styles.taskMeta}>
                        <Ionicons name="person-outline" size={11} color={colors.textTertiary} />
                        <Text style={styles.taskMetaText}>{task.assignedTo}</Text>
                        <Ionicons name="calendar-outline" size={11} color={colors.textTertiary} />
                        <Text style={styles.taskMetaText}>{formatDate(task.dueDate)}</Text>
                      </View>
                    </View>
                    <View style={[styles.taskStatusChip, { backgroundColor: `${statusColor}20` }]}>
                      <Text style={[styles.taskStatusText, { color: statusColor }]}>{statusLabel}</Text>
                    </View>
                  </View>
                );
              })}
            </LinearGradient>
          </View>
        )}

        <Button
          title="Technical Review"
          onPress={() => navigation.navigate('TechnicalReview', { appId: MOCK_APP.id })}
          variant="primary"
          fullWidth
          icon={<Ionicons name="shield-checkmark-outline" size={16} color="#FFFFFF" />}
          style={{ marginTop: 8 }}
        />
        <Button
          title="Contact Support"
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
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? colors.bgCardLight : colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
    headerSub: { fontSize: 12, color: colors.textTertiary },
    progressHero: {
      marginHorizontal: 20,
      borderRadius: BorderRadius.lg,
      padding: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    progressHeroLeft: { flex: 1 },
    progressHeroProduct: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    progressHeroMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
    progressCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: `${colors.primary}20`,
      borderWidth: 2,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressPercent: { fontSize: 18, fontWeight: '800', color: colors.primary },
    progressLabel: { fontSize: 9, color: colors.textSecondary },
    tabScroll: { maxHeight: 48 },
    tabRow: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
    tab: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: BorderRadius.full,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    tabText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
    tabTextActive: { color: '#FFFFFF', fontWeight: '600' },
    content: { paddingHorizontal: 20, paddingTop: 16 },
    card: {
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
      marginBottom: 16,
    },
    cardInner: { padding: 16 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 14 },
    cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border,
    },
    detailLabel: { fontSize: 13, color: colors.textTertiary },
    detailValue: { fontSize: 13, color: colors.textPrimary, fontWeight: '500', flex: 1, textAlign: 'right' },
    paymentRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
    paymentItem: { alignItems: 'center' },
    paymentAmount: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    paymentLabel: { fontSize: 11, color: colors.textTertiary, marginTop: 4 },
    paymentDivider: { width: 1, height: 40, backgroundColor: colors.border, alignSelf: 'center' },
    uploadBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: BorderRadius.full,
      backgroundColor: `${colors.primary}20`,
    },
    uploadBtnText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
    docRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border,
    },
    docIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: `${colors.primary}20`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    docName: { fontSize: 13, color: colors.textPrimary, fontWeight: '500' },
    docSize: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    docDownload: { padding: 4 },
    noteItem: { flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border },
    noteDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 5 },
    noteContent: { flex: 1 },
    noteText: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    noteMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
    noteAuthor: { fontSize: 11, color: colors.primary, fontWeight: '600' },
    noteDate: { fontSize: 11, color: colors.textTertiary },
    taskRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border,
    },
    taskCheckbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    taskName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 },
    taskNameDone: { textDecorationLine: 'line-through', color: colors.textTertiary },
    taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    taskMetaText: { fontSize: 11, color: colors.textTertiary, marginRight: 4 },
    taskStatusChip: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: BorderRadius.full,
    },
    taskStatusText: { fontSize: 11, fontWeight: '600' },
  });

export default ApplicationDetailScreen;
