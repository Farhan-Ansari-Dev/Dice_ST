import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const ContainerTrackingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const events: any[] = [];
  const containerNo = '';
  const containerType = '';
  const origin = '';
  const destination = '';
  const status = '';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Container Tracking</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <LinearGradient colors={['#1A1560', '#6C63FF']} style={[styles.containerCard, Shadows.md]}>
          <Text style={styles.containerNo}>{containerNo || '—'}</Text>
          <Text style={styles.containerType}>{containerType || '—'}</Text>
          <View style={styles.containerRoute}>
            <Text style={styles.routeCity}>{origin || '—'}</Text>
            <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.7)" />
            <Text style={styles.routeCity}>{destination || '—'}</Text>
          </View>
          <View style={[styles.statusTag, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Ionicons name="boat-outline" size={14} color="#FFFFFF" />
            <Text style={styles.statusTagText}>{status || '—'}</Text>
          </View>
        </LinearGradient>

        <Text style={styles.sectionTitle}>Container Journey</Text>
        {events.map((e, i) => (
          <View key={i} style={styles.timelineRow}>
            <View style={styles.timelineLeft}>
              <View style={[styles.dot, { backgroundColor: e.done ? colors.success : e.active ? colors.primary : isDark ? 'rgba(255,255,255,0.15)' : colors.border }]}>
                {e.done && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
              </View>
              {i < events.length - 1 && <View style={[styles.line, { backgroundColor: e.done ? colors.success : isDark ? 'rgba(255,255,255,0.1)' : colors.border }]} />}
            </View>
            <View style={[styles.eventCard, Shadows.sm, { marginBottom: i < events.length - 1 ? 0 : 0 }]}>
              <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.eventCardInner}>
                <Text style={[styles.eventName, e.active && { color: colors.primary }]}>{e.event}</Text>
                <Text style={styles.eventLoc}>{e.loc}</Text>
                <Text style={styles.eventTime}>{e.time}</Text>
              </LinearGradient>
            </View>
          </View>
        ))}
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
    containerCard: { borderRadius: BorderRadius.lg, padding: 16, marginBottom: 20, gap: 6 },
    containerNo: { fontSize: 22, fontWeight: '900', color: '#FFFFFF' },
    containerType: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
    containerRoute: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    routeCity: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
    statusTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full, alignSelf: 'flex-start', marginTop: 4 },
    statusTagText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 14 },
    timelineRow: { flexDirection: 'row', gap: 12 },
    timelineLeft: { alignItems: 'center', width: 24 },
    dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
    line: { flex: 1, width: 2, marginVertical: 4 },
    eventCard: { flex: 1, marginBottom: 10, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    eventCardInner: { padding: 12 },
    eventName: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
    eventLoc: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    eventTime: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
  });

export default ContainerTrackingScreen;
