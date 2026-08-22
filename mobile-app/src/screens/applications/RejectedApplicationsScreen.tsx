import React, { useMemo } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import EmptyState from '../../components/common/EmptyState';
import { useApplicationsByBucket } from '../../hooks/useApplicationsByBucket';

const RejectedApplicationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { items: REJECTED, loading, refreshing, error, refresh } = useApplicationsByBucket('rejected');
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
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
      <FlatList
        data={REJECTED}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState icon={error ? 'cloud-offline-outline' : 'close-circle-outline'} title={error ? 'Could not load' : 'No Rejected Applications'} subtitle={error ?? 'Great — nothing has been rejected.'} />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
        renderItem={({ item }) => (
          <View style={[styles.rejCard, Shadows.md]}>
            <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.rejCardInner}>
              <View style={styles.rejRow}>
                <View style={[styles.rejIcon, { backgroundColor: `${colors.error}20` }]}>
                  <Ionicons name="close-circle" size={22} color={colors.error} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rejName}>{item.name}</Text>
                  <Text style={styles.rejMeta}>{item.type} • {item.appId}</Text>
                  <Text style={styles.rejDate}>Updated: {item.updated}</Text>
                </View>
              </View>
              <View style={[styles.reasonCard, { backgroundColor: `${colors.error}10`, borderColor: `${colors.error}30` }]}>
                <Text style={styles.reasonTitle}>Reason: </Text>
                <Text style={styles.reasonText}>{item.reason ?? 'Not specified — open the application for details.'}</Text>
              </View>
              <TouchableOpacity style={[styles.reapplyBtn, Shadows.sm]} onPress={() => navigation.navigate('NewApplication')} activeOpacity={0.85}>
                <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.reapplyBtnGradient}>
                  <Ionicons name="refresh" size={14} color="#FFFFFF" />
                  <Text style={styles.reapplyText}>Reapply</Text>
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}
      />
      )}
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? colors.bgCardLight : colors.border, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
    rejCard: { marginBottom: 12, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    rejCardInner: { padding: 16, gap: 12 },
    rejRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rejIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    rejName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    rejMeta: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    rejDate: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
    reasonCard: { flexDirection: 'row', padding: 10, borderRadius: BorderRadius.md, borderWidth: 1, gap: 4 },
    reasonTitle: { fontSize: 12, fontWeight: '700', color: colors.error },
    reasonText: { fontSize: 12, color: colors.textSecondary, flex: 1 },
    reapplyBtn: { borderRadius: BorderRadius.md, overflow: 'hidden' },
    reapplyBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 6 },
    reapplyText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  });

export default RejectedApplicationsScreen;
