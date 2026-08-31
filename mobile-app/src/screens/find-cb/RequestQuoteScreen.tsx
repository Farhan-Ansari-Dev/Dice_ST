import React, { useMemo, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import * as DocumentPicker from 'expo-document-picker'
import { useTheme, Shadows, BorderRadius } from '../../theme'
import cbService from '../../services/cbService'
import documentsService from '../../services/documentsService'

export default function RequestQuoteScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { colors, isDark } = useTheme()
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark])
  const p = route.params || {}

  const [message, setMessage] = useState('')
  const [docs, setDocs] = useState<{ _id: string; name: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const pickDoc = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: false, copyToCacheDirectory: true })
      if (result.canceled || !result.assets?.length) return
      const file = result.assets[0]
      setUploading(true)
      const uploaded = await documentsService.uploadFromDevice(file.uri, file.name, file.mimeType || 'application/octet-stream', 'general', p.applicationId)
      setDocs((d) => [...d, { _id: uploaded._id, name: file.name }])
    } catch (e: any) {
      Alert.alert('Upload failed', e?.response?.data?.error || e?.message || 'Could not upload document.')
    } finally { setUploading(false) }
  }

  const submit = async () => {
    setSubmitting(true)
    try {
      const created = await cbService.createRequest({
        certification_body_id: p.cbId,
        application_id: p.applicationId,
        product_id: p.product_id,
        cert_type: p.cert_type,
        market: p.market,
        product_category: p.product_category,
        message: message.trim() || undefined,
        document_ids: docs.map((d) => d._id),
        match_snapshot: p.match_snapshot,
      })
      navigation.replace('CBRequestSuccess', { requestId: created._id, requestNumber: created.request_number })
    } catch (e: any) {
      if (e?.response?.status === 409) {
        const existing = e.response.data?.data
        Alert.alert(
          'You already have a request',
          'You already have an active request with this certification body for this certification and market.',
          [
            { text: 'Choose another CB', style: 'cancel', onPress: () => navigation.goBack() },
            { text: 'View existing request', onPress: () => existing?.request_id && navigation.replace('CBRequestDetail', { id: existing.request_id }) },
          ],
        )
      } else if (e?.response?.status === 401) {
        Alert.alert('Session expired', 'Please sign in again to continue.')
      } else {
        Alert.alert('Could not send request', e?.response?.data?.message || 'Please try again.')
      }
    } finally { setSubmitting(false) }
  }

  const Summary = ({ label, value }: { label: string; value?: string }) => value ? (
    <View style={styles.sumRow}><Text style={styles.sumLabel}>{label}</Text><Text style={styles.sumValue}>{value}</Text></View>
  ) : null

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={22} color={colors.textPrimary} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Request a Quote</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, Shadows.sm]}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.cardInner}>
            <Text style={styles.cardTitle}>Request summary</Text>
            <Summary label="Certification Body" value={p.cbName} />
            <Summary label="Product" value={p.product_name || p.product_category} />
            <Summary label="Certification" value={p.cert_type} />
            <Summary label="Market" value={p.market} />
            <Summary label="Documents" value={docs.length ? `${docs.length} attached` : 'None'} />
          </LinearGradient>
        </View>

        <View style={[styles.card, Shadows.sm]}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.cardInner}>
            <Text style={styles.cardTitle}>Message (optional)</Text>
            <TextInput value={message} onChangeText={setMessage} multiline placeholder="Add any details for the certification body…" placeholderTextColor={colors.textTertiary} style={styles.textarea} />
          </LinearGradient>
        </View>

        <View style={[styles.card, Shadows.sm]}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.cardInner}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>Documents</Text>
              <TouchableOpacity style={styles.uploadBtn} onPress={pickDoc} disabled={uploading}>
                {uploading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="cloud-upload-outline" size={16} color={colors.primary} />}
                <Text style={styles.uploadBtnText}>{uploading ? 'Uploading…' : 'Attach'}</Text>
              </TouchableOpacity>
            </View>
            {docs.length === 0 ? <Text style={styles.muted}>Attach relevant documents (optional).</Text> : docs.map((d, i) => (
              <View key={d._id + i} style={styles.docRow}>
                <Ionicons name="document-text" size={18} color={colors.primary} />
                <Text style={styles.docName} numberOfLines={1}>{d.name}</Text>
                <TouchableOpacity onPress={() => setDocs((prev) => prev.filter((x) => x._id !== d._id))}><Ionicons name="close" size={18} color={colors.textTertiary} /></TouchableOpacity>
              </View>
            ))}
          </LinearGradient>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={[styles.sendBtn, submitting && { opacity: 0.6 }]} disabled={submitting} onPress={submit}>
          {submitting ? <ActivityIndicator color="#fff" /> : <><Ionicons name="send" size={16} color="#fff" /><Text style={styles.sendBtnText}>Send Request</Text></>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const makeStyles = (c: any, dark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bgDark },
  muted: { color: c.textSecondary, fontSize: 13 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: dark ? c.bgCardLight : c.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: c.textPrimary, fontSize: 17, fontWeight: '800' },
  card: { borderRadius: BorderRadius.lg, marginBottom: 14, overflow: 'hidden' },
  cardInner: { padding: 16, borderRadius: BorderRadius.lg },
  cardTitle: { color: c.textPrimary, fontSize: 14, fontWeight: '800', marginBottom: 10 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
  sumLabel: { color: c.textSecondary, fontSize: 13 },
  sumValue: { color: c.textPrimary, fontSize: 13, fontWeight: '700', maxWidth: '60%', textAlign: 'right' },
  textarea: { minHeight: 90, color: c.textPrimary, fontSize: 14, textAlignVertical: 'top', backgroundColor: dark ? c.bgCardLight : '#F4F6FB', borderRadius: 10, padding: 12 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  uploadBtnText: { color: c.primary, fontSize: 13, fontWeight: '700' },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  docName: { flex: 1, color: c.textPrimary, fontSize: 13 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: c.bgCard, borderTopWidth: 1, borderTopColor: c.border },
  sendBtn: { flexDirection: 'row', gap: 8, backgroundColor: c.primary, borderRadius: BorderRadius.md, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
})
