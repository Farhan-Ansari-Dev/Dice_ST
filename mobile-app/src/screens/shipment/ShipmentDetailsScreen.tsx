import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const ShipmentDetailsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const sections: any[] = [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shipment Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {sections.map((section) => (
          <View key={section.title} style={[styles.sectionCard, Shadows.md]}>
            <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.sectionCardInner}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.rows.map((row: any, i: any) => (
                <View key={row.label} style={[styles.row, i > 0 && styles.rowBorder]}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <Text style={styles.rowValue}>{row.value}</Text>
                </View>
              ))}
            </LinearGradient>
          </View>
        ))}

        <View style={styles.actionRow}>
          {[
            { icon: 'document-text-outline' as const, label: 'BL Copy', color: colors.primary },
            { icon: 'location-outline' as const, label: 'Track', color: colors.success },
            { icon: 'call-outline' as const, label: 'Contact', color: colors.warning },
          ].map((a) => (
            <TouchableOpacity key={a.label} style={[styles.actionBtn, Shadows.sm, { backgroundColor: `${a.color}15` }]}>
              <Ionicons name={a.icon} size={22} color={a.color} />
              <Text style={[styles.actionBtnLabel, { color: a.color }]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
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
    sectionCard: { marginBottom: 14, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    sectionCardInner: { padding: 16 },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.primary, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8 },
    rowBorder: { borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border },
    rowLabel: { fontSize: 13, color: colors.textSecondary, flex: 1 },
    rowValue: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, flex: 1, textAlign: 'right' },
    actionRow: { flexDirection: 'row', gap: 12 },
    actionBtn: { flex: 1, alignItems: 'center', gap: 6, padding: 14, borderRadius: BorderRadius.lg },
    actionBtnLabel: { fontSize: 12, fontWeight: '700' },
  });

export default ShipmentDetailsScreen;
