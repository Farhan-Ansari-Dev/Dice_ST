import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Share,
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import Badge, { getStatusVariant } from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { formatDate } from '../../utils/formatters';
import certificationService from '../../services/certificationService';

const prettyStatus = (s?: string) =>
  (s ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Unknown';

const CertificationDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const certId: string | undefined = route.params?.id;
  const [cert, setCert] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    if (!certId) {
      setError('Missing certificate reference.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res: any = await certificationService.getCertificationById(certId);
      setCert(res?.data ?? res ?? null);
    } catch (e) {
      setError('Could not load this certificate.');
    } finally {
      setLoading(false);
    }
  }, [certId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDownload = useCallback(async () => {
    if (!certId) return;
    try {
      setDownloading(true);
      const res: any = await certificationService.downloadCertificate(certId);
      const url = res?.data?.url ?? res?.url;
      if (url) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Download', 'The official certificate document is not available yet.');
      }
    } catch (e: any) {
      const msg =
        e?.response?.status === 409
          ? 'The official certificate document has not been issued yet.'
          : 'Could not download the certificate. Please try again.';
      Alert.alert('Download', msg);
    } finally {
      setDownloading(false);
    }
  }, [certId]);

  const handleShare = useCallback(() => {
    if (!cert) return;
    Share.share({
      title: cert.scheme || cert.cert_type || 'Certificate',
      message:
        `${cert.cert_type ?? 'Certificate'}\n` +
        `Certificate No: ${cert.cert_number ?? '—'}\n` +
        `Issued by: ${cert.issuing_body ?? '—'}\n` +
        `Valid until: ${formatDate(cert.expiry_date)}` +
        (cert.verification_url ? `\nVerify: ${cert.verification_url}` : ''),
    });
  }, [cert]);

  const detailRows = useMemo(() => {
    if (!cert) return [];
    return [
      { label: 'Product', value: cert.product_id?.name },
      { label: 'Certification Type', value: cert.cert_type },
      { label: 'Scheme / Standard', value: cert.scheme },
      { label: 'Issuing Body', value: cert.issuing_body },
      { label: 'Company', value: cert.org_id?.name },
      { label: 'Issue Date', value: cert.issue_date ? formatDate(cert.issue_date) : undefined },
      { label: 'Expiry Date', value: cert.expiry_date ? formatDate(cert.expiry_date) : undefined },
      {
        label: 'Validity',
        value: cert.validity_period_months ? `${cert.validity_period_months} months` : undefined,
      },
      { label: 'Scope', value: cert.scope },
    ].filter((r) => !!r.value);
  }, [cert]);

  const renderHeader = (title: string) => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.shareBtn} />
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']}
          style={StyleSheet.absoluteFill}
        />
        {renderHeader('Certificate Detail')}
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (error || !cert) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']}
          style={StyleSheet.absoluteFill}
        />
        {renderHeader('Certificate Detail')}
        <View style={styles.centerFill}>
          <Ionicons name="alert-circle-outline" size={44} color={colors.textTertiary} />
          <Text style={styles.emptyText}>{error ?? 'Certificate not found.'}</Text>
          <Button title="Retry" onPress={load} variant="outline" size="md" style={{ marginTop: 16 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Certificate Detail</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Hero Card */}
        <LinearGradient
          colors={[colors.success + 'DD', colors.successDark + 'CC']}
          style={[styles.heroCard, Shadows.lg]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroCertIcon}>
              <Ionicons name="shield-checkmark" size={40} color="#FFFFFF" />
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.heroCertName}>{cert.scheme || cert.cert_type || 'Certificate'}</Text>
              <Text style={styles.heroCertType}>{cert.issuing_body || cert.cert_type}</Text>
              <Badge
                label={prettyStatus(cert.status)}
                variant={getStatusVariant(cert.status)}
                size="sm"
                dot
                style={{ marginTop: 6 }}
              />
            </View>
          </View>
          <View style={styles.heroStats}>
            {!!cert.cert_number && (
              <View style={styles.heroStatItem}>
                <Ionicons name="barcode-outline" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.heroStatValue}>{cert.cert_number}</Text>
              </View>
            )}
            {!!cert.expiry_date && (
              <View style={styles.heroStatItem}>
                <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.heroStatValue}>Expires: {formatDate(cert.expiry_date)}</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <Button
            title={downloading ? 'Preparing…' : 'Download'}
            onPress={handleDownload}
            disabled={downloading}
            variant="primary"
            size="md"
            icon={<Ionicons name="download-outline" size={16} color="#FFFFFF" />}
            style={{ flex: 1 }}
          />
          <Button
            title="Share"
            onPress={handleShare}
            variant="outline"
            size="md"
            icon={<Ionicons name="share-social-outline" size={16} color={colors.primary} />}
            style={{ flex: 1 }}
          />
          <Button
            title="Renew"
            onPress={() => navigation.navigate('NewCertification')}
            variant="ghost"
            size="md"
            icon={<Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />}
            style={{ flex: 1 }}
          />
        </View>

        {/* Details Card */}
        <View style={[styles.card, Shadows.sm]}>
          <LinearGradient
            colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
            style={styles.cardInner}
          >
            <Text style={styles.cardTitle}>Certificate Details</Text>
            {detailRows.map((item, i) => (
              <View key={i} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{item.label}</Text>
                <Text style={styles.detailValue}>{item.value}</Text>
              </View>
            ))}
          </LinearGradient>
        </View>

        {/* Official document */}
        <View style={[styles.card, Shadows.sm]}>
          <LinearGradient
            colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
            style={styles.cardInner}
          >
            <Text style={styles.cardTitle}>Official Certificate</Text>
            {cert.certificate_document_id ? (
              <TouchableOpacity style={styles.docRow} onPress={handleDownload} disabled={downloading}>
                <View style={styles.docIcon}>
                  <Ionicons name="document-text" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docName}>Certificate document</Text>
                  <Text style={styles.docType}>PDF · tap to download</Text>
                </View>
                <Ionicons name="download-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : (
              <Text style={styles.docType}>
                The official certificate document has not been issued yet.
              </Text>
            )}
          </LinearGradient>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    emptyText: { fontSize: 14, color: colors.textSecondary, marginTop: 12, textAlign: 'center' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? colors.bgCardLight : colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: colors.textPrimary },
    shareBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? colors.bgCardLight : colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100 },
    heroCard: {
      borderRadius: BorderRadius.xl,
      padding: 20,
      marginBottom: 16,
    },
    heroTop: { flexDirection: 'row', gap: 16, marginBottom: 16 },
    heroCertIcon: {
      width: 72,
      height: 72,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroInfo: { flex: 1, justifyContent: 'center' },
    heroCertName: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', lineHeight: 22 },
    heroCertType: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 3 },
    heroStats: { gap: 8 },
    heroStatItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    heroStatValue: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
    actionsRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 20,
    },
    card: {
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
      marginBottom: 16,
    },
    cardInner: { padding: 16 },
    cardTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 14 },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border,
    },
    detailLabel: { fontSize: 13, color: colors.textTertiary },
    detailValue: { fontSize: 13, color: colors.textPrimary, fontWeight: '500', flex: 1, textAlign: 'right' },
    docRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
    },
    docIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: `${colors.primary}20`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    docName: { fontSize: 13, color: colors.textPrimary, fontWeight: '500' },
    docType: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
  });

export default CertificationDetailScreen;
