/**
 * Certification overview / marketing page.
 *
 * Replaces the old behaviour where Saudi PCoC & SCoC jumped straight into the
 * New Application form. A user arriving here has not yet decided; they need to
 * understand the certification first. Apply submits an enquiry (Lead) that a
 * certification manager qualifies from the Admin Panel.
 */
import React, { useMemo, useState } from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/common/ToastProvider';
import { getCertificationOverview } from '../../data/certificationOverviews';
import { useQueryClient } from '@tanstack/react-query';
import leadsService from '../../services/leadsService';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CertificationOverviewScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const serviceId: string = route.params?.serviceId ?? 'pcoc_scoc';
  const overview = getCertificationOverview(serviceId);

  const [submitting, setSubmitting] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  if (!overview) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.emptyText}>This certification does not have an overview page yet.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleFaq = (i: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenFaq(openFaq === i ? null : i);
  };

  const handleApply = async () => {
    if (!user?.email) {
      showToast('Sign in required', 'Please sign in before submitting an enquiry.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await leadsService.create({
        serviceId: overview.id,
        serviceName: overview.name,
        contactName: user.name ?? user.email.split('@')[0],
        contactEmail: user.email,
        contactPhone: user.phone,
        companyName: user.companyName,
        targetMarkets: [overview.market],
      });

      // Invalidate My Work queries so the new Draft Application appears
      queryClient.invalidateQueries({ queryKey: ['mywork'] });

      showToast(
        'Application created',
        'Your draft application is ready. Continue from My Work.',
        'success',
      );

      // Navigate to My Work so the customer sees the Draft Application
      navigation.navigate('MainTabs', {
        screen: 'Home',
        params: { screen: 'MyWork' },
      });
    } catch (err: any) {
      showToast(
        'Could not send enquiry',
        err?.response?.data?.message ?? 'Please check your connection and try again.',
        'error',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Hero */}
        <LinearGradient colors={overview.heroGradient} style={[styles.hero, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>

          <View style={styles.heroBadge}>
            <Ionicons name="location" size={12} color="#FFF" />
            <Text style={styles.heroBadgeText}>{overview.market}</Text>
          </View>

          <Text style={styles.heroTitle}>{overview.name}</Text>
          <Text style={styles.heroTagline}>{overview.tagline}</Text>
          <Text style={styles.heroAuthority}>{overview.authority}</Text>
        </LinearGradient>

        {/* What it is */}
        <Section title="Overview" icon="information-circle" colors={colors} styles={styles}>
          {overview.whatItIs.map((para, i) => (
            <Text key={i} style={styles.paragraph}>{para}</Text>
          ))}
        </Section>

        {/* Benefits */}
        <Section title="Benefits" icon="sparkles" colors={colors} styles={styles}>
          {overview.benefits.map((b) => (
            <View key={b.title} style={styles.benefitRow}>
              <View style={[styles.benefitIcon, { backgroundColor: `${colors.primary}18` }]}>
                <Ionicons name={b.icon as any} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitTitle}>{b.title}</Text>
                <Text style={styles.benefitDetail}>{b.detail}</Text>
              </View>
            </View>
          ))}
        </Section>

        {/* Timeline */}
        <Section title="Timeline" icon="time" colors={colors} styles={styles}>
          {overview.timeline.map((step, i) => {
            const last = i === overview.timeline.length - 1;
            return (
              <View key={step.label} style={styles.stepRow}>
                <View style={styles.stepRail}>
                  <View style={[styles.stepDot, { backgroundColor: colors.primary }]}>
                    <Text style={styles.stepDotText}>{i + 1}</Text>
                  </View>
                  {!last && <View style={[styles.stepLine, { backgroundColor: colors.border }]} />}
                </View>
                <View style={{ flex: 1, paddingBottom: last ? 0 : 18 }}>
                  <View style={styles.stepHeader}>
                    <Text style={styles.stepTitle}>{step.label}</Text>
                    <View style={[styles.durationChip, { backgroundColor: `${colors.primary}14` }]}>
                      <Text style={[styles.durationText, { color: colors.primary }]}>{step.duration}</Text>
                    </View>
                  </View>
                  <Text style={styles.stepDetail}>{step.detail}</Text>
                </View>
              </View>
            );
          })}
        </Section>

        {/* Required documents */}
        <Section title="Required documents" icon="document-text" colors={colors} styles={styles}>
          {overview.requiredDocuments.map((doc) => (
            <View key={doc} style={styles.docRow}>
              <Ionicons name="checkmark-circle" size={17} color={colors.success} />
              <Text style={styles.docText}>{doc}</Text>
            </View>
          ))}
        </Section>

        {/* FAQs */}
        <Section title="Frequently asked" icon="help-circle" colors={colors} styles={styles}>
          {overview.faqs.map((faq, i) => (
            <TouchableOpacity
              key={faq.q}
              activeOpacity={0.8}
              onPress={() => toggleFaq(i)}
              style={styles.faqItem}
              accessibilityRole="button"
              accessibilityState={{ expanded: openFaq === i }}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.q}</Text>
                <Ionicons
                  name={openFaq === i ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textTertiary}
                />
              </View>
              {openFaq === i && <Text style={styles.faqAnswer}>{faq.a}</Text>}
            </TouchableOpacity>
          ))}
        </Section>
      </ScrollView>

      {/* Apply */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity onPress={handleApply} disabled={submitting} activeOpacity={0.88}>
          <LinearGradient
            colors={overview.heroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.applyBtn}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.applyText}>Apply for {overview.name}</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
        <Text style={styles.footerNote}>
          Creates a draft application — no payment required
        </Text>
      </View>
    </View>
  );
};

