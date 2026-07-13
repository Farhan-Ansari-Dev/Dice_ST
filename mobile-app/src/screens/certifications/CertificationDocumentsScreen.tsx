import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const DOCUMENTS: any[] = [];

const STATUS_CONFIG = {
  uploaded: { color: '#00C896', icon: 'checkmark-circle' as const, label: 'Uploaded' },
  pending: { color: '#F59E0B', icon: 'time' as const, label: 'Pending' },
  rejected: { color: '#EF4444', icon: 'close-circle' as const, label: 'Rejected' },
};

const CertificationDocumentsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const uploaded = DOCUMENTS.filter((d) => d.status === 'uploaded').length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Documents</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.statsRow}>
          {[
            { label: 'Total', value: DOCUMENTS.length.toString(), color: colors.textPrimary },
            { label: 'Uploaded', value: uploaded.toString(), color: colors.success },
            { label: 'Pending', value: DOCUMENTS.filter((d) => d.status === 'pending').length.toString(), color: colors.warning },
            { label: 'Rejected', value: DOCUMENTS.filter((d) => d.status === 'rejected').length.toString(), color: colors.error },
          ].map((stat) => (
            <View key={stat.label} style={[styles.statCard, Shadows.sm]}>
              <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.statCardInner}>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </LinearGradient>
            </View>
          ))}
        </View>

        {DOCUMENTS.map((doc) => {
          const config = STATUS_CONFIG[doc.status as keyof typeof STATUS_CONFIG];
          return (
            <View key={doc.id} style={[styles.docCard, Shadows.sm]}>
              <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.docCardInner}>
                <View style={styles.docRow}>
                  <View style={[styles.docIcon, { backgroundColor: `${config.color}20` }]}>
                    <Ionicons name="document" size={20} color={config.color} />
                  </View>
                  <View style={styles.docInfo}>
                    <Text style={styles.docName}>{doc.name}</Text>
                    {doc.required && <Text style={[styles.requiredTag, { color: colors.error }]}>Required</Text>}
                    {doc.uploadedOn && <Text style={styles.docMeta}>{doc.uploadedOn} {doc.size ? `• ${doc.size}` : ''}</Text>}
                    {doc.status === 'rejected' && doc.reason && (
                      <Text style={[styles.rejectReason, { color: colors.error }]}>{doc.reason}</Text>
                    )}
                  </View>
                  <View style={styles.docRight}>
                    <View style={[styles.statusBadge, { backgroundColor: `${config.color}20` }]}>
                      <Ionicons name={config.icon} size={14} color={config.color} />
                    </View>
                    {(doc.status === 'pending' || doc.status === 'rejected') && (
                      <TouchableOpacity
                        style={[styles.uploadBtn, { backgroundColor: `${colors.primary}20` }]}
                        onPress={() => Alert.alert('Upload', `Upload ${doc.name}`)}
                      >
                        <Ionicons name="cloud-upload-outline" size={16} color={colors.primary} />
                        <Text style={[styles.uploadText, { color: colors.primary }]}>Upload</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </LinearGradient>
            </View>
          );
        })}
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
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    content: { paddingHorizontal: 20, paddingTop: 8 },
    statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    statCard: { flex: 1, borderRadius: BorderRadius.md, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    statCardInner: { padding: 10, alignItems: 'center' },
    statValue: { fontSize: 18, fontWeight: '800' },
    statLabel: { fontSize: 10, color: colors.textTertiary, marginTop: 2 },
    docCard: { marginBottom: 10, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    docCardInner: { padding: 14 },
    docRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    docIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    docInfo: { flex: 1, gap: 2 },
    docName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    requiredTag: { fontSize: 10, fontWeight: '700' },
    docMeta: { fontSize: 11, color: colors.textTertiary },
    rejectReason: { fontSize: 11, lineHeight: 16, marginTop: 2 },
    docRight: { alignItems: 'flex-end', gap: 6 },
    statusBadge: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.full },
    uploadText: { fontSize: 12, fontWeight: '600' },
  });

export default CertificationDocumentsScreen;
