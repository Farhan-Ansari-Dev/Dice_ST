import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import Badge, { getStatusVariant } from '../../components/common/Badge';
import ProgressBar from '../../components/common/ProgressBar';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import * as DocumentPicker from 'expo-document-picker';
import documentsService from '../../services/documentsService';

const STATUS_PROGRESS: Record<string, number> = {
  draft: 5,
  submitted: 15,
  docs_review: 30,
  docs_required: 25,
  tech_review: 50,
  testing: 65,
  approval_pending: 80,
  approved: 95,
  cert_issued: 100,
  rejected: 100,
  on_hold: 0,
  cancelled: 0,
};

const ApplicationDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'timeline' | 'notes'>('overview');

  const appId = route.params?.id;

  const { data: appData, isLoading, error } = useQuery({
    queryKey: ['application', appId],
    queryFn: async () => {
      const res = await api.get(`/applications/${appId}`) as any;
      return res?.data;
    },
    enabled: !!appId,
  });

  const { data: docsData } = useQuery({
    queryKey: ['application-docs', appId],
    queryFn: async () => {
      const res = await api.get(`/documents?application_id=${appId}`) as any;
      return res?.data || [];
    },
    enabled: !!appId,
  });

  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  // Pick a file from the device and upload it, linked to THIS application, so it
  // appears in the Documents tab (backend /documents/finalize accepts application_id).
  const handleUploadDoc = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: false, copyToCacheDirectory: true });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const file = result.assets[0];
      const mimeType = file.mimeType || 'application/octet-stream';
      setUploading(true);
      await documentsService.uploadFromDevice(file.uri, file.name, mimeType, 'general', appId);
      await queryClient.invalidateQueries({ queryKey: ['application-docs', appId] });
      Alert.alert('Document Added', `"${file.name}" has been uploaded successfully.`);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || err?.message || 'Could not upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { marginTop: 12 }]}>Loading application...</Text>
      </View>
    );
  }

  if (error || !appData) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.errorText}>Failed to load application</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.retryBtn}>
          <Text style={styles.retryText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const app = appData;
  const product = app.product_id;
  const progress = STATUS_PROGRESS[app.status] ?? 0;
  const statusHistory = (app.status_history || []).slice().reverse();
  const documents = app.documents || [];
  const assignee = app.primary_assignee || (app.assignees && app.assignees[0]);

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
          <Text style={styles.headerTitle}>{app.application_number}</Text>
          <Text style={styles.headerSub}>{app.cert_type?.replace(/_/g, ' ')}</Text>
        </View>
        <Badge label={app.status.replace(/_/g, ' ')} variant={getStatusVariant(app.status)} size="sm" dot />
      </View>

      <LinearGradient
        colors={['rgba(108,99,255,0.3)', 'rgba(0,212,255,0.15)']}
        style={styles.progressHero}
      >
        <View style={styles.progressHeroLeft}>
          <Text style={styles.progressHeroProduct}>
            {product?.name || app.cert_type}
            {product?.deleted_at ? ' (Archived)' : ''}
          </Text>
          <Text style={styles.progressHeroMeta}>Updated {formatDate(app.updated_at || app.updatedAt)}</Text>
        </View>
        <View style={styles.progressCircle}>
          <Text style={styles.progressPercent}>{progress}%</Text>
          <Text style={styles.progressLabel}>Complete</Text>
        </View>
      </LinearGradient>
      <ProgressBar progress={progress} height={6} color={colors.primary} style={{ marginHorizontal: 20, marginBottom: 16 }} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabRow}>
        {(['overview', 'documents', 'timeline', 'notes'] as const).map((tab) => (
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
                  { label: 'Application No', value: app.application_number },
                  { label: 'Product', value: product?.name || '—' },
                  { label: 'Brand', value: product?.brand || '—' },
                  { label: 'Certification Type', value: app.cert_type?.replace(/_/g, ' ') },
                  { label: 'Priority', value: app.priority?.charAt(0).toUpperCase() + (app.priority?.slice(1) || '') },
                  { label: 'Assigned To', value: assignee?.name || 'Unassigned' },
                  { label: 'Created By', value: app.created_by?.name || '—' },
                  { label: 'Submitted', value: formatDate(app.submitted_at || app.created_at || app.createdAt) },
                  { label: 'Est. Completion', value: formatDate(app.estimated_completion_at) },
                ].map((item, i) => (
                  <View key={i} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{item.label}</Text>
                    <Text style={styles.detailValue}>{item.value || '—'}</Text>
                  </View>
                ))}
              </LinearGradient>
            </View>

            {app.fee && (
              <View style={[styles.card, Shadows.sm]}>
                <LinearGradient
                  colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
                  style={styles.cardInner}
                >
                  <Text style={styles.cardTitle}>Fee Summary</Text>
                  <View style={styles.paymentRow}>
                    <View style={styles.paymentItem}>
                      <Text style={styles.paymentAmount}>{formatCurrency(app.fee.base_inr || 0)}</Text>
                      <Text style={styles.paymentLabel}>Base Fee</Text>
                    </View>
                    <View style={styles.paymentDivider} />
                    <View style={styles.paymentItem}>
                      <Text style={[styles.paymentAmount, { color: app.fee.paid ? colors.success : colors.warning }]}>
                        {app.fee.paid ? 'Paid' : 'Unpaid'}
                      </Text>
                      <Text style={styles.paymentLabel}>Status</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            )}
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
                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={handleUploadDoc}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons name="cloud-upload-outline" size={16} color={colors.primary} />
                  )}
                  <Text style={styles.uploadBtnText}>{uploading ? 'Uploading…' : 'Upload'}</Text>
                </TouchableOpacity>
              </View>
              {(docsData && docsData.length > 0) ? docsData.map((doc: any) => (
                <View key={doc._id} style={styles.docRow}>
                  <View style={styles.docIcon}>
                    <Ionicons name="document-text" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docName}>{doc.name || doc.filename}</Text>
                    <Text style={styles.docSize}>{doc.doc_type || 'Document'}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.docDownload}
                    onPress={async () => {
                      try {
                        const res = await api.get(`/documents/${doc._id}/download`) as any;
                        if (res?.data?.url) Linking.openURL(res.data.url);
                      } catch {
                        Alert.alert('Error', 'Could not download document');
                      }
                    }}
                  >
                    <Ionicons name="download-outline" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              )) : documents.length > 0 ? documents.map((docRef: any, i: number) => (
                <View key={docRef.document_id?._id || i} style={styles.docRow}>
                  <View style={styles.docIcon}>
                    <Ionicons name="document-text" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docName}>{docRef.label || docRef.document_id?.name || 'Document'}</Text>
                    <Text style={styles.docSize}>{docRef.required_for_stage || ''}</Text>
                  </View>
                </View>
              )) : (
                <View style={styles.emptyTab}>
                  <Ionicons name="folder-open-outline" size={40} color={colors.textTertiary} />
                  <Text style={styles.emptyTabText}>No documents uploaded yet</Text>
                  <Text style={styles.emptyTabSub}>Upload documents to support your application</Text>
                </View>
              )}
            </LinearGradient>
          </View>
        )}

        {activeTab === 'timeline' && (
          <View style={[styles.card, Shadows.sm]}>
            <LinearGradient
              colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
              style={styles.cardInner}
            >
              <Text style={styles.cardTitle}>Status Timeline</Text>
              {statusHistory.length > 0 ? statusHistory.map((entry: any, idx: number) => {
                const isFirst = idx === 0;
                const isLast = idx === statusHistory.length - 1;
                return (
                  <View key={idx} style={styles.tlRow}>
                    <View style={styles.tlLeft}>
                      <View style={[
                        styles.tlDot,
                        isFirst
                          ? { backgroundColor: `${colors.primary}20`, borderColor: colors.primary }
                          : { backgroundColor: `${colors.success}20`, borderColor: colors.success },
                      ]}>
                        <Ionicons
                          name={isFirst ? 'radio-button-on' : 'checkmark'}
                          size={12}
                          color={isFirst ? colors.primary : colors.success}
                        />
                      </View>
                      {!isLast && (
                        <View style={[styles.tlLine, { backgroundColor: colors.success }]} />
                      )}
                    </View>
                    <View style={styles.tlContent}>
                      <Text style={styles.tlEvent}>
                        {entry.from?.replace(/_/g, ' ')} → {entry.to?.replace(/_/g, ' ')}
                      </Text>
                      <Text style={styles.tlTime}>{formatDate(entry.at)}</Text>
                      {entry.reason && <Text style={styles.tlNote}>{entry.reason}</Text>}
                    </View>
                  </View>
                );
              }) : (
                <View style={styles.emptyTab}>
                  <Ionicons name="time-outline" size={40} color={colors.textTertiary} />
                  <Text style={styles.emptyTabText}>No status changes yet</Text>
                  <Text style={styles.emptyTabSub}>Timeline updates will appear as your application progresses</Text>
                </View>
              )}
            </LinearGradient>
          </View>
        )}

        {activeTab === 'notes' && (
          <View style={[styles.card, Shadows.sm]}>
            <LinearGradient
              colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
              style={styles.cardInner}
            >
              <Text style={styles.cardTitle}>Notes</Text>
              {app.notes ? (
                <Text style={styles.notesText}>{app.notes}</Text>
              ) : (
                <View style={styles.emptyTab}>
                  <Ionicons name="chatbubble-outline" size={40} color={colors.textTertiary} />
                  <Text style={styles.emptyTabText}>No notes</Text>
                </View>
              )}
            </LinearGradient>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    center: { alignItems: 'center', justifyContent: 'center' },
    loadingText: { fontSize: 14, color: colors.textSecondary },
    errorText: { fontSize: 16, color: colors.error, fontWeight: '600', marginTop: 12 },
    retryBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: BorderRadius.md, backgroundColor: `${colors.primary}20` },
    retryText: { color: colors.primary, fontWeight: '600' },

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
    notesText: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },

    tlRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
    tlLeft: { alignItems: 'center', width: 28 },
    tlDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    tlLine: { width: 2, height: 24, marginTop: 4 },
    tlContent: { flex: 1, paddingBottom: 12 },
    tlEvent: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
    tlTime: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    tlNote: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 18 },

    emptyTab: { alignItems: 'center', paddingVertical: 30, gap: 8 },
    emptyTabText: { fontSize: 14, fontWeight: '600', color: colors.textTertiary },
    emptyTabSub: { fontSize: 12, color: colors.textTertiary, textAlign: 'center' },
  });

export default ApplicationDetailScreen;
