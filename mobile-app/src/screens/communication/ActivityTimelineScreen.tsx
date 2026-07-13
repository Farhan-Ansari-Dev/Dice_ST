import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const ACTIVITIES: any[] = [];

const ActivityTimelineScreen: React.FC = () => {
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
        <Text style={styles.headerTitle}>Activity Timeline</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {ACTIVITIES.map((act, i) => (
          <View key={i} style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View style={[styles.dot, { backgroundColor: act.color }]}>
                <Ionicons name={act.icon} size={14} color="#FFFFFF" />
              </View>
              {i < ACTIVITIES.length - 1 && <View style={[styles.line, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]} />}
            </View>
            <View style={[styles.card, Shadows.sm]}>
              <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF','#F7F8FC']} style={styles.cardInner}>
                <Text style={styles.actTitle}>{act.title}</Text>
                <Text style={styles.actDesc}>{act.desc}</Text>
                <Text style={styles.actTime}>{act.time}</Text>
              </LinearGradient>
            </View>
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
  timelineItem: { flexDirection: 'row', gap: 12, marginBottom: 0 },
  timelineLeft: { alignItems: 'center', width: 36 },
  dot: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  line: { width: 2, flex: 1, minHeight: 16, marginVertical: 4 },
  card: { flex: 1, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, marginBottom: 12 },
  cardInner: { padding: 12 },
  actTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  actDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  actTime: { fontSize: 11, color: colors.textTertiary, marginTop: 4 },
});
export default ActivityTimelineScreen;
