import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';

import { useTheme, Shadows, BorderRadius } from '../../theme';
import Badge from '../../components/common/Badge';
import applicationsService, { Application } from '../../services/applicationsService';

/**
 * Verified-consultant workspace — the applications an admin has assigned to this
 * consultant. Backed by GET /applications?assignee_to_me=true, which the backend
 * scopes strictly to `assignees: me`, so no other user's data is ever returned.
 * This screen is only reachable from the Consultant Zone when the account is
 * `consultantVerificationStatus === 'verified'`.
 */
const AssignedApplicationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['assigned-applications'],
    queryFn: async () => {
      const res = await applicationsService.getAssignedToMe({ limit: 100 });
      return (res as any)?.data ?? [];
    },
  });

  const apps: Application[] = Array.isArray(data) ? data : [];

  const openApp = (app: Application) => {
    // The shared application detail screen lives in the Applications drawer stack.
    navigation.navigate('Applications', { screen: 'ApplicationDetail', params: { id: app._id } });
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
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Assigned Applications</Text>
          <Text style={styles.headerSub}>Applications assigned to you</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />}
      >
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : isError ? (
          <View style={styles.center}>
            <Ionicons name="cloud-offline-outline" size={40} color={colors.textTertiary} />
            <Text style={styles.emptyText}>Couldn't load your applications.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : apps.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="briefcase-outline" size={40} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No applications assigned yet</Text>
            <Text style={styles.emptyText}>When our team assigns you to a certification application, it will appear here.</Text>
          </View>
        ) : (
          apps.map((app) => (
            <TouchableOpacity key={app._id} style={[styles.card, Shadows.sm]} activeOpacity={0.85} onPress={() => openApp(app)}>
              <LinearGradient
                colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
                style={styles.cardInner}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.appNumber}>{app.application_number || app.cert_type || 'Application'}</Text>
                  <Badge label={String(app.status ?? 'unknown').replace(/_/g, ' ')} variant="info" size="sm" />
                </View>
                {!!app.product_id?.name && (
                  <View style={styles.metaRow}>
                    <Ionicons name="cube-outline" size={14} color={colors.textTertiary} />
                    <Text style={styles.metaText}>{app.product_id.name}</Text>
                  </View>
                )}
                <View style={styles.metaRow}>
                  <Ionicons name="shield-checkmark-outline" size={14} color={colors.textTertiary} />
                  <Text style={styles.metaText}>{app.cert_type}</Text>
                  {!!app.priority && <Text style={styles.metaDot}>·</Text>}
                  {!!app.priority && <Text style={styles.metaText}>{app.priority} priority</Text>}
                </View>
                <View style={styles.cardFooter}>
                  <Text style={styles.viewText}>View details</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? colors.bgCardLight : colors.border, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    headerSub: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
    content: { padding: 20, gap: 12 },
    center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginTop: 4 },
    emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 30, lineHeight: 19 },
    retryBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: BorderRadius.md, backgroundColor: `${colors.primary}18` },
    retryText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
    card: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    cardInner: { padding: 16, gap: 8 },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    appNumber: { fontSize: 15, fontWeight: '800', color: colors.textPrimary, flex: 1 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    metaText: { fontSize: 13, color: colors.textSecondary },
    metaDot: { fontSize: 13, color: colors.textTertiary },
    cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 },
    viewText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  });

export default AssignedApplicationsScreen;
