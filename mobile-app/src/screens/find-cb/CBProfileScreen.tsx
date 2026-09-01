import React, { useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useQuery } from '@tanstack/react-query'
import { useTheme, Shadows, BorderRadius } from '../../theme'
import cbService from '../../services/cbService'
import { formatDate } from '../../utils/formatters'

function Section({ title, icon, children, colors }: any) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Ionicons name={icon} size={15} color={colors.primary} />
        <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '800' }}>{title}</Text>
      </View>
      {children}
    </View>
  )
}

export default function CBProfileScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark])
  const p = route.params || {}

  const marketsCsv = Array.isArray(p.markets) ? p.markets.join(',') : (p.markets ?? p.market)
  const { data: cb, isLoading, error, refetch } = useQuery({
    queryKey: ['cb-profile', p.id, p.cert_type, marketsCsv],
    queryFn: () => cbService.getCB(p.id, { cert_type: p.cert_type, markets: marketsCsv, product_category: p.product_category }),
    enabled: !!p.id,
  })

  const chips = (arr?: string[]) => (arr && arr.length ? <View style={styles.chipWrap}>{arr.map((x) => <View key={x} style={styles.chip}><Text style={styles.chipText}>{x}</Text></View>)}</View> : <Text style={styles.muted}>—</Text>)

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={22} color={colors.textPrimary} /></TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{cb?.name || 'Certification Body'}</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : error || !cb ? (
        <View style={styles.center}><Ionicons name="alert-circle-outline" size={44} color={colors.error} /><Text style={styles.muted}>Failed to load.</Text><TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 90 }}>
            {/* Header card */}
            <View style={[styles.card, Shadows.sm]}>
              <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.cardInner}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={styles.logo}><Ionicons name="business" size={22} color={colors.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cbName}>{cb.name}</Text>
                    {cb.legal_name ? <Text style={styles.muted}>{cb.legal_name}</Text> : null}
                    {cb.verification?.verified
                      ? <View style={styles.verifiedRow}><Ionicons name="shield-checkmark" size={14} color={colors.success} /><Text style={[styles.verifiedText, { color: colors.success }]}>Verified by Sanyog{cb.verification?.verified_at ? ` · ${formatDate(cb.verification.verified_at)}` : ''}</Text></View>
                      : <Text style={styles.muted}>Not yet verified</Text>}
                  </View>
                  {typeof cb.match_score === 'number' && <View style={styles.scoreBox}><Text style={styles.scoreValue}>{cb.match_score}%</Text></View>}
                </View>
                <View style={{ flexDirection: 'row', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
                  {cb.email ? <Text style={styles.muted}>{cb.email}</Text> : null}
                  {cb.phone ? <Text style={styles.muted}>{cb.phone}</Text> : null}
                  {cb.website ? <TouchableOpacity onPress={() => Linking.openURL(cb.website)}><Text style={styles.link}>Website ↗</Text></TouchableOpacity> : null}
                </View>
              </LinearGradient>
            </View>

            <View style={[styles.card, Shadows.sm]}>
              <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.cardInner}>
                {/* Why matches */}
                {cb.match_reasons?.length ? (
                  <Section title="Why this matches" icon="sparkles-outline" colors={colors}>
                    {cb.match_reasons.map((r: any) => (
                      <View key={r.key} style={styles.reasonRow}><Ionicons name={r.satisfied ? 'checkmark-circle' : 'ellipse-outline'} size={15} color={r.satisfied ? colors.success : colors.textTertiary} /><Text style={[styles.reasonText, !r.satisfied && { color: colors.textTertiary }]}>{r.label}</Text></View>
                    ))}
                  </Section>
                ) : null}

                {/* Target market coverage (backend-computed) */}
                {cb.market_coverage ? (
                  <Section title="Target market coverage" icon="globe-outline" colors={colors}>
                    <Text style={[styles.body, { fontWeight: '700', color: cb.market_coverage.percent === 100 ? colors.success : colors.warning }]}>
                      {cb.market_coverage.covered.length} / {cb.market_coverage.requested.length} requested markets ({cb.market_coverage.percent}%)
                    </Text>
                    {cb.market_coverage.covered.length > 0 && (
                      <View style={[styles.chipWrap, { marginTop: 6 }]}>{cb.market_coverage.covered.map((m: string) => <View key={m} style={styles.chip}><Text style={styles.chipText}>{m}</Text></View>)}</View>
                    )}
                    {cb.market_coverage.missing.length > 0 && <Text style={[styles.muted, { marginTop: 6 }]}>Missing: {cb.market_coverage.missing.join(', ')}</Text>}
                  </Section>
                ) : null}

                <Section title="Accreditations" icon="ribbon-outline" colors={colors}>{chips(cb.accreditations)}</Section>
                <Section title="Certification scope" icon="layers-outline" colors={colors}>
                  {(cb.scopes || []).length ? (cb.scopes || []).map((s: any) => (
                    <View key={s.id} style={styles.scopeItem}>
                      <Text style={styles.scopeCert}>{s.cert_type}</Text>
                      {!!(s.product_categories || []).length && <Text style={styles.scopeLine}>Products: {(s.product_categories).join(', ')}</Text>}
                      {!!(s.markets || []).length && <Text style={styles.scopeLine}>Markets: {(s.markets).join(', ')}</Text>}
                      {s.service_type ? <Text style={styles.scopeLine}>Service: {s.service_type}</Text> : null}
                      {s.valid_until ? <Text style={styles.scopeLine}>Valid until: {formatDate(s.valid_until)}</Text> : null}
                    </View>
                  )) : <Text style={styles.muted}>No itemised scope published.</Text>}
                </Section>
                <Section title="Markets served" icon="globe-outline" colors={colors}>{chips(cb.countries)}</Section>
                <Section title="Product categories" icon="cube-outline" colors={colors}>{chips(cb.product_categories)}</Section>
                <Section title="Certifications" icon="document-text-outline" colors={colors}>{chips(cb.allowed_cert_types)}</Section>
                {cb.scope_summary ? <Section title="About" icon="information-circle-outline" colors={colors}><Text style={styles.body}>{cb.scope_summary}</Text></Section> : null}
              </LinearGradient>
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
            <TouchableOpacity style={styles.quoteBtn} onPress={() => navigation.navigate('RequestQuote', { cbId: cb.id, cbName: cb.name, cert_type: p.cert_type, markets: p.markets, product_category: p.product_category, applicationId: p.applicationId, product_id: p.product_id, product_name: p.product_name, match_snapshot: cb.match_score != null ? { score: cb.match_score, reasons: (cb.match_reasons || []).filter((r: any) => r.satisfied).map((r: any) => r.label) } : undefined })}>
              <Text style={styles.quoteBtnText}>Request Quote</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  )
}

