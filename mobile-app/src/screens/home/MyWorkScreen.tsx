import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTheme, Shadows } from '../../theme';
import applicationsService from '../../services/applicationsService';
import supportService from '../../services/supportService';
import paymentsService from '../../services/paymentsService';
import certificationService from '../../services/certificationService';
import documentsService from '../../services/documentsService';
import api from '../../services/api';

/**
 * "My Work" — the unified place to resume everything, centred on the Draft
 * Application (the platform's central object). Read-only aggregation over the
 * existing services; the customer never sees the Lead/Application distinction.
 */

const asArray = (v: any): any[] => (Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : []);

const ACTIVE = ['submitted', 'docs_review', 'docs_required', 'tech_review', 'testing', 'approval_pending', 'on_hold'];
const DONE = ['approved', 'cert_issued'];

const MyWorkScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const apps = useQuery({
    queryKey: ['mywork', 'applications'],
    queryFn: async () => asArray(await applicationsService.getAll({ limit: 100 })),
  });
  const meetings = useQuery({
    queryKey: ['mywork', 'meetings'],
    queryFn: async () => asArray(await api.get('/meetings/mine')),
  });
  const tickets = useQuery({
    queryKey: ['mywork', 'support'],
    queryFn: async () => asArray(await supportService.myTickets()),
  });
  const payments = useQuery({
    queryKey: ['mywork', 'payments'],
    queryFn: async () => asArray(await paymentsService.getAll()),
  });
  const certs = useQuery({
    queryKey: ['mywork', 'certs'],
    queryFn: async () => asArray(await certificationService.getCertifications()),
  });
  const docs = useQuery({
    queryKey: ['mywork', 'documents'],
    queryFn: async () => asArray(await documentsService.getAll()),
  });

  const applications = apps.data ?? [];
  const drafts = applications.filter((a: any) => a.status === 'draft');
  const inProgress = applications.filter((a: any) => ACTIVE.includes(a.status));
  const completed = applications.filter((a: any) => DONE.includes(a.status));

  const openTickets = (tickets.data ?? []).filter((t: any) => t.status && t.status !== 'closed' && t.status !== 'resolved');
  const upcomingMeetings = meetings.data ?? [];
  const duePayments = (payments.data ?? []).filter((p: any) => p.status === 'pending' || p.status === 'created' || p.status === 'due');
  const expiringCerts = (certs.data ?? []).filter((c: any) => c.status === 'expiring_soon' || c.status === 'expired');

  const refreshing = apps.isFetching || meetings.isFetching || tickets.isFetching || payments.isFetching || certs.isFetching || docs.isFetching;
  const refetchAll = () => { apps.refetch(); meetings.refetch(); tickets.refetch(); payments.refetch(); certs.refetch(); docs.refetch(); };

  const openApplication = (id: string) =>
    navigation.navigate('Applications', { screen: 'ApplicationDetail', params: { id } });

  const statusLabel = (a: any) => {
    if (a.status === 'draft') return a.product_status === 'pending_validation' ? 'Draft · Pending product validation' : 'Draft';
    if (ACTIVE.includes(a.status)) return 'In progress';
    if (a.status === 'cert_issued') return 'Certified';
    if (a.status === 'approved') return 'Approved';
    return String(a.status || '').replace(/_/g, ' ');
  };
  const productLabel = (a: any) =>
    a.product_id?.name || (a.product_status === 'pending_validation' ? 'Product pending validation' : a.cert_type);

  const renderAppRow = (a: any) => (
    <TouchableOpacity key={a._id || a.id} style={styles.row} onPress={() => openApplication(a._id || a.id)}>
      <View style={[styles.rowIcon, { backgroundColor: `${colors.primary}18` }]}>
        <Ionicons name="document-text-outline" size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>{a.cert_type} — {productLabel(a)}</Text>
        <Text style={styles.rowSub} numberOfLines={1}>{a.application_number} · {statusLabel(a)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  );

  const SummaryRow = ({ icon, label, count, hint, onPress }: { icon: any; label: string; count: number; hint?: string; onPress?: () => void }) => (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={!onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={[styles.rowIcon, { backgroundColor: `${colors.info}18` }]}>
        <Ionicons name={icon} size={20} color={colors.info} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{label}</Text>
        {!!hint && <Text style={styles.rowSub} numberOfLines={1}>{hint}</Text>}
      </View>
      <View style={styles.countPill}><Text style={styles.countText}>{count}</Text></View>
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} /> : null}
    </TouchableOpacity>
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={[styles.card, Shadows.sm]}>{children}</View>
    </View>
  );

  const empty = (msg: string) => <View style={styles.emptyBox}><Text style={styles.emptyText}>{msg}</Text></View>;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : ['#F9FAFF', '#F0F3FA']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <Text style={styles.eyebrow}>COMPLIANCE WORKSPACE</Text>
        <Text style={styles.title}>My Work</Text>
        <Text style={styles.subtitle}>Everything you're working on, in one place</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetchAll} tintColor={colors.primary} />}
      >
        {apps.isLoading ? (
          <View style={styles.loadingBox}><ActivityIndicator color={colors.primary} /><Text style={styles.rowSub}>Loading your work…</Text></View>
        ) : (
          <>
            <Section title={`Applications${applications.length ? ` (${applications.length})` : ''}`}>
              {applications.length === 0 ? empty('No applications yet. Start a certification to see it here.') : (
                <>
                  {drafts.map(renderAppRow)}
                  {inProgress.map(renderAppRow)}
                  {completed.map(renderAppRow)}
                </>
              )}
            </Section>

            <Section title="Meetings">
              {upcomingMeetings.length === 0 ? empty('No consultations booked.') : (
                <SummaryRow icon="videocam-outline" label="Consultations" count={upcomingMeetings.length}
                  hint={upcomingMeetings[0]?.topic || upcomingMeetings[0]?.consultant?.name} />
              )}
            </Section>

            <Section title="Support">
              {openTickets.length === 0 ? empty('No open support tickets.') : (
                <SummaryRow icon="chatbubbles-outline" label="Open tickets" count={openTickets.length}
                  hint={openTickets[0]?.subject} />
              )}
            </Section>

            <Section title="Payments">
              <SummaryRow icon="card-outline" label={duePayments.length ? 'Payments due' : 'Payments'}
                count={duePayments.length || (payments.data ?? []).length}
                hint={duePayments.length ? 'Tap to review and pay' : 'View invoices and history'}
                onPress={() => navigation.navigate('Payments')} />
            </Section>

            <Section title="Renewals">
              <SummaryRow icon="refresh-outline" label={expiringCerts.length ? 'Certificates needing renewal' : 'Certificates'}
                count={expiringCerts.length || (certs.data ?? []).length}
                hint={expiringCerts.length ? 'Action needed to stay compliant' : 'Your issued certificates'}
                onPress={() => navigation.navigate('Certifications')} />
            </Section>

            <Section title="Documents">
              <SummaryRow icon="folder-outline" label="Vault documents" count={(docs.data ?? []).length}
                hint="Certificates, reports and company files" onPress={() => navigation.navigate('Documents')} />
            </Section>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDark },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: colors.primary, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: isDark ? colors.bgCard : '#FFFFFF', borderRadius: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  rowSub: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
  countPill: { minWidth: 26, height: 26, borderRadius: 13, paddingHorizontal: 8, backgroundColor: `${colors.primary}18`, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  countText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  emptyBox: { paddingHorizontal: 14, paddingVertical: 18 },
  emptyText: { fontSize: 13, color: colors.textTertiary },
  loadingBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 10 },
});

export default MyWorkScreen;
