import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme, Typography, Shadows, BorderRadius, Spacing } from '../../theme';
import Button from '../../components/common/Button';
import leadsService from '../../services/leadsService';
import { useAuthStore } from '../../store/authStore';

export default function ApplyOpportunityScreen() {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuthStore();

  const { oppData = {} } = route.params || {};
  const oppId: string | undefined = oppData?._id;
  const productDescription: string = oppData.title || '';
  const targetMarket: string | undefined = oppData.country || oppData.targetMarket;
  const certs: string[] = Array.isArray(oppData.requiredCertifications) ? oppData.requiredCertifications.filter(Boolean) : [];
  const primaryCert: string | undefined = certs[0];
  // No verified certification mapping on the opportunity → route to manual review.
  const needsManualReview = !primaryCert;

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !!oppId && !!user?.email && !!productDescription;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await leadsService.create({
        serviceId: primaryCert || 'market_access_opportunity',
        serviceName: primaryCert || `${productDescription} — market access`,
        contactName: user!.name || 'DICE Client',
        contactEmail: user!.email,
        contactPhone: user!.phone || undefined,
        companyName: user!.companyName || undefined,
        productDescription,
        targetMarkets: targetMarket ? [targetMarket] : [],
        source: 'market_opportunity',
        opportunityId: oppId,
        manualReview: needsManualReview,
        notes: `Applied from Market Access opportunity: ${oppData.title || oppId}`,
      });
      setDone(true);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not submit your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successWrap}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={72} color={colors.success} />
          </View>
          <Text style={styles.successTitle}>Request submitted</Text>
          <Text style={styles.successSub}>
            Our certification team has received your request and will review it. You can track its status any time.
          </Text>
          <Button title="Track my request" onPress={() => navigation.navigate('MyRequests')} style={{ marginTop: Spacing.xl, alignSelf: 'stretch' }} />
          <Button title="Done" variant="secondary" onPress={() => navigation.goBack()} style={{ marginTop: Spacing.md, alignSelf: 'stretch' }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.glassBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Apply for Certification</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lead}>Review your request. We’ll prefill from this opportunity — nothing is submitted until you confirm.</Text>

        <Row label="Product" value={productDescription || 'Not specified'} missing={!productDescription} colors={colors} styles={styles} />
        <Row label="Target market" value={targetMarket || 'To be confirmed with our team'} missing={!targetMarket} colors={colors} styles={styles} />
        <Row
          label="Certification"
          value={primaryCert || 'To be determined by our specialists (manual review)'}
          missing={needsManualReview}
          colors={colors}
          styles={styles}
        />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your details</Text>
          <DetailLine label="Name" value={user?.name} styles={styles} />
          <DetailLine label="Email" value={user?.email} styles={styles} />
          {user?.phone ? <DetailLine label="Phone" value={user.phone} styles={styles} /> : null}
          {user?.companyName ? <DetailLine label="Company" value={user.companyName} styles={styles} /> : null}
        </View>

        {needsManualReview ? (
          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
            <Text style={styles.noticeText}>
              We don’t have a verified certification mapping for this opportunity yet. Our specialists will identify the
              right certification for your product and market.
            </Text>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {!user?.email ? <Text style={styles.errorText}>Your account is missing an email address, so we can’t submit this request.</Text> : null}

        <Button
          title={submitting ? 'Submitting…' : 'Submit Request'}
          onPress={submit}
          loading={submitting}
          disabled={!canSubmit || submitting}
          style={{ marginTop: Spacing.xl }}
        />
        <Text style={styles.footNote}>What happens next: a draft application is created and our team is notified. You can track the status under “My Requests”.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, missing, colors, styles }: any) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, missing && { color: colors.warning }]}>{value}</Text>
    </View>
  );
}

function DetailLine({ label, value, styles }: any) {
  return (
    <View style={styles.detailLine}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || '—'}</Text>
    </View>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#0A0A0A' : '#F7F9FC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border },
  glassBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...Typography.h4, color: colors.textPrimary },
  content: { padding: Spacing.xl },
  lead: { ...Typography.body2, color: colors.textSecondary, marginBottom: Spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bgCard, padding: Spacing.lg, borderRadius: BorderRadius.lg, marginBottom: Spacing.sm, ...Shadows.sm },
  rowLabel: { ...Typography.caption, color: colors.textSecondary },
  rowValue: { ...Typography.body2, color: colors.textPrimary, fontWeight: '600', flexShrink: 1, textAlign: 'right', marginLeft: Spacing.md },
  card: { backgroundColor: colors.bgCard, padding: Spacing.lg, borderRadius: BorderRadius.xl, marginTop: Spacing.md, ...Shadows.sm },
  cardTitle: { ...Typography.body1, fontWeight: '700', color: colors.textPrimary, marginBottom: Spacing.sm },
  detailLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  detailLabel: { ...Typography.caption, color: colors.textSecondary },
  detailValue: { ...Typography.caption, color: colors.textPrimary, fontWeight: '600' },
  notice: { flexDirection: 'row', gap: Spacing.sm, backgroundColor: colors.warning + '15', padding: Spacing.md, borderRadius: BorderRadius.lg, marginTop: Spacing.md },
  noticeText: { ...Typography.caption, color: colors.textPrimary, flex: 1, lineHeight: 18 },
  errorText: { ...Typography.caption, color: colors.error, marginTop: Spacing.md },
  footNote: { ...Typography.caption, color: colors.textSecondary, marginTop: Spacing.md, lineHeight: 18 },
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  successIcon: { marginBottom: Spacing.lg },
  successTitle: { ...Typography.h2, color: colors.textPrimary, marginBottom: Spacing.sm },
  successSub: { ...Typography.body2, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
});
