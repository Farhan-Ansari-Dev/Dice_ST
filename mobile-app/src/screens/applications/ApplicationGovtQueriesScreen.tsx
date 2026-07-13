import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const ApplicationGovtQueriesScreen: React.FC = () => {
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
        <Text style={styles.headerTitle}>Government Queries</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.queryCard, Shadows.md]}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.queryCardInner}>
            <View style={styles.queryHeader}>
              <View style={[styles.govtIcon, { backgroundColor: `${colors.warning}20` }]}>
                <Ionicons name="business" size={20} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.queryFrom}>BIS Delhi Office</Text>
                <Text style={styles.queryDate}>Dec 15, 2024 • Ref: BIS/QRY/2024/0892</Text>
              </View>
              <View style={[styles.pendBadge, { backgroundColor: `${colors.warning}20` }]}>
                <Text style={[styles.pendText, { color: colors.warning }]}>Pending</Text>
              </View>
            </View>
            <Text style={styles.queryText}>Please provide the updated test report for IS 13252 Part 2 from an NABL accredited laboratory. The previous report submitted was from a non-NABL lab.</Text>
            <TouchableOpacity style={[styles.replyBtn, Shadows.sm]} onPress={() => navigation.navigate('GovernmentQueries')} activeOpacity={0.85}>
              <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.replyBtnGradient}>
                <Ionicons name="chatbubble-outline" size={14} color="#FFFFFF" />
                <Text style={styles.replyBtnText}>Reply to Query</Text>
              </LinearGradient>
            </TouchableOpacity>
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
    queryCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    queryCardInner: { padding: 16, gap: 12 },
    queryHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    govtIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    queryFrom: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    queryDate: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    pendBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
    pendText: { fontSize: 11, fontWeight: '700' },
    queryText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
    replyBtn: { borderRadius: BorderRadius.md, overflow: 'hidden' },
    replyBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 6 },
    replyBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  });

export default ApplicationGovtQueriesScreen;
