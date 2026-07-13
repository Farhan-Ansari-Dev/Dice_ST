import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import EmptyState from '../../components/common/EmptyState';

const REPORTS: any[] = [];

const TestReportsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => { setRefreshing(true); await new Promise(r => setTimeout(r, 800)); setRefreshing(false); };
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lab Test Reports</Text>
        <View style={{ width: 40 }} />
      </View>
      <FlatList
        data={REPORTS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState icon="flask-outline" title="No Test Reports" subtitle="Test reports will appear here once available." />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        renderItem={({ item }) => (
          <View style={[styles.reportCard, Shadows.md]}>
            <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.reportCardInner}>
              <View style={styles.reportRow}>
                <View style={[styles.reportIcon, { backgroundColor: item.result === 'pass' ? `${colors.success}20` : `${colors.error}20` }]}>
                  <Ionicons name={item.result === 'pass' ? 'checkmark-circle' : 'close-circle'} size={22} color={item.result === 'pass' ? colors.success : colors.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{item.product}</Text>
                  <Text style={styles.labName}>{item.lab}</Text>
                  <Text style={styles.reportMeta}>Report: {item.reportNo}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={styles.reportDate}>{item.date}</Text>
                  <View style={[styles.resultBadge, { backgroundColor: item.result === 'pass' ? `${colors.success}20` : `${colors.error}20` }]}>
                    <Text style={[styles.resultText, { color: item.result === 'pass' ? colors.success : colors.error }]}>
                      {item.result === 'pass' ? 'PASS' : 'FAIL'}
                    </Text>
                  </View>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}
      />
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? colors.bgCardLight : colors.border, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
    reportCard: { marginBottom: 12, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    reportCardInner: { padding: 16 },
    reportRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    reportIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    productName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    labName: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    reportMeta: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    reportDate: { fontSize: 11, color: colors.textTertiary },
    resultBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
    resultText: { fontSize: 11, fontWeight: '800' },
  });

export default TestReportsScreen;
