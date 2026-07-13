import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const TIMELINE: any[] = [];

const ApplicationTimelineScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const getStatusColor = (status: string) => status === 'done' ? colors.success : status === 'current' ? colors.primary : colors.textTertiary;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Application Timeline</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {TIMELINE.map((item, index) => {
          const color = getStatusColor(item.status);
          const isLast = index === TIMELINE.length - 1;
          return (
            <View key={item.id} style={styles.tlRow}>
              <View style={styles.tlLeft}>
                <View style={[styles.tlDot, { backgroundColor: `${color}20`, borderColor: color }]}>
                  <Ionicons name={item.icon} size={13} color={color} />
                </View>
                {!isLast && <View style={[styles.tlLine, { backgroundColor: item.status === 'done' ? colors.success : isDark ? 'rgba(255,255,255,0.08)' : colors.border }]} />}
              </View>
              <View style={[styles.tlContent, Shadows.sm, { marginBottom: isLast ? 0 : 12 }]}>
                <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.tlCardInner}>
                  <Text style={[styles.tlEvent, item.status === 'current' && { color: colors.primary }]}>{item.event}</Text>
                  <Text style={styles.tlTime}>{item.time}</Text>
                  <Text style={styles.tlBy}>By: {item.by}</Text>
                  <Text style={styles.tlNote}>{item.note}</Text>
                </LinearGradient>
              </View>
            </View>
          );
        })}
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
    tlRow: { flexDirection: 'row', gap: 12 },
    tlLeft: { alignItems: 'center', width: 32 },
    tlDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    tlLine: { width: 2, flex: 1, marginTop: 4 },
    tlContent: { flex: 1, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    tlCardInner: { padding: 12 },
    tlEvent: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
    tlTime: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    tlBy: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
    tlNote: { fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 18 },
  });

export default ApplicationTimelineScreen;
