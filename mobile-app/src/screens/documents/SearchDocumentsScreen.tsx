import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, TextInput , KeyboardAvoidingView, Platform} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const ALL_DOCS: any[] = [];

const TYPE_FILTERS = ['All', 'Certificate', 'Test Report', 'Company Doc', 'Government Doc', 'License'];

const STATUS_COLORS: Record<string, string> = {
  approved: '#00C896',
  pending: '#FF9500',
  expiring: '#FFCC00',
  rejected: '#FF3B30',
};

const SearchDocumentsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const filtered = ALL_DOCS.filter((doc) => {
    const matchesQuery = doc.name.toLowerCase().includes(query.toLowerCase()) || doc.type.toLowerCase().includes(query.toLowerCase());
    const matchesType = typeFilter === 'All' || doc.type === typeFilter;
    return matchesQuery && matchesType;
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search Documents</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBar, Shadows.sm]}>
        <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.searchBarInner}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search by name, type..."
            placeholderTextColor={colors.textTertiary}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </LinearGradient>
      </View>

      {/* Type Filter */}
      <FlatList
        horizontal
        data={TYPE_FILTERS}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterChip, typeFilter === item && { backgroundColor: colors.primary }]}
            onPress={() => setTypeFilter(item)}
          >
            <Text style={[styles.filterChipText, typeFilter === item && { color: '#FFFFFF' }]}>{item}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Results */}
      <Text style={styles.resultCount}>{filtered.length} document{filtered.length !== 1 ? 's' : ''} found</Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No documents found</Text>
            <Text style={styles.emptySubtitle}>Try different keywords or filters</Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusColor = STATUS_COLORS[item.status] || colors.textTertiary;
          return (
            <View style={[styles.docCard, Shadows.sm]}>
              <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.docCardInner}>
                <View style={styles.docRow}>
                  <View style={[styles.docIcon, { backgroundColor: `${colors.primary}20` }]}>
                    <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docName}>{item.name}</Text>
                    <View style={styles.docMeta}>
                      <Text style={styles.docType}>{item.type}</Text>
                      <Text style={styles.docDot}>•</Text>
                      <Text style={styles.docSize}>{item.size}</Text>
                      <Text style={styles.docDot}>•</Text>
                      <Text style={styles.docDate}>{item.date}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 8 }}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <TouchableOpacity>
                      <Ionicons name="download-outline" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </LinearGradient>
            </View>
          );
        }}
      />
    </View>
    </KeyboardAvoidingView>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? colors.bgCardLight : colors.border, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    searchBar: { marginHorizontal: 20, marginBottom: 10, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    searchBarInner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
    searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary, padding: 0 },
    filterRow: { paddingHorizontal: 20, paddingBottom: 10, gap: 8 },
    filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: BorderRadius.full, backgroundColor: isDark ? colors.bgCardLight : colors.border },
    filterChipText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
    resultCount: { fontSize: 12, color: colors.textTertiary, paddingHorizontal: 20, marginBottom: 8 },
    listContent: { paddingHorizontal: 20, paddingBottom: 40 },
    docCard: { marginBottom: 10, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    docCardInner: { padding: 14 },
    docRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    docIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    docName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 },
    docMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    docType: { fontSize: 11, color: colors.primary, fontWeight: '600' },
    docDot: { fontSize: 11, color: colors.textTertiary },
    docSize: { fontSize: 11, color: colors.textTertiary },
    docDate: { fontSize: 11, color: colors.textTertiary },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    emptyState: { paddingTop: 60, alignItems: 'center', gap: 10 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
    emptySubtitle: { fontSize: 13, color: colors.textTertiary },
  });

export default SearchDocumentsScreen;
