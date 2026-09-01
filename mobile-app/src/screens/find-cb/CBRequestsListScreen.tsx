import React, { useCallback, useMemo, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { useTheme, Shadows, BorderRadius } from '../../theme'
import Badge, { getStatusVariant } from '../../components/common/Badge'
import EmptyState from '../../components/common/EmptyState'
import cbService, { CBRequest } from '../../services/cbService'
import { formatDate } from '../../utils/formatters'

const pretty = (s?: string) => (s || '').replace(/_/g, ' ')

export default function CBRequestsListScreen() {
  const navigation = useNavigation<any>()
  const { colors, isDark } = useTheme()
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark])
  const [items, setItems] = useState<CBRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setError(false)
    try { const { items } = await cbService.listRequests({ limit: 50 }); setItems(items) }
    catch { setError(true) }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={22} color={colors.textPrimary} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Certification Body Requests</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : error ? (
        <View style={styles.center}><Ionicons name="cloud-offline-outline" size={44} color={colors.error} /><Text style={styles.muted}>Couldn’t load your requests.</Text><TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); load() }}><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View>
      ) : items.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center' }}><EmptyState icon="albums-outline" title="No CB requests yet" subtitle="When you request a quote from a certification body, it will appear here." /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i._id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={[styles.card, Shadows.sm]} onPress={() => navigation.navigate('CBRequestDetail', { id: item._id })}>
              <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.cardInner}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.cbName} numberOfLines={1}>{item.certification_body_id?.name || 'Certification Body'}</Text>
                  <Badge label={pretty(item.status)} variant={getStatusVariant(item.status)} />
                </View>
                <Text style={styles.reqNo}>{item.request_number}</Text>
                <Text style={styles.meta}>{[item.product_id?.name || item.product_category, item.cert_type, (item.markets?.length ? item.markets.join(', ') : item.market)].filter(Boolean).join(' · ')}</Text>
                <Text style={styles.muted}>Updated {formatDate(item.updated_at)}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  )
}

const makeStyles = (c: any, dark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bgDark },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  muted: { color: c.textSecondary, fontSize: 12, marginTop: 4 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: c.primary, borderRadius: BorderRadius.md },
  retryText: { color: '#fff', fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: dark ? c.bgCardLight : c.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: c.textPrimary, fontSize: 17, fontWeight: '800' },
  card: { borderRadius: BorderRadius.lg, marginBottom: 12, overflow: 'hidden' },
  cardInner: { padding: 16, borderRadius: BorderRadius.lg },
  cbName: { color: c.textPrimary, fontSize: 15, fontWeight: '800', flex: 1, marginRight: 8 },
  reqNo: { color: c.primary, fontSize: 12, fontWeight: '700', marginTop: 4 },
  meta: { color: c.textSecondary, fontSize: 13, marginTop: 4 },
})
