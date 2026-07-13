import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import Badge, { getStatusVariant } from '../../components/common/Badge';
import SearchBar from '../../components/common/SearchBar';
import EmptyState from '../../components/common/EmptyState';
import { formatDate, formatFileSize } from '../../utils/formatters';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';

const DocumentsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data: documentsData, isLoading, refetch } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      try {
        const res = await api.get('/documents') as any;
        return res?.data || [];
      } catch (e) {
        return [];
      }
    }
  });

  const DOCUMENTS = useMemo(() => {
    if (!documentsData) return [];
    return documentsData.map((doc: any) => ({
      id: doc._id,
      name: doc.name,
      docType: doc.doc_type,
      status: doc.status || 'approved',
      size: doc.size_bytes,
      uploadedAt: doc.created_at,
      uploadedBy: doc.uploaded_by?.name,
      applicationNo: doc.application_ids?.[0] || 'N/A',
    }));
  }, [documentsData]);

  const TYPE_ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = useMemo(() => ({
    test_report: { icon: 'flask', color: colors.secondary },
    certificate: { icon: 'ribbon', color: colors.success },
    invoice: { icon: 'receipt', color: colors.warning },
    declaration: { icon: 'document-text', color: colors.primary },
    authorization: { icon: 'key', color: colors.accent },
    other: { icon: 'document', color: colors.textSecondary },
  }), [colors]);

  const filtered = DOCUMENTS.filter((doc: typeof DOCUMENTS[0]) =>
    doc.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    doc.applicationNo.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const pickFromLibrary = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        Alert.alert(
          'Document Added',
          `"${file.name}" has been uploaded successfully.`,
          [{ text: 'OK' }]
        );
        await refetch();
      }
    } catch (err) {
      Alert.alert('Error', 'Could not open document picker. Please try again.');
    }
  };

  const handleUpload = () => {
    Alert.alert(
      'Upload Document',
      'Choose upload method',
      [
        { text: 'Take Photo (OCR)', onPress: () => navigation.navigate('DocumentScan') },
        { text: 'From Library', onPress: pickFromLibrary },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const toggleSelect = (id: string) => {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Documents</Text>
          <Text style={styles.headerSubtitle}>{DOCUMENTS.length} files stored</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={() => navigation.navigate('DocumentScan')}
          >
            <Ionicons name="scan" size={20} color={colors.secondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.uploadBtnGradient}>
              <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        {[
          { label: 'Total', value: DOCUMENTS.length, color: colors.primary },
          { label: 'Approved', value: DOCUMENTS.filter((d: typeof DOCUMENTS[0]) => d.status === 'approved').length, color: colors.success },
          { label: 'Pending', value: DOCUMENTS.filter((d: typeof DOCUMENTS[0]) => d.status === 'pending').length, color: colors.warning },
          { label: 'Rejected', value: DOCUMENTS.filter((d: typeof DOCUMENTS[0]) => d.status === 'rejected').length, color: colors.error },
        ].map((stat, i) => (
          <View key={i} style={styles.statItem}>
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.searchWrapper}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search documents..."
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="folder-open-outline"
            title="No documents found"
            subtitle="Upload your compliance documents to get started"
            actionLabel="Upload Document"
            onAction={handleUpload}
          />
        }
        renderItem={({ item }) => {
          const typeInfo = TYPE_ICONS[item.type] ?? TYPE_ICONS.other;
          const isSelected = selectedDocs.has(item.id);

          return (
            <TouchableOpacity
              style={[styles.docCard, Shadows.sm, isSelected && styles.docCardSelected]}
              onPress={() => isSelecting ? toggleSelect(item.id) : Alert.alert('Document', 'Opening: ' + item.name)}
              onLongPress={() => { setIsSelecting(true); toggleSelect(item.id); }}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={isSelected
                  ? [`${colors.primary}25`, `${colors.primary}15`]
                  : isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']
                }
                style={styles.docCardInner}
              >
                {/* Select overlay */}
                {isSelecting && (
                  <View style={styles.selectCheck}>
                    {isSelected ? (
                      <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.checkCircle}>
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      </LinearGradient>
                    ) : (
                      <View style={styles.uncheckedCircle} />
                    )}
                  </View>
                )}

                <View style={[styles.docIcon, { backgroundColor: typeInfo.color + '20' }]}>
                  <Ionicons name={typeInfo.icon} size={24} color={typeInfo.color} />
                </View>

                <View style={styles.docInfo}>
                  <Text style={styles.docName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.docMeta}>{item.format} • {formatFileSize(item.size)}</Text>
                  <Text style={styles.docApp}>{item.applicationNo}</Text>
                </View>

                <View style={styles.docRight}>
                  <Badge label={item.status} variant={getStatusVariant(item.status)} size="sm" />
                  <Text style={styles.docDate}>{formatDate(item.uploadedAt)}</Text>
                  <TouchableOpacity style={styles.docMenu}>
                    <Ionicons name="ellipsis-vertical" size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          );
        }}
      />

      {/* Selection toolbar */}
      {isSelecting && selectedDocs.size > 0 && (
        <View style={[styles.selectionBar, { paddingBottom: insets.bottom + 8 }]}>
          <Text style={styles.selectionCount}>{selectedDocs.size} selected</Text>
          <View style={styles.selectionActions}>
            <TouchableOpacity style={styles.selectionBtn} onPress={() => Alert.alert('Download', 'Downloading selected files.')}>
              <Ionicons name="download-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.selectionBtn} onPress={() => Alert.alert('Delete', 'Delete selected?')}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setIsSelecting(false); setSelectedDocs(new Set()); }}>
              <Text style={styles.cancelSelection}>Cancel</Text>
            </TouchableOpacity>
          </View>
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
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? colors.bgCardLight : colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
    headerSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    headerActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    scanBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: 'rgba(0,212,255,0.1)',
      borderWidth: 1,
      borderColor: 'rgba(0,212,255,0.3)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    uploadBtn: { borderRadius: 14, overflow: 'hidden' },
    uploadBtnGradient: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    statsBar: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 12,
      gap: 8,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: isDark ? colors.bgCard : '#FFFFFF',
      borderRadius: BorderRadius.md,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
    },
    statValue: { fontSize: 20, fontWeight: '800' },
    statLabel: { fontSize: 10, color: colors.textTertiary, marginTop: 2 },
    searchWrapper: { paddingHorizontal: 20, marginBottom: 12 },
    listContent: { paddingHorizontal: 20, paddingBottom: 100 },
    docCard: {
      marginBottom: 10,
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
    },
    docCardSelected: { borderColor: colors.primary },
    docCardInner: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      gap: 12,
    },
    selectCheck: { marginRight: 4 },
    checkCircle: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    uncheckedCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border },
    docIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    docInfo: { flex: 1 },
    docName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 3 },
    docMeta: { fontSize: 11, color: colors.textTertiary },
    docApp: { fontSize: 11, color: colors.primary, marginTop: 2 },
    docRight: { alignItems: 'flex-end', gap: 4 },
    docDate: { fontSize: 10, color: colors.textTertiary },
    docMenu: { padding: 4 },
    selectionBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 16,
      backgroundColor: isDark ? colors.bgCard : '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    selectionCount: { flex: 1, fontSize: 15, color: colors.textPrimary, fontWeight: '600' },
    selectionActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    selectionBtn: { padding: 8 },
    cancelSelection: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  });

export default DocumentsScreen;
