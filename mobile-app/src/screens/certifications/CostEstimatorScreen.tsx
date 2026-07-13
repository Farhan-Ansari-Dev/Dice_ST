import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const CERT_DATA: any[] = [];

const formatINR = (n: number) =>
  n === 0 ? 'Included' : `₹${n.toLocaleString('en-IN')}`;

const CostEstimatorScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [selectedId, setSelectedId] = useState('bis');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const cert = CERT_DATA.find((c) => c.id === selectedId) ?? CERT_DATA[0];
  const total = cert.govtFees + cert.serviceFees + cert.labTesting;

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
        <Text style={styles.headerTitle}>Cost Estimator</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Dropdown */}
        <Text style={styles.label}>Select Certification Type</Text>
        <TouchableOpacity
          style={[styles.dropdown, Shadows.sm]}
          onPress={() => setDropdownOpen(!dropdownOpen)}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
            style={styles.dropdownInner}
          >
            <Text style={styles.dropdownText}>{cert.label}</Text>
            <Ionicons
              name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textSecondary}
            />
          </LinearGradient>
        </TouchableOpacity>

        {dropdownOpen && (
          <View style={[styles.dropdownList, Shadows.md]}>
            <LinearGradient
              colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
              style={styles.dropdownListInner}
            >
              {CERT_DATA.map((c, i) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.dropdownItem, i > 0 && styles.dropdownDivider]}
                  onPress={() => {
                    setSelectedId(c.id);
                    setDropdownOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      c.id === selectedId && { color: colors.primary, fontWeight: '700' },
                    ]}
                  >
                    {c.label}
                  </Text>
                  {c.id === selectedId && (
                    <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </LinearGradient>
          </View>
        )}

        {/* Description */}
        <View style={[styles.descCard, Shadows.sm]}>
          <LinearGradient
            colors={['rgba(108,99,255,0.15)', 'rgba(0,212,255,0.08)']}
            style={styles.descCardInner}
          >
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
            <Text style={styles.descText}>{cert.description}</Text>
          </LinearGradient>
        </View>

        {/* Fee Breakdown */}
        <View style={[styles.card, Shadows.sm]}>
          <LinearGradient
            colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
            style={styles.cardInner}
          >
            <Text style={styles.cardTitle}>Fee Breakdown</Text>

            {[
              { label: 'Government Fees', value: cert.govtFees, icon: 'business-outline', color: colors.primary },
              { label: 'Service Fees (DICE)', value: cert.serviceFees, icon: 'shield-checkmark-outline', color: colors.secondary },
              { label: 'Lab Testing', value: cert.labTesting, icon: 'flask-outline', color: colors.success },
            ].map((row) => (
              <View key={row.label} style={styles.feeRow}>
                <View style={[styles.feeIcon, { backgroundColor: `${row.color}20` }]}>
                  <Ionicons name={row.icon as any} size={16} color={row.color} />
                </View>
                <Text style={styles.feeLabel}>{row.label}</Text>
                <Text style={[styles.feeValue, row.value === 0 && { color: colors.success, fontSize: 12 }]}>
                  {formatINR(row.value)}
                </Text>
              </View>
            ))}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Estimate</Text>
              <Text style={styles.totalValue}>₹{total.toLocaleString('en-IN')}</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Timeline */}
        <View style={[styles.card, Shadows.sm]}>
          <LinearGradient
            colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
            style={styles.cardInner}
          >
            <Text style={styles.cardTitle}>Timeline Estimate</Text>
            <View style={styles.timelineRow}>
              <View style={[styles.timelineBox, { borderColor: colors.warning }]}>
                <Ionicons name="person-outline" size={20} color={colors.warning} />
                <Text style={styles.timelineMode}>DIY</Text>
                <Text style={[styles.timelineDuration, { color: colors.warning }]}>{cert.diyWeeks}</Text>
                <Text style={styles.timelineNote}>Self-managed</Text>
              </View>
              <View style={styles.timelineVsBox}>
                <Text style={styles.timelineVs}>vs</Text>
              </View>
              <View style={[styles.timelineBox, { borderColor: colors.primary }]}>
                <Ionicons name="sparkles" size={20} color={colors.primary} />
                <Text style={styles.timelineMode}>DICE-Assisted</Text>
                <Text style={[styles.timelineDuration, { color: colors.primary }]}>{cert.diceWeeks}</Text>
                <Text style={styles.timelineNote}>Expert guided</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaBtn, Shadows.primary]}
          onPress={() => navigation.navigate('NewApplication', { certType: cert.label })}
          activeOpacity={0.9}
        >
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.ctaBtnGradient}>
            <Ionicons name="rocket-outline" size={20} color="#FFFFFF" />
            <Text style={styles.ctaBtnText}>Start Application</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      gap: 12,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? colors.bgCardLight : colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    content: { paddingHorizontal: 20, paddingTop: 8 },
    label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 },
    dropdown: {
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
      marginBottom: 8,
    },
    dropdownInner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    dropdownText: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
    dropdownList: {
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
      marginBottom: 16,
    },
    dropdownListInner: { paddingVertical: 4 },
    dropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 13,
    },
    dropdownDivider: {
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border,
    },
    dropdownItemText: { fontSize: 14, color: colors.textPrimary },
    descCard: {
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      marginBottom: 16,
    },
    descCardInner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      padding: 14,
    },
    descText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
    card: {
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
      marginBottom: 16,
    },
    cardInner: { padding: 16 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 14 },
    feeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border,
    },
    feeIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    feeLabel: { flex: 1, fontSize: 14, color: colors.textPrimary },
    feeValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 14,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border,
    },
    totalLabel: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
    totalValue: { fontSize: 22, fontWeight: '800', color: colors.primary },
    timelineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    timelineBox: {
      flex: 1,
      borderWidth: 1.5,
      borderRadius: BorderRadius.lg,
      padding: 14,
      alignItems: 'center',
      gap: 4,
    },
    timelineMode: { fontSize: 12, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
    timelineDuration: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
    timelineNote: { fontSize: 11, color: colors.textTertiary },
    timelineVsBox: { width: 32, alignItems: 'center' },
    timelineVs: { fontSize: 13, fontWeight: '700', color: colors.textTertiary },
    ctaBtn: {
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      marginTop: 8,
    },
    ctaBtnGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 16,
    },
    ctaBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  });

export default CostEstimatorScreen;
