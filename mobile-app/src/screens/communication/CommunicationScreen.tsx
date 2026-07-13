import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import Avatar from '../../components/common/Avatar';
import Badge from '../../components/common/Badge';
import { formatRelativeTime } from '../../utils/formatters';

const CHATS: any[] = [];

const CommunicationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = CHATS.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const QUICK_ACTIONS = useMemo(() => [
    { label: 'Call Support', icon: 'call' as const, color: colors.success, onPress: () => Linking.openURL('tel:+917897001049') },
    { label: 'Video Call', icon: 'videocam' as const, color: colors.primary, onPress: () => navigation.navigate('VideoConsultation') },
    { label: 'Email', icon: 'mail' as const, color: colors.secondary, onPress: () => Linking.openURL('mailto:info@sanyogconformity.com') },
    { label: 'WhatsApp', icon: 'logo-whatsapp' as const, color: '#25D366', onPress: () => Linking.openURL('https://wa.me/917897001049?text=Hi%20Sanyog%20Support%2C%20I%20need%20help%20with%20my%20compliance%20application.') },
  ], [colors, navigation]);

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

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
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.composeBtn}>
          <Ionicons name="create-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={16} color={colors.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search conversations..."
          placeholderTextColor={colors.textTertiary}
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {QUICK_ACTIONS.map((action, i) => (
          <TouchableOpacity
            key={i}
            style={styles.quickAction}
            onPress={action.onPress}
          >
            <LinearGradient
              colors={[action.color + '25', action.color + '10']}
              style={[styles.quickActionIcon, { borderColor: action.color + '40' }]}
            >
              <Ionicons name={action.icon} size={22} color={action.color} />
            </LinearGradient>
            <Text style={styles.quickActionLabel}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>Recent Conversations</Text>
        {filtered.map((chat) => (
          <TouchableOpacity
            key={chat.id}
            style={[styles.chatItem, Shadows.sm]}
            onPress={() => navigation.navigate('LiveChat', { chat })}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
              style={styles.chatItemInner}
            >
              <Avatar name={chat.name} size="md" online={chat.online} />
              <View style={styles.chatInfo}>
                <View style={styles.chatNameRow}>
                  <Text style={styles.chatName}>{chat.name}</Text>
                  <Text style={styles.chatTime}>{formatRelativeTime(chat.time)}</Text>
                </View>
                <Text style={styles.chatRole}>{chat.role}</Text>
                <Text style={styles.chatLastMsg} numberOfLines={1}>{chat.lastMessage}</Text>
              </View>
              {chat.unread > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadCount}>{chat.unread}</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? colors.bgCardLight : colors.border, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    composeBtn: { padding: 8 },
    searchWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? colors.bgCardLight : '#FFFFFF',
      borderRadius: BorderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      marginHorizontal: 20,
      marginBottom: 16,
      paddingHorizontal: 12,
      height: 46,
    },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, color: colors.textPrimary, fontSize: 14 },
    quickActions: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 20 },
    quickAction: { flex: 1, alignItems: 'center', gap: 6 },
    quickActionIcon: {
      width: 54,
      height: 54,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    quickActionLabel: { fontSize: 10, color: colors.textTertiary, textAlign: 'center' },
    content: { paddingHorizontal: 20 },
    sectionLabel: { fontSize: 12, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
    chatItem: { marginBottom: 8, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    chatItemInner: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
    chatInfo: { flex: 1 },
    chatNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    chatName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    chatTime: { fontSize: 11, color: colors.textTertiary },
    chatRole: { fontSize: 11, color: colors.primary, marginTop: 1 },
    chatLastMsg: { fontSize: 12, color: colors.textTertiary, marginTop: 3 },
    unreadBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unreadCount: { fontSize: 11, color: '#FFFFFF', fontWeight: '700' },
  });

export default CommunicationScreen;
