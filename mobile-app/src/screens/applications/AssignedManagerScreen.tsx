import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const MANAGER: any = {
  name: '',
  designation: '',
  initials: '',
  email: '',
  phone: '',
  experience: '',
  specializations: [],
  languages: [],
  activeApplications: 0,
  successRate: 0,
};

const AssignedManagerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Manager</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Profile Card */}
        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={[styles.profileCard, Shadows.md]}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitials}>{MANAGER.initials}</Text>
          </View>
          <View style={styles.onlineDot} />
          <Text style={styles.profileName}>{MANAGER.name}</Text>
          <Text style={styles.profileDesig}>{MANAGER.designation}</Text>
          <Text style={styles.profileExp}>{MANAGER.experience} experience</Text>
          <View style={styles.profileStats}>
            <View style={styles.profileStat}>
              <Text style={styles.statValue}>{MANAGER.activeApplications}</Text>
              <Text style={styles.statLabel}>Active Cases</Text>
            </View>
            <View style={styles.statDiv} />
            <View style={styles.profileStat}>
              <Text style={styles.statValue}>{MANAGER.successRate}%</Text>
              <Text style={styles.statLabel}>Success Rate</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, Shadows.sm]}
            onPress={() => navigation.navigate('LiveChat')}
            activeOpacity={0.85}
          >
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.actionBtnInner}>
              <Ionicons name="chatbubbles" size={22} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Chat</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, Shadows.sm]}
            onPress={() => Alert.alert('Call', 'Calling Priya Sharma...')}
            activeOpacity={0.85}
          >
            <LinearGradient colors={[colors.success, colors.successDark]} style={styles.actionBtnInner}>
              <Ionicons name="call" size={22} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Call</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, Shadows.sm]}
            onPress={() => navigation.navigate('VideoConsultation')}
            activeOpacity={0.85}
          >
            <LinearGradient colors={[colors.secondary, colors.secondaryDark]} style={styles.actionBtnInner}>
              <Ionicons name="videocam" size={22} color="#FFFFFF" />
              <Text style={styles.actionBtnText}>Video</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Details Card */}
        <View style={[styles.detailsCard, Shadows.md]}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.detailsCardInner}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            {[
              { icon: 'mail-outline' as const, label: 'Email', value: MANAGER.email },
              { icon: 'call-outline' as const, label: 'Phone', value: MANAGER.phone },
            ].map((item) => (
              <View key={item.label} style={styles.detailRow}>
                <View style={[styles.detailIcon, { backgroundColor: `${colors.primary}20` }]}>
                  <Ionicons name={item.icon} size={16} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.detailLabel}>{item.label}</Text>
                  <Text style={styles.detailValue}>{item.value}</Text>
                </View>
              </View>
            ))}

            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Specializations</Text>
            <View style={styles.tagsRow}>
              {MANAGER.specializations.map((spec: any) => (
                <View key={spec} style={[styles.tag, { backgroundColor: `${colors.primary}20` }]}>
                  <Text style={[styles.tagText, { color: colors.primary }]}>{spec}</Text>
                </View>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Languages</Text>
            <View style={styles.tagsRow}>
              {MANAGER.languages.map((lang: any) => (
                <View key={lang} style={[styles.tag, { backgroundColor: `${colors.secondary}20` }]}>
                  <Text style={[styles.tagText, { color: colors.secondary }]}>{lang}</Text>
                </View>
              ))}
            </View>
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
    profileCard: { borderRadius: BorderRadius.xl, padding: 24, alignItems: 'center', marginBottom: 16, position: 'relative' },
    profileAvatar: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    profileInitials: { fontSize: 28, fontWeight: '900', color: '#FFFFFF' },
    onlineDot: { position: 'absolute', top: 42, right: 'auto', width: 16, height: 16, borderRadius: 8, backgroundColor: '#00C896', borderWidth: 3, borderColor: colors.primary },
    profileName: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
    profileDesig: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
    profileExp: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 20 },
    profileStats: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: BorderRadius.md, padding: 14 },
    profileStat: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 22, fontWeight: '900', color: '#FFFFFF' },
    statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    statDiv: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
    actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    actionBtn: { flex: 1, borderRadius: BorderRadius.lg, overflow: 'hidden' },
    actionBtnInner: { alignItems: 'center', gap: 6, paddingVertical: 14 },
    actionBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
    detailsCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    detailsCardInner: { padding: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 14 },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    detailIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    detailLabel: { fontSize: 11, color: colors.textTertiary },
    detailValue: { fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full },
    tagText: { fontSize: 12, fontWeight: '600' },
  });

export default AssignedManagerScreen;
