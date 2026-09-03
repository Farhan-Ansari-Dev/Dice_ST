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
    content: 'We collect information you provide, including your name, email address, and phone number; your business profile (company name, business role, company size, industries, target markets, certifications of interest, and country); and the content you add — products, certification applications, and any documents or product photos you upload. To operate the app we also register your device’s push-notification token and record basic in-app activity needed to provide the service. Where you make a payment, we process the related order and payment records.',
  },
  {
    title: 'How We Use Your Data',
    icon: 'analytics-outline' as const,
    content: 'Your data is used to provide compliance services, process certification applications, generate reports, and send important notifications. We never sell your personal data to third parties. See the "AI-Powered Features" section below for how information is used when you use AI features.',
  },
  {
    title: 'Data Sharing',
    icon: 'share-social-outline' as const,
    content: 'We share data with government bodies (BIS, FSSAI, WPC) only as required for certification processing. We work with NABL-accredited labs that require product and company information for testing. When you use AI-powered features, information is also shared with a third-party AI provider — see the "AI-Powered Features" section below.',
  },
  {
    title: 'AI-Powered Features',
    icon: 'sparkles-outline' as const,
    content:
      'Some features in this app are powered by AI. When you use an AI-powered feature, the information needed to process your request is sent to OpenAI, a third-party AI service provider, to generate a result. This may include your business profile (company name, business role, company size, industries, target export markets, certifications of interest, and country), the questions and product details you enter (such as product names, descriptions, HS codes, and markets), and any product photo or document text you choose to submit for analysis. ' +
      'This information is used only to produce your result. AI-powered features require your consent before any data is shared: you can allow or decline when first prompted, and you can review or withdraw your consent at any time in Settings → AI Features & Privacy. Declining turns off only the AI-powered features — the rest of the app continues to work. OpenAI processes this information as a separate company under our agreement with it; we do not make additional representations here about how it retains or uses that information.',
  },
  {
    title: 'Security',
    icon: 'shield-checkmark-outline' as const,
    content: 'We protect your information in transit using encrypted HTTPS/TLS connections. Uploaded files are stored in encrypted cloud storage, and sensitive credentials are encrypted at rest. Access to production systems is restricted to authorized personnel. No method of transmission or storage is completely secure, so while we work to protect your information we cannot guarantee absolute security.',
  },
  {
    title: 'Your Rights',
    icon: 'person-outline' as const,
    content: 'You have the right to access, correct, or delete your personal data at any time. You can request a copy of your data or withdraw consent for marketing communications. To exercise these rights, contact our Data Protection Officer.',
  },
  {
    title: 'Data Retention & Deletion',
    icon: 'trash-outline' as const,
    content:
      'We keep your account and profile information for as long as your account is active. You can delete your account at any time from Profile → Delete Account. ' +
      'When you delete your account, we anonymize your profile so it no longer identifies you and remove your authentication credentials. We permanently delete personal content you own — your AI conversation history, notifications, saved items, push-notification registrations, scheduled meetings, standalone contact enquiries, and private files you uploaded that are not part of a certification or compliance record (the underlying files are deleted from storage). ' +
      'For records we keep for legitimate business, financial, accreditation, or compliance reasons — such as certification and application records, invoices and payment records, support history, and documents that form part of a certification record or that are under a legal hold — we retain the record and either remove or anonymize the personal information within it (for example your name, contact details, free-text messages, and personal attachments) or associate it only with your anonymized profile. ' +
      'Shared organization data is never deleted when you delete your account, because it may belong to other members. We do not keep personal data longer than needed for the purposes described in this policy. For questions about retention, or to make a specific request, contact our Data Protection Officer.',
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
          <Text style={[styles.updateText, { color: colors.primary }]}>Last updated: September 3, 2026</Text>
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
