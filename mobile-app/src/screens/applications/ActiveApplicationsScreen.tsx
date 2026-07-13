import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import EmptyState from '../../components/common/EmptyState';
import ProgressBar from '../../components/common/ProgressBar';

const ACTIVE: any[] = [];

const ActiveApplicationsScreen: React.FC = () => {
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
        <Text style={styles.headerTitle}>Active Applications</Text>
        <View style={[styles.countBadge, { backgroundColor: `${colors.primary}20` }]}>
          <Text style={[styles.countText, { color: colors.primary }]}>{ACTIVE.length}</Text>
        </View>
      </View>
      <FlatList
        data={ACTIVE}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState icon="document-text-outline" title="No Active Applications" subtitle="Submit a new application to get started." />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.appCard, Shadows.md]} onPress={() => navigation.navigate('ApplicationDetail', { id: item.id })} activeOpacity={0.85}>
            <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.appCardInner}>
              <View style={styles.appRow}>
                <View style={[styles.appIcon, { backgroundColor: `${item.color}20` }]}>
                  <Ionicons name="document-text" size={22} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.appName}>{item.name}</Text>
                  <Text style={styles.appType}>{item.type} • {item.appId}</Text>
                </View>
                <View style={[styles.stageBadge, { backgroundColor: `${item.color}20` }]}>
                  <Text style={[styles.stageText, { color: item.color }]}>{item.stage}</Text>
                </View>
              </View>
              <ProgressBar progress={item.progress} height={6} color={item.color} showLabel label={`${item.progress}%`} style={{ marginTop: 12 }} />
              <Text style={styles.updatedText}>Updated: {item.updated}</Text>
            </LinearGradient>
          </TouchableOpacity>
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
    countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
    countText: { fontSize: 13, fontWeight: '700' },
    listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
    appCard: { marginBottom: 12, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    appCardInner: { padding: 16 },
    appRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
    appIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    appName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    appType: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    stageBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
    stageText: { fontSize: 11, fontWeight: '700' },
    updatedText: { fontSize: 11, color: colors.textTertiary, marginTop: 6 },
  });

export default ActiveApplicationsScreen;
