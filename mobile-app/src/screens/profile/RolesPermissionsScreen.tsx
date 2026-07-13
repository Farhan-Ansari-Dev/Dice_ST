import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

type Permission = { view: boolean; edit: boolean; approve: boolean; download: boolean };
type RoleKey = 'Admin' | 'Manager' | 'Viewer';

const ROLE_ICONS: Record<RoleKey, keyof typeof Ionicons.glyphMap> = {
  Admin: 'shield-checkmark',
  Manager: 'people',
  Viewer: 'eye',
};
const ROLE_COLORS: Record<RoleKey, string> = {
  Admin: '#6C63FF',
  Manager: '#00C896',
  Viewer: '#8896AB',
};

const RolesPermissionsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [permissions, setPermissions] = useState<Record<RoleKey, Permission>>({
    Admin: { view: true, edit: true, approve: true, download: true },
    Manager: { view: true, edit: true, approve: false, download: true },
    Viewer: { view: true, edit: false, approve: false, download: false },
  });

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const togglePermission = (role: RoleKey, perm: keyof Permission) => {
    if (role === 'Admin') return; // Admin always has all permissions
    setPermissions((prev) => ({
      ...prev,
      [role]: { ...prev[role], [perm]: !prev[role][perm] },
    }));
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
        <Text style={styles.headerTitle}>Roles & Permissions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Manage what each role can do within the application.</Text>

        {(Object.keys(permissions) as RoleKey[]).map((role) => (
          <View key={role} style={[styles.roleCard, Shadows.md]}>
            <LinearGradient
              colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
              style={styles.roleCardInner}
            >
              <View style={styles.roleHeader}>
                <LinearGradient
                  colors={[ROLE_COLORS[role], `${ROLE_COLORS[role]}AA`]}
                  style={styles.roleIconBg}
                >
                  <Ionicons name={ROLE_ICONS[role]} size={20} color="#FFFFFF" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={styles.roleName}>{role}</Text>
                  {role === 'Admin' && <Text style={styles.roleNote}>All permissions (cannot be changed)</Text>}
                </View>
                {role === 'Admin' && (
                  <View style={[styles.lockedBadge, { backgroundColor: `${ROLE_COLORS[role]}20` }]}>
                    <Ionicons name="lock-closed" size={12} color={ROLE_COLORS[role]} />
                  </View>
                )}
              </View>

              <View style={styles.permsGrid}>
                {(['view', 'edit', 'approve', 'download'] as (keyof Permission)[]).map((perm) => (
                  <View key={perm} style={styles.permRow}>
                    <View style={styles.permInfo}>
                      <Ionicons
                        name={perm === 'view' ? 'eye-outline' : perm === 'edit' ? 'pencil-outline' : perm === 'approve' ? 'checkmark-circle-outline' : 'download-outline'}
                        size={16}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.permName}>{perm.charAt(0).toUpperCase() + perm.slice(1)}</Text>
                    </View>
                    <Switch
                      value={permissions[role][perm]}
                      onValueChange={() => togglePermission(role, perm)}
                      disabled={role === 'Admin'}
                      trackColor={{ false: colors.bgCardLight, true: `${ROLE_COLORS[role]}60` }}
                      thumbColor={permissions[role][perm] ? ROLE_COLORS[role] : colors.textTertiary}
                    />
                  </View>
                ))}
              </View>
            </LinearGradient>
          </View>
        ))}

        <TouchableOpacity style={[styles.saveBtn, Shadows.md]} activeOpacity={0.85}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.saveBtnGradient}>
            <Text style={styles.saveBtnText}>Save Permission Changes</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
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
    content: { paddingHorizontal: 20, paddingTop: 8 },
    subtitle: { fontSize: 14, color: colors.textSecondary, lineHeight: 22, marginBottom: 20 },
    roleCard: { marginBottom: 16, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    roleCardInner: { padding: 16 },
    roleHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    roleIconBg: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    roleName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
    roleNote: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    lockedBadge: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    permsGrid: { gap: 2 },
    permRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border },
    permInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    permName: { fontSize: 14, color: colors.textPrimary },
    saveBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
    saveBtnGradient: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
    saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  });

export default RolesPermissionsScreen;
