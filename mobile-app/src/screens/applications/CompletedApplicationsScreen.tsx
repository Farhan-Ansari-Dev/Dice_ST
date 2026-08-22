import React, { useMemo } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import EmptyState from '../../components/common/EmptyState';
import { useApplicationsByBucket } from '../../hooks/useApplicationsByBucket';

const CompletedApplicationsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { items: COMPLETED, loading, refreshing, error, refresh } = useApplicationsByBucket('completed');
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Completed</Text>
        <View style={{ width: 40 }} />
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
      <FlatList
        data={COMPLETED}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState icon={error ? 'cloud-offline-outline' : 'checkmark-circle-outline'} title={error ? 'Could not load' : 'No Completed Applications'} subtitle={error ?? 'Completed applications will appear here.'} />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
        renderItem={({ item }) => (
          <View style={[styles.compCard, Shadows.md]}>
            <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.compCardInner}>
              <View style={styles.compRow}>
                <LinearGradient colors={[item.color, `${item.color}AA`]} style={styles.compIcon}>
                  <Ionicons name={item.icon} size={22} color="#FFFFFF" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={styles.compName}>{item.name}</Text>
                  <Text style={styles.compType}>{item.type} • {item.appId}</Text>
                  <Text style={styles.compCert}>Stage: {item.stage}</Text>
                </View>
                <View style={[styles.doneBadge, { backgroundColor: `${colors.success}20` }]}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                </View>
              </View>
              <View style={styles.compFooter}>
                <Text style={styles.completedOn}>Updated: {item.updated}</Text>
                <TouchableOpacity style={[styles.downloadBtn, { backgroundColor: `${colors.primary}20` }]} onPress={() => navigation.navigate('ApplicationDetail', { id: item.id })} activeOpacity={0.7}>
                  <Ionicons name="open-outline" size={14} color={colors.primary} />
                  <Text style={[styles.downloadText, { color: colors.primary }]}>View</Text>
                </TouchableOpacity>
              </View>
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
    compCard: { marginBottom: 12, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    compCardInner: { padding: 16 },
    compRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    compIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    compName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    compType: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    compCert: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    doneBadge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    compFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    completedOn: { fontSize: 12, color: colors.textTertiary },
    downloadBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full },
    downloadText: { fontSize: 12, fontWeight: '600' },
  });

export default CompletedApplicationsScreen;
