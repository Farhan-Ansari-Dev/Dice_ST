import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import EmptyState from '../../components/common/EmptyState';

const EXPIRY_DATA: any[] = [];

const ExpiryTrackerScreen: React.FC = () => {
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
        <Text style={styles.headerTitle}>Expiry Tracker</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={EXPIRY_DATA}
        keyExtractor={(item) => item.group}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState icon="time-outline" title="No Expiring Documents" subtitle="All documents are valid." />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        renderItem={({ item: group }) => (
          <View style={styles.groupSection}>
            <View style={styles.groupHeader}>
              <View style={[styles.groupDot, { backgroundColor: group.color }]} />
              <Text style={[styles.groupTitle, { color: group.color }]}>{group.group}</Text>
              <View style={[styles.groupCount, { backgroundColor: `${group.color}20` }]}>
                <Text style={[styles.groupCountText, { color: group.color }]}>{group.items.length}</Text>
              </View>
            </View>
            {(group.items || []).map((item: any) => (
              <View key={item.id} style={[styles.itemCard, Shadows.sm]}>
                <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.itemCardInner}>
                  <View style={styles.itemRow}>
                    <View style={[styles.itemIcon, { backgroundColor: `${group.color}20` }]}>
                      <Ionicons name="time-outline" size={20} color={group.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemCertNo}>{item.certNo}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 3 }}>
                      <Text style={styles.itemExpiry}>Exp: {item.expiry}</Text>
                      <View style={[styles.daysTag, { backgroundColor: `${group.color}20` }]}>
                        <Text style={[styles.daysTagText, { color: group.color }]}>{item.daysLeft}d left</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          backgroundColor: group.color,
                          width: `${Math.max(5, Math.min(100, 100 - (item.daysLeft / 180) * 100))}%`,
                        },
                      ]}
                    />
                  </View>
                  <TouchableOpacity style={[styles.renewBtn, { borderColor: group.color }]}>
                    <Text style={[styles.renewBtnText, { color: group.color }]}>Start Renewal</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            ))}
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
    listContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },
    groupSection: { marginBottom: 20 },
    groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    groupDot: { width: 8, height: 8, borderRadius: 4 },
    groupTitle: { fontSize: 15, fontWeight: '800', flex: 1 },
    groupCount: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    groupCountText: { fontSize: 12, fontWeight: '800' },
    itemCard: { marginBottom: 10, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    itemCardInner: { padding: 14 },
    itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
    itemIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    itemName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    itemCertNo: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    itemExpiry: { fontSize: 11, color: colors.textTertiary },
    daysTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
    daysTagText: { fontSize: 11, fontWeight: '700' },
    progressBarBg: { height: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border, borderRadius: 2, marginBottom: 10 },
    progressBarFill: { height: 4, borderRadius: 2 },
    renewBtn: { borderWidth: 1, borderRadius: BorderRadius.md, paddingVertical: 7, alignItems: 'center' },
    renewBtnText: { fontSize: 12, fontWeight: '700' },
  });

export default ExpiryTrackerScreen;
