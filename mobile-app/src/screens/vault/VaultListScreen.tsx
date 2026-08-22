import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Easing,
  Share,
  AccessibilityInfo,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import { useVaultStore, VaultDocument } from '../../store/vaultStore';
import documentsService from '../../services/documentsService';
import { fileKind, openDocument } from '../../utils/documentDisplay';
import { useDebounce } from '../../hooks/useDebounce';

type StatusFilter = 'all' | 'verified' | 'unverified';
type SortKey = 'recent' | 'name' | 'size';

const humanSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
};

const relativeDate = (iso?: string): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < day && d.getDate() === new Date().getDate()) return 'Today';
  if (diff < 2 * day) return 'Yesterday';
  if (diff < 7 * day) return `${Math.floor(diff / day)} days ago`;
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

const VaultListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { documents, loadDocuments, isLoading, hasLoaded, error } = useVaultStore();

  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 250);
  const [category, setCategory] = useState<string>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortKey>('recent');
  const [showFilters, setShowFilters] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => { loadDocuments(); }, [loadDocuments]));

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  // ── Derived data (real documents only) ─────────────────────────────────────
  const stats = useMemo(() => {
    const total = documents.length;
    const verified = documents.filter((d) => d.verified === true).length;
    return { total, verified, actionNeeded: total - verified };
  }, [documents]);

  const categories = useMemo(() => {
    const set = new Map<string, string>();
    for (const d of documents) {
      const c = (d.type || 'Other').trim();
      if (c) set.set(c.toLowerCase(), c);
    }
    return ['all', ...Array.from(set.values())];
  }, [documents]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    let list = documents.filter((d) => {
      if (category !== 'all' && (d.type || 'Other').toLowerCase() !== category.toLowerCase()) return false;
      if (status === 'verified' && d.verified !== true) return false;
      if (status === 'unverified' && d.verified === true) return false;
      if (q) {
        const hay = `${d.name ?? ''} ${d.type ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sort === 'size') return (b.sizeBytes || 0) - (a.sizeBytes || 0);
      return new Date(b.dateAdded || 0).getTime() - new Date(a.dateAdded || 0).getTime();
    });
    return list;
  }, [documents, category, status, debouncedSearch, sort]);

  const activeFilterCount = (status !== 'all' ? 1 : 0) + (sort !== 'recent' ? 1 : 0);

  // ── Upload (existing real flow: presign → S3 → finalize) ────────────────────
  const addPickedDocument = async (doc: { name: string; uri: string; mimeType?: string | null }) => {
    const isImage = doc.mimeType?.startsWith('image/') ?? false;
    const mimeType = doc.mimeType || (isImage ? 'image/jpeg' : 'application/octet-stream');
    setUploading(true);
    try {
      await documentsService.uploadFromDevice(doc.uri, doc.name, mimeType);
      await loadDocuments();
      setCategory('all');
      setSearch('');
      Alert.alert('Document uploaded', 'Your document has been securely saved to the Vault.');
    } catch (e: any) {
      Alert.alert('Upload failed', e?.response?.data?.error || e?.message || 'Could not upload the document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) { Alert.alert('Camera permission required', 'Allow camera access to scan documents into the Vault.'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!result.canceled) {
      const a = result.assets[0];
      addPickedDocument({ name: `Scan ${new Date().toLocaleDateString()}.jpg`, uri: a.uri, mimeType: a.mimeType ?? 'image/jpeg' });
    }
  };
  const chooseImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Photos permission required', 'Allow access to import an image into the Vault.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!result.canceled) {
      const a = result.assets[0];
      addPickedDocument({ name: a.fileName ?? `Image ${new Date().toLocaleDateString()}.jpg`, uri: a.uri, mimeType: a.mimeType ?? 'image/jpeg' });
    }
  };
  const chooseFile = async (pdfOnly = false) => {
    const result = await DocumentPicker.getDocumentAsync({ type: pdfOnly ? 'application/pdf' : '*/*', copyToCacheDirectory: true, multiple: false });
    if (!result.canceled) {
      const a = result.assets[0];
      addPickedDocument({ name: a.name, uri: a.uri, mimeType: a.mimeType });
    }
  };
  const handleAddDocument = () => {
    Alert.alert('Add to Vault', 'Choose how you would like to add a document.', [
      { text: 'Scan with Camera', onPress: takePhoto },
      { text: 'Choose Image', onPress: chooseImage },
      { text: 'Import PDF', onPress: () => chooseFile(true) },
      { text: 'Choose Any File', onPress: () => chooseFile(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ── Per-document actions (real APIs) ────────────────────────────────────────
  const shareDoc = async (doc: VaultDocument) => {
    try {
      const res = await documentsService.getDownloadUrl(doc.id);
      const url = res?.data?.url;
      if (url) await Share.share(Platform.OS === 'ios' ? { url, message: doc.name } : { message: `${doc.name}\n${url}` });
      else Alert.alert('Unavailable', 'Could not prepare this document for sharing.');
    } catch (e: any) {
      Alert.alert('Share failed', e?.response?.data?.message ?? 'Please try again.');
    }
  };
  const deleteDoc = (doc: VaultDocument) => {
    Alert.alert('Delete document', `Delete "${doc.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try { await documentsService.delete(doc.id); await loadDocuments(); }
          catch (e: any) { Alert.alert('Delete failed', e?.response?.data?.message ?? 'Please try again.'); }
        },
      },
    ]);
  };
  const openMenu = (doc: VaultDocument) => {
    Alert.alert(doc.name, undefined, [
      { text: 'Open / Download', onPress: () => openDocument(doc.id, doc.name) },
      { text: 'Share', onPress: () => shareDoc(doc) },
      { text: 'Delete', style: 'destructive', onPress: () => deleteDoc(doc) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const showSkeleton = isLoading && !hasLoaded;

  const chipRow = (
    <View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={categories}
        keyExtractor={(c) => c}
        contentContainerStyle={styles.chipsContent}
        renderItem={({ item }) => {
          const active = category.toLowerCase() === item.toLowerCase();
          return (
            <TouchableOpacity onPress={() => setCategory(item)} activeOpacity={0.8} style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                {item === 'all' ? 'All Documents' : item}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );

  const Header = (
    <View>
      {/* Summary card */}
      <LinearGradient colors={[colors.primary, colors.primaryDark]} style={[styles.summaryCard, Shadows.md]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.summaryHeader}>
          <View style={styles.summaryIcon}><Ionicons name="shield-checkmark" size={22} color="#FFFFFF" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryTitle}>Your compliance records</Text>
            <Text style={styles.summaryText}>All your documents are secure and organized</Text>
          </View>
        </View>
        <View style={styles.summaryStats}>
          <SummaryStat value={stats.total} label="TOTAL" skeleton={showSkeleton} />
          <View style={styles.statDivider} />
          <SummaryStat value={stats.verified} label="VERIFIED" skeleton={showSkeleton} />
          <View style={styles.statDivider} />
          <SummaryStat value={stats.actionNeeded} label="ACTION NEEDED" skeleton={showSkeleton} />
        </View>
      </LinearGradient>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search documents..." placeholderTextColor={colors.textTertiary} style={[styles.searchInput, { flex: 1 }]} returnKeyType="search" />

          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}><Ionicons name="close-circle" size={18} color={colors.textTertiary} /></TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={[styles.filterBtn, (showFilters || activeFilterCount > 0) && styles.filterBtnActive]} onPress={() => setShowFilters((s) => !s)} accessibilityLabel="Filter and sort">
          <Ionicons name="options-outline" size={20} color={showFilters || activeFilterCount > 0 ? '#FFFFFF' : colors.primary} />
          {activeFilterCount > 0 && <View style={styles.filterDot} />}
        </TouchableOpacity>
      </View>

      {/* Category chips */}
      {categories.length > 1 && chipRow}

      {/* Filter / sort panel */}
      {showFilters && (
        <View style={[styles.filterPanel, Shadows.sm]}>
          <Text style={styles.filterGroupLabel}>Status</Text>
          <View style={styles.pillRow}>
            {(['all', 'verified', 'unverified'] as StatusFilter[]).map((s) => (
              <Pill key={s} label={s === 'all' ? 'All' : s === 'verified' ? 'Verified' : 'Action needed'} active={status === s} onPress={() => setStatus(s)} colors={colors} />
            ))}
          </View>
          <Text style={[styles.filterGroupLabel, { marginTop: 12 }]}>Sort by</Text>
          <View style={styles.pillRow}>
            {(['recent', 'name', 'size'] as SortKey[]).map((s) => (
              <Pill key={s} label={s === 'recent' ? 'Recently uploaded' : s === 'name' ? 'Name' : 'Size'} active={sort === s} onPress={() => setSort(s)} colors={colors} />
            ))}
          </View>
        </View>
      )}

      {/* Section header */}
      {!showSkeleton && documents.length > 0 && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>YOUR DOCUMENTS</Text>
          <Text style={styles.sectionCount}>{filtered.length} of {documents.length}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : ['#F9FAFF', '#F0F3FA']} style={StyleSheet.absoluteFill} />

      <View style={styles.pageHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>COMPLIANCE WORKSPACE</Text>
          <Text style={styles.pageTitle}>Document Vault</Text>
          <Text style={styles.pageSub}>Secure storage for your important compliance documents</Text>
        </View>
        <TouchableOpacity accessibilityLabel="Upload a document" style={styles.addBtn} onPress={handleAddDocument} activeOpacity={0.85}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.addBtnGrad}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <FlatList
        data={showSkeleton ? [] : filtered}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={Header}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={isLoading && hasLoaded} onRefresh={loadDocuments} tintColor={colors.primary} />}
        renderItem={({ item, index }) => (
          <DocCard doc={item} index={index} reduceMotion={reduceMotion} colors={colors} styles={styles} onPress={() => openDocument(item.id, item.name)} onMenu={() => openMenu(item)} />
        )}
        ListEmptyComponent={
          showSkeleton ? (
            <View>{[0, 1, 2, 3, 4].map((i) => <SkeletonCard key={i} styles={styles} />)}</View>
          ) : error ? (
            <StateBox styles={styles} colors={colors} icon="cloud-offline-outline" title="Couldn’t load your documents" text={error} actionLabel="Retry" onAction={loadDocuments} />
          ) : documents.length === 0 ? (
            <StateBox styles={styles} colors={colors} icon="folder-open-outline" title="No documents yet" text="Upload a certificate, test report, or company document and it will appear here." actionLabel="Upload Document" onAction={handleAddDocument} />
          ) : (
            <StateBox styles={styles} colors={colors} icon="search-outline"
              title={debouncedSearch ? 'No documents found' : category !== 'all' ? 'No documents in this category' : 'Nothing matches'}
              text={debouncedSearch ? 'Try a different search or filter.' : 'Try a different category or filter.'}
              actionLabel="Clear filters" onAction={() => { setSearch(''); setCategory('all'); setStatus('all'); }} />
          )
        }
      />

      {uploading && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.uploadingText}>Uploading…</Text>
        </View>
      )}
    </View>
  );
};

// ── Small building blocks ─────────────────────────────────────────────────────

const SummaryStat: React.FC<{ value: number; label: string; skeleton?: boolean }> = ({ value, label, skeleton }) => {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'flex-start' }}>
      {skeleton ? (
        <View style={{ width: 28, height: 22, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.3)' }} />
      ) : (
        <Text style={{ fontSize: 21, fontWeight: '800', color: '#FFFFFF' }}>{value}</Text>
      )}
      <Text style={{ fontSize: 9.5, fontWeight: '700', letterSpacing: 0.6, color: 'rgba(255,255,255,0.7)', marginTop: 3 }}>{label}</Text>
    </View>
  );
};