const Section: React.FC<{
  title: string; icon: string; colors: any; styles: any; children: React.ReactNode;
}> = ({ title, icon, colors, styles, children }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Ionicons name={icon as any} size={17} color={colors.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDark },

  hero: { paddingHorizontal: 20, paddingBottom: 28 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginBottom: 12 },
  heroBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  heroTitle: { color: '#FFF', fontSize: 27, fontWeight: '800', letterSpacing: -0.4 },
  heroTagline: { color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 20, marginTop: 8 },
  heroAuthority: { color: 'rgba(255,255,255,0.65)', fontSize: 11.5, marginTop: 10 },

  section: { backgroundColor: colors.bgCard, marginHorizontal: 16, marginTop: 16, padding: 18, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, ...Shadows.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },

  paragraph: { fontSize: 14, lineHeight: 22, color: colors.textSecondary, marginBottom: 10 },

  benefitRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  benefitIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  benefitTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 3 },
  benefitDetail: { fontSize: 12.5, lineHeight: 19, color: colors.textSecondary },

  stepRow: { flexDirection: 'row', gap: 12 },
  stepRail: { alignItems: 'center', width: 26 },
  stepDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepDotText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  stepLine: { width: 2, flex: 1, marginTop: 4 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  stepTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, flexShrink: 1 },
  durationChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  durationText: { fontSize: 10.5, fontWeight: '700' },
  stepDetail: { fontSize: 12.5, lineHeight: 19, color: colors.textSecondary },

  docRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 11 },
  docText: { flex: 1, fontSize: 13.5, lineHeight: 20, color: colors.textSecondary },

  faqItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border },
  faqHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  faqQuestion: { flex: 1, fontSize: 13.5, fontWeight: '600', color: colors.textPrimary },
  faqAnswer: { fontSize: 13, lineHeight: 20, color: colors.textSecondary, marginTop: 9 },

  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 14, backgroundColor: colors.bgCard, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
  applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: BorderRadius.xl },
  applyText: { color: '#FFF', fontSize: 15.5, fontWeight: '700' },
  footerNote: { textAlign: 'center', fontSize: 11, color: colors.textTertiary, marginTop: 9 },

  emptyText: { textAlign: 'center', color: colors.textSecondary, fontSize: 14, paddingHorizontal: 32 },
  backLink: { marginTop: 16, alignSelf: 'center' },
  backLinkText: { color: colors.primary, fontWeight: '700' },
});

export default CertificationOverviewScreen;
