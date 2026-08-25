import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import { SERVICE_GROUPS } from '../../data/services';

const groupColor = (key: string, colors: ReturnType<typeof useTheme>['colors']) => {
  switch (key) {
    case 'international': return colors.primary;
    case 'domestic': return colors.secondary;
    case 'testing': return colors.warning;
    case 'inspection': return colors.success;
    default: return colors.primary;
  }
};

const ServicesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const filterKey: string | undefined = route.params?.key;
  const groups = useMemo(
    () => (filterKey ? SERVICE_GROUPS.filter((g) => g.key === filterKey) : SERVICE_GROUPS),
    [filterKey],
  );
  const single = groups.length === 1 ? groups[0] : null;
  const total = useMemo(() => groups.reduce((n, g) => n + g.items.length, 0), [groups]);

  const openService = (name: string, category: string, categoryKey: string) =>
    navigation.navigate('ServiceDetail', { name, category, categoryKey });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{single ? single.title : 'Services'}</Text>
          <Text style={styles.headerSub}>
            {single ? `${total} services` : `${total} services across certification, testing & inspection`}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}>
        {groups.map((group) => {
          const accent = groupColor(group.key, colors);
          return (
            <View key={group.key} style={styles.group}>
              {!single && (
                <View style={styles.groupHeader}>
                  <View style={[styles.groupIcon, { backgroundColor: `${accent}1A` }]}>
                    <Ionicons name={group.icon as any} size={18} color={accent} />
                  </View>
                  <Text style={styles.groupTitle}>{group.title}</Text>
                </View>
              )}
              <View style={styles.card}>
                {group.items.map((item, i) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.row, i < group.items.length - 1 && styles.rowDivider]}
                    onPress={() => openService(item, group.title, group.key)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.dot, { backgroundColor: accent }]} />
                    <Text style={styles.rowText}>{item}</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
    headerSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    group: { marginTop: 20 },
    groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    groupIcon: { width: 34, height: 34, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
    groupTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, flex: 1 },
    card: { backgroundColor: colors.bgCard, borderRadius: BorderRadius.base, borderWidth: 1, borderColor: colors.border, ...Shadows.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
    rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    dot: { width: 6, height: 6, borderRadius: 3 },
    rowText: { fontSize: 14, color: colors.textPrimary, flex: 1 },
  });

export default ServicesScreen;
