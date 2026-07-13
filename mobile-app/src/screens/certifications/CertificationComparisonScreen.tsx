import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const COMPARISON_DATA: any[] = [];

const CertificationComparisonScreen: React.FC = () => {
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
        <Text style={styles.headerTitle}>Compare Certifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Headers */}
        <View style={styles.compareHeaders}>
          <View style={{ width: 100 }} />
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.certHeader}>
            <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
            <Text style={styles.certHeaderText}>BIS IS 13252</Text>
          </LinearGradient>
          <LinearGradient colors={[colors.secondary, colors.secondaryDark]} style={styles.certHeader}>
            <Ionicons name="leaf" size={18} color="#FFFFFF" />
            <Text style={styles.certHeaderText}>EPR Auth</Text>
          </LinearGradient>
        </View>

        {/* Comparison rows */}
        <View style={[styles.comparisonTable, Shadows.md]}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.tableInner}>
            {COMPARISON_DATA.map((row, index) => (
              <View key={row.label} style={[styles.compRow, index > 0 && styles.compRowBorder]}>
                <Text style={styles.compLabel}>{row.label}</Text>
                <View style={styles.compValues}>
                  <View style={[styles.compValue, { borderColor: `${colors.primary}40`, backgroundColor: `${colors.primary}10` }]}>
                    <Text style={styles.compValueText}>{row.a}</Text>
                  </View>
                  <View style={[styles.compValue, { borderColor: `${colors.secondary}40`, backgroundColor: `${colors.secondary}10` }]}>
                    <Text style={styles.compValueText}>{row.b}</Text>
                  </View>
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
    compareHeaders: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    certHeader: { flex: 1, flexDirection: 'column', alignItems: 'center', padding: 12, borderRadius: BorderRadius.md, gap: 4 },
    certHeaderText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
    comparisonTable: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    tableInner: { padding: 0 },
    compRow: { padding: 14, gap: 8 },
    compRowBorder: { borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border },
    compLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3 },
    compValues: { flexDirection: 'row', gap: 8 },
    compValue: { flex: 1, borderRadius: BorderRadius.sm, borderWidth: 1, padding: 8 },
    compValueText: { fontSize: 12, color: colors.textPrimary, lineHeight: 16 },
  });

export default CertificationComparisonScreen;
