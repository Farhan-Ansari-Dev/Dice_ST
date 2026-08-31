import React, { useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTheme, Shadows, BorderRadius } from '../../theme'
import Badge, { getStatusVariant } from '../../components/common/Badge'
import cbService from '../../services/cbService'
import { formatDate } from '../../utils/formatters'

const pretty = (s?: string) => (s || '').replace(/_/g, ' ')
const TERMINAL = ['rejected', 'cancelled', 'closed']

export default function CBRequestDetailScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark])
  const queryClient = useQueryClient()
  const id = route.params?.id

  const { data: r, isLoading, error, refetch } = useQuery({ queryKey: ['cb-request', id], queryFn: () => cbService.getRequest(id), enabled: !!id })

  const cancel = () => Alert.alert('Cancel request', 'Are you sure you want to cancel this request?', [
    { text: 'Keep', style: 'cancel' },
    { text: 'Cancel request', style: 'destructive', onPress: async () => {
      try { await cbService.cancelRequest(id, 'Cancelled by customer'); queryClient.invalidateQueries({ queryKey: ['cb-request', id] }) } catch { Alert.alert('Error', 'Could not cancel the request.') }
    } },
  ])

  const cb = r?.certification_body_id
  const history = r?.status_history || []
  const updates = [
    ...(r?.cb_response?.summary ? [{ at: (r as any).updated_at, text: r.cb_response.summary, quote: r.cb_response }] : []),
    ...history.filter((h: any) => h.note).map((h: any) => ({ at: h.at, text: h.note, status: h.to })),
  ]

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={22} color={colors.textPrimary} /></TouchableOpacity>
        <Text style={styles.headerTitle}>{r?.request_number || 'Request'}</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : error || !r ? (
        <View style={styles.center}><Ionicons name="alert-circle-outline" size={44} color={colors.error} /><Text style={styles.muted}>Failed to load.</Text><TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
          {/* Status */}
          <View style={[styles.card, Shadows.sm]}>
            <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.cardInner}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.cardTitle}>{cb?.name || 'Certification Body'}</Text>
                <Badge label={pretty(r.status)} variant={getStatusVariant(r.status)} />
              </View>
              <View style={{ marginTop: 10, gap: 6 }}>
                {r.product_id?.name || r.product_category ? <Row label="Product" value={r.product_id?.name || r.product_category} c={colors} /> : null}
                {r.cert_type ? <Row label="Certification" value={r.cert_type} c={colors} /> : null}
                {r.market ? <Row label="Market" value={r.market} c={colors} /> : null}
                {r.application_id?.application_number ? <Row label="Application" value={r.application_id.application_number} c={colors} /> : null}
                <Row label="Created" value={formatDate(r.created_at)} c={colors} />
                <Row label="Updated" value={formatDate(r.updated_at)} c={colors} />
              </View>
            </LinearGradient>
          </View>

          {/* Timeline */}
          <View style={[styles.card, Shadows.sm]}>
            <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.cardInner}>
              <Text style={styles.cardTitle}>Status timeline</Text>
              {history.length === 0 ? <Text style={styles.muted}>Submitted — awaiting review.</Text> : (
                <View style={{ marginTop: 6 }}>
                  {history.map((h: any, i: number) => {
                    const last = i === history.length - 1
                    return (
                      <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ alignItems: 'center' }}>
                          <View style={[styles.dot, { backgroundColor: last ? colors.primary : colors.success }]} />
                          {!last && <View style={styles.line} />}
                        </View>
                        <View style={{ flex: 1, paddingBottom: 16 }}>
                          <Text style={styles.stepTitle}>{pretty(h.to)}</Text>
                          <Text style={styles.muted}>{formatDate(h.at)}{h.note ? ` · ${h.note}` : ''}</Text>
                        </View>
                      </View>
                    )
                  })}
                </View>
              )}
            </LinearGradient>
          </View>

          {/* Updates (customer-visible only) */}
          {updates.length > 0 && (
            <View style={[styles.card, Shadows.sm]}>
              <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.cardInner}>
                <Text style={styles.cardTitle}>Updates</Text>
                {updates.map((u: any, i: number) => (
                  <View key={i} style={styles.update}>
                    <Text style={styles.updateText}>{u.text}</Text>
                    {u.quote?.quote_amount != null && <Text style={styles.quoteText}>Quote: {u.quote.quote_currency || 'INR'} {u.quote.quote_amount}{u.quote.valid_until ? ` · valid until ${formatDate(u.quote.valid_until)}` : ''}</Text>}
                    {u.at ? <Text style={styles.muted}>{formatDate(u.at)}</Text> : null}
                  </View>
                ))}
              </LinearGradient>
            </View>
          )}

          {/* Documents */}
          {(r.document_ids || []).length > 0 && (
            <View style={[styles.card, Shadows.sm]}>
              <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.cardInner}>
                <Text style={styles.cardTitle}>Documents</Text>
                {(r.document_ids || []).map((d: any) => (
                  <View key={d._id} style={styles.docRow}><Ionicons name="document-text" size={18} color={colors.primary} /><Text style={styles.docName} numberOfLines={1}>{d.name}</Text></View>
                ))}
              </LinearGradient>
            </View>
          )}

          {cb?.contact?.website ? (
            <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(cb.contact.website)}><Ionicons name="globe-outline" size={16} color={colors.primary} /><Text style={styles.link}>Visit certification body website</Text></TouchableOpacity>
          ) : null}

          {!TERMINAL.includes(r.status) && (
            <TouchableOpacity style={styles.cancelBtn} onPress={cancel}><Text style={styles.cancelBtnText}>Cancel request</Text></TouchableOpacity>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

function Row({ label, value, c }: { label: string; value: string; c: any }) {
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: c.textSecondary, fontSize: 13 }}>{label}</Text><Text style={{ color: c.textPrimary, fontSize: 13, fontWeight: '700' }}>{value}</Text></View>
}

const makeStyles = (c: any, dark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bgDark },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  muted: { color: c.textSecondary, fontSize: 12 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: c.primary, borderRadius: BorderRadius.md },
  retryText: { color: '#fff', fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: dark ? c.bgCardLight : c.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: c.textPrimary, fontSize: 17, fontWeight: '800' },
  card: { borderRadius: BorderRadius.lg, marginBottom: 14, overflow: 'hidden' },
  cardInner: { padding: 16, borderRadius: BorderRadius.lg },
  cardTitle: { color: c.textPrimary, fontSize: 15, fontWeight: '800' },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 3 },
  line: { width: 2, flex: 1, backgroundColor: c.border, marginTop: 2 },
  stepTitle: { color: c.textPrimary, fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
  update: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  updateText: { color: c.textPrimary, fontSize: 13, lineHeight: 19 },
  quoteText: { color: c.success, fontSize: 13, fontWeight: '700', marginTop: 3 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  docName: { flex: 1, color: c.textPrimary, fontSize: 13 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, justifyContent: 'center' },
  link: { color: c.primary, fontSize: 14, fontWeight: '700' },
  cancelBtn: { marginTop: 8, paddingVertical: 13, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: c.error, alignItems: 'center' },
  cancelBtnText: { color: c.error, fontSize: 14, fontWeight: '800' },
})
