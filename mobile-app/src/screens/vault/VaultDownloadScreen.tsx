import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const VaultDownloadScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [downloading, setDownloading] = useState<string | null>(null);

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  
  const options = [
    { id: 'pdf', icon: 'document-text' as const, label: 'Download as PDF', desc: 'High-quality PDF, suitable for printing', color: colors.error },
    { id: 'png', icon: 'image' as const, label: 'Download as Image', desc: 'PNG format, suitable for digital use', color: colors.primary },
    { id: 'email', icon: 'mail' as const, label: 'Send via Email', desc: 'Send document to your registered email', color: colors.success },
  ];

  const handleDownload = async (id: string) => {
    setDownloading(id);
    await new Promise(r => setTimeout(r, 1500));
    setDownloading(null);
    Alert.alert('Success', id === 'email' ? 'Document sent to your email!' : 'Document downloaded successfully!');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Download / Export</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.content}>
        <View style={[styles.preview, Shadows.md]}>
          <LinearGradient colors={['#1A1560','#6C63FF']} style={styles.previewGrad}>
            <Ionicons name="documents" size={40} color="#FFFFFF" />
            <Text style={styles.previewTitle}>Vault Export</Text>
            <Text style={styles.previewSub}>Secure Access File</Text>
          </LinearGradient>
        </View>
        <Text style={styles.sectionLabel}>Choose Format</Text>
        {options.map(opt => (
          <TouchableOpacity key={opt.id} style={[styles.optCard, Shadows.sm]} onPress={() => handleDownload(opt.id)} activeOpacity={0.85}>
            <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF','#F7F8FC']} style={styles.optCardInner}>
              <View style={[styles.optIcon, { backgroundColor: `${opt.color}18` }]}>
                <Ionicons name={opt.icon} size={22} color={opt.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optLabel}>{opt.label}</Text>
                <Text style={styles.optDesc}>{opt.desc}</Text>
              </View>
              {downloading === opt.id
                ? <Ionicons name="ellipsis-horizontal" size={20} color={colors.textTertiary} />
                : <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDark },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? colors.bgCardLight : colors.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  preview: { borderRadius: BorderRadius.xl, overflow: 'hidden', marginBottom: 24 },
  previewGrad: { padding: 32, alignItems: 'center', gap: 6 },
  previewTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginTop: 8 },
  previewSub: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  optCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, marginBottom: 10 },
  optCardInner: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  optIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  optDesc: { fontSize: 12, color: colors.textTertiary },
});
export default VaultDownloadScreen;
