import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../hooks/useAuth';
import { useTheme, Shadows, BorderRadius } from '../../theme';
import { api } from '../../services/api';

type PickedDoc = {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
};

const STATUS_CONFIG: Record<string, { color: string; icon: string; label: string; description: string }> = {
  pending: {
    color: '#F59E0B',
    icon: 'time-outline',
    label: 'Pending Review',
    description: 'Your documents are being reviewed by our team. This usually takes 1-2 business days.',
  },
  verified: {
    color: '#10B981',
    icon: 'checkmark-circle',
    label: 'Verified',
    description: 'Your consultant profile has been verified. You can now be assigned to applications.',
  },
  rejected: {
    color: '#EF4444',
    icon: 'close-circle',
    label: 'Rejected',
    description: 'Your verification was not approved. Please review the reason below and resubmit.',
  },
};

const ConsultantVerificationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [documents, setDocuments] = useState<PickedDoc[]>([]);

  const { data: profileData, isLoading: profileLoading, refetch } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      const res = await api.get('/users/me') as any;
      return res?.data || res;
    },
    enabled: !!user?.id,
  });

  const verificationStatus = profileData?.consultant_verification_status;
  const rejectionReason = profileData?.consultant_rejection_reason;
  const existingDocs = profileData?.consultant_verification_documents || [];
  const statusInfo = STATUS_CONFIG[verificationStatus || ''];

  const submitMutation = useMutation({
    mutationFn: async () => {
      const docPayload = documents.map(doc => ({
        url: doc.uri,
        name: doc.name,
      }));
      const res = await api.post('/consultants/request-verification', {
        documents: docPayload,
      }) as any;
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      setDocuments([]);
      Alert.alert('Submitted', 'Your verification documents have been submitted for review.');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.response?.data?.error || 'Failed to submit verification';
      Alert.alert('Error', msg);
    },
  });

  const handlePickDocuments = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        multiple: true,
      });

      if (result.assets && result.assets.length > 0) {
        const newDocs: PickedDoc[] = result.assets.map((file: any) => ({
          uri: file.uri,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size,
        }));
        setDocuments(prev => [...prev, ...newDocs]);
      }
    } catch (err) {
      console.error('Error picking documents:', err);
    }
  }, []);

  const handleRemoveDocument = useCallback((index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = () => {
    if (documents.length === 0) {
      Alert.alert('No documents', 'Please upload at least one document.');
      return;
    }
    submitMutation.mutate();
  };

  const canSubmit = verificationStatus !== 'pending' && verificationStatus !== 'verified';

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
          <Text style={styles.headerTitle}>Consultant Verification</Text>
          <Text style={styles.headerSub}>Identity & qualification check</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={profileLoading} onRefresh={() => refetch()} tintColor={colors.primary} />
        }
      >
        {/* User info */}
        {user && (
          <View style={styles.userCard}>
            <View style={styles.userAvatar}>
              <Ionicons name="person" size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
          </View>
        )}

        {/* Current status */}
        {statusInfo && (
          <View style={[styles.statusCard, Shadows.sm]}>
            <LinearGradient
              colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
              style={styles.statusCardInner}
            >
              <View style={styles.statusHeader}>
                <View style={[styles.statusIcon, { backgroundColor: `${statusInfo.color}20` }]}>
                  <Ionicons name={statusInfo.icon as any} size={24} color={statusInfo.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.statusLabel, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                  <Text style={styles.statusDescription}>{statusInfo.description}</Text>
                </View>
              </View>

              {verificationStatus === 'rejected' && rejectionReason && (
                <View style={styles.rejectionBox}>
                  <Ionicons name="warning" size={16} color="#EF4444" />
                  <Text style={styles.rejectionText}>{rejectionReason}</Text>
                </View>
              )}

              {existingDocs.length > 0 && (
                <View style={styles.existingDocsSection}>
                  <Text style={styles.existingDocsTitle}>Submitted Documents</Text>
                  {existingDocs.map((doc: any, i: number) => (
                    <View key={i} style={styles.existingDocRow}>
                      <Ionicons name="document-text" size={16} color={colors.primary} />
                      <Text style={styles.existingDocName}>{doc.name}</Text>
                    </View>
                  ))}
                </View>
              )}
            </LinearGradient>
          </View>
        )}

        {/* Upload section — shown when not pending/verified */}
        {canSubmit && (
          <View style={[styles.uploadCard, Shadows.sm]}>
            <LinearGradient
              colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
              style={styles.uploadCardInner}
            >
              <Text style={styles.uploadTitle}>
                {verificationStatus === 'rejected' ? 'Resubmit Documents' : 'Upload Documents'}
              </Text>
              <Text style={styles.uploadSubtitle}>
                Upload documents to verify your identity and qualifications (PDF, images)
              </Text>

              <TouchableOpacity style={styles.uploadButton} onPress={handlePickDocuments}>
                <Ionicons name="cloud-upload-outline" size={28} color={colors.primary} />
                <Text style={styles.uploadButtonText}>Select Documents</Text>
                <Text style={styles.uploadButtonHint}>PDF, JPG, PNG — up to 10 MB each</Text>
              </TouchableOpacity>

              {documents.length > 0 && (
                <View style={styles.fileList}>
                  {documents.map((doc, index) => (
                    <View key={index} style={styles.fileItem}>
                      <View style={styles.fileIcon}>
                        <Ionicons
                          name={doc.mimeType?.includes('pdf') ? 'document-text' : 'image'}
                          size={18}
                          color={colors.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fileName} numberOfLines={1}>{doc.name}</Text>
                        {doc.size && (
                          <Text style={styles.fileSize}>
                            {(doc.size / 1024).toFixed(0)} KB
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity onPress={() => handleRemoveDocument(index)} style={styles.removeBtn}>
                        <Ionicons name="close-circle" size={22} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </LinearGradient>
          </View>
        )}

        {/* Info card */}
        {!statusInfo && (
          <View style={[styles.infoCard, Shadows.sm]}>
            <LinearGradient
              colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
              style={styles.infoCardInner}
            >
              <Text style={styles.infoTitle}>Why verify?</Text>
              {[
                { icon: 'shield-checkmark', text: 'Get assigned to certification applications' },
                { icon: 'people', text: 'Build trust with clients and the team' },
                { icon: 'star', text: 'Access premium consultant features' },
              ].map((item, i) => (
                <View key={i} style={styles.infoRow}>
                  <View style={[styles.infoDot, { backgroundColor: `${colors.primary}20` }]}>
                    <Ionicons name={item.icon as any} size={14} color={colors.primary} />
                  </View>
                  <Text style={styles.infoText}>{item.text}</Text>
                </View>
              ))}
            </LinearGradient>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Submit footer */}
      {canSubmit && documents.length > 0 && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={submitMutation.isPending}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.submitBtnGradient}
            >
              {submitMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Submit for Verification</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
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
    headerTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    headerSub: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
    content: { padding: 20 },

    userCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginBottom: 20,
    },
    userAvatar: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: `${colors.primary}20`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    userName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
    userEmail: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },

    statusCard: {
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
      marginBottom: 16,
    },
    statusCardInner: { padding: 16 },
    statusHeader: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
    statusIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusLabel: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
    statusDescription: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },

    rejectionBox: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 14,
      padding: 12,
      borderRadius: BorderRadius.md,
      backgroundColor: 'rgba(239,68,68,0.08)',
      borderWidth: 1,
      borderColor: 'rgba(239,68,68,0.15)',
    },
    rejectionText: { flex: 1, fontSize: 13, color: '#EF4444', lineHeight: 18 },

    existingDocsSection: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    existingDocsTitle: { fontSize: 12, fontWeight: '600', color: colors.textTertiary, marginBottom: 8 },
    existingDocRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
    existingDocName: { fontSize: 13, color: colors.textPrimary },

    uploadCard: {
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
      marginBottom: 16,
    },
    uploadCardInner: { padding: 16 },
    uploadTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
    uploadSubtitle: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginBottom: 16 },
    uploadButton: {
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.primary,
      borderStyle: 'dashed',
      borderRadius: BorderRadius.lg,
      paddingVertical: 28,
      backgroundColor: `${colors.primary}08`,
      gap: 6,
    },
    uploadButtonText: { fontSize: 15, fontWeight: '700', color: colors.primary },
    uploadButtonHint: { fontSize: 11, color: colors.textTertiary },

    fileList: { marginTop: 16, gap: 8 },
    fileItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: BorderRadius.md,
      backgroundColor: isDark ? colors.bgCardLight : '#F9FAFB',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
    },
    fileIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: `${colors.primary}15`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fileName: { fontSize: 13, fontWeight: '500', color: colors.textPrimary },
    fileSize: { fontSize: 11, color: colors.textTertiary, marginTop: 1 },
    removeBtn: { padding: 2 },

    infoCard: {
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
      marginBottom: 16,
    },
    infoCardInner: { padding: 16 },
    infoTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
    infoDot: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    infoText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },

    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
    },
    submitBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
    submitBtnGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      gap: 8,
    },
    submitBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  });

export default ConsultantVerificationScreen;
