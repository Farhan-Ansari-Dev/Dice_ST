import React, { useMemo, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import Svg, { Circle } from 'react-native-svg';

const OVERALL_SCORE = 0;

const CATEGORIES: any[] = [];

const IMPROVEMENTS: any[] = [];

const GaugeCircle: React.FC<{ score: number; size: number; color: string }> = ({ score, size, color }) => {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (score / 100) * circumference;

  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(0,0,0,0.08)" strokeWidth={12} fill="none" />
      <Circle
        cx={size / 2} cy={size / 2} r={radius}
        stroke={color} strokeWidth={12} fill="none"
        strokeDasharray={`${strokeDash} ${circumference}`}
        strokeLinecap="round"
      />
    </Svg>
  );
};

const CategoryBar: React.FC<{ item: typeof CATEGORIES[0]; colors: any; isDark: boolean }> = ({ item, colors, isDark }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: item.score / 100, useNativeDriver: false, tension: 60, friction: 8 }).start();
  }, []);
  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={{ marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 }}>
        <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: `${item.color}20`, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={item.icon} size={14} color={item.color} />
        </View>
        <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: colors.textPrimary }}>{item.label}</Text>
        <Text style={{ fontSize: 13, fontWeight: '800', color: item.color }}>{item.score}</Text>
      </View>
      <View style={{ height: 6, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
        <Animated.View style={{ height: '100%', width, backgroundColor: item.color, borderRadius: 3 }} />
      </View>
      <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 4 }}>{item.detail}</Text>
    </View>
  );
};

const ComplianceScoreScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const scoreColor = OVERALL_SCORE >= 80 ? colors.success : OVERALL_SCORE >= 60 ? colors.warning : colors.error;
  const scoreLabel = OVERALL_SCORE >= 80 ? 'Excellent' : OVERALL_SCORE >= 60 ? 'Good' : 'Needs Work';

  const displayScore = scoreAnim.interpolate({ inputRange: [0, 1], outputRange: [0, OVERALL_SCORE] });

  useEffect(() => {
    Animated.timing(scoreAnim, { toValue: 1, duration: 1200, useNativeDriver: false }).start();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Compliance Score</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

        {/* Gauge card */}
        <View style={[styles.gaugeCard, Shadows.md]}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.gaugeCardInner}>
            <View style={styles.gaugeWrapper}>
              <GaugeCircle score={OVERALL_SCORE} size={180} color={scoreColor} />
              <View style={styles.gaugeCenter}>
                <Animated.Text style={[styles.gaugeScore, { color: scoreColor }]}>
                  {displayScore.interpolate({ inputRange: [0, OVERALL_SCORE], outputRange: ['0', String(OVERALL_SCORE)] })}
                </Animated.Text>
                <Text style={[styles.gaugeLabel, { color: scoreColor }]}>{scoreLabel}</Text>
              </View>
            </View>
            <Text style={styles.gaugeSubtitle}>Overall Compliance Health</Text>
            <View style={[styles.scoreBadge, { backgroundColor: `${scoreColor}15`, borderColor: `${scoreColor}30` }]}>
              <Ionicons name="trending-up" size={14} color={scoreColor} />
              <Text style={[styles.scoreBadgeText, { color: scoreColor }]}>+5 pts from last month</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Category breakdown */}
        <Text style={styles.sectionTitle}>BREAKDOWN BY CATEGORY</Text>
        <View style={[styles.card, Shadows.sm]}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.cardInner}>
            {CATEGORIES.map((cat) => (
              <CategoryBar key={cat.label} item={cat} colors={colors} isDark={isDark} />
            ))}
          </LinearGradient>
        </View>

        {/* Improvements */}
        <Text style={styles.sectionTitle}>HOW TO IMPROVE</Text>
        <View style={[styles.card, Shadows.sm]}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.cardInner}>
            {IMPROVEMENTS.map((item, i) => (
              <View key={i} style={[styles.improveRow, i < IMPROVEMENTS.length - 1 && styles.improveBorder]}>
                <View style={[styles.improveIcon, { backgroundColor: `${item.color}15` }]}>
                  <Ionicons name={item.icon} size={16} color={item.color} />
                </View>
                <Text style={styles.improveText}>{item.text}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
              </View>
            ))}
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
    content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 60 },
    gaugeCard: { borderRadius: BorderRadius.xl, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    gaugeCardInner: { padding: 24, alignItems: 'center' },
    gaugeWrapper: { width: 180, height: 180, position: 'relative', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    gaugeCenter: { position: 'absolute', alignItems: 'center' },
    gaugeScore: { fontSize: 48, fontWeight: '900' },
    gaugeLabel: { fontSize: 13, fontWeight: '700', marginTop: -4 },
    gaugeSubtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 12 },
    scoreBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1 },
    scoreBadgeText: { fontSize: 12, fontWeight: '600' },
    sectionTitle: { fontSize: 11, fontWeight: '700', color: colors.textTertiary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10, marginTop: 4 },
    card: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    cardInner: { padding: 16 },
    improveRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    improveBorder: { borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border },
    improveIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    improveText: { flex: 1, fontSize: 13, color: colors.textPrimary, lineHeight: 18 },
  });

export default ComplianceScoreScreen;
