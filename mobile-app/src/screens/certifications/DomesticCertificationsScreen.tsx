import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import EmptyState from '../../components/common/EmptyState';
import Badge, { getStatusVariant } from '../../components/common/Badge';
import ProgressBar from '../../components/common/ProgressBar';

const CERTS: any[] = [];

const DomesticCertificationsScreen: React.FC = () => {
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
        <Text style={styles.headerTitle}>Domestic Certifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={CERTS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState icon="shield-checkmark-outline" title="No Domestic Certifications" subtitle="Start a new application to get certified." />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={[styles.certCard, Shadows.md]} onPress={() => navigation.navigate('CertificationDetail', { id: item.id })} activeOpacity={0.85}>
            <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.certCardInner}>
              <View style={styles.certTop}>
                <View style={[styles.certIcon, { backgroundColor: `${item.color}20` }]}>
                  <Ionicons name={item.icon as any} size={22} color={item.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.certName}>{item.name}</Text>
                  <Text style={styles.certType}>{item.type}</Text>
                </View>
                <Badge label={item.status.replace('_', ' ')} variant={getStatusVariant(item.status)} size="sm" dot />
              </View>
              {item.progress < 100 && (
                <ProgressBar progress={item.progress} height={4} color={item.color} showLabel label={`${item.progress}%`} style={{ marginTop: 10 }} />
              )}
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
    listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100 },
    certCard: { marginBottom: 12, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    certCardInner: { padding: 16 },
    certTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    certIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    certName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    certType: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
  });

export default DomesticCertificationsScreen;
