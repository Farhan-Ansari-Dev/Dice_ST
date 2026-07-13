import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const COUNTRIES: any[] = [];
const REQUIREMENTS: Record<string, { cert: string; mandatory: boolean }[]> = {};

const CountryComplianceScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [selected, setSelected] = useState('USA');
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const reqs = REQUIREMENTS[selected] || [];
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Country Compliance</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.label}>Select Destination Country</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          <View style={styles.countryRow}>
            {COUNTRIES.map(c => (
              <TouchableOpacity key={c} style={[styles.countryChip, selected === c && { backgroundColor: `${colors.primary}18`, borderColor: colors.primary }]} onPress={() => setSelected(c)}>
                <Text style={[styles.countryText, selected === c && { color: colors.primary, fontWeight: '700' }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        <View style={[styles.card, Shadows.sm]}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF','#F7F8FC']} style={styles.cardInner}>
            <Text style={styles.sectionTitle}>Requirements for {selected}</Text>
            {reqs.map((r, i) => (
              <View key={i} style={[styles.reqRow, i > 0 && { borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border }]}>
                <View style={[styles.reqDot, { backgroundColor: r.mandatory ? colors.error : colors.warning }]} />
                <Text style={styles.reqCert}>{r.cert}</Text>
                <View style={[styles.reqBadge, { backgroundColor: r.mandatory ? `${colors.error}18` : `${colors.warning}18` }]}>
                  <Text style={[styles.reqBadgeText, { color: r.mandatory ? colors.error : colors.warning }]}>{r.mandatory ? 'Mandatory' : 'Optional'}</Text>
                </View>
              </View>
            ))}
          </LinearGradient>
        </View>
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
  label: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 10 },
  countryRow: { flexDirection: 'row', gap: 8 },
  countryChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border },
  countryText: { fontSize: 13, color: colors.textSecondary },
  card: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
  cardInner: { padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  reqRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
  reqDot: { width: 8, height: 8, borderRadius: 4 },
  reqCert: { flex: 1, fontSize: 14, color: colors.textPrimary },
  reqBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  reqBadgeText: { fontSize: 11, fontWeight: '600' },
});
export default CountryComplianceScreen;
