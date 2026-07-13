import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import Badge, { getStatusVariant } from '../../components/common/Badge';
import ProgressBar from '../../components/common/ProgressBar';
import { formatDate } from '../../utils/formatters';

const TESTS: any[] = [];

const TestingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

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
        <Text style={styles.headerTitle}>Testing Reports</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('NewTesting')}>
          <Ionicons name="add" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        {[
          { label: 'Total', value: TESTS.length, color: colors.primary },
          { label: 'Active', value: TESTS.filter(t => t.status === 'in_progress').length, color: colors.secondary },
          { label: 'Done', value: TESTS.filter(t => t.status === 'completed').length, color: colors.success },
          { label: 'Pending', value: TESTS.filter(t => t.status === 'pending').length, color: colors.warning },
        ].map((item, i) => (
          <View key={i} style={[styles.summaryCard, { borderColor: item.color + '40' }]}>
            <Text style={[styles.summaryValue, { color: item.color }]}>{item.value}</Text>
            <Text style={styles.summaryLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {TESTS.map((test) => (
          <View key={test.id} style={[styles.testCard, Shadows.sm]}>
            <LinearGradient
              colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
              style={styles.testCardInner}
            >
              <View style={styles.testHeader}>
                <View style={styles.testIconWrapper}>
                  <Ionicons name="flask" size={22} color={colors.secondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.testProduct}>{test.product}</Text>
                  <Text style={styles.testStandard}>{test.standard}</Text>
                </View>
                <Badge label={test.status.replace('_', ' ')} variant={getStatusVariant(test.status)} size="sm" dot />
              </View>

              <View style={styles.testDetails}>
                <View style={styles.testDetail}>
                  <Ionicons name="business-outline" size={13} color={colors.textTertiary} />
                  <Text style={styles.testDetailText}>{test.labName}</Text>
                </View>
                <View style={styles.testDetail}>
                  <Ionicons name="flask-outline" size={13} color={colors.textTertiary} />
                  <Text style={styles.testDetailText}>{test.testType}</Text>
                </View>
                <View style={styles.testDetail}>
                  <Ionicons name="calendar-outline" size={13} color={colors.textTertiary} />
                  <Text style={styles.testDetailText}>Expected: {formatDate(test.expectedDate)}</Text>
                </View>
              </View>

              {test.progress > 0 && (
                <ProgressBar progress={test.progress} height={5} color={colors.secondary} showLabel style={{ marginBottom: 14 }} />
              )}

              {/* Sub-tests */}
              <View style={styles.subTests}>
                {test.tests.map((subTest: any, i: any) => (
                  <View key={i} style={styles.subTestRow}>
                    <Ionicons
                      name={subTest.status === 'completed' ? 'checkmark-circle' : subTest.status === 'in_progress' ? 'time' : 'ellipse-outline'}
                      size={14}
                      color={subTest.status === 'completed' ? colors.success : subTest.status === 'in_progress' ? colors.secondary : colors.textTertiary}
                    />
                    <Text style={styles.subTestName}>{subTest.name}</Text>
                    <Badge label={subTest.status.replace('_', ' ')} variant={getStatusVariant(subTest.status)} size="sm" />
                  </View>
                ))}
              </View>
            </LinearGradient>
          </View>
        ))}
        <View style={{ height: 100 }} />
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
    addBtn: { padding: 8 },
    summaryRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 16 },
    summaryCard: {
      flex: 1,
      alignItems: 'center',
      padding: 12,
      borderRadius: BorderRadius.md,
      backgroundColor: isDark ? colors.bgCard : '#FFFFFF',
      borderWidth: 1,
    },
    summaryValue: { fontSize: 20, fontWeight: '800' },
    summaryLabel: { fontSize: 10, color: colors.textTertiary, marginTop: 2 },
    content: { paddingHorizontal: 20 },
    testCard: { marginBottom: 14, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    testCardInner: { padding: 16 },
    testHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    testIconWrapper: {
      width: 48, height: 48, borderRadius: 14,
      backgroundColor: 'rgba(0,212,255,0.12)',
      alignItems: 'center', justifyContent: 'center',
    },
    testProduct: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    testStandard: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
    testDetails: { gap: 6, marginBottom: 14 },
    testDetail: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    testDetailText: { fontSize: 12, color: colors.textSecondary },
    subTests: { gap: 8 },
    subTestRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    subTestName: { flex: 1, fontSize: 12, color: colors.textSecondary },
  });

export default TestingScreen;
