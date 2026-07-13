import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const DIGILOCKER_URL = 'https://digilocker.gov.in';

const FETCHABLE_DOCS: any[] = [];

const DigiLockerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [isConnected, setIsConnected] = useState(false);
  const [fetchedDocs, setFetchedDocs] = useState<Set<string>>(new Set());

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const handleConnect = async () => {
    try {
      const supported = await Linking.canOpenURL(DIGILOCKER_URL);
      if (supported) {
        await Linking.openURL(DIGILOCKER_URL);
      } else {
        Alert.alert('Error', 'Cannot open DigiLocker. Please visit digilocker.gov.in manually.');
      }
      // Simulate connection after returning
      setTimeout(() => setIsConnected(true), 2000);
    } catch {
      Alert.alert('Error', 'Failed to open DigiLocker.');
    }
  };

  const handleFetch = (doc: typeof FETCHABLE_DOCS[0]) => {
    Alert.alert(
      'Opening DigiLocker...',
      `Fetching ${doc.name} from ${doc.issuer}. You will be redirected to DigiLocker for authentication.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed',
          onPress: async () => {
            await Linking.openURL(DIGILOCKER_URL).catch(() => {});
            setFetchedDocs((prev) => new Set([...prev, doc.id]));
          },
        },
      ]
    );
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect DigiLocker',
      'This will remove your DigiLocker connection. Fetched documents will remain.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', style: 'destructive', onPress: () => setIsConnected(false) },
      ]
    );
  };

  const categories = Array.from(new Set(FETCHABLE_DOCS.map((d) => d.category)));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>DigiLocker</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* DigiLocker Brand Card */}
        <View style={[styles.brandCard, Shadows.md]}>
          <LinearGradient
            colors={['#FF6B35', '#E84545']}
            style={styles.brandCardGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.brandLogoRow}>
              <View style={styles.brandLogo}>
                <Ionicons name="cloud" size={28} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.brandTitle}>DigiLocker</Text>
                <Text style={styles.brandSub}>Government of India</Text>
              </View>
              {isConnected && (
                <View style={styles.connectedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                  <Text style={styles.connectedText}>Connected</Text>
                </View>
              )}
            </View>
            <Text style={styles.brandDesc}>
              Access your government-issued documents digitally. Securely fetch Aadhaar, PAN, GST Certificate and more.
            </Text>
            {isConnected ? (
              <View style={styles.brandBtnRow}>
                <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect}>
                  <Text style={styles.disconnectBtnText}>Disconnect</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={[styles.connectBtn, Shadows.sm]} onPress={handleConnect} activeOpacity={0.9}>
                <Ionicons name="link-outline" size={16} color="#FF6B35" />
                <Text style={styles.connectBtnText}>Connect DigiLocker</Text>
              </TouchableOpacity>
            )}
          </LinearGradient>
        </View>

        {/* Info if not connected */}
        {!isConnected && (
          <View style={[styles.infoCard, Shadows.sm]}>
            <LinearGradient
              colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
              style={styles.infoCardInner}
            >
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.infoText}>
                Connect your DigiLocker account to fetch documents directly. You can still use the Fetch button below to link individual documents.
              </Text>
            </LinearGradient>
          </View>
        )}

        {/* Documents by category */}
        {categories.map((category) => (
          <View key={category}>
            <Text style={styles.categoryTitle}>{category} Documents</Text>
            <View style={[styles.docListCard, Shadows.sm]}>
              <LinearGradient
                colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
                style={styles.docListCardInner}
              >
                {FETCHABLE_DOCS.filter((d) => d.category === category).map((doc, idx, arr) => (
                  <View key={doc.id}>
                    {idx > 0 && <View style={styles.divider} />}
                    <View style={styles.docRow}>
                      <View style={[styles.docIcon, { backgroundColor: `${colors.primary}15` }]}>
                        <Ionicons name={doc.icon} size={18} color={colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.docName}>{doc.name}</Text>
                        <Text style={styles.docIssuer}>{doc.issuer}</Text>
                      </View>
                      {fetchedDocs.has(doc.id) ? (
                        <View style={[styles.fetchedChip, { backgroundColor: `${colors.success}20` }]}>
                          <Ionicons name="checkmark" size={12} color={colors.success} />
                          <Text style={[styles.fetchedText, { color: colors.success }]}>Fetched</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[styles.fetchBtn, { borderColor: colors.primary }]}
                          onPress={() => handleFetch(doc)}
                        >
                          <Text style={[styles.fetchBtnText, { color: colors.primary }]}>Fetch</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </LinearGradient>
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? colors.bgCardLight : colors.border, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    content: { paddingHorizontal: 20, paddingTop: 8 },
    brandCard: { borderRadius: BorderRadius.xl, overflow: 'hidden', marginBottom: 16 },
    brandCardGrad: { padding: 20 },
    brandLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    brandLogo: { width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
    brandTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
    brandSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    connectedBadge: { marginLeft: 'auto' as any, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full },
    connectedText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
    brandDesc: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 19, marginBottom: 16 },
    connectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFFFFF', paddingVertical: 12, borderRadius: BorderRadius.lg },
    connectBtnText: { fontSize: 14, fontWeight: '700', color: '#FF6B35' },
    brandBtnRow: { alignItems: 'flex-start' },
    disconnectBtn: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: BorderRadius.full },
    disconnectBtnText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
    infoCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, marginBottom: 20 },
    infoCardInner: { flexDirection: 'row', gap: 10, padding: 14, alignItems: 'flex-start' },
    infoText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
    categoryTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 10, marginTop: 4 },
    docListCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, marginBottom: 16 },
    docListCardInner: { paddingVertical: 4 },
    docRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
    docIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    docName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    docIssuer: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    fetchBtn: { borderWidth: 1.5, borderRadius: BorderRadius.full, paddingHorizontal: 14, paddingVertical: 6 },
    fetchBtnText: { fontSize: 12, fontWeight: '700' },
    fetchedChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.full },
    fetchedText: { fontSize: 12, fontWeight: '600' },
    divider: { height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border, marginHorizontal: 14 },
  });

export default DigiLockerScreen;
