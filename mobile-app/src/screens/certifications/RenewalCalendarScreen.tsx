import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  SectionList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

interface RenewalItem {
  id: string;
  certName: string;
  certNo: string;
  product: string;
  daysLeft: number;
  dueDate: string;
}

interface Section {
  title: string;
  data: RenewalItem[];
}

const RENEWAL_DATA: Section[] = [];

const getUrgencyColor = (daysLeft: number, colors: any) => {
  if (daysLeft < 30) return colors.error ?? '#FF5A5A';
  if (daysLeft < 90) return colors.warning;
  return colors.success;
};

const getUrgencyLabel = (daysLeft: number) => {
  if (daysLeft < 30) return 'Critical';
  if (daysLeft < 90) return 'Upcoming';
  return 'On Track';
};

const RenewalCalendarScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const renderItem = ({ item }: { item: RenewalItem }) => {
    const urgencyColor = getUrgencyColor(item.daysLeft, colors);
    return (
      <View style={[styles.certCard, Shadows.sm]}>
        <LinearGradient
          colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
          style={styles.certCardInner}
        >
          <View style={[styles.urgencyBar, { backgroundColor: urgencyColor }]} />
          <View style={styles.certBody}>
            <View style={styles.certTop}>
              <View style={styles.certIconWrap}>
                <Ionicons name="shield-checkmark-outline" size={18} color={urgencyColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.certName}>{item.certName}</Text>
                <Text style={styles.certNo}>{item.certNo}</Text>
              </View>
              <View style={[styles.urgencyBadge, { backgroundColor: `${urgencyColor}20` }]}>
                <View style={[styles.urgencyDot, { backgroundColor: urgencyColor }]} />
                <Text style={[styles.urgencyText, { color: urgencyColor }]}>
                  {getUrgencyLabel(item.daysLeft)}
                </Text>
              </View>
            </View>
            <View style={styles.certMeta}>
              <Text style={styles.metaText}>
                <Ionicons name="cube-outline" size={12} color={colors.textTertiary} /> {item.product}
              </Text>
              <Text style={styles.metaText}>
                <Ionicons name="calendar-outline" size={12} color={colors.textTertiary} /> Due: {item.dueDate}
              </Text>
            </View>
            <View style={styles.certFooter}>
              <View style={[styles.daysChip, { backgroundColor: `${urgencyColor}15` }]}>
                <Text style={[styles.daysText, { color: urgencyColor }]}>
                  {item.daysLeft} days left
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.renewBtn, { backgroundColor: urgencyColor }]}
                onPress={() => Alert.alert('Renew Now', `Starting renewal for ${item.certName}`)}
              >
                <Text style={styles.renewBtnText}>Renew Now</Text>
                <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  const renderSectionHeader = ({ section }: { section: Section }) => (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionCount}>{section.data.length} due</Text>
    </View>
  );

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
        <Text style={styles.headerTitle}>Renewal Calendar</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {[
          { color: colors.error ?? '#FF5A5A', label: '<30 days' },
          { color: colors.warning, label: '<90 days' },
          { color: colors.success, label: '>90 days' },
        ].map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <SectionList
        sections={RENEWAL_DATA}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        ListFooterComponent={<View style={{ height: 100 }} />}
      />
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
    legend: {
      flexDirection: 'row',
      gap: 16,
      paddingHorizontal: 20,
      marginBottom: 8,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendLabel: { fontSize: 12, color: colors.textTertiary },
    listContent: { paddingHorizontal: 20 },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 20,
      marginBottom: 10,
    },
    sectionDot: { width: 6, height: 6, borderRadius: 3 },
    sectionTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.textPrimary },
    sectionCount: { fontSize: 12, color: colors.textTertiary },
    certCard: {
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
      marginBottom: 10,
      flexDirection: 'row',
    },
    certCardInner: { flex: 1, flexDirection: 'row' },
    urgencyBar: { width: 4, borderTopLeftRadius: BorderRadius.lg, borderBottomLeftRadius: BorderRadius.lg },
    certBody: { flex: 1, padding: 14 },
    certTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
    certIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: 'rgba(108,99,255,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    certName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    certNo: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    urgencyBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: BorderRadius.full,
    },
    urgencyDot: { width: 5, height: 5, borderRadius: 3 },
    urgencyText: { fontSize: 11, fontWeight: '600' },
    certMeta: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    metaText: { fontSize: 12, color: colors.textTertiary },
    certFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    daysChip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: BorderRadius.full,
    },
    daysText: { fontSize: 12, fontWeight: '700' },
    renewBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: BorderRadius.full,
    },
    renewBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  });

export default RenewalCalendarScreen;
