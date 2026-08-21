import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, Typography, Shadows, BorderRadius, Spacing } from '../../theme';
import useSavedOpportunities from '../../hooks/useSavedOpportunities';

export default function SavedItemsScreen() {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const navigation = useNavigation<any>();
  const { items, loading, error, refresh } = useSavedOpportunities();

  // Re-sync whenever the screen regains focus (e.g. after un-saving on detail).
  useFocusEffect(
    React.useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const getGradient = (index: number): readonly [string, string] => {
    const gradients: readonly [string, string][] = [
      ['#FF416C', '#FF4B2B'],
      ['#4776E6', '#8E54E9'],
      ['#00B4DB', '#0083B0'],
      ['#F3904F', '#3B4371'],
      ['#1D976C', '#93F9B9'],
    ];
    return gradients[index % gradients.length];
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.glassBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.textSecondary} />
          <Text style={styles.emptyText}>Couldn’t load your saved items.</Text>
          <TouchableOpacity onPress={refresh} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => {
            const gradient = getGradient(index);
            const m = item.metadata || {};
            return (
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('BusinessOpportunity', {
                    title: m.title,
                    oppData: { _id: item.item_id, ...m },
                  })
                }
              >
                <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
                  <View style={styles.glassOverlay} />
                  <View style={styles.topRow}>
                    <View style={styles.badge}><Text style={styles.badgeText}>{m.industry || 'Opportunity'}</Text></View>
                    <Ionicons name="bookmark" size={20} color="#FFF" />
                  </View>
                  <Text style={styles.title} numberOfLines={1}>{m.title || 'Saved opportunity'}</Text>
                  {(m.country || m.demand) ? (
                    <Text style={styles.sub}>{[m.country, m.demand && `${m.demand} Demand`].filter(Boolean).join(' • ')}</Text>
                  ) : null}
                  <View style={styles.footer}>
                    {m.investment != null ? (
                      <View>
                        <Text style={styles.investLabel}>Est. Investment</Text>
                        <Text style={styles.invest}>₹{m.investment}</Text>
                      </View>
                    ) : <View />}
                    <Ionicons name="arrow-forward-circle" size={32} color="#FFF" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="bookmark-outline" size={44} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No saved items yet.</Text>
              <Text style={styles.emptySub}>Tap the bookmark on an opportunity to save it here.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#0A0A0A' : '#F7F9FC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border },
  glassBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...Typography.h3, color: colors.textPrimary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: Spacing['4xl'], paddingHorizontal: Spacing.xl },
  listContent: { padding: Spacing.xl, flexGrow: 1 },
  card: { padding: Spacing.xl, borderRadius: BorderRadius['2xl'], marginBottom: Spacing.lg, ...Shadows.lg, overflow: 'hidden' },
  glassOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.1)' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  badge: { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full },
  badgeText: { ...Typography.label, color: '#FFFFFF', fontWeight: 'bold' },
  title: { ...Typography.h2, color: '#FFFFFF', marginBottom: 4 },
  sub: { ...Typography.body1, color: 'rgba(255,255,255,0.8)', marginBottom: Spacing.xl },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  investLabel: { ...Typography.caption, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  invest: { ...Typography.h4, color: '#FFFFFF' },
  emptyText: { ...Typography.body1, color: colors.textSecondary, marginTop: Spacing.md, textAlign: 'center' },
  emptySub: { ...Typography.caption, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
  retryBtn: { marginTop: Spacing.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: colors.primary },
  retryText: { ...Typography.label, color: '#FFFFFF', fontWeight: '700' },
});
