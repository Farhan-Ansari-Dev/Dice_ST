import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const SESSIONS: any[] = [];

const DeviceSessionsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [sessions, setSessions] = useState(SESSIONS);
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const logout = (id: string) => {
    Alert.alert('Logout Device', 'Are you sure you want to logout this device?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => setSessions((prev) => prev.filter((s) => s.id !== id)) },
    ]);
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
        <Text style={styles.headerTitle}>Active Sessions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.infoCard, { backgroundColor: `${colors.warning}15`, borderColor: `${colors.warning}30` }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
          <Text style={[styles.infoText, { color: colors.warning }]}>
            {sessions.length} device{sessions.length !== 1 ? 's' : ''} currently logged in
          </Text>
        </View>

        {sessions.map((session) => (
          <View key={session.id} style={[styles.sessionCard, Shadows.md]}>
            <LinearGradient
              colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
              style={styles.sessionCardInner}
            >
              <View style={styles.sessionRow}>
                <View style={[styles.deviceIcon, { backgroundColor: session.isCurrent ? `${colors.success}20` : `${colors.primary}20` }]}>
                  <Ionicons name={session.icon} size={22} color={session.isCurrent ? colors.success : colors.primary} />
                </View>
                <View style={styles.deviceInfo}>
                  <View style={styles.deviceNameRow}>
                    <Text style={styles.deviceName}>{session.device}</Text>
                    {session.isCurrent && (
                      <View style={[styles.currentBadge, { backgroundColor: `${colors.success}20` }]}>
                        <Text style={[styles.currentText, { color: colors.success }]}>Current</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.deviceOs}>{session.os}</Text>
                  <View style={styles.deviceMeta}>
                    <Ionicons name="location-outline" size={12} color={colors.textTertiary} />
                    <Text style={styles.deviceLocation}>{session.location}</Text>
                  </View>
                  <View style={styles.deviceMeta}>
                    <Ionicons name="time-outline" size={12} color={colors.textTertiary} />
                    <Text style={styles.deviceTime}>{session.lastActive}</Text>
                  </View>
                </View>
                {!session.isCurrent && (
                  <TouchableOpacity style={styles.logoutBtn} onPress={() => logout(session.id)}>
                    <Ionicons name="log-out-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            </LinearGradient>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.logoutAllBtn, Shadows.md]}
          onPress={() => Alert.alert('Logout All', 'Logout all other devices?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout All', style: 'destructive', onPress: () => setSessions((prev) => prev.filter((s) => s.isCurrent)) },
          ])}
          activeOpacity={0.85}
        >
          <View style={[styles.logoutAllBtnInner, { backgroundColor: `${colors.error}15`, borderColor: `${colors.error}30`, borderWidth: 1 }]}>
            <Ionicons name="log-out-outline" size={18} color={colors.error} />
            <Text style={[styles.logoutAllText, { color: colors.error }]}>Logout All Other Devices</Text>
          </View>
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
    infoCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: 16 },
    infoText: { fontSize: 13, fontWeight: '600', flex: 1 },
    sessionCard: { marginBottom: 12, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    sessionCardInner: { padding: 16 },
    sessionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    deviceIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    deviceInfo: { flex: 1, gap: 4 },
    deviceNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    deviceName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    currentBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full },
    currentText: { fontSize: 10, fontWeight: '700' },
    deviceOs: { fontSize: 12, color: colors.textSecondary },
    deviceMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    deviceLocation: { fontSize: 11, color: colors.textTertiary },
    deviceTime: { fontSize: 11, color: colors.textTertiary },
    logoutBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: `${colors.error}15`, alignItems: 'center', justifyContent: 'center' },
    logoutAllBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
    logoutAllBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: BorderRadius.lg },
    logoutAllText: { fontSize: 15, fontWeight: '700' },
  });

export default DeviceSessionsScreen;