const makeStyles = (c: any, dark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bgDark },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  muted: { color: c.textSecondary, fontSize: 13 },
  body: { color: c.textPrimary, fontSize: 13, lineHeight: 20 },
  link: { color: c.primary, fontSize: 13, fontWeight: '700' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: c.primary, borderRadius: BorderRadius.md },
  retryText: { color: '#fff', fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: dark ? c.bgCardLight : c.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: c.textPrimary, fontSize: 17, fontWeight: '800', flex: 1 },
  card: { borderRadius: BorderRadius.lg, marginBottom: 14, overflow: 'hidden' },
  cardInner: { padding: 16, borderRadius: BorderRadius.lg },
  logo: { width: 46, height: 46, borderRadius: 12, backgroundColor: dark ? c.bgCardLight : '#EEF0F7', alignItems: 'center', justifyContent: 'center' },
  cbName: { color: c.textPrimary, fontSize: 18, fontWeight: '800' },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  verifiedText: { fontSize: 12, fontWeight: '600' },
  scoreBox: { alignItems: 'flex-end' },
  scoreValue: { color: c.primary, fontSize: 20, fontWeight: '900' },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  reasonText: { color: c.textPrimary, fontSize: 13, flex: 1 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { backgroundColor: dark ? c.bgCardLight : '#EEF0F7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, marginRight: 6, marginBottom: 6 },
  chipText: { color: c.textSecondary, fontSize: 12 },
  scopeItem: { padding: 10, borderRadius: 8, backgroundColor: dark ? c.bgCardLight : '#F4F6FB', marginBottom: 8 },
  scopeCert: { color: c.textPrimary, fontSize: 13, fontWeight: '800', marginBottom: 3 },
  scopeLine: { color: c.textSecondary, fontSize: 12, marginTop: 1 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: c.bgCard, borderTopWidth: 1, borderTopColor: c.border },
  quoteBtn: { backgroundColor: c.primary, borderRadius: BorderRadius.md, paddingVertical: 14, alignItems: 'center' },
  quoteBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
})
