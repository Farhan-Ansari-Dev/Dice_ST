import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import EmptyState from '../../components/common/EmptyState';

const REJECTED_DOCS: any[] = [];

const RejectedDocumentsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => { setRefreshing(true); await new Promise(r => setTimeout(r, 800)); setRefreshing(false); };
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rejected Documents</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Info Banner */}
      <View style={[styles.infoBanner, { backgroundColor: `${colors.error}15`, borderColor: `${colors.error}30` }]}>
        <Ionicons name="information-circle-outline" size={18} color={colors.error} />
        <Text style={[styles.infoBannerText, { color: colors.error }]}>{REJECTED_DOCS.length} documents require your attention</Text>
      </View>

      <FlatList
        data={REJECTED_DOCS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState icon="close-circle-outline" title="No Rejected Documents" subtitle="All documents have been accepted." />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        renderItem={({ item }) => (
          <View style={[styles.docCard, Shadows.md]}>
            <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.docCardInner}>
              <View style={styles.docRow}>
                <View style={[styles.docIcon, { backgroundColor: `${colors.error}20` }]}>
                  <Ionicons name="close-circle" size={22} color={colors.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docName}>{item.name}</Text>
                  <Text style={styles.docMeta}>{item.docType} • {item.rejectedBy}</Text>
                  <Text style={styles.docDate}>{item.date}</Text>
                </View>
                <View style={[styles.codeTag, { backgroundColor: `${colors.error}20` }]}>
                  <Text style={[styles.codeText, { color: colors.error }]}>{item.rejectCode}</Text>
                </View>
              </View>

              <View style={[styles.reasonBox, { backgroundColor: isDark ? 'rgba(255,59,48,0.08)' : '#FFF3F2', borderColor: `${colors.error}20` }]}>
                <Text style={styles.reasonLabel}>Rejection Reason</Text>
                <Text style={styles.reasonText}>{item.reason}</Text>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: `${colors.primary}15`, flex: 1 }]}>
                  <Ionicons name="cloud-upload-outline" size={15} color={colors.primary} />
                  <Text style={[styles.actionBtnText, { color: colors.primary }]}>Re-upload</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: `${colors.warning}15`, flex: 1 }]}>
                  <Ionicons name="chatbubble-outline" size={15} color={colors.warning} />
                  <Text style={[styles.actionBtnText, { color: colors.warning }]}>Ask Expert</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        )}
      />
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? colors.bgCardLight : colors.border, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    infoBanner: { marginHorizontal: 20, marginBottom: 12, borderRadius: BorderRadius.md, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
    infoBannerText: { fontSize: 13, fontWeight: '600' },
    listContent: { paddingHorizontal: 20, paddingBottom: 40 },
    docCard: { marginBottom: 14, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    docCardInner: { padding: 14 },
    docRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
    docIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    docName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    docMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    docDate: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    codeTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.sm },
    codeText: { fontSize: 10, fontWeight: '800' },
    reasonBox: { borderRadius: BorderRadius.md, borderWidth: 1, padding: 12, marginBottom: 12 },
    reasonLabel: { fontSize: 11, fontWeight: '700', color: colors.error, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    reasonText: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
    actionRow: { flexDirection: 'row', gap: 10 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: BorderRadius.md },
    actionBtnText: { fontSize: 13, fontWeight: '600' },
  });

export default RejectedDocumentsScreen;
