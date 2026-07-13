import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const NotificationDetailScreen: React.FC = () => {
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
        <Text style={styles.headerTitle}>Notification</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, Shadows.sm]}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF','#F7F8FC']} style={styles.cardInner}>
            <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
              <Ionicons name="document-text" size={28} color={colors.primary} />
            </View>
            <Text style={styles.title}>Application Update</Text>
            <Text style={styles.time}>Dec 15, 2024 — 09:30 AM</Text>
            <Text style={styles.body}>Your BIS certification application (SCS-2024-0042) has been moved to the review stage. The Bureau of Indian Standards officer has started evaluating your submitted documents and lab test reports. You will receive the next update within 7–10 working days. If any additional documents are required, you will be notified immediately.</Text>
          </LinearGradient>
        </View>
        <TouchableOpacity style={[styles.actionBtn, Shadows.md]} onPress={() => navigation.navigate('ApplicationDetail', { id: '1' })}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.actionBtnGrad}>
            <Text style={styles.actionBtnText}>View Application</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};
const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDark },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? colors.bgCardLight : colors.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  card: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, marginBottom: 16 },
  cardInner: { padding: 20, alignItems: 'center', gap: 10 },
  iconWrap: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  time: { fontSize: 12, color: colors.textTertiary },
  body: { fontSize: 14, color: colors.textSecondary, lineHeight: 22, textAlign: 'center', marginTop: 8 },
  actionBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  actionBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  actionBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
export default NotificationDetailScreen;
