import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import Badge from '../../components/common/Badge';

const REPLIES: any[] = [];

const TicketDetailsScreen: React.FC = () => {
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
        <Text style={styles.headerTitle}>Ticket #1042</Text>
        <Badge label="Resolved" variant="success" size="sm" />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.card, Shadows.sm]}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF','#F7F8FC']} style={styles.cardInner}>
            <Text style={styles.subject}>Duplicate Payment Charged</Text>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>Category: Payment Problem</Text>
              <Text style={styles.meta}>Priority: High</Text>
            </View>
            <Text style={styles.meta}>Raised: Dec 15, 2024 at 10:00 AM</Text>
          </LinearGradient>
        </View>
        <Text style={styles.sectionTitle}>Conversation</Text>
        {REPLIES.map((r, i) => (
          <View key={i} style={[styles.replyCard, Shadows.sm, r.isAgent && { borderLeftWidth: 3, borderLeftColor: colors.primary }]}>
            <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF','#F7F8FC']} style={styles.replyInner}>
              <View style={styles.replyHeader}>
                <Text style={[styles.replyFrom, r.isAgent && { color: colors.primary }]}>{r.from}</Text>
                <Text style={styles.replyTime}>{r.time}</Text>
              </View>
              <Text style={styles.replyMsg}>{r.msg}</Text>
            </LinearGradient>
          </View>
        ))}
        <View style={{ height: 60 }} />
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
  card: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, marginBottom: 20 },
  cardInner: { padding: 16, gap: 6 },
  subject: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  metaRow: { flexDirection: 'row', gap: 16 },
  meta: { fontSize: 12, color: colors.textTertiary },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  replyCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, marginBottom: 10 },
  replyInner: { padding: 14 },
  replyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  replyFrom: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  replyTime: { fontSize: 11, color: colors.textTertiary },
  replyMsg: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
});
export default TicketDetailsScreen;
