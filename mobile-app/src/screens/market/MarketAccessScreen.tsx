import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Dimensions, Platform, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, Typography, Shadows, BorderRadius, Spacing } from '../../theme';
import Badge from '../../components/common/Badge';
import api from '../../services/api';

const { width } = Dimensions.get('window');

export default function MarketAccessScreen() {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState('');
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetchOpportunities();
  }, []);

  const fetchOpportunities = async () => {
    try {
      const res = await api.get<any>('/bi/opportunities');
      setOpportunities(res.data?.slice(0, 4) || []);
    } catch (error) {
      console.warn('Failed to fetch opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGradient = (index: number) => {
    const gradients: readonly [string, string][] = [
      ['#FF416C', '#FF4B2B'],
      ['#4776E6', '#8E54E9'],
      ['#00B4DB', '#0083B0'],
      ['#F3904F', '#3B4371']
    ];
    return gradients[index % gradients.length];
  };

  const quickCategories = [
    { id: '1', label: '🔥 Trending', type: 'trending' },
    { id: '2', label: '🌍 Countries', type: 'countries' },
    { id: '3', label: '🏭 Manufacturing', type: 'manufacturing' },
    { id: '4', label: '📦 Products', type: 'products' },
    { id: '5', label: '💰 Investment', type: 'investment' },
  ];

  const countries = [
    { id: '1', name: 'United States', flag: '🇺🇸', demand: 'High', certs: 'FCC, FDA' },
    { id: '2', name: 'European Union', flag: '🇪🇺', demand: 'High', certs: 'CE, RoHS' },
    { id: '3', name: 'UAE', flag: '🇦🇪', demand: 'Medium', certs: 'ECAS' },
  ];
  
  const tools = [
    { id: '1', title: 'Product Finder', sub: 'Search by HS Code', icon: 'scan', color: colors.primary, route: 'ProductAnalyzer' },
    { id: '2', title: 'Investment ROI', sub: 'Calculate Profit', icon: 'calculator', color: colors.success, route: 'InvestmentROI' },
    { id: '3', title: 'Risk Analyzer', sub: 'Check Trade Risks', icon: 'shield-checkmark', color: colors.warning, route: 'RiskAnalyzer' },
    { id: '4', title: 'Trade Traffic', sub: 'Import/export activity', icon: 'trending-up', color: colors.error, route: 'TradeTariffs' },
  ];

  return (
    <View style={styles.container}>
      {/* Background Abstract Glows */}
      <View style={styles.bgGlow1} />
      <View style={styles.bgGlow2} />
      <View style={styles.bgGlow3} />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <View style={styles.glassBtn}>
                <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
              </View>
            </TouchableOpacity>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.glassBtn} onPress={() => navigation.navigate('MyRequests')}>
                <Ionicons name="receipt-outline" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.glassBtn, { marginLeft: 12 }]} onPress={() => navigation.navigate('SavedItems')}>
                <Ionicons name="bookmark-outline" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Title Area */}
          <View style={styles.titleArea}>
            <Text style={styles.titleGradient}>Market Access</Text>
            <Text style={styles.subtitle}>Unlock global trade insights, regulations, and high-growth opportunities.</Text>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={colors.primary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search markets, products, HS code..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <View style={styles.searchBadge}>
              <Ionicons name="mic-outline" size={16} color="#FFF" />
            </View>
          </View>

          {/* Quick Categories */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer} contentContainerStyle={{ paddingHorizontal: Spacing.xl }}>
            {quickCategories.map((cat, index) => (
              <TouchableOpacity key={cat.id} style={[styles.categoryPill, index === 0 && styles.categoryPillActive]}>
                <Text style={[styles.categoryText, index === 0 && styles.categoryTextActive]}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Trending Opportunities (Premium Gradient Cards) */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
               <Text style={styles.sectionTitle}>🔥 Hot Opportunities</Text>
               <TouchableOpacity onPress={() => navigation.navigate('OpportunitiesList')}><Text style={styles.seeAll}>Explore All</Text></TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll} contentContainerStyle={{ paddingHorizontal: Spacing.xl }}>
              {loading ? <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 20 }} /> : null}
              {opportunities.map((opp, index) => {
                const gradient = getGradient(index);
                const tag = opp.requiredCertifications?.[0] || opp.industry || 'Trend';
                const trendIcon = opp.demand === 'Low' ? 'trending-down' : 'trending-up';
                return (
                <TouchableOpacity key={opp._id} onPress={() => navigation.navigate('BusinessOpportunity', { title: opp.title, oppData: opp })}>
                  <LinearGradient
                    colors={gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.oppCard}
                  >
                    <View style={styles.glassOverlay} />
                    <View style={styles.oppTopRow}>
                       <View style={styles.certBadge}><Text style={styles.certText}>{tag}</Text></View>
                       <View style={styles.trendIcon}><Ionicons name={trendIcon} size={16} color={gradient[0]} /></View>
                    </View>
                    <Text style={styles.oppTitle} numberOfLines={1}>{opp.title}</Text>
                    <Text style={styles.oppSub}>{opp.country} • {opp.demand} Demand</Text>
                    <View style={styles.oppFooter}>
                      <View>
                        <Text style={styles.oppInvestLabel}>Est. Investment</Text>
                        <Text style={styles.oppInvest}>₹{opp.investment}</Text>
                      </View>
                      <Ionicons name="arrow-forward-circle" size={32} color="#FFF" />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              )})}
            </ScrollView>
          </View>

          {/* Essential Intelligence Tools */}
          <View style={styles.sectionPadded}>
            <Text style={styles.sectionTitle}>Intelligence Tools</Text>
            <View style={styles.toolsGrid}>
              {tools.map((tool) => (
                <TouchableOpacity key={tool.id} style={styles.toolCard} onPress={() => navigation.navigate(tool.route)}>
                  <View style={[styles.toolIconBg, { backgroundColor: tool.color + '15' }]}>
                     <Ionicons name={tool.icon as any} size={24} color={tool.color} />
                  </View>
                  <Text style={styles.toolTitle}>{tool.title}</Text>
                  <Text style={styles.toolSub}>{tool.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Premium Country Explorer */}
          <View style={styles.sectionPadded}>
            <View style={styles.sectionHeader}>
               <Text style={styles.sectionTitle}>🌍 Target Markets</Text>
               <TouchableOpacity onPress={() => navigation.navigate('TargetMarketsMap')}><Text style={styles.seeAll}>See Map</Text></TouchableOpacity>
            </View>
            {countries.map(item => (
              <TouchableOpacity key={item.id} style={styles.countryCard} onPress={() => navigation.navigate('CountryDetails', { countryName: item.name, flag: item.flag })}>
                <View style={styles.flagContainer}>
                  <Text style={styles.flag}>{item.flag}</Text>
                </View>
                <View style={styles.countryInfo}>
                  <Text style={styles.countryName}>{item.name}</Text>
                  <Text style={styles.countrySub}>Demand: <Text style={{ color: colors.success, fontWeight: '600' }}>{item.demand}</Text></Text>
                </View>
                <View style={styles.countryAction}>
                  <Text style={styles.countryCerts}>{item.certs}</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} style={{ marginLeft: 8 }} />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: Spacing['4xl'] }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#0A0A0A' : '#F7F9FC' },
  
  /* Background Abstract Glows */
  bgGlow1: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: colors.primary, opacity: isDark ? 0.15 : 0.08, top: -50, left: -100, transform: [{ scale: 1.5 }] },
  bgGlow2: { position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: colors.accent || '#00D4FF', opacity: isDark ? 0.15 : 0.08, top: 100, right: -80, transform: [{ scale: 1.2 }] },
  bgGlow3: { position: 'absolute', width: 350, height: 350, borderRadius: 175, backgroundColor: colors.success, opacity: isDark ? 0.1 : 0.05, bottom: -50, left: '20%' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, marginBottom: Spacing.xl },
  backBtn: {},
  headerRight: { flexDirection: 'row' },
  glassBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
  
  titleArea: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  titleGradient: { ...Typography.h1, color: colors.textPrimary, marginBottom: Spacing.xs },
  subtitle: { ...Typography.body1, color: colors.textSecondary, lineHeight: 24, paddingRight: 40 },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF', marginHorizontal: Spacing.xl, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.full, height: 56, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border, ...Shadows.sm, marginBottom: Spacing.xl },
  searchInput: { flex: 1, marginLeft: Spacing.sm, ...Typography.body1, color: colors.textPrimary },
  searchBadge: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.primary },
  
  categoriesContainer: { marginBottom: Spacing['2xl'], maxHeight: 44 },
  categoryPill: { paddingHorizontal: Spacing.lg, paddingVertical: 12, borderRadius: BorderRadius.full, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF', marginRight: Spacing.sm, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border },
  categoryPillActive: { backgroundColor: colors.primary, borderColor: colors.primary, ...Shadows.primary },
  categoryText: { ...Typography.label, color: colors.textSecondary },
  categoryTextActive: { color: '#FFFFFF', fontWeight: 'bold' },
  
  section: { marginBottom: Spacing['2xl'] },
  sectionPadded: { paddingHorizontal: Spacing.xl, marginBottom: Spacing['2xl'] },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: Spacing.lg, paddingHorizontal: Spacing.xl },
  sectionTitle: { ...Typography.h3, color: colors.textPrimary },
  seeAll: { ...Typography.label, color: colors.primary, fontWeight: '700', marginBottom: 4 },
  
  horizontalScroll: { paddingBottom: Spacing.md, overflow: 'visible' },
  
  oppCard: { padding: Spacing.xl, borderRadius: BorderRadius['2xl'], width: width * 0.75, marginRight: Spacing.lg, ...Shadows.lg, overflow: 'hidden' },
  glassOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.1)' },
  oppTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing['2xl'] },
  certBadge: { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full },
  certText: { ...Typography.label, color: '#FFFFFF', fontWeight: 'bold' },
  trendIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  oppTitle: { ...Typography.h2, color: '#FFFFFF', marginBottom: 4 },
  oppSub: { ...Typography.body1, color: 'rgba(255,255,255,0.8)', marginBottom: Spacing.xl },
  oppFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  oppInvestLabel: { ...Typography.caption, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  oppInvest: { ...Typography.h4, color: '#FFFFFF' },
  
  toolsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  toolCard: { width: '48%', backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF', padding: Spacing.lg, borderRadius: BorderRadius.xl, marginBottom: Spacing.md, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border, ...Shadows.sm },
  toolIconBg: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  toolTitle: { ...Typography.body1, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  toolSub: { ...Typography.caption, color: colors.textSecondary },
  
  countryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF', padding: Spacing.lg, borderRadius: BorderRadius.xl, marginBottom: Spacing.md, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border, ...Shadows.sm },
  flagContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.bgCardLight, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  flag: { fontSize: 32 },
  countryInfo: { flex: 1 },
  countryName: { ...Typography.h5, color: colors.textPrimary, marginBottom: 4 },
  countrySub: { ...Typography.caption, color: colors.textSecondary },
  countryAction: { flexDirection: 'row', alignItems: 'center' },
  countryCerts: { ...Typography.caption, color: colors.primary, fontWeight: '700' },
});
