import React, { useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Shadows, BorderRadius } from '../../theme';

const PROCESS_OPTIONS = [
  {
    id: 'certifications',
    title: 'Certifications',
    subtitle: 'Apply for BIS, EPR, WPC, and more.',
    icon: 'ribbon-outline',
    routePayload: ['MainTabs', { screen: 'Certifications', params: { screen: 'NewCertification' } }],
    gradient: ['#007BFF', '#00C6FF'],
    bg: '#F8F9FE',
    border: '#E8EAF6'
  },
  {
    id: 'testing',
    title: 'Testing',
    subtitle: 'Book lab tests and safety checks.',
    icon: 'flask-outline',
    routePayload: ['Testing', { screen: 'NewTesting' }],
    gradient: ['#00B4DB', '#0083B0'],
    bg: '#F0FAFA',
    border: '#E0F2F1'
  },
  {
    id: 'inspection',
    title: 'Inspection',
    subtitle: 'Schedule factory or product inspections.',
    icon: 'search-outline',
    routePayload: ['Testing', { screen: 'NewInspection' }],
    gradient: ['#FF8008', '#FFC837'],
    bg: '#FFF8F0',
    border: '#FFE0B2'
  }
];

const NewApplicationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const handlePress = (option: any) => {
    navigation.navigate(...option.routePayload);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#EEF3FF']}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerEyebrow}>CREATE</Text>
          <Text style={styles.headerTitle}>Start a new application</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, Shadows.lg]}>
          <LinearGradient
            colors={isDark ? ['rgba(108,99,255,0.24)', 'rgba(0,212,255,0.12)'] : ['#FFFFFF', '#F7F9FF']}
            style={styles.heroCardInner}
          >
            <View style={styles.heroTopRow}>
              <LinearGradient colors={colors.gradientPrimary} style={styles.heroIconWrap}>
                <Ionicons name="layers-outline" size={24} color="#FFFFFF" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>Choose the best path, then launch it fast</Text>
                <Text style={styles.heroSubtitle}>
                  Pick a starting workflow. Every option keeps the same app flow underneath, but the interface is tuned for speed, clarity, and better decision making.
                </Text>
              </View>
            </View>

            <View style={styles.heroStatsRow}>
              {[
                { value: '3', label: 'Entry paths' },
                { value: '1 tap', label: 'Start action' },
                { value: 'Zero', label: 'Flow change' },
              ].map((item) => (
                <View key={item.label} style={styles.heroStatChip}>
                  <Text style={styles.heroStatValue}>{item.value}</Text>
                  <Text style={styles.heroStatLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </View>

        {PROCESS_OPTIONS.map((option) => (
          <TouchableOpacity 
            key={option.id} 
            style={[styles.card, { backgroundColor: isDark ? colors.bgCardLight : option.bg, borderColor: isDark ? 'rgba(255,255,255,0.05)' : option.border }]}
            onPress={() => handlePress(option)}
            activeOpacity={0.8}
          >
            <LinearGradient colors={option.gradient as any} style={styles.iconWrap}>
              <Ionicons name={option.icon as any} size={24} color="#FFFFFF" />
            </LinearGradient>
            
            <View style={styles.cardTextWrap}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>{option.title}</Text>
                <View style={styles.cardPill}>
                  <Text style={styles.cardPillText}>Recommended</Text>
                </View>
              </View>
              <Text style={styles.cardSubtitle}>{option.subtitle}</Text>
              <View style={styles.cardMetaRow}>
                <Text style={styles.cardMetaText}>Fast setup</Text>
                <Text style={styles.cardMetaDot}>•</Text>
                <Text style={styles.cardMetaText}>Guided flow</Text>
              </View>
            </View>
            
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDark },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, gap: 16 },
    headerEyebrow: { fontSize: 11, fontWeight: '800', color: colors.textTertiary, letterSpacing: 1.2, marginBottom: 4 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border },
    headerTitle: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
    scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, gap: 16 },
    heroCard: { borderRadius: BorderRadius.xl, overflow: 'hidden' },
    heroCardInner: { padding: 18, gap: 16 },
    heroTopRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
    heroIconWrap: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    heroTitle: { fontSize: 18, lineHeight: 26, fontWeight: '800', color: colors.textPrimary, marginBottom: 6 },
    heroSubtitle: { fontSize: 13, lineHeight: 20, color: colors.textSecondary },
    heroStatsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
    heroStatChip: { flexGrow: 1, minWidth: 92, paddingHorizontal: 12, paddingVertical: 10, borderRadius: BorderRadius.lg, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border },
    heroStatValue: { fontSize: 13, fontWeight: '800', color: colors.textPrimary, marginBottom: 2 },
    heroStatLabel: { fontSize: 11, color: colors.textTertiary },
  card: { 
    flexDirection: 'row', 
      alignItems: 'flex-start', 
      padding: 16, 
    borderRadius: BorderRadius.xl, 
    borderWidth: 1,
      gap: 14,
    ...Shadows.sm
  },
    iconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    cardTextWrap: { flex: 1, justifyContent: 'center' },
    cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
    cardTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.textPrimary },
    cardPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full, backgroundColor: isDark ? 'rgba(0,212,255,0.14)' : 'rgba(0,212,255,0.12)' },
    cardPillText: { fontSize: 10, fontWeight: '800', color: colors.secondary, letterSpacing: 0.4 },
    cardSubtitle: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginBottom: 8 },
    cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    cardMetaText: { fontSize: 11, color: colors.textTertiary, fontWeight: '600' },
    cardMetaDot: { fontSize: 11, color: colors.textTertiary },
});

export default NewApplicationScreen;
