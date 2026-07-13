import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const FAQS: { q: string; a: string }[] = [];

const CertificationFAQScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [expanded, setExpanded] = useState<number | null>(0);
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>FAQs</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.aiTip, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}>
          <Ionicons name="bulb" size={18} color={colors.primary} />
          <Text style={[styles.aiTipText, { color: colors.primary }]}>Tap any question to expand the answer</Text>
        </View>

        {FAQS.map((faq, index) => {
          const isExpanded = expanded === index;
          return (
            <View key={index} style={[styles.faqCard, Shadows.sm]}>
              <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.faqCardInner}>
                <TouchableOpacity style={styles.faqHeader} onPress={() => setExpanded(isExpanded ? null : index)} activeOpacity={0.7}>
                  <View style={[styles.faqNum, { backgroundColor: `${colors.primary}20` }]}>
                    <Text style={[styles.faqNumText, { color: colors.primary }]}>{index + 1}</Text>
                  </View>
                  <Text style={styles.question}>{faq.q}</Text>
                  <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
                </TouchableOpacity>
                {isExpanded && (
                  <View style={styles.answerSection}>
                    <View style={[styles.answerLine, { backgroundColor: colors.primary }]} />
                    <Text style={styles.answer}>{faq.a}</Text>
                  </View>
                )}
              </LinearGradient>
            </View>
          );
        })}
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
    aiTip: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: 16 },
    aiTipText: { fontSize: 13, fontWeight: '500' },
    faqCard: { marginBottom: 10, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    faqCardInner: { padding: 0 },
    faqHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16 },
    faqNum: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
    faqNumText: { fontSize: 12, fontWeight: '800' },
    question: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textPrimary, lineHeight: 20 },
    answerSection: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: 16 },
    answerLine: { width: 3, borderRadius: 2 },
    answer: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 22 },
  });

export default CertificationFAQScreen;