const Pill: React.FC<{ label: string; active: boolean; onPress: () => void; colors: any }> = ({ label, active, onPress, colors }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, marginRight: 8, marginBottom: 8,
    backgroundColor: active ? colors.primary : `${colors.primary}12`,
  }}>
    <Text style={{ fontSize: 12, fontWeight: '600', color: active ? '#FFFFFF' : colors.primary }}>{label}</Text>
  </TouchableOpacity>
);

const StateBox: React.FC<any> = ({ styles, colors, icon, title, text, actionLabel, onAction }) => (
  <View style={styles.stateBox}>
    <View style={styles.stateIcon}><Ionicons name={icon} size={30} color={colors.primary} /></View>
    <Text style={styles.stateTitle}>{title}</Text>
    <Text style={styles.stateText}>{text}</Text>
    {actionLabel && onAction && (
      <TouchableOpacity onPress={onAction} style={styles.stateBtn}><Text style={styles.stateBtnText}>{actionLabel}</Text></TouchableOpacity>
    )}
  </View>
);

const SkeletonCard: React.FC<{ styles: any }> = ({ styles }) => {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.4, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <Animated.View style={[styles.card, styles.skelCard, { opacity: pulse }]}>
      <View style={styles.skelIcon} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={[styles.skelLine, { width: '70%' }]} />
        <View style={[styles.skelLine, { width: '40%' }]} />
      </View>
    </Animated.View>
  );
};

