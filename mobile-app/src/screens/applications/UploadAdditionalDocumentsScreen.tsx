import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const DOCS_REQUESTED: any[] = [];

const UploadAdditionalDocumentsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Additional Documents</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Manager Note */}
        <View style={[styles.managerNote, Shadows.sm]}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.managerNoteInner}>
            <View style={styles.managerHeader}>
              <View style={[styles.managerAvatar, { backgroundColor: `${colors.primary}20` }]}>
                <Text style={[styles.managerInitials, { color: colors.primary }]}>PS</Text>
              </View>
              <View>
                <Text style={styles.managerName}>Priya Sharma</Text>
                <Text style={styles.managerRole}>SCS Manager • Dec 12, 2024</Text>
              </View>
            </View>
            <Text style={styles.noteText}>
              Hi, BIS has requested additional documents for your application SCS-2024-0042. Please upload the documents listed below before December 20, 2024. Lab testing is on hold until these are received.
            </Text>
          </LinearGradient>
        </View>

        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Requested Documents</Text>

        {DOCS_REQUESTED.map((doc) => {
          const isPending = doc.status === 'pending';
          return (
            <View key={doc.id} style={[styles.docCard, Shadows.sm]}>
              <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.docCardInner}>
                <View style={styles.docRow}>
                  <View style={[styles.docIcon, { backgroundColor: isPending ? `${colors.warning}20` : `${colors.success}20` }]}>
                    <Ionicons name={isPending ? 'document-outline' : 'document'} size={20} color={isPending ? colors.warning : colors.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docName}>{doc.name}</Text>
                    <Text style={styles.docNote}>{doc.note}</Text>
                    {doc.uploadedOn ? (
                      <Text style={[styles.uploadedOn, { color: colors.success }]}>Uploaded: {doc.uploadedOn}</Text>
                    ) : (
                      <Text style={[styles.deadline, { color: colors.warning }]}>Deadline: {doc.deadline}</Text>
                    )}
                  </View>
                </View>
                {isPending && (
                  <TouchableOpacity
                    style={[styles.uploadBtn, Shadows.sm]}
                    onPress={() => Alert.alert('Upload', `Upload ${doc.name}`)}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.uploadBtnGradient}>
                      <Ionicons name="cloud-upload-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.uploadBtnText}>Upload Document</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
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
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.textPrimary },
    content: { paddingHorizontal: 20, paddingTop: 8 },
    managerNote: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, marginBottom: 20 },
    managerNoteInner: { padding: 16 },
    managerHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    managerAvatar: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    managerInitials: { fontSize: 14, fontWeight: '800' },
    managerName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    managerRole: { fontSize: 11, color: colors.textTertiary, marginTop: 1 },
    noteText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    docCard: { marginBottom: 12, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    docCardInner: { padding: 14, gap: 12 },
    docRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    docIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    docName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    docNote: { fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
    deadline: { fontSize: 11, fontWeight: '600', marginTop: 4 },
    uploadedOn: { fontSize: 11, fontWeight: '600', marginTop: 4 },
    uploadBtn: { borderRadius: BorderRadius.md, overflow: 'hidden' },
    uploadBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 6 },
    uploadBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  });

export default UploadAdditionalDocumentsScreen;
