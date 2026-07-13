import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import QRCode from 'react-native-qrcode-svg';

const VaultQRScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>QR Verification</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.qrCard, Shadows.lg]}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF','#FFFFFF']} style={styles.qrCardInner}>
            <View style={styles.qrHeader}>
              <Ionicons name="shield-checkmark" size={24} color={colors.success} />
              <Text style={styles.qrHeaderTitle}>Authentic Document</Text>
            </View>
            
            <View style={styles.qrContainer}>
              <QRCode
                value="https://verify.scs.org/doc/7654321"
                size={220}
                color={isDark ? '#FFFFFF' : '#000000'}
                backgroundColor="transparent"
              />
            </View>

            <View style={styles.qrInfo}>
              <Text style={styles.qrInfoLabel}>Scan with standard QR reader</Text>
              <Text style={styles.qrInfoSub}>ID: CM/L-7654321</Text>
            </View>
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
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  qrCard: { width: '100%', borderRadius: BorderRadius.xl, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
  qrCardInner: { padding: 32, alignItems: 'center' },
  qrHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 32 },
  qrHeaderTitle: { fontSize: 16, fontWeight: '700', color: colors.success },
  qrContainer: { padding: 16, backgroundColor: isDark ? '#FFFFFF10' : '#F7F8FC', borderRadius: BorderRadius.lg, marginBottom: 32 },
  qrInfo: { alignItems: 'center', gap: 4 },
  qrInfoLabel: { fontSize: 14, color: colors.textSecondary },
  qrInfoSub: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
});
export default VaultQRScreen;
