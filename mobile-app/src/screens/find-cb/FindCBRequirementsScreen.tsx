import React, { useMemo, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useTheme, BorderRadius } from '../../theme'
import CountrySelector from '../../components/common/CountrySelector'

/**
 * Explore-origin entry for Find Your CB. There is no application context here, so
 * the customer supplies the requirement (the backend /certification-bodies/match
 * endpoint accepts cert_type + optional market/product_category directly). Matching
 * itself happens entirely on the backend — this screen only collects inputs.
 */
export default function FindCBRequirementsScreen() {
  const navigation = useNavigation<any>()
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark])

  const [certType, setCertType] = useState('')
  const [markets, setMarkets] = useState<string[]>([])
  const [productCategory, setProductCategory] = useState('')
  const [touched, setTouched] = useState(false)

  const certValid = certType.trim().length > 0
  const toggleMarket = (code: string) =>
    setMarkets(prev => (prev.includes(code) ? prev.filter(x => x !== code) : [...prev, code]))

  const search = () => {
    setTouched(true)
    if (!certValid) return
    navigation.navigate('FindCBResults', {
      cert_type: certType.trim(),
      markets: markets.length ? markets : undefined,
      product_category: productCategory.trim() || undefined,
    })
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={22} color={colors.textPrimary} /></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Find Your Certification Body</Text>
          <Text style={styles.headerSub}>Find bodies relevant to your certification and market</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('CBRequestsList')} style={styles.backBtn}><Ionicons name="albums-outline" size={20} color={colors.textPrimary} /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.cardInner}>
            <Text style={styles.label}>Certification type <Text style={styles.req}>*</Text></Text>
            <TextInput
              value={certType}
              onChangeText={(t) => setCertType(t.toUpperCase())}
              autoCapitalize="characters"
              placeholder="e.g. BIS_CRS, CE, SASO"
              placeholderTextColor={colors.textTertiary}
              style={[styles.input, touched && !certValid && { borderColor: colors.error }]}
            />
            {touched && !certValid ? <Text style={styles.errorText}>Certification type is required.</Text> : <Text style={styles.help}>The scheme or standard you need (as used in DICE).</Text>}

            <Text style={[styles.label, { marginTop: 18 }]}>Target markets</Text>
            <CountrySelector multiple selectedCodes={markets} onToggle={toggleMarket} onClear={() => setMarkets([])} placeholder="Add target markets" label="" />
            <Text style={styles.help}>Optional — select one or more destination markets to see per-market coverage.</Text>

            <Text style={[styles.label, { marginTop: 6 }]}>Product category</Text>
            <TextInput
              value={productCategory}
              onChangeText={setProductCategory}
              placeholder="e.g. Electronics (optional)"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />
            <Text style={styles.help}>Optional — narrows results to bodies whose scope covers your product.</Text>
          </LinearGradient>
        </View>

        <Text style={styles.note}>Certification bodies are matched and ranked on the DICE backend based on their verified scope, accreditation and market coverage.</Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={[styles.searchBtn, !certValid && { opacity: 0.6 }]} onPress={search}>
          <Ionicons name="search" size={16} color="#fff" />
          <Text style={styles.searchBtnText}>Find Certification Bodies</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const makeStyles = (c: any, dark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bgDark },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: dark ? c.bgCardLight : c.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: c.textPrimary, fontSize: 17, fontWeight: '800' },
  headerSub: { color: c.textSecondary, fontSize: 12, marginTop: 2 },
  card: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  cardInner: { padding: 16, borderRadius: BorderRadius.lg },
  label: { color: c.textPrimary, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  req: { color: c.error },
  input: { backgroundColor: dark ? c.bgCardLight : '#F4F6FB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: c.textPrimary, fontSize: 15, borderWidth: 1, borderColor: 'transparent' },
  help: { color: c.textTertiary, fontSize: 12, marginTop: 6 },
  errorText: { color: c.error, fontSize: 12, marginTop: 6 },
  note: { color: c.textTertiary, fontSize: 12, lineHeight: 18, marginTop: 16, textAlign: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: c.bgCard, borderTopWidth: 1, borderTopColor: c.border },
  searchBtn: { flexDirection: 'row', gap: 8, backgroundColor: c.primary, borderRadius: BorderRadius.md, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
})
