import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme, Typography, Shadows, BorderRadius, Spacing } from '../../theme';

export default function TargetMarketsMapScreen() {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const navigation = useNavigation();

  const markets = [
    { name: 'United States', flag: '🇺🇸', demand: 'Very High', products: 124 },
    { name: 'European Union', flag: '🇪🇺', demand: 'High', products: 89 },
    { name: 'UAE', flag: '🇦🇪', demand: 'Medium', products: 45 },
    { name: 'Singapore', flag: '🇸🇬', demand: 'High', products: 67 },
    { name: 'Japan', flag: '🇯🇵', demand: 'Medium', products: 34 },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.glassBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Global Markets Map</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.mapPlaceholder}>
          <Ionicons name="earth" size={80} color={colors.primary} style={{ opacity: 0.8 }} />
          <Text style={styles.mapText}>Interactive Map View</Text>
          <Text style={styles.mapSubText}>Select a region to explore compliance & demand.</Text>
        </View>

        <Text style={styles.sectionTitle}>Top Markets</Text>
        {markets.map((market, index) => (
          <TouchableOpacity key={index} style={styles.marketCard} onPress={() => (navigation as any).navigate('CountryDetails', { countryName: market.name, flag: market.flag })}>
            <Text style={styles.flag}>{market.flag}</Text>
            <View style={styles.marketInfo}>
              <Text style={styles.marketName}>{market.name}</Text>
              <Text style={styles.marketSub}>{market.products} Active Opportunities</Text>
            </View>
            <View style={styles.demandBadge}>
              <Text style={[styles.demandText, { color: market.demand === 'Very High' ? colors.success : colors.primary }]}>{market.demand}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#0A0A0A' : '#F7F9FC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border },
  glassBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...Typography.h3, color: colors.textPrimary },
  content: { padding: Spacing.xl },
  mapPlaceholder: { height: 200, backgroundColor: colors.primary + '10', borderRadius: BorderRadius['2xl'], alignItems: 'center', justifyContent: 'center', marginBottom: Spacing['2xl'], borderWidth: 1, borderColor: colors.primary + '20' },
  mapText: { ...Typography.h4, color: colors.primary, marginTop: Spacing.md },
  mapSubText: { ...Typography.body2, color: colors.textSecondary, marginTop: 4 },
  sectionTitle: { ...Typography.h4, color: colors.textPrimary, marginBottom: Spacing.lg },
  marketCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: Spacing.lg, borderRadius: BorderRadius.xl, marginBottom: Spacing.md, ...Shadows.sm },
  flag: { fontSize: 32, marginRight: Spacing.md },
  marketInfo: { flex: 1 },
  marketName: { ...Typography.h5, color: colors.textPrimary, marginBottom: 2 },
  marketSub: { ...Typography.caption, color: colors.textSecondary },
  demandBadge: { backgroundColor: colors.background, paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full },
  demandText: { ...Typography.caption, fontWeight: 'bold' },
});