const DocCard: React.FC<{
  doc: VaultDocument; index: number; reduceMotion: boolean; colors: any; styles: any; onPress: () => void; onMenu: () => void;
}> = React.memo(({ doc, index, reduceMotion, colors, styles, onPress, onMenu }) => {
  const kind = fileKind(doc.name, doc.mimeType);
  const enter = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) { enter.setValue(1); return; }
    Animated.timing(enter, {
      toValue: 1, duration: 260, delay: Math.min(index, 8) * 45, easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  }, [enter, index, reduceMotion]);

  const pressIn = () => !reduceMotion && Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  const pressOut = () => !reduceMotion && Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 4 }).start();

  return (
    <Animated.View style={{ opacity: enter, transform: [{ scale }, { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} style={[styles.card, Shadows.sm]}>
        <View style={[styles.cardIcon, { backgroundColor: `${kind.tint}1A` }]}>
          <Ionicons name={kind.icon} size={22} color={kind.tint} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.cardName} numberOfLines={1}>{doc.name}</Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {doc.type || 'Document'} · Uploaded {relativeDate(doc.dateAdded)}
          </Text>
          <View style={styles.cardFooter}>
            {doc.verified === true ? (
              <View style={styles.verifiedTag}><Ionicons name="checkmark-circle" size={12} color={colors.success} /><Text style={[styles.tagText, { color: colors.success }]}>Verified</Text></View>
            ) : (
              <View style={styles.pendingTag}><Ionicons name="ellipse-outline" size={11} color={colors.warning} /><Text style={[styles.tagText, { color: colors.warning }]}>Pending review</Text></View>
            )}
            <Text style={styles.cardSize}>{humanSize(doc.sizeBytes)}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onMenu} hitSlop={10} style={styles.cardMenu} accessibilityLabel="Document actions">
          <Ionicons name="ellipsis-vertical" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
});

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1 },
  pageHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: colors.primary, marginBottom: 4 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  pageSub: { fontSize: 13, color: colors.textSecondary, marginTop: 4, paddingRight: 12 },
  addBtn: { borderRadius: 15, overflow: 'hidden', ...Shadows.sm },
  addBtnGrad: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 20, paddingTop: 12 },

  summaryCard: { borderRadius: BorderRadius.lg, padding: 20, marginBottom: 16 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  summaryIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  summaryText: { fontSize: 12, color: 'rgba(255,255,255,0.78)', marginTop: 3 },
  summaryStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statDivider: { height: 30, width: 1, backgroundColor: 'rgba(255,255,255,0.24)' },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, borderRadius: 14, paddingHorizontal: 14, backgroundColor: isDark ? colors.bgCard : '#FFFFFF', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
  searchInput: { fontSize: 14, color: colors.textPrimary, padding: 0, ...(Platform.OS === 'android' ? { paddingVertical: 2 } : {}) },
  filterBtn: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? colors.bgCard : '#FFFFFF', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error, borderWidth: 1, borderColor: '#FFFFFF' },

  chipsContent: { paddingVertical: 2, paddingRight: 8, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: isDark ? colors.bgCard : '#FFFFFF', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, maxWidth: 180 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12.5, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: '#FFFFFF' },

  filterPanel: { marginTop: 12, borderRadius: BorderRadius.lg, padding: 14, backgroundColor: isDark ? colors.bgCard : '#FFFFFF', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
  filterGroupLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, color: colors.textTertiary, marginBottom: 8 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 10 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, letterSpacing: 0.8 },
  sectionCount: { fontSize: 12, color: colors.textTertiary, fontWeight: '600' },

  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: 10, borderRadius: BorderRadius.lg, backgroundColor: isDark ? colors.bgCard : '#FFFFFF', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
  cardIcon: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardName: { fontSize: 14.5, fontWeight: '700', color: colors.textPrimary, marginBottom: 3 },
  cardMeta: { fontSize: 11.5, color: colors.textTertiary },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 7 },
  verifiedTag: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  pendingTag: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tagText: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.3 },
  cardSize: { fontSize: 11, color: colors.textTertiary, fontWeight: '600' },
  cardMenu: { padding: 4, alignSelf: 'flex-start' },

  stateBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 10 },
  stateIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.primary}12`, marginBottom: 4 },
  stateTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  stateText: { fontSize: 13, lineHeight: 19, color: colors.textSecondary, textAlign: 'center', maxWidth: 300 },
  stateBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12, backgroundColor: colors.primary },
  stateBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13.5 },

  skelCard: { opacity: 0.5 },
  skelIcon: { width: 46, height: 46, borderRadius: 13, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
  skelLine: { height: 11, borderRadius: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },

  uploadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', gap: 12, zIndex: 10 },
  uploadingText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});

export default VaultListScreen;
