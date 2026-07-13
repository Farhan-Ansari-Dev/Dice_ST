import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import EmptyState from '../../components/common/EmptyState';

const REJECTED: any[] = [];

const RejectedCertificationsScreen: React.FC = () => {
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
        <Text style={styles.headerTitle}>Rejected Applications</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={REJECTED}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState icon="close-circle-outline" title="No Rejected Certifications" subtitle="No rejections on record." />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View style={[styles.infoCard, { backgroundColor: `${colors.error}15`, borderColor: `${colors.error}30` }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.error} />
            <Text style={[styles.infoText, { color: colors.error }]}>Address the rejection reason before reapplying</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.rejCard, Shadows.md]}>
            <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.rejCardInner}>
              <View style={styles.rejHeader}>
                <View style={[styles.rejIcon, { backgroundColor: `${colors.error}20` }]}>
                  <Ionicons name="close-circle" size={22} color={colors.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rejName}>{item.name}</Text>
                  <Text style={styles.rejType}>{item.type} • {item.appId}</Text>
                </View>
                <Text style={styles.rejDate}>{item.rejectedOn}</Text>
              </View>

              <View style={[styles.reasonCard, { backgroundColor: `${colors.error}10`, borderColor: `${colors.error}30` }]}>
                <Text style={styles.reasonLabel}>Rejection Reason</Text>
                <Text style={styles.reasonText}>{item.reason}</Text>
              </View>

              <TouchableOpacity
                style={[styles.reapplyBtn, Shadows.sm]}
                onPress={() => navigation.navigate('NewApplication')}
                activeOpacity={0.85}
              >
                <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.reapplyBtnGradient}>
                  <Ionicons name="refresh" size={16} color="#FFFFFF" />
                  <Text style={styles.reapplyText}>Reapply</Text>
                </LinearGradient>
              </TouchableOpacity>
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
    infoCard: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: 16 },
    infoText: { fontSize: 13, fontWeight: '500', flex: 1 },
    rejCard: { marginBottom: 16, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    rejCardInner: { padding: 16 },
    rejHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    rejIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    rejName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    rejType: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    rejDate: { fontSize: 11, color: colors.textTertiary },
    reasonCard: { borderRadius: BorderRadius.md, borderWidth: 1, padding: 12, marginBottom: 12 },
    reasonLabel: { fontSize: 11, fontWeight: '700', color: colors.error, marginBottom: 6 },
    reasonText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
    reapplyBtn: { borderRadius: BorderRadius.md, overflow: 'hidden' },
    reapplyBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 },
    reapplyText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  });

export default RejectedCertificationsScreen;
