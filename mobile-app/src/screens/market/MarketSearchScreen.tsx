import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme, Typography, Shadows, BorderRadius, Spacing } from '../../theme';
import marketSearchService, { SearchResults } from '../../services/marketSearchService';

const EMPTY: SearchResults = { hsCodes: [], certifications: [], opportunities: [], markets: [], categories: [] };

export default function MarketSearchScreen() {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [query, setQuery] = useState(route.params?.query ?? '');
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [searched, setSearched] = useState(false);
  const timer = useRef<any>(null);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults(EMPTY);
      setSearched(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const res = await marketSearchService.search(q.trim());
      setResults(res.results || EMPTY);
      setSearched(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search on query change.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => runSearch(query), 350);
    return () => timer.current && clearTimeout(timer.current);
  }, [query, runSearch]);

  const total =
    results.hsCodes.length + results.certifications.length + results.opportunities.length + results.markets.length + results.categories.length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.glassBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Products, HS codes, markets, certifications…"
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons name="cloud-offline-outline" size={40} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Search failed. Check your connection and try again.</Text>
          </View>
        ) : query.trim().length < 2 ? (
          <View style={styles.center}>
            <Ionicons name="search-outline" size={40} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Search Market Access</Text>
            <Text style={styles.emptySub}>Find products, HS codes, target markets, certifications and opportunities.</Text>
          </View>
        ) : searched && total === 0 ? (
          <View style={styles.center}>
            <Ionicons name="file-tray-outline" size={40} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No matches for “{query}”.</Text>
          </View>
        ) : (
          <>
            <Group title="HS Codes" icon="barcode-outline" items={results.hsCodes} render={(h) => (
              <TouchableOpacity key={h.code} style={styles.row} onPress={() => navigation.navigate('ProductAnalyzer')}>
                <Text style={styles.rowMain}>{h.displayCode}</Text>
                <Text style={styles.rowSub} numberOfLines={1}>{h.description}</Text>
              </TouchableOpacity>
            )} styles={styles} colors={colors} />

            <Group title="Opportunities" icon="flame-outline" items={results.opportunities} render={(o) => (
              <TouchableOpacity key={o._id} style={styles.row} onPress={() => navigation.navigate('BusinessOpportunity', { title: o.title, oppData: o })}>
                <Text style={styles.rowMain}>{o.title}</Text>
                <Text style={styles.rowSub}>{[o.industry, o.country].filter(Boolean).join(' • ')}</Text>
              </TouchableOpacity>
            )} styles={styles} colors={colors} />

            <Group title="Target Markets" icon="earth-outline" items={results.markets} render={(m) => (
              <TouchableOpacity key={m.code} style={styles.row} onPress={() => navigation.navigate('CountryDetails', { countryName: m.name, flag: m.flag })}>
                <Text style={styles.rowMain}>{m.flag ? `${m.flag} ` : ''}{m.name}</Text>
                <Text style={styles.rowSub}>{m.code}</Text>
              </TouchableOpacity>
            )} styles={styles} colors={colors} />

            <Group title="Certifications" icon="ribbon-outline" items={results.certifications} render={(c) => (
              <View key={c.code} style={styles.row}>
                <Text style={styles.rowMain}>{c.name}</Text>
                <Text style={styles.rowSub}>{[c.authority, c.country].filter(Boolean).join(' • ')}</Text>
              </View>
            )} styles={styles} colors={colors} />

            <Group title="Product Categories" icon="cube-outline" items={results.categories} render={(c) => (
              <TouchableOpacity key={c.id} style={styles.row} onPress={() => navigation.navigate('ProductAnalyzer')}>
                <Text style={styles.rowMain}>{c.name}</Text>
              </TouchableOpacity>
            )} styles={styles} colors={colors} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Group<T>({ title, icon, items, render, styles, colors }: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  items: T[];
  render: (item: T) => React.ReactNode;
  styles: ReturnType<typeof makeStyles>;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  if (!items || items.length === 0) return null;
  return (
    <View style={styles.group}>
      <View style={styles.groupHead}>
        <Ionicons name={icon} size={16} color={colors.primary} />
        <Text style={styles.groupTitle}>{title}</Text>
      </View>
      {items.map(render)}
    </View>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#0A0A0A' : '#F7F9FC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.sm, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border },
  glassBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', alignItems: 'center', justifyContent: 'center' },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF', borderWidth: 1, borderColor: colors.border, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, height: 44 },
  searchInput: { flex: 1, ...Typography.body2, color: colors.textPrimary },
  content: { padding: Spacing.xl, flexGrow: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: Spacing['4xl'] },
  emptyText: { ...Typography.body1, color: colors.textSecondary, marginTop: Spacing.md, textAlign: 'center' },
  emptySub: { ...Typography.caption, color: colors.textSecondary, marginTop: 4, textAlign: 'center', paddingHorizontal: Spacing.xl },
  group: { marginBottom: Spacing.lg },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  groupTitle: { ...Typography.caption, color: colors.primary, fontWeight: '700', textTransform: 'uppercase' },
  row: { backgroundColor: colors.bgCard, padding: Spacing.md, borderRadius: BorderRadius.lg, marginBottom: Spacing.sm, ...Shadows.sm },
  rowMain: { ...Typography.body2, color: colors.textPrimary, fontWeight: '600' },
  rowSub: { ...Typography.caption, color: colors.textSecondary, marginTop: 2 },
});
