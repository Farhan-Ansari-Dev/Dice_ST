import React, { useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useTheme, Shadows, BorderRadius } from '../../theme'
import { CBMatch, matchTier } from '../../services/cbService'

export default function CBCompareScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { colors, isDark } = useTheme()
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark])
  const cbs: CBMatch[] = route.params?.cbs || []

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><View style={{ flex: 1 }}>{typeof value === 'string' ? <Text style={styles.rowValue}>{value || '—'}</Text> : value}</View></View>
  )

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={22} color={colors.textPrimary} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Compare ({cbs.length})</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12 }}>
        {cbs.map((cb) => (
          <View key={cb.id} style={[styles.col, Shadows.sm]}>
            <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.colInner}>
              <Text style={styles.cbName} numberOfLines={2}>{cb.name}</Text>
              <View style={styles.scoreRow}><Text style={styles.score}>{cb.match_score}%</Text><Text style={styles.tier}>{matchTier(cb.match_score)}</Text></View>
              <View style={styles.divider} />
              <Row label="Verification" value={cb.verified ? <Text style={[styles.rowValue, { color: colors.success }]}>Verified</Text> : <Text style={styles.rowValue}>Not verified</Text>} />
              <Row label="Certifications" value={(cb.cert_types || []).slice(0, 4).join(', ')} />
              <Row label="Products" value={(cb.product_categories || []).slice(0, 4).join(', ')} />
              <Row label="Markets" value={(cb.markets || []).slice(0, 6).join(', ')} />
              <Row label="Accreditation" value={(cb.accreditations || []).slice(0, 3).join(', ')} />
              <Row label="Service" value={(cb.service_types || []).join(', ')} />
              <View style={styles.divider} />
              <TouchableOpacity style={styles.ghostBtn} onPress={() => navigation.navigate('CBProfile', { id: cb.id })}><Text style={styles.ghostBtnText}>View details</Text></TouchableOpacity>
              <TouchableOpacity style={styles.quoteBtn} onPress={() => navigation.navigate('RequestQuote', { cbId: cb.id, cbName: cb.name, match_snapshot: { score: cb.match_score, reasons: (cb.match_reasons || []).filter((r) => r.satisfied).map((r) => r.label) } })}><Text style={styles.quoteBtnText}>Request Quote</Text></TouchableOpacity>
            </LinearGradient>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const makeStyles = (c: any, dark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bgDark },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: dark ? c.bgCardLight : c.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: c.textPrimary, fontSize: 17, fontWeight: '800' },
  col: { width: 260, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  colInner: { padding: 16, borderRadius: BorderRadius.lg },
  cbName: { color: c.textPrimary, fontSize: 16, fontWeight: '800', minHeight: 42 },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 },
  score: { color: c.primary, fontSize: 22, fontWeight: '900' },
  tier: { color: c.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  divider: { height: 1, backgroundColor: c.border, marginVertical: 12 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  rowLabel: { color: c.textTertiary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', width: 86 },
  rowValue: { color: c.textPrimary, fontSize: 13 },
  ghostBtn: { paddingVertical: 10, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: c.border, alignItems: 'center', marginBottom: 8 },
  ghostBtnText: { color: c.textPrimary, fontSize: 13, fontWeight: '700' },
  quoteBtn: { paddingVertical: 11, borderRadius: BorderRadius.md, backgroundColor: c.primary, alignItems: 'center' },
  quoteBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
})
