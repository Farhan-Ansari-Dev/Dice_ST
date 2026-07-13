import React, { useMemo } from 'react';
import { Share } from 'react-native';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import Badge, { getStatusVariant } from '../../components/common/Badge';
import Timeline from '../../components/common/Timeline';
import ProgressBar from '../../components/common/ProgressBar';
import Button from '../../components/common/Button';
import { formatDate } from '../../utils/formatters';

const MOCK_CERT: any = {
  id: '',
  name: '',
  type: '',
  certificateNo: '',
  status: '',
  issuedDate: '',
  expiryDate: '',
  productName: '',
  progress: 0,
  companyName: '',
  applicantName: '',
  labName: '',
  standardName: '',
  description: '',
  timeline: [],
  documents: [],
};

const CertificationDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

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
        <TouchableOpacity style={styles.shareBtn} onPress={() => Share.share({ title: MOCK_CERT.name, message: `${MOCK_CERT.name}\nCertificate No: ${MOCK_CERT.certificateNo}\nProduct: ${MOCK_CERT.productName}\nValid until: ${MOCK_CERT.expiryDate}` })}>
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
              <Text style={styles.heroCertName}>{MOCK_CERT.name}</Text>
              <Text style={styles.heroCertType}>{MOCK_CERT.type}</Text>
              <Badge label="Active" variant="success" size="sm" dot style={{ marginTop: 6 }} />
            </View>
          </View>
          <View style={styles.heroStats}>
            <View style={styles.heroStatItem}>
              <Ionicons name="barcode-outline" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.heroStatValue}>{MOCK_CERT.certificateNo}</Text>
            </View>
            <View style={styles.heroStatItem}>
              <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.heroStatValue}>Expires: {formatDate(MOCK_CERT.expiryDate)}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <Button
            title="Download"
            onPress={() => Alert.alert('Download', 'Certificate download started.')}
            variant="primary"
            size="md"
            icon={<Ionicons name="download-outline" size={16} color="#FFFFFF" />}
            style={{ flex: 1 }}
          />
          <Button
            title="Share"
            onPress={() => Alert.alert('Share', 'Share dialog.')}
            variant="outline"
            size="md"
            icon={<Ionicons name="share-social-outline" size={16} color={colors.primary} />}
            style={{ flex: 1 }}
          />
          <Button
            title="Renew"
            onPress={() => navigation.navigate('NewApplication')}
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
            {[
              { label: 'Product Name', value: MOCK_CERT.productName },
              { label: 'Standard', value: MOCK_CERT.standardName },
              { label: 'Testing Lab', value: MOCK_CERT.labName },
              { label: 'Company Name', value: MOCK_CERT.companyName },
              { label: 'Applicant', value: MOCK_CERT.applicantName },
              { label: 'Issue Date', value: formatDate(MOCK_CERT.issuedDate) },
              { label: 'Expiry Date', value: formatDate(MOCK_CERT.expiryDate) },
            ].map((item, i) => (
              <View key={i} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{item.label}</Text>
                <Text style={styles.detailValue}>{item.value}</Text>
              </View>
            ))}
          </LinearGradient>
        </View>

        {/* Documents */}
        <View style={[styles.card, Shadows.sm]}>
          <LinearGradient
            colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
            style={styles.cardInner}
          >
            <Text style={styles.cardTitle}>Supporting Documents</Text>
            {(MOCK_CERT.documents || []).map((doc: any) => (
              <View key={doc.id} style={styles.docRow}>
                <View style={styles.docIcon}>
                  <Ionicons name="document-text" size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docName}>{doc.name}</Text>
                  <Text style={styles.docType}>{doc.type}</Text>
                </View>
                <Badge label={doc.status} variant={getStatusVariant(doc.status)} size="sm" />
              </View>
            ))}
          </LinearGradient>
        </View>

        {/* Timeline */}
        <View style={[styles.card, Shadows.sm]}>
          <LinearGradient
            colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
            style={styles.cardInner}
          >
            <Text style={styles.cardTitle}>Application Timeline</Text>
            <Timeline items={MOCK_CERT.timeline} />
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
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border,
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
