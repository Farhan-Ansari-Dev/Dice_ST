import React, { useMemo, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useQuery } from '@tanstack/react-query'
import { useTheme, Shadows, BorderRadius } from '../../theme'
import Badge from '../../components/common/Badge'
import EmptyState from '../../components/common/EmptyState'
import cbService, { CBMatch, matchTier } from '../../services/cbService'

export default function FindCBResultsScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark])

  const p = route.params || {}
  const params: Record<string, any> = {
    application_id: p.applicationId,
    cert_type: p.cert_type,
    product_category: p.product_category,
    market: p.market,
  }
  Object.keys(params).forEach((k) => params[k] == null && delete params[k])

  const [selected, setSelected] = useState<Record<string, CBMatch>>({})
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['cb-match', params],
    queryFn: () => cbService.match(params),
    enabled: !!(params.application_id || params.cert_type),
  })

  const selectedList = Object.values(selected)
  const toggleSelect = (cb: CBMatch) => setSelected((s) => {
    const next = { ...s }
    if (next[cb.id]) delete next[cb.id]
    else if (Object.keys(next).length < 3) next[cb.id] = cb
    return next
  })

  const list: CBMatch[] = (data?.certificationBodies || []).filter((c) => !verifiedOnly || c.verified)
  const req = data?.requirement

  const requestQuote = (cb: CBMatch) => navigation.navigate('RequestQuote', {
    cbId: cb.id, cbName: cb.name, cert_type: req?.cert_type, market: req?.market, product_category: req?.product_category,
    applicationId: p.applicationId, product_id: p.product_id, product_name: p.product_name,
    match_snapshot: { score: cb.match_score, reasons: (cb.match_reasons || []).filter((r) => r.satisfied).map((r) => r.label) },
  })

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={22} color={colors.textPrimary} /></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Find Your Certification Body</Text>
          {req && <Text style={styles.headerSub}>{[req.product_category, req.cert_type, req.market].filter(Boolean).join(' · ')}</Text>}
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('CBRequestsList')} style={styles.backBtn}><Ionicons name="albums-outline" size={20} color={colors.textPrimary} /></TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /><Text style={styles.muted}>Finding certification bodies…</Text></View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.error} />
          <Text style={styles.errorText}>Couldn’t load matches.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
        </View>
      ) : !data?.available || list.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState icon="business-outline" title="No certification bodies match yet"
            subtitle={data?.message || 'We couldn’t find a verified Certification Body matching the selected certification, market and scope.'} />
          <View style={styles.emptyActions}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}><Text style={styles.secondaryBtnText}>Change requirements</Text></TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('SupportCenter')}><Text style={styles.primaryBtnText}>Contact Sanyog</Text></TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.toolbar}>
            <Text style={styles.count}>{list.length} certification {list.length === 1 ? 'body' : 'bodies'} found</Text>
            <TouchableOpacity style={[styles.chip, verifiedOnly && styles.chipActive]} onPress={() => setVerifiedOnly((v) => !v)}>
              <Ionicons name="shield-checkmark" size={13} color={verifiedOnly ? '#fff' : colors.textSecondary} />
              <Text style={[styles.chipText, verifiedOnly && styles.chipTextActive]}>Verified only</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: selectedList.length ? 100 : 32 }} refreshControl={undefined}>
            {list.map((cb, idx) => {
              const isSel = !!selected[cb.id]
              const isOpen = !!expanded[cb.id]
              const reasons = cb.match_reasons || []
              return (
                <View key={cb.id} style={[styles.card, Shadows.sm]}>
                  <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.cardInner}>
                    {idx === 0 && <View style={styles.topPick}><Text style={styles.topPickText}>RECOMMENDED</Text></View>}
                    <View style={styles.cardTop}>
                      <View style={styles.logo}><Ionicons name="business" size={20} color={colors.primary} /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cbName} numberOfLines={1}>{cb.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                          {cb.verified
                            ? <View style={styles.verifiedRow}><Ionicons name="shield-checkmark" size={13} color={colors.success} /><Text style={[styles.verifiedText, { color: colors.success }]}>Verified by Sanyog</Text></View>
                            : <Text style={styles.muted}>Not yet verified</Text>}
                        </View>
                      </View>
                      <View style={styles.scoreBox}>
                        <Text style={styles.scoreValue}>{cb.match_score}%</Text>
                        <Text style={styles.scoreTier}>{matchTier(cb.match_score)}</Text>
                      </View>
                    </View>

                    {/* Why matches */}
                    <View style={styles.reasons}>
                      {(isOpen ? reasons : reasons.slice(0, 3)).map((r) => (
                        <View key={r.key} style={styles.reasonRow}>
                          <Ionicons name={r.satisfied ? 'checkmark-circle' : 'ellipse-outline'} size={15} color={r.satisfied ? colors.success : colors.textTertiary} />
                          <Text style={[styles.reasonText, !r.satisfied && { color: colors.textTertiary }]}>{r.label}</Text>
                        </View>
                      ))}
                      {reasons.length > 3 && (
                        <TouchableOpacity onPress={() => setExpanded((e) => ({ ...e, [cb.id]: !isOpen }))}>
                          <Text style={styles.whyLink}>{isOpen ? 'Show less' : `Why this matches (${reasons.length})`}</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {!!cb.accreditations?.length && <Text style={styles.metaLine}>Accreditation: {cb.accreditations.slice(0, 3).join(', ')}</Text>}
                    {!!cb.markets?.length && <Text style={styles.metaLine}>Markets: {cb.markets.slice(0, 5).join(', ')}</Text>}

                    <View style={styles.cardActions}>
                      <TouchableOpacity style={styles.ghostBtn} onPress={() => navigation.navigate('CBProfile', { id: cb.id, cert_type: req?.cert_type, market: req?.market, product_category: req?.product_category, applicationId: p.applicationId, product_id: p.product_id, product_name: p.product_name })}>
                        <Text style={styles.ghostBtnText}>View details</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.compareBtn, isSel && styles.compareBtnActive]} onPress={() => toggleSelect(cb)}>
                        <Ionicons name={isSel ? 'checkbox' : 'git-compare-outline'} size={15} color={isSel ? '#fff' : colors.primary} />
                        <Text style={[styles.compareBtnText, isSel && { color: '#fff' }]}>Compare</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.quoteBtn} onPress={() => requestQuote(cb)}>
                        <Text style={styles.quoteBtnText}>Request Quote</Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </View>
              )
            })}
          </ScrollView>

          {/* Compare bar */}
          {selectedList.length >= 2 && (
            <View style={[styles.compareBar, { paddingBottom: insets.bottom + 12 }]}>
              <Text style={styles.compareBarText}>{selectedList.length} selected</Text>
              <TouchableOpacity style={styles.compareBarBtn} onPress={() => navigation.navigate('CBCompare', { cbs: selectedList })}>
                <Ionicons name="git-compare" size={16} color="#fff" /><Text style={styles.compareBarBtnText}>Compare</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  )
}

