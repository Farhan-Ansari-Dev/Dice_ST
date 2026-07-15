import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTheme, BorderRadius } from '../../theme';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import { api } from '../../services/api';
import { formatDate } from '../../utils/formatters';

const InsightDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const id = route.params?.id as string | undefined;

  // Fully API-driven — no hardcoded article. Fetches the same document the
  // admin dashboard wrote, from the same collection via the same REST API.
  const { data: insight, isLoading, isError } = useQuery({
    queryKey: ['insight', id],
    enabled: !!id,
    queryFn: async () => {
      const res = (await api.get(`/insights/${id}`)) as any;
      return res?.data ?? null;
    },
  });

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const openSource = async () => {
    if (!insight?.link) return;
    const supported = await Linking.canOpenURL(insight.link).catch(() => false);
    if (supported) {
      Linking.openURL(insight.link);
    } else {
      Alert.alert('Cannot open link', insight.link);
    }
  };

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
        <Text style={styles.headerTitle}>Insight Detail</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError || !insight ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Insight unavailable"
          subtitle="This article could not be loaded. Please try again."
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.metaRow}>
            <View style={styles.categoryBadge}>
              <View style={[styles.categoryDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.categoryText, { color: colors.primary }]}>
                {String(insight.category || 'news').replace(/_/g, ' ').toUpperCase()}
              </Text>
            </View>
            <Text style={styles.date}>{formatDate(insight.publishedAt || insight.createdAt)}</Text>
          </View>

          <Text style={styles.title}>{insight.title}</Text>

          <View style={styles.sourceRow}>
            <Ionicons name="newspaper-outline" size={14} color={colors.textTertiary} />
            <Text style={styles.source}>{insight.source}</Text>
            {insight.country ? <Text style={styles.source}>· {insight.country}</Text> : null}
          </View>

          {/* Short summary lead-in */}
          {insight.summary ? <Text style={styles.summary}>{insight.summary}</Text> : null}

          {/* Full article body */}
          {insight.content ? <Text style={styles.body}>{insight.content}</Text> : null}

          {/* Tags */}
          {Array.isArray(insight.tags) && insight.tags.length > 0 && (
            <View style={styles.tagsWrap}>
              {insight.tags.map((tag: string, i: number) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Visit Official Source — opens the stored Source URL */}
          {insight.link ? (
            <View style={{ marginTop: 24 }}>
              <Button
                title="Visit Official Source"
                onPress={openSource}
                fullWidth
                icon={<Ionicons name="open-outline" size={18} color="#FFFFFF" />}
              />
            </View>
          ) : null}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    content: { paddingHorizontal: 20, paddingTop: 8 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    categoryBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: BorderRadius.full,
      backgroundColor: colors.primary + '20',
    },
    categoryDot: { width: 6, height: 6, borderRadius: 3 },
    categoryText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
    date: { fontSize: 12, color: colors.textTertiary },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.textPrimary,
      lineHeight: 30,
      marginBottom: 12,
    },
    sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
    source: { fontSize: 12, color: colors.textTertiary, fontStyle: 'italic' },
    summary: {
      fontSize: 16,
      color: colors.textPrimary,
      fontWeight: '600',
      lineHeight: 24,
      marginBottom: 16,
    },
    body: {
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 26,
    },
    tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 },
    tag: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: BorderRadius.full,
    },
    tagText: { fontSize: 11, color: colors.textTertiary, fontWeight: '500' },
  });

export default InsightDetailScreen;
