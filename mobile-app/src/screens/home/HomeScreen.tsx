import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Typography, BorderRadius, Shadows } from '../../theme';
import Badge, { getStatusVariant } from '../../components/common/Badge';
import NotificationBell from '../../components/common/NotificationBell';
import Avatar from '../../components/common/Avatar';
import { Skeleton } from '../../components/common/SkeletonLoader';
import AISearchBar from '../../components/home/AISearchBar';
import { useCurrency } from '../../hooks/useCurrency';
import { useAuthStore } from '../../store/authStore';

import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';

// const { width } = Dimensions.get('window');

type ActionRequiredItem = {
  id: string;
  title: string;
  subtitle: string;
  urgency: 'critical' | 'warning';
};

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user, businessRole, userType } = useAuthStore();
  const { colors, isDark, toggleTheme } = useTheme();
  const currencySymbol = useCurrency();
  const [refreshing, setRefreshing] = useState(false);
  // Workspace is derived ONLY from the authenticated user's role (server-owned).
  // Home never asks the user to (re)classify themselves — that belongs to
  // onboarding/profile — it just renders the correct workspace for who they are.
  const roleName = (businessRole ?? userType ?? user?.businessRole ?? user?.role ?? '').toLowerCase();
  const isConsultantAccount = roleName === 'consultant';

  // Live Data Queries
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics_overview'],
    queryFn: async () => {
      const res = await api.get('/analytics/overview') as any;
      return res?.data || {};
    }
  });

  const { data: applicationsData, isLoading: appsLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: async () => {
      const res = await api.get('/applications') as any;
      return res?.data || [];
    }
  });

  const recentApplications = (applicationsData || []).slice(0, 3);
  const actionRequiredItems = useMemo<ActionRequiredItem[]>(() => {
    return (applicationsData || [])
      .filter((app: any) => ['draft', 'docs_required', 'on_hold'].includes(app.status) || app.is_overdue)
      .slice(0, 3)
      .map((app: any) => ({
        id: String(app._id ?? app.id),
        title: `${app.application_number || app.cert_type || 'Application'} needs attention`,
        subtitle: app.is_overdue
          ? 'Overdue application. Open it to continue.'
          : `Current status: ${String(app.status ?? 'unknown').replace(/_/g, ' ')}`,
        urgency: app.is_overdue || app.status === 'on_hold' ? 'critical' : 'warning',
      } satisfies ActionRequiredItem));
  }, [applicationsData]);

  const sunOpacity = useRef(new Animated.Value(isDark ? 0 : 1)).current;
  const moonOpacity = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(sunOpacity, { toValue: isDark ? 0 : 1, duration: 250, useNativeDriver: true }),
      Animated.timing(moonOpacity, { toValue: isDark ? 1 : 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [isDark]);

  const QUICK_ACTIONS = useMemo(() => [
    { id: '1', title: 'New\nApplication', icon: 'add-circle', color: colors.primary, route: 'Certifications', screen: 'NewCertification' },
    { id: '2', title: 'Market\nAccess', icon: 'globe', color: colors.success, route: 'MarketAccess' },
    { id: '3', title: 'Vault', icon: 'lock-closed', color: colors.info, route: 'Profile' },
    { id: '4', title: 'Ask\nExpert', icon: 'chatbubbles', color: colors.warning, route: 'Profile', screen: 'SupportCenter' },
    { id: '5', title: 'My\nWork', icon: 'briefcase', color: colors.primary, route: 'MyWork' },
  ], [colors, isDark]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 1200));
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 21) return 'Good Evening';
    return 'Good Night';
  };

  const handleQuickAction = async (action: any) => {
    if (action.title === 'Vault') {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (!hasHardware || !isEnrolled) {
          Alert.alert(
            'Biometrics Unavailable',
            'Biometrics are not set up on this device. Would you like to proceed with your device passcode?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Use Passcode', onPress: () => navigation.navigate('Profile', { screen: 'Vault' }) }
            ]
          );
          return;
        }
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate to open Vault',
          fallbackLabel: 'Use Passcode',
          cancelLabel: 'Cancel',
        });
        if (result.success) {
          navigation.navigate('Profile', { screen: 'Vault' });
        }
      } catch (e) {
        console.warn('Biometric error:', e);
      }
    } else {
      if (action.screen) {
        navigation.navigate(action.route, { screen: action.screen });
      } else {
        navigation.navigate(action.route);
      }
    }
  };

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF', paddingTop: insets.top }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: headerOpacity }]}>
        <LinearGradient
          colors={isDark ? ['#1e3a8a', '#000000'] : ['#bfdbfe', '#FFFFFF']}
          style={StyleSheet.absoluteFill}
          locations={[0, 0.5]}
        />
      </Animated.View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeft} onPress={() => navigation.openDrawer()} activeOpacity={0.7}>
          <Avatar name={user?.name ?? 'User'} uri={user?.avatar} size="md" online />
          <View style={styles.greetingArea}>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.name?.split(' ')[0] ?? 'there'}
            </Text>
            {!!user?.companyName && (
              <Text style={[styles.greeting, { marginTop: 1 }]} numberOfLines={1}>
                {user.companyName}
              </Text>
            )}
          </View>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          {/* Non-interactive role badge — reflects the account's actual role,
              not a signup toggle. */}
          <View style={[styles.modeBadge, { backgroundColor: isConsultantAccount ? `${colors.success}15` : `${colors.primary}15` }]}>
            <Text style={[styles.modeBadgeText, isConsultantAccount && { color: colors.success }]}>
              {isConsultantAccount ? 'Consultant' : 'Biz'}
            </Text>
          </View>
          <TouchableOpacity style={styles.themeBtn} onPress={toggleTheme} activeOpacity={0.7}>
            <Animated.View style={[StyleSheet.absoluteFill, styles.themeIconWrap, { opacity: sunOpacity }]}>
              <Ionicons name="sunny" size={18} color={colors.warning} />
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, styles.themeIconWrap, { opacity: moonOpacity }]}>
              <Ionicons name="moon" size={18} color={colors.primary} />
            </Animated.View>
          </TouchableOpacity>
          <NotificationBell onPress={() => navigation.navigate('Notifications')} />
        </View>
      </View>

      {isConsultantAccount && (
        <TouchableOpacity
          style={styles.consultantCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Profile', { screen: 'ConsultantVerification' })}
        >
          <View style={styles.consultantIcon}>
            <Ionicons name="briefcase" size={18} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.consultantTitle}>Consultant Workspace</Text>
            <Text style={styles.consultantHint}>Open your Verification Center and consultant tools</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      )}

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* AI SEARCH BAR */}
        <View style={styles.searchSection}>
          <AISearchBar
            onSearch={(q) => navigation.navigate('AISearch', { query: q })}
          />
        </View>

        {/* SECTION 1: COMPLIANCE HEALTH (HERO) */}
        <TouchableOpacity
          style={[styles.healthContainer, { backgroundColor: isDark ? colors.bgCardLight : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border }]}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('ComplianceScore')}
        >
          <View style={styles.healthHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.healthTitle}>Compliance Health</Text>
              <View style={styles.healthScoreRow}>
                {analyticsLoading ? (
                  <Skeleton width={80} height={40} borderRadius={8} />
                ) : (
                  <Text style={styles.healthScore}>{analytics?.compliance_score ?? 0}%</Text>
                )}
                {!analyticsLoading && (
                  (analytics?.compliance_score ?? 0) >= 70
                    ? <Badge label="Ready for Market" variant="success" size="sm" />
                    : <Badge label="Building Compliance" variant="warning" size="sm" />
                )}
              </View>
            </View>
            <View style={styles.healthChartWrap}>
              {analyticsLoading ? (
                <Skeleton width={60} height={60} borderRadius={30} />
              ) : (
                <View style={styles.heroScoreCircleSmall}>
                  <Text style={styles.heroScoreSmall}>{analytics?.compliance_score ?? 0}</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.healthStatsRow}>
            <View style={styles.healthStat}>
              {analyticsLoading ? (
                <Skeleton width={30} height={20} />
              ) : (
                <Text style={styles.healthStatValue}>{analytics?.active_certifications || 0}</Text>
              )}
              <Text style={styles.healthStatLabel}>Active Certs</Text>
            </View>
            <View style={styles.healthDivider} />
            <View style={styles.healthStat}>
              {analyticsLoading ? (
                <Skeleton width={30} height={20} />
              ) : (
                <Text style={styles.healthStatValue}>{analytics?.pending_applications || 0}</Text>
              )}
              <Text style={styles.healthStatLabel}>Pending Apps</Text>
            </View>
            <View style={styles.healthDivider} />
            <View style={styles.healthStat}>
              {analyticsLoading ? (
                <Skeleton width={30} height={20} />
              ) : (
                <Text style={[styles.healthStatValue, { color: colors.warning }]}>{analytics?.expiring_soon || 0}</Text>
              )}
              <Text style={styles.healthStatLabel}>Expiring Soon</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* QUICK ACTIONS */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickActionsScroll}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity key={action.id} onPress={() => handleQuickAction(action)} style={styles.quickActionItem}>
              <View style={[styles.quickActionIconWrap, { backgroundColor: `${action.color}15` }]}>
                <Ionicons name={action.icon as any} size={20} color={action.color} />
              </View>
              <Text style={styles.quickActionLabel}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* EXPLORE FEATURES */}
        <View style={[styles.sectionHeader, { marginTop: 16, marginBottom: 12 }]}>
          <Text style={styles.sectionTitle}>Explore Features</Text>
          <View style={styles.aiBadgeWrap}>
            <Ionicons name="sparkles" size={14} color={colors.primary} />
            <Text style={styles.aiBadgeText}>AI Powered</Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.exploreScroll} decelerationRate="fast" snapToInterval={Dimensions.get('window').width * 0.85 + 16}>
          {[
            { id: '1', badge: 'NEW', badgeColor: '#00C853', title: 'AI Product Quality\nIdentifier', desc: 'Scan any product or label to get instant quality, safety & composition insights', icon: 'scan', gradient: ['#311B92', '#00B0FF'], route: 'Identifier' },
            { id: '2', badge: 'POPULAR', badgeColor: '#FF8F00', title: 'Find Your\nCertification Body', desc: 'Compare 50+ CBs on pricing, TAT, scope & reviews — and apply directly', icon: 'git-compare-outline', gradient: ['#004D40', '#00E676'], route: 'Certifications' },
            { id: '3', badge: 'OFFER', badgeColor: '#FF5252', title: 'Saudi PCoC & SCoC\nCertifications', desc: 'Get your SABER Product and Shipment Certificates approved in just 1-2 days', icon: 'flash', gradient: ['#1A0033', '#8E24AA'], route: 'Certifications', screen: 'CertificationOverview', params: { serviceId: 'pcoc_scoc' } },
            { id: '4', badge: 'LIVE', badgeColor: '#00B0FF', title: 'Live Regulatory\nUpdates', desc: 'AI-curated feed of BIS, FSSAI, WPC, EPR policy changes — delivered daily', icon: 'newspaper', gradient: ['#3E2723', '#FF8F00'], route: 'Insights' },
          ].map((feature) => (
            <TouchableOpacity key={feature.id} activeOpacity={0.9} style={styles.richExploreCard} onPress={() => navigation.navigate(feature.route, (feature as any).screen ? { screen: (feature as any).screen, params: (feature as any).params } : undefined)}>
              <LinearGradient colors={feature.gradient as any} style={styles.richExploreGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={styles.richExploreTopRow}>
                  <View style={[styles.richExploreBadge, { backgroundColor: feature.badgeColor }]}>
                    <Text style={styles.richExploreBadgeText}>{feature.badge}</Text>
                  </View>
                  <View style={styles.richExploreIconWrap}>
                    <Ionicons name={feature.icon as any} size={20} color="#fff" />
                  </View>
                </View>
                <View style={styles.richExploreContent}>
                  <Text style={styles.richExploreTitle}>{feature.title}</Text>
                  <Text style={styles.richExploreDesc} numberOfLines={2}>{feature.desc}</Text>
                </View>
                <View style={styles.richExploreFooter}>
                  <Text style={styles.richExploreFooterText}>Explore</Text>
                  <View style={styles.richExploreArrowBtn}>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* SECTION 2: ACTION REQUIRED (HIGHEST PRIORITY) */}
        {actionRequiredItems.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Action Required</Text>
              <View style={styles.alertBadge}><Text style={styles.alertBadgeText}>{actionRequiredItems.length}</Text></View>
            </View>
            <View style={styles.actionStack}>
              {actionRequiredItems.map((item: ActionRequiredItem) => (
                <View key={item.id} style={[styles.actionCard, { borderColor: item.urgency === 'critical' ? colors.error : colors.warning, backgroundColor: isDark ? colors.bgCardLight : '#fff' }]}>
                  <View style={styles.actionCardLeft}>
                    <View style={[styles.actionIconWrap, { backgroundColor: item.urgency === 'critical' ? `${colors.error}15` : `${colors.warning}15` }]}>
                      <Ionicons name="warning" size={18} color={item.urgency === 'critical' ? colors.error : colors.warning} />
                    </View>
                    <View style={styles.actionCardTextWrap}>
                      <Text style={styles.actionCardTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.actionCardSub}>{item.subtitle}</Text>
                    </View>
                  </View>
                  <TouchableOpacity style={[styles.resolveBtn, { backgroundColor: item.urgency === 'critical' ? colors.error : colors.warning }]}>
                    <Text style={styles.resolveBtnText}>Open</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* SECTION 3: BUSINESS IMPACT */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { marginBottom: 16, paddingHorizontal: 20 }]}>Business Impact</Text>
          <View style={styles.impactGrid}>
            <View style={[styles.impactCard, { backgroundColor: isDark ? colors.bgCardLight : '#fff' }]}>
              <View style={styles.impactCardHeader}>
                <View style={[styles.impactIconWrap, { backgroundColor: '#10B98115' }]}>
                  <Ionicons name="cash" size={16} color="#10B981" />
                </View>
                <Text style={[styles.impactTrend, { color: colors.success }]}>+Live</Text>
              </View>
              <Text style={styles.impactValue}>{currencySymbol}{(analytics?.total_revenue || 0).toLocaleString()}</Text>
              <Text style={styles.impactLabel}>Revenue Processed</Text>
            </View>

            <View style={[styles.impactCard, { backgroundColor: isDark ? colors.bgCardLight : '#fff' }]}>
              <View style={styles.impactCardHeader}>
                <View style={[styles.impactIconWrap, { backgroundColor: '#3B82F615' }]}>
                  <Ionicons name="documents" size={16} color="#3B82F6" />
                </View>
                <Text style={[styles.impactTrend, { color: colors.success }]}>Total</Text>
              </View>
              <Text style={styles.impactValue}>{analytics?.total_certifications || 0}</Text>
              <Text style={styles.impactLabel}>Certs Issued</Text>
            </View>
          </View>
        </View>

        {/* SECTION 5: RECENT APPLICATIONS */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Applications</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Applications')}><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
          </View>
          <View style={styles.compactAppList}>
            {recentApplications.map((app: any) => (
              <TouchableOpacity key={app._id} style={[styles.compactAppCard, { backgroundColor: isDark ? colors.bgCardLight : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border }]} onPress={() => navigation.navigate('Applications')}>
                <View style={styles.compactAppLeft}>
                  <Text style={styles.compactAppName}>{app.product_id?.name || app.cert_type}</Text>
                  <Text style={styles.compactAppDate}>ID: {app.application_number}</Text>
                </View>
                <View style={styles.compactAppRight}>
                  <Badge label={app.status.replace(/_/g, ' ')} variant={getStatusVariant(app.status)} size="sm" />
                </View>
              </TouchableOpacity>
            ))}
            {recentApplications.length === 0 && (
              <Text style={{ textAlign: 'center', color: colors.textTertiary, padding: 20 }}>No applications found.</Text>
            )}
          </View>
        </View>

        <View style={{ height: 80 }} />
      </Animated.ScrollView>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    greetingArea: { flex: 1 },
    greeting: { fontSize: 12, color: colors.textTertiary, fontWeight: '400' },
    userName: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    modePill: { flexDirection: 'row', backgroundColor: isDark ? colors.bgCard : colors.border, borderRadius: BorderRadius.full, padding: 2 },
    modePillBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full },
    modePillBtnActive: { backgroundColor: colors.primary },
    modePillText: { fontSize: 10, fontWeight: '600', color: colors.textTertiary },
    modePillTextActive: { color: '#FFFFFF' },
    modeBadge: { borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 6 },
    modeBadgeText: { fontSize: 10, fontWeight: '700', color: colors.primary },
    themeBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: isDark ? colors.bgCardLight : colors.border, alignItems: 'center', justifyContent: 'center' },
    themeIconWrap: { alignItems: 'center', justifyContent: 'center' },
    clientRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingBottom: 8, flexWrap: 'wrap' },
    clientLabel: { fontSize: 12, color: colors.textTertiary },
    clientHint: { fontSize: 12, color: colors.textSecondary },
    consultantCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, marginBottom: 8, padding: 14, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: `${colors.success}30`, backgroundColor: isDark ? 'rgba(52,211,153,0.08)' : 'rgba(16,185,129,0.06)' },
    consultantIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.success}18` },
    consultantTitle: { fontSize: 15, fontWeight: '800', color: colors.textPrimary },
    consultantHint: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
    scrollContent: { paddingTop: Platform.OS === 'ios' ? 4 : 8 },
    searchSection: { paddingHorizontal: 20, marginBottom: Platform.OS === 'ios' ? 12 : 16 },

    // Shared
    sectionContainer: { marginTop: 24 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Platform.OS === 'ios' ? 12 : 16, paddingHorizontal: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
    seeAll: { fontSize: 13, color: colors.primary, fontWeight: '600' },

    // Hero / Health
    healthContainer: {
      marginHorizontal: 20, marginBottom: 8, borderWidth: 1,
      padding: Platform.OS === 'ios' ? 16 : 20,
      borderRadius: Platform.OS === 'ios' ? 20 : 24,
      ...(Platform.OS === 'ios'
        ? { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 }
        : Shadows.md)
    },
    healthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Platform.OS === 'ios' ? 16 : 20 },
    healthTitle: { fontSize: Platform.OS === 'ios' ? 11 : 13, fontWeight: Platform.OS === 'ios' ? '700' : '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    healthScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    healthScore: { fontSize: Platform.OS === 'ios' ? 32 : 42, fontWeight: Platform.OS === 'ios' ? '700' : '800', color: colors.textPrimary, letterSpacing: -1 },
    healthChartWrap: { width: Platform.OS === 'ios' ? 64 : 70, height: Platform.OS === 'ios' ? 64 : 70, alignItems: 'center', justifyContent: 'center' },
    heroScoreCircleSmall: { width: Platform.OS === 'ios' ? 56 : 64, height: Platform.OS === 'ios' ? 56 : 64, borderRadius: Platform.OS === 'ios' ? 28 : 32, backgroundColor: `${colors.success}15`, alignItems: 'center', justifyContent: 'center' },
    heroScoreSmall: { fontSize: Platform.OS === 'ios' ? 18 : 24, fontWeight: Platform.OS === 'ios' ? '700' : '800', color: colors.success },
    healthStatsRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 16, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    healthStat: { flex: 1, alignItems: 'center' },
    healthDivider: { width: 1, height: 30, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    healthStatValue: { fontSize: Platform.OS === 'ios' ? 16 : 20, fontWeight: Platform.OS === 'ios' ? '700' : '700', color: colors.textPrimary },
    healthStatLabel: { fontSize: 11, color: colors.textTertiary, marginTop: 4, textAlign: 'center' },

    // Quick Actions
    quickActionsScroll: { paddingHorizontal: 20, gap: 4, paddingTop: Platform.OS === 'ios' ? 12 : 16, paddingBottom: Platform.OS === 'ios' ? 4 : 8 },
    quickActionItem: { width: Platform.OS === 'ios' ? (Dimensions.get('window').width - 56) / 5 : 75, alignItems: 'center' },
    quickActionIconWrap: { width: Platform.OS === 'ios' ? 40 : 44, height: Platform.OS === 'ios' ? 40 : 44, borderRadius: Platform.OS === 'ios' ? 20 : 22, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    quickActionLabel: { fontSize: 11, fontWeight: '600', color: colors.textPrimary, textAlign: 'center' },

    // Action Required
    actionStack: { paddingHorizontal: 20, gap: 10 },
    actionCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 16, borderWidth: 1, borderLeftWidth: 4, ...Shadows.sm },
    actionCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    actionIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    actionCardTextWrap: { flex: 1 },
    actionCardTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
    actionCardSub: { fontSize: 11, color: colors.textTertiary },
    resolveBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    resolveBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    alertBadge: { backgroundColor: `${colors.error}20`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
    alertBadgeText: { color: colors.error, fontSize: 12, fontWeight: '700' },

    // Business Impact
    impactGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 12 },
    impactCard: { width: (Dimensions.get('window').width - 52) / 2, padding: 16, borderRadius: 16, ...Shadows.sm, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border },
    impactCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    impactIconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    impactTrend: { fontSize: 12, fontWeight: '700' },
    impactValue: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 2 },
    impactLabel: { fontSize: 11, color: colors.textTertiary, fontWeight: '500' },

    // Recent Apps (Compact)
    compactAppList: { paddingHorizontal: 20, gap: 10 },
    compactAppCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, ...Shadows.sm },
    compactAppLeft: { flex: 1 },
    compactAppName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
    compactAppDate: { fontSize: 11, color: colors.textTertiary },
    compactAppRight: { alignItems: 'flex-end', gap: 8 },
    miniProgressBg: { width: 60, height: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0', borderRadius: 2, overflow: 'hidden' },
    miniProgressFill: { height: '100%', borderRadius: 2 },

    // Explore Features Rich
    aiBadgeWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? 'rgba(94, 53, 177, 0.2)' : '#E8EAF6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
    aiBadgeText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
    exploreScroll: { paddingHorizontal: 20, gap: 16, paddingBottom: 16 },
    richExploreCard: { width: Dimensions.get('window').width * 0.85, height: Platform.OS === 'ios' ? 225 : 260, borderRadius: 28, overflow: 'hidden' },
    richExploreGradient: { flex: 1, padding: Platform.OS === 'ios' ? 20 : 24, justifyContent: 'space-between' },
    richExploreTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    richExploreBadge: { paddingHorizontal: Platform.OS === 'ios' ? 10 : 12, paddingVertical: Platform.OS === 'ios' ? 4 : 6, borderRadius: Platform.OS === 'ios' ? 10 : 12 },
    richExploreBadgeText: { color: '#fff', fontSize: Platform.OS === 'ios' ? 9 : 10, fontWeight: Platform.OS === 'ios' ? '700' : '800', letterSpacing: 0.5 },
    richExploreIconWrap: { width: Platform.OS === 'ios' ? 36 : 40, height: Platform.OS === 'ios' ? 36 : 40, borderRadius: Platform.OS === 'ios' ? 14 : 16, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
    richExploreContent: { marginTop: Platform.OS === 'ios' ? 6 : 8 },
    richExploreTitle: { fontSize: Platform.OS === 'ios' ? 18 : 22, fontWeight: Platform.OS === 'ios' ? '600' : '800', color: '#fff', lineHeight: Platform.OS === 'ios' ? 24 : 28 },
    richExploreDesc: { fontSize: Platform.OS === 'ios' ? 12 : 13, color: 'rgba(255,255,255,0.9)', marginTop: Platform.OS === 'ios' ? 6 : 8, lineHeight: Platform.OS === 'ios' ? 18 : 18, paddingRight: 10 },
    richExploreFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 'auto', gap: 10 },
    richExploreFooterText: { color: '#fff', fontSize: Platform.OS === 'ios' ? 14 : 15, fontWeight: Platform.OS === 'ios' ? '700' : '800' },
    richExploreArrowBtn: { width: Platform.OS === 'ios' ? 26 : 28, height: Platform.OS === 'ios' ? 26 : 28, borderRadius: Platform.OS === 'ios' ? 13 : 14, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  });

export default HomeScreen;
