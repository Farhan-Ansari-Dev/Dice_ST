import React, { useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const VaultShareScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const options = [
    { icon: 'logo-whatsapp' as const, label: 'WhatsApp', color: '#25D366' },
    { icon: 'mail' as const, label: 'Email', color: colors.primary },
    { icon: 'download-outline' as const, label: 'Download', color: colors.secondary },
    { icon: 'copy-outline' as const, label: 'Copy Link', color: colors.warning },
    { icon: 'print-outline' as const, label: 'Print', color: colors.textSecondary },
    { icon: 'ellipsis-horizontal' as const, label: 'More', color: colors.textTertiary },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Share Document</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.preview, Shadows.md]}>
          <LinearGradient colors={['#1A1560','#6C63FF','#00D4FF']} style={styles.previewGrad}>
            <Ionicons name="document-text" size={36} color="#FFFFFF" />
            <Text style={styles.previewTitle}>Selected Document</Text>
            <Text style={styles.previewSub}>Secure sharing enabled</Text>
          </LinearGradient>
        </View>

        <Text style={styles.shareLabel}>Share via</Text>

        <View style={styles.grid}>
          {options.map((opt, i) => (
            <TouchableOpacity key={i} style={styles.optItem} onPress={() => Alert.alert('Shared', `Document shared via ${opt.label}!`)} activeOpacity={0.7}>
              <View style={[styles.optIcon, { backgroundColor: `${opt.color}18` }]}>
                <Ionicons name={opt.icon} size={24} color={opt.color} />
              </View>
              <Text style={styles.optLabel}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.linkBox, Shadows.sm]}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF','#F7F8FC']} style={styles.linkBoxInner}>
            <Text style={styles.linkText} numberOfLines={1}>https://scs.verify/share/DOC12345</Text>
            <TouchableOpacity onPress={() => Alert.alert('Copied', 'Link copied to clipboard!')}>
              <Ionicons name="copy-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </View>
  );
};

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDark },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? colors.bgCardLight : colors.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  content: { paddingHorizontal: 20 },
  preview: { borderRadius: BorderRadius.xl, overflow: 'hidden', marginBottom: 28 },
  previewGrad: { padding: 28, alignItems: 'center', gap: 6 },
  previewTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginTop: 6 },
  previewSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  shareLabel: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  optItem: { width: '30%', alignItems: 'center', gap: 8 },
  optIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  optLabel: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
  linkBox: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
  linkBoxInner: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  linkText: { flex: 1, fontSize: 13, color: colors.textTertiary },
});
export default VaultShareScreen;
