import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const SECTIONS = [
  {
    title: 'Data Collection',
    icon: 'cloud-upload-outline' as const,
    content: 'We collect information you provide when you create an account, including your name, email address, phone number, and company details. We also collect usage data to improve our services, such as features you interact with and how you navigate the app.',
  },
  {
    title: 'How We Use Your Data',
    icon: 'analytics-outline' as const,
    content: 'Your data is used to provide compliance services, process certification applications, generate reports, and send important notifications. We use anonymized data for improving AI models and app performance. We never sell your personal data to third parties.',
  },
  {
    title: 'Data Sharing',
    icon: 'share-social-outline' as const,
    content: 'We share data with government bodies (BIS, FSSAI, WPC) only as required for certification processing. We work with NABL-accredited labs that require product and company information for testing. All third-party partners are bound by strict confidentiality agreements.',
  },
  {
    title: 'Security',
    icon: 'shield-checkmark-outline' as const,
    content: 'We implement industry-standard security measures including end-to-end encryption, secure HTTPS connections, and regular security audits. Your data is stored in ISO 27001 certified data centers located within India, complying with data localization requirements.',
  },
  {
    title: 'Your Rights',
    icon: 'person-outline' as const,
    content: 'You have the right to access, correct, or delete your personal data at any time. You can request a copy of your data or withdraw consent for marketing communications. To exercise these rights, contact our Data Protection Officer.',
  },
  {
    title: 'Contact Us',
    icon: 'mail-outline' as const,
    content: 'For privacy-related queries, contact us at info@sanyogconformity.com or visit www.sanyogconformity.com. You may also write to: Data Protection Officer, Sanyog Conformity Solutions Pvt. Ltd., India.',
  },
];

const PrivacyPolicyScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [expanded, setExpanded] = useState<string | null>('Data Collection');
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.updateCard, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}>
          <Ionicons name="calendar-outline" size={16} color={colors.primary} />
          <Text style={[styles.updateText, { color: colors.primary }]}>Last updated: December 1, 2024</Text>
        </View>

        <Text style={styles.intro}>
          Sanyog Conformity Solutions is committed to protecting your privacy. This policy explains how we collect, use, and protect your personal information.
        </Text>

        {SECTIONS.map((section) => {
          const isExpanded = expanded === section.title;
          return (
            <View key={section.title} style={[styles.sectionCard, Shadows.sm]}>
              <LinearGradient
                colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
                style={styles.sectionCardInner}
              >
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() => setExpanded(isExpanded ? null : section.title)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.sectionIconBg, { backgroundColor: `${colors.primary}20` }]}>
                    <Ionicons name={section.icon} size={18} color={colors.primary} />
                  </View>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
                </TouchableOpacity>
                {isExpanded && (
                  <Text style={styles.sectionContent}>{section.content}</Text>
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
    updateCard: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: 16 },
    updateText: { fontSize: 13, fontWeight: '600' },
    intro: { fontSize: 14, color: colors.textSecondary, lineHeight: 22, marginBottom: 20 },
    sectionCard: { marginBottom: 10, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    sectionCardInner: { padding: 0 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
    sectionIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    sectionTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.textPrimary },
    sectionContent: { fontSize: 13, color: colors.textSecondary, lineHeight: 22, paddingHorizontal: 16, paddingBottom: 16 },
  });

export default PrivacyPolicyScreen;
