import React, { useMemo } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const HISTORY: any[] = [];

const ACTION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Status Changed': 'swap-horizontal',
  'Document Uploaded': 'cloud-upload',
  'Note Added': 'create',
  'Manager Assigned': 'person-add',
  'Application Created': 'document-text',
};

const ApplicationHistoryScreen: React.FC = () => {
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
        <Text style={styles.headerTitle}>Audit History</Text>
        <View style={{ width: 40 }} />
      </View>
      <FlatList
        data={HISTORY}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <View style={styles.histRow}>
            <View style={styles.histLeft}>
              <View style={[styles.histDot, { backgroundColor: `${colors.primary}20`, borderColor: colors.primary }]}>
                <Ionicons name={ACTION_ICONS[item.action] || 'ellipse'} size={12} color={colors.primary} />
              </View>
              {index < HISTORY.length - 1 && <View style={[styles.histLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]} />}
            </View>
            <View style={[styles.histCard, Shadows.sm, { marginBottom: index < HISTORY.length - 1 ? 12 : 0 }]}>
              <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.histCardInner}>
                <Text style={styles.histAction}>{item.action}</Text>
                {item.from && <Text style={styles.histFrom}>From: {item.from}</Text>}
                <Text style={styles.histTo}>→ {item.to}</Text>
                <Text style={styles.histMeta}>{item.time} • {item.by}</Text>
              </LinearGradient>
            </View>
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
    histRow: { flexDirection: 'row', gap: 12 },
    histLeft: { alignItems: 'center', width: 28 },
    histDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    histLine: { width: 2, flex: 1, marginTop: 4 },
    histCard: { flex: 1, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    histCardInner: { padding: 12 },
    histAction: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
    histFrom: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    histTo: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
    histMeta: { fontSize: 10, color: colors.textTertiary, marginTop: 4 },
  });

export default ApplicationHistoryScreen;