const makeStyles = (c: any, dark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bgDark },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  muted: { color: c.textSecondary, fontSize: 13 },
  errorText: { color: c.textPrimary, fontSize: 15, fontWeight: '600' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: c.primary, borderRadius: BorderRadius.md },
  retryText: { color: '#fff', fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: dark ? c.bgCardLight : c.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: c.textPrimary, fontSize: 17, fontWeight: '800' },
  headerSub: { color: c.textSecondary, fontSize: 12, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.4 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 4 },
  count: { color: c.textPrimary, fontSize: 14, fontWeight: '700' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: dark ? c.bgCardLight : c.border },
  chipActive: { backgroundColor: c.primary },
  chipText: { color: c.textSecondary, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  card: { borderRadius: BorderRadius.lg, marginBottom: 14, overflow: 'hidden' },
  cardInner: { padding: 16, borderRadius: BorderRadius.lg },
  topPick: { alignSelf: 'flex-start', backgroundColor: c.primary + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, marginBottom: 8 },
  topPickText: { color: c.primary, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 42, height: 42, borderRadius: 10, backgroundColor: dark ? c.bgCardLight : '#EEF0F7', alignItems: 'center', justifyContent: 'center' },
  cbName: { color: c.textPrimary, fontSize: 16, fontWeight: '800' },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { fontSize: 12, fontWeight: '600' },
  scoreBox: { alignItems: 'flex-end' },
  scoreValue: { color: c.primary, fontSize: 20, fontWeight: '900' },
  scoreTier: { color: c.textSecondary, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  reasons: { marginTop: 12, gap: 5 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reasonText: { color: c.textPrimary, fontSize: 13, flex: 1 },
  whyLink: { color: c.primary, fontSize: 12, fontWeight: '700', marginTop: 2 },
  metaLine: { color: c.textSecondary, fontSize: 12, marginTop: 8 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  ghostBtn: { flex: 1, paddingVertical: 10, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: c.border, alignItems: 'center' },
  ghostBtnText: { color: c.textPrimary, fontSize: 13, fontWeight: '700' },
  compareBtn: { flexDirection: 'row', gap: 5, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: c.primary },
  compareBtnActive: { backgroundColor: c.primary },
  compareBtnText: { color: c.primary, fontSize: 13, fontWeight: '700' },
  quoteBtn: { flex: 1.2, paddingVertical: 10, borderRadius: BorderRadius.md, backgroundColor: c.primary, alignItems: 'center' },
  quoteBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  compareBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, backgroundColor: c.bgCard, borderTopWidth: 1, borderTopColor: c.border },
  compareBarText: { color: c.textPrimary, fontWeight: '700' },
  compareBarBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: BorderRadius.md },
  compareBarBtnText: { color: '#fff', fontWeight: '800' },
  emptyActions: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginTop: 16, paddingHorizontal: 24 },
  secondaryBtn: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: c.border },
  secondaryBtnText: { color: c.textPrimary, fontWeight: '700' },
  primaryBtn: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: BorderRadius.md, backgroundColor: c.primary },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
})
