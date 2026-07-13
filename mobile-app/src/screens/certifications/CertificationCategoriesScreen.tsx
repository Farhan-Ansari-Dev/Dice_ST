import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 52) / 2;

const CATEGORIES = [
  { id: '1', name: 'Electronics', icon: 'phone-portrait' as const, count: 8, gradient: ['#6C63FF', '#4F46E5'] as [string, string] },
  { id: '2', name: 'Food & Beverage', icon: 'nutrition' as const, count: 5, gradient: ['#00C896', '#00A87E'] as [string, string] },
  { id: '3', name: 'Textiles', icon: 'shirt' as const, count: 3, gradient: ['#F59E0B', '#D97706'] as [string, string] },
  { id: '4', name: 'Chemicals', icon: 'flask' as const, count: 4, gradient: ['#EF4444', '#DC2626'] as [string, string] },
  { id: '5', name: 'Medical Devices', icon: 'medkit' as const, count: 6, gradient: ['#00D4FF', '#0099BB'] as [string, string] },
  { id: '6', name: 'Cosmetics', icon: 'sparkles' as const, count: 2, gradient: ['#EC4899', '#BE185D'] as [string, string] },
  { id: '7', name: 'Automotive', icon: 'car' as const, count: 4, gradient: ['#8B5CF6', '#7C3AED'] as [string, string] },
  { id: '8', name: 'Solar Energy', icon: 'sunny' as const, count: 3, gradient: ['#F59E0B', '#92400E'] as [string, string] },
];

const CertificationCategoriesScreen: React.FC = () => {
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
        <Text style={styles.headerTitle}>Certification Categories</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Browse certifications by industry category</Text>
        <View style={styles.grid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryCard, Shadows.md, { width: CARD_SIZE }]}
              onPress={() => navigation.navigate('Certifications')}
              activeOpacity={0.85}
            >
              <LinearGradient colors={cat.gradient} style={styles.categoryCardInner}>
                <Ionicons name={cat.icon} size={32} color="rgba(255,255,255,0.9)" />
                <Text style={styles.categoryName}>{cat.name}</Text>
                <Text style={styles.categoryCount}>{cat.count} certifications</Text>
              </LinearGradient>
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
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.textPrimary },
    content: { paddingHorizontal: 20, paddingTop: 8 },
    subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 20 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    categoryCard: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
    categoryCardInner: { padding: 20, gap: 8, minHeight: 130, justifyContent: 'flex-end' },
    categoryName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
    categoryCount: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  });

export default CertificationCategoriesScreen;
