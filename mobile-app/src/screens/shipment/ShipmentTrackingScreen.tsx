import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput , KeyboardAvoidingView, Platform} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const STEPS: any[] = [];

const ShipmentTrackingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [trackId, setTrackId] = useState('');
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shipment Tracking</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Search */}
        <View style={[styles.searchBox, Shadows.sm]}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.searchBoxInner}>
            <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
            <TextInput style={styles.searchInput} value={trackId} onChangeText={setTrackId} placeholder="Enter shipment ID..." placeholderTextColor={colors.textTertiary} />
            <TouchableOpacity style={[styles.trackBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.trackBtnText}>Track</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Status Banner */}
        <LinearGradient colors={['#1A1560', '#6C63FF']} style={[styles.statusBanner, Shadows.md]}>
          <View style={styles.statusBannerRow}>
            <View>
              <Text style={styles.statusBannerLabel}>Shipment ID</Text>
              <Text style={styles.statusBannerValue}>{trackId}</Text>
            </View>
            <View style={[styles.inTransitTag, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Ionicons name="boat-outline" size={14} color="#FFFFFF" />
              <Text style={styles.inTransitText}>In Transit</Text>
            </View>
          </View>
          <View style={styles.routeRow}>
            <Text style={styles.routeCity}>Mumbai</Text>
            <View style={styles.routeLine}>
              <View style={styles.routeDash} />
              <Ionicons name="boat" size={16} color="rgba(255,255,255,0.8)" />
              <View style={styles.routeDash} />
            </View>
            <Text style={styles.routeCity}>Hamburg</Text>
          </View>
          <Text style={styles.etaText}>ETA: December 18, 2024</Text>
        </LinearGradient>

        {/* Timeline */}
        <Text style={styles.sectionTitle}>Tracking Timeline</Text>
        {STEPS.map((step, i) => (
          <View key={i} style={styles.timelineRow}>
            <View style={styles.timelineLeft}>
              <View style={[styles.timelineDot, { backgroundColor: step.done ? colors.success : step.active ? colors.primary : isDark ? 'rgba(255,255,255,0.15)' : colors.border }]}>
                {step.done && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
                {step.active && <View style={[styles.activePulse, { backgroundColor: colors.primary }]} />}
              </View>
              {i < STEPS.length - 1 && <View style={[styles.timelineLine, { backgroundColor: step.done ? colors.success : isDark ? 'rgba(255,255,255,0.1)' : colors.border }]} />}
            </View>
            <View style={[styles.timelineCard, Shadows.sm, { marginBottom: i < STEPS.length - 1 ? 0 : 0 }]}>
              <LinearGradient colors={isDark ? [step.active ? colors.bgCardLight : colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={[styles.timelineCardInner, step.active && { borderColor: `${colors.primary}40`, borderWidth: 1 }]}>
                <Text style={[styles.stepLabel, step.active && { color: colors.primary }]}>{step.label}</Text>
                <Text style={styles.stepLocation}>{step.location}</Text>
                <Text style={styles.stepTime}>{step.time}</Text>
              </LinearGradient>
            </View>
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
    </KeyboardAvoidingView>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? colors.bgCardLight : colors.border, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    content: { paddingHorizontal: 20, paddingTop: 8 },
    searchBox: { marginBottom: 16, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    searchBoxInner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
    searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary, padding: 0 },
    trackBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: BorderRadius.md },
    trackBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
    statusBanner: { borderRadius: BorderRadius.lg, padding: 16, marginBottom: 20 },
    statusBannerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    statusBannerLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
    statusBannerValue: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
    inTransitTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full },
    inTransitText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
    routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    routeCity: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
    routeLine: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    routeDash: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.4)' },
    etaText: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 14 },
    timelineRow: { flexDirection: 'row', gap: 12, marginBottom: 0 },
    timelineLeft: { alignItems: 'center', width: 24 },
    timelineDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
    activePulse: { width: 8, height: 8, borderRadius: 4 },
    timelineLine: { flex: 1, width: 2, marginVertical: 4 },
    timelineCard: { flex: 1, marginBottom: 10, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    timelineCardInner: { padding: 12 },
    stepLabel: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    stepLocation: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    stepTime: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
  });

export default ShipmentTrackingScreen;
