import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const TERMS_SECTIONS = [
  { title: 'Acceptance of Terms', icon: 'checkmark-circle-outline' as const, content: 'By accessing and using the Sanyog Conformity Solutions app, you agree to be bound by these terms. If you do not agree to these terms, please do not use our services. These terms apply to all users including manufacturers, exporters, importers, and consultants.' },
  { title: 'Services Provided', icon: 'construct-outline' as const, content: 'SCS provides compliance management services including certification application processing, document management, AI-powered compliance guidance, and shipment tracking. We act as a facilitator between businesses and regulatory authorities.' },
  { title: 'User Responsibilities', icon: 'person-outline' as const, content: 'You are responsible for providing accurate information, maintaining account security, and ensuring compliance with all applicable laws. You must not use our services for illegal activities or to misrepresent product compliance status.' },
  { title: 'Payment Terms', icon: 'card-outline' as const, content: 'Service fees are charged as per the quoted amount. Government fees are billed at actuals. Refunds are subject to our refund policy. All amounts are in Indian Rupees and subject to applicable GST.' },
  { title: 'Intellectual Property', icon: 'ribbon-outline' as const, content: 'All content, AI models, and software in the SCS platform are proprietary to Sanyog Conformity Solutions Pvt Ltd. You may not copy, modify, or redistribute our content without written permission.' },
  { title: 'Limitation of Liability', icon: 'warning-outline' as const, content: 'SCS is not liable for certification rejection by regulatory authorities, delays in government processing, or any indirect damages. Our liability is limited to the fees paid for the specific service.' },
  { title: 'Governing Law', icon: 'scale-outline' as const, content: 'These terms are governed by the laws of India. Any disputes shall be resolved through arbitration in Mumbai, Maharashtra, under the Arbitration and Conciliation Act, 1996.' },
  { title: 'Contact & Website', icon: 'globe-outline' as const, content: 'For any queries regarding these terms, visit us at www.sanyogconformity.com or reach us at info@sanyogconformity.com. Sanyog Conformity Solutions Pvt. Ltd. — Your trusted compliance partner.' },
];

const TermsConditionsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [expanded, setExpanded] = useState<string | null>('Acceptance of Terms');
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
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.updateCard, { backgroundColor: `${colors.secondary}15`, borderColor: `${colors.secondary}30` }]}>
          <Ionicons name="calendar-outline" size={16} color={colors.secondary} />
          <Text style={[styles.updateText, { color: colors.secondary }]}>Effective: December 1, 2024</Text>
        </View>

        <Text style={styles.intro}>
          Please read these Terms and Conditions carefully before using the Sanyog Conformity Solutions platform.
        </Text>

        {TERMS_SECTIONS.map((section) => {
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
                  <View style={[styles.sectionIconBg, { backgroundColor: `${colors.secondary}20` }]}>
                    <Ionicons name={section.icon} size={18} color={colors.secondary} />
                  </View>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
                </TouchableOpacity>
                {isExpanded && <Text style={styles.sectionContent}>{section.content}</Text>}
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

export default TermsConditionsScreen;
