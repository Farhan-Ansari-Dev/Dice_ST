import React, { useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import { centeredContent } from '../../utils/layout';
import AIWidget from '../../components/common/AIWidget';
import Badge from '../../components/common/Badge';
import SearchBar from '../../components/common/SearchBar';
import EmptyState from '../../components/common/EmptyState';
import { formatRelativeTime } from '../../utils/formatters';
import { useDebounce } from '../../hooks/useDebounce';
import { useBookmarkStore } from '../../store/bookmarkStore';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';

const InsightsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const { toggle: toggleBookmark, isBookmarked } = useBookmarkStore();
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Fetch insights from API
  const { data: insightsData, isLoading, refetch } = useQuery({
    queryKey: ['insights'],
    queryFn: async () => {
      try {
        const res = await api.get('/insights') as any;
        return res?.data || [];
      } catch (e) {
        console.warn('Failed to fetch insights:', e);
        return [];
      }
    }
  });

  const INSIGHTS = useMemo(() => {
    if (!insightsData) return [];
    return insightsData.map((insight: any) => ({
      id: insight._id,
      title: insight.title,
      summary: insight.summary,
      content: insight.content,
      category: insight.category || 'news',
      source: insight.source || 'Sanyog',
      publishedAt: insight.publishedAt || insight.createdAt || new Date().toISOString(),
      tags: insight.tags || [],
      featured: insight.featured || false,
    }));
  }, [insightsData]);

  const handleCategoryChange = (catId: string) => {
    setActiveCategory(catId);
  };

  const CATEGORIES = useMemo(() => [
    { id: 'all', label: 'All', icon: 'apps' as const, color: colors.textSecondary },
    { id: 'bis_update', label: 'BIS Updates', icon: 'newspaper-outline' as const, color: colors.primary },
    { id: 'customs', label: 'Customs', icon: 'document-text' as const, color: colors.secondary },
    { id: 'export_import', label: 'Export/Import', icon: 'swap-horizontal-outline' as const, color: colors.success },
    { id: 'certification', label: 'Certification', icon: 'ribbon-outline' as const, color: colors.warning },
    { id: 'government', label: 'Government', icon: 'business-outline' as const, color: colors.error },
  ], [colors]);

  const filteredInsights = INSIGHTS.filter((insight: typeof INSIGHTS[0]) => {
    const matchSearch =
      insight.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      insight.summary.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchCategory = activeCategory === 'all' || insight.category === activeCategory;
    return matchSearch && matchCategory;
  });

  // Prepend AI widget as first scrollable item so it scrolls with content
  type ListItem = { type: 'ai_widget'; id: string } | (typeof INSIGHTS[0] & { type: 'insight' });
  const listData: ListItem[] = [
    { type: 'ai_widget', id: '__ai_widget__' },
    ...filteredInsights.map((i: typeof INSIGHTS[0]) => ({ ...i, type: 'insight' as const })),
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={styles.container}>
      {/* BRAND HERO */}
      <LinearGradient
        colors={colors.gradientHero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.heroRow}>
          <TouchableOpacity style={styles.heroIconBtn} onPress={() => navigation.openDrawer()} hitSlop={8}>
            <Ionicons name="menu-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Insights</Text>
            <Text style={styles.heroSubtitle}>Regulatory intelligence, personalized</Text>
          </View>
          <TouchableOpacity style={styles.heroIconBtn} onPress={() => navigation.navigate('SearchInsights')} hitSlop={8}>
            <Ionicons name="search-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Search + filters sit OUTSIDE FlatList — naturally pinned, no sticky tricks */}
      <View style={styles.controls}>
        <View style={styles.searchWrapper}>
          <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Search insights..." />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesRow}
          style={{ height: 48, marginBottom: 4 }}
          contentInsetAdjustmentBehavior="never"
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryChip, activeCategory === cat.id && { borderColor: cat.color, backgroundColor: cat.color + '20' }]}
              onPress={() => handleCategoryChange(cat.id)}
            >
              <Ionicons name={cat.icon} size={14} color={activeCategory === cat.id ? cat.color : colors.textTertiary} />
              <Text style={[styles.categoryText, activeCategory === cat.id && { color: cat.color, fontWeight: '600' }]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        ref={flatListRef}
        key={activeCategory}
        data={listData}
        keyExtractor={(item) => item.id}
        style={styles.flatList}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            title="No results found"
            subtitle="Try a different search term or category filter"
          />
        }
        renderItem={({ item }) => {
          // AI Widget — scrolls naturally as first list item
          if (item.type === 'ai_widget') {
            return (
              <View style={{ marginBottom: 14 }}>
                <AIWidget
                  title="AI Summary: Latest compliance updates"
                  insight="Get AI-powered insights on regulatory changes, compliance alerts, and industry trends relevant to your business."
                  confidence={96}
                  onPress={() => navigation.navigate('Identifier')}
                />
              </View>
            );
          }

          // Insight card
          const catColor = CATEGORIES.find((c) => c.id === item.category)?.color ?? colors.primary;
          return (
            <TouchableOpacity
              style={[styles.insightCard, Shadows.sm]}
              onPress={() => navigation.navigate('InsightDetail', { id: item.id })}
              activeOpacity={0.85}
            >
              <View style={styles.insightCardInner}>
                {/* Category row */}
                <View style={styles.tagsRow}>
                  <View style={[styles.impactBadge, { backgroundColor: catColor + '20' }]}>
                    <View style={[styles.impactDot, { backgroundColor: catColor }]} />
                    <Text style={[styles.impactText, { color: catColor }]}>
                      {String(item.category).replace(/_/g, ' ').toUpperCase()}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => toggleBookmark(item.id)} style={{ marginLeft: 'auto' as any }}>
                    <Ionicons
                      name={isBookmarked(item.id) ? 'bookmark' : 'bookmark-outline'}
                      size={18}
                      color={isBookmarked(item.id) ? colors.primary : colors.textTertiary}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.insightTitle}>{item.title}</Text>
                <Text style={styles.insightSummary} numberOfLines={2}>{item.summary}</Text>

                {/* Tags */}
                {item.tags && item.tags.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsList}>
                    {item.tags.map((tag: string, i: number) => (
                      <View key={i} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </ScrollView>
                )}

                {/* Footer */}
                <View style={styles.insightFooter}>
                  <Ionicons name="newspaper-outline" size={12} color={colors.textTertiary} />
                  <Text style={styles.insightSource}>{item.source}</Text>
                  <Text style={styles.insightDate}>{formatRelativeTime(item.publishedAt)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    hero: {
      paddingHorizontal: 20,
      paddingBottom: 18,
      borderBottomLeftRadius: BorderRadius['2xl'],
      borderBottomRightRadius: BorderRadius['2xl'],
    },
    heroRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    heroIconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    heroTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.4 },
    heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
    controls: {
      paddingTop: 14,
    },
    searchWrapper: { paddingHorizontal: 20, marginBottom: 12 },
    categoriesRow: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: BorderRadius.full,
      backgroundColor: isDark ? colors.bgCard : '#FFFFFF',
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
    },
    categoryText: { fontSize: 12, color: colors.textTertiary, fontWeight: '500' },
    flatList: { flex: 1 },
    listContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 100, flexGrow: 1, ...centeredContent },
    insightCard: {
      marginBottom: 14,
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
    },
    insightCardInner: { padding: 16, backgroundColor: colors.bgCard },
    tagsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
    impactBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: BorderRadius.full,
    },
    impactDot: { width: 5, height: 5, borderRadius: 3 },
    impactText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
    readTime: { fontSize: 11, color: colors.textTertiary },
    insightTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.textPrimary,
      lineHeight: 21,
      marginBottom: 6,
    },
    insightSummary: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 19,
      marginBottom: 10,
    },
    tagsList: { marginBottom: 10 },
    tag: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: BorderRadius.full,
      marginRight: 6,
    },
    tagText: { fontSize: 10, color: colors.textTertiary, fontWeight: '500' },
    insightFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border,
    },
    insightSource: { flex: 1, fontSize: 11, color: colors.textTertiary },
    insightDate: { fontSize: 11, color: colors.textTertiary },
  });

export default InsightsScreen;
