import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const TEAM_MEMBERS: any[] = [];

const ROLE_COLORS: Record<string, string> = {
  Admin: '#6C63FF',
  Manager: '#00C896',
  Executive: '#F59E0B',
  Viewer: '#8896AB',
};

const TeamMembersScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
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
        <Text style={styles.headerTitle}>Team Members</Text>
        <View style={[styles.countBadge, { backgroundColor: `${colors.primary}20` }]}>
          <Text style={[styles.countText, { color: colors.primary }]}>{TEAM_MEMBERS.length}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.statsRow}>
          {[
            { label: 'Total', value: '0', color: colors.primary },
            { label: 'Active', value: '0', color: colors.success },
            { label: 'Pending', value: '0', color: colors.warning },
          ].map((stat) => (
            <View key={stat.label} style={[styles.statCard, Shadows.sm]}>
              <LinearGradient
                colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
                style={styles.statCardInner}
              >
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </LinearGradient>
            </View>
          ))}
        </View>

        {TEAM_MEMBERS.map((member) => (
          <TouchableOpacity key={member.id} style={[styles.memberCard, Shadows.sm]} activeOpacity={0.85}>
            <LinearGradient
              colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
              style={styles.memberCardInner}
            >
              <View style={styles.memberRow}>
                <View style={styles.avatarWrapper}>
                  <View style={[styles.avatar, { backgroundColor: `${member.color}20` }]}>
                    <Text style={[styles.avatarInitials, { color: member.color }]}>{member.initials}</Text>
                  </View>
                  <View style={[styles.statusDot, {
                    backgroundColor: member.status === 'online' ? colors.success : member.status === 'away' ? colors.warning : colors.bgCardLight,
                  }]} />
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberEmail}>{member.email}</Text>
                </View>
                <View style={[styles.roleBadge, { backgroundColor: `${ROLE_COLORS[member.role]}20` }]}>
                  <Text style={[styles.roleText, { color: ROLE_COLORS[member.role] }]}>{member.role}</Text>
                </View>
              </View>
              <View style={styles.memberActions}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: `${colors.primary}15` }]}>
                  <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
                  <Text style={[styles.actionText, { color: colors.primary }]}>Message</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: `${colors.secondary}15` }]}>
                  <Ionicons name="settings-outline" size={16} color={colors.secondary} />
                  <Text style={[styles.actionText, { color: colors.secondary }]}>Manage</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, Shadows.md]} activeOpacity={0.85}>
        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.fabGradient}>
          <Ionicons name="person-add" size={22} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? colors.bgCardLight : colors.border, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
    countText: { fontSize: 13, fontWeight: '700' },
    content: { paddingHorizontal: 20, paddingTop: 8 },
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    statCard: { flex: 1, borderRadius: BorderRadius.md, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    statCardInner: { padding: 14, alignItems: 'center' },
    statValue: { fontSize: 22, fontWeight: '800' },
    statLabel: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    memberCard: { marginBottom: 12, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    memberCardInner: { padding: 16 },
    memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    avatarWrapper: { position: 'relative' },
    avatar: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    avatarInitials: { fontSize: 16, fontWeight: '800' },
    statusDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: isDark ? colors.bgCard : '#FFFFFF' },
    memberInfo: { flex: 1 },
    memberName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
    memberEmail: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
    roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
    roleText: { fontSize: 11, fontWeight: '700' },
    memberActions: { flexDirection: 'row', gap: 8 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: BorderRadius.full },
    actionText: { fontSize: 12, fontWeight: '600' },
    fab: {
      position: 'absolute', bottom: 24, right: 24,
      borderRadius: 18, overflow: 'hidden',
      shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 10,
    },
    fabGradient: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  });

export default TeamMembersScreen;
