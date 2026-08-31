import React, { useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useTheme, BorderRadius } from '../../theme'

export default function CBRequestSuccessScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { colors, isDark } = useTheme()
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark])
  const { requestId, requestNumber } = route.params || {}

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.center}>
        <View style={styles.badge}><Ionicons name="checkmark" size={44} color="#fff" /></View>
        <Text style={styles.title}>Request submitted</Text>
        {requestNumber ? <Text style={styles.number}>{requestNumber}</Text> : null}
        <Text style={styles.sub}>Your request has been submitted successfully. We’ll notify you as the certification body responds.</Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.replace('CBRequestDetail', { id: requestId })}>
          <Text style={styles.primaryBtnText}>Track Request</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ghostBtn} onPress={() => navigation.navigate('CBRequestsList')}>
          <Text style={styles.ghostBtnText}>View all my requests</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const makeStyles = (c: any, dark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.bgDark },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 10 },
  badge: { width: 84, height: 84, borderRadius: 42, backgroundColor: c.success, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { color: c.textPrimary, fontSize: 22, fontWeight: '900' },
  number: { color: c.primary, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  sub: { color: c.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 21, marginTop: 4, marginBottom: 16 },
  primaryBtn: { backgroundColor: c.primary, borderRadius: BorderRadius.md, paddingVertical: 14, paddingHorizontal: 40, alignItems: 'center', width: '100%' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  ghostBtn: { paddingVertical: 12, alignItems: 'center' },
  ghostBtnText: { color: c.textSecondary, fontSize: 14, fontWeight: '700' },
})
