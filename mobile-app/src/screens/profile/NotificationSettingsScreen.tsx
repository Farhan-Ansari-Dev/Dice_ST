import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const NOTIFICATION_SETTINGS = [
  { id: 'app_updates', icon: 'document-text' as const, title: 'Application Updates', desc: 'Get notified when your application status changes', color: '#6C63FF', default: true },
  { id: 'cert_expiry', icon: 'time' as const, title: 'Certificate Expiry', desc: 'Reminders 30, 15, and 7 days before expiry', color: '#EF4444', default: true },
  { id: 'payment_alerts', icon: 'card' as const, title: 'Payment Alerts', desc: 'Invoice generation and payment confirmations', color: '#F59E0B', default: true },
  { id: 'govt_alerts', icon: 'business' as const, title: 'Government Alerts', desc: 'New circulars and regulatory changes', color: '#00C896', default: true },
  { id: 'ai_reco', icon: 'bulb' as const, title: 'AI Recommendations', desc: 'Personalized compliance suggestions', color: '#00D4FF', default: false },
  { id: 'marketing', icon: 'megaphone' as const, title: 'Marketing & Offers', desc: 'Promotional content and special offers', color: '#8896AB', default: false },
];

const NotificationSettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [settings, setSettings] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATION_SETTINGS.map((s) => [s.id, s.default]))
  );

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
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.masterCard, Shadows.sm]}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.masterCardInner}>
            <View style={styles.masterLeft}>
              <Ionicons name="notifications" size={22} color="#FFFFFF" />
              <View>
                <Text style={styles.masterTitle}>Push Notifications</Text>
                <Text style={styles.masterSubtitle}>Master control for all notifications</Text>
              </View>
            </View>
            <Switch
              value={Object.values(settings).some(Boolean)}
              onValueChange={(v) => setSettings(Object.fromEntries(NOTIFICATION_SETTINGS.map((s) => [s.id, v])))}
              trackColor={{ false: 'rgba(255,255,255,0.2)', true: 'rgba(255,255,255,0.4)' }}
              thumbColor="#FFFFFF"
            />
          </LinearGradient>
        </View>

        <View style={[styles.settingsCard, Shadows.md]}>
          <LinearGradient
            colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
            style={styles.settingsCardInner}
          >
            {NOTIFICATION_SETTINGS.map((item, index) => (
              <View key={item.id}>
                {index > 0 && <View style={styles.divider} />}
                <View style={styles.settingRow}>
                  <View style={[styles.settingIcon, { backgroundColor: `${item.color}20` }]}>
                    <Ionicons name={item.icon} size={18} color={item.color} />
                  </View>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingTitle}>{item.title}</Text>
                    <Text style={styles.settingDesc}>{item.desc}</Text>
                  </View>
                  <Switch
                    value={settings[item.id]}
                    onValueChange={(v) => setSettings((prev) => ({ ...prev, [item.id]: v }))}
                    trackColor={{ false: colors.bgCardLight, true: `${item.color}60` }}
                    thumbColor={settings[item.id] ? item.color : colors.textTertiary}
                  />
                </View>
              </View>
            ))}
          </LinearGradient>
        </View>
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
    masterCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: 16 },
    masterCardInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    masterLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    masterTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
    masterSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    settingsCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    settingsCardInner: { padding: 4 },
    settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 14 },
    settingIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    settingInfo: { flex: 1 },
    settingTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    settingDesc: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
    divider: { height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border, marginHorizontal: 12 },
  });

export default NotificationSettingsScreen;
