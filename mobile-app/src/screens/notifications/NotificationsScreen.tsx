import React, { useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import { useNotificationStore, Notification } from '../../store/notificationStore';
import notificationsService from '../../services/notificationsService';

const TYPE_CONFIG: Record<
  Notification['type'],
  { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }
> = {
  application: { icon: 'document-text', color: '#6C63FF', bg: 'rgba(108,99,255,0.12)' },
  certification: { icon: 'shield-checkmark', color: '#00C896', bg: 'rgba(0,200,150,0.12)' },
  payment: { icon: 'card', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  document: { icon: 'attach', color: '#00D4FF', bg: 'rgba(0,212,255,0.12)' },
  system: { icon: 'settings', color: '#8896AB', bg: 'rgba(136,150,171,0.12)' },
  reminder: { icon: 'alarm', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { notifications, markAsRead, markAllAsRead, removeNotification, setNotifications } = useNotificationStore();

  useEffect(() => {
    let cancelled = false;

    notificationsService
      .getAll({ limit: 100 })
      .then((response: any) => {
        if (cancelled) return;

        const items = ((response?.data?.data ?? response?.data ?? []) as any[]).map((item: any): Notification => ({
          id: String(item._id ?? item.id),
          title: item.title ?? 'Notification',
          body: item.body ?? '',
          type: item.type ?? 'system',
          isRead: Boolean(item.read_at),
          data: item.data ?? item.metadata ?? undefined,
          createdAt: item.created_at ?? new Date().toISOString(),
        }));

        setNotifications(items);
      })
      .catch((error) => {
        console.warn('[Notifications] Load failed:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [setNotifications]);

  const unread = notifications.filter((n) => !n.isRead).length;

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unread > 0 && (
            <Text style={styles.headerSubtitle}>{unread} unread</Text>
          )}
        </View>
        {unread > 0 && (
            <TouchableOpacity onPress={() => { notificationsService.markAllRead().catch(() => {}); markAllAsRead(); }} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: isDark ? colors.bgCardLight : colors.border }]}>
              <Ionicons name="notifications-off-outline" size={40} color={colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySubtitle}>No notifications at the moment.</Text>
          </View>
        ) : (
          notifications.map((item) => {
            const cfg = TYPE_CONFIG[item.type];
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, Shadows.sm, !item.isRead && styles.cardUnread]}
                onPress={() => {
                  notificationsService.markRead(item.id).catch(() => {});
                  markAsRead(item.id);
                }}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
                  style={styles.cardGradient}
                >
                  {/* Unread dot */}
                  {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}

                  <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
                    <Ionicons name={cfg.icon} size={20} color={cfg.color} />
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.cardTop}>
                      <Text style={[styles.cardTitle, !item.isRead && { color: colors.textPrimary, fontWeight: '700' }]}>
                        {item.title}
                      </Text>
                      <Text style={styles.cardTime}>{timeAgo(item.createdAt)}</Text>
                    </View>
                    <Text style={styles.cardBody2} numberOfLines={2}>{item.body}</Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      notificationsService.delete(item.id).catch(() => {});
                      removeNotification(item.id);
                    }}
                    style={styles.removeBtn}
                  >
                    <Ionicons name="close" size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                </LinearGradient>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      gap: 12,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: 12,
      backgroundColor: isDark ? colors.bgCardLight : colors.border,
      alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
    headerSubtitle: { fontSize: 12, color: colors.textTertiary, marginTop: 1 },
    markAllBtn: {
      paddingHorizontal: 12, paddingVertical: 6,
      borderRadius: BorderRadius.full,
      backgroundColor: `${colors.primary}18`,
    },
    markAllText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
    scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
    card: {
      borderRadius: BorderRadius.lg,
      marginBottom: 10,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
    },
    cardUnread: {
      borderColor: `${colors.primary}30`,
    },
    cardGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      gap: 12,
    },
    unreadDot: {
      position: 'absolute',
      top: 14,
      left: 6,
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    iconWrap: {
      width: 44, height: 44, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center',
    },
    cardBody: { flex: 1 },
    cardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 4,
    },
    cardTitle: {
      fontSize: 14, fontWeight: '500',
      color: colors.textPrimary, flex: 1, marginRight: 8,
    },
    cardTime: { fontSize: 11, color: colors.textTertiary },
    cardBody2: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
    removeBtn: { padding: 4 },
    emptyState: { alignItems: 'center', paddingTop: 80 },
    emptyIcon: {
      width: 80, height: 80, borderRadius: 24,
      alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
    emptySubtitle: { fontSize: 14, color: colors.textTertiary },
  });

export default NotificationsScreen;
