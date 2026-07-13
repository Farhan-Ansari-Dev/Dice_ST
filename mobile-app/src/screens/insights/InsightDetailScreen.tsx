import React, { useMemo } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import AIWidget from '../../components/common/AIWidget';
import Button from '../../components/common/Button';

const InsightDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

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
        <Text style={styles.headerTitle}>Insight Detail</Text>
        <TouchableOpacity>
          <Ionicons name="share-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.metaRow}>
          <View style={styles.impactBadge}>
            <View style={[styles.impactDot, { backgroundColor: colors.error }]} />
            <Text style={[styles.impactText, { color: colors.error }]}>HIGH IMPACT</Text>
          </View>
          <Text style={styles.readTime}>4 min read</Text>
          <Text style={styles.date}>45 minutes ago</Text>
        </View>
        <Text style={styles.title}>BIS Mandatory Certification Extended to Smart Home Devices</Text>
        <View style={styles.sourceRow}>
          <Ionicons name="newspaper-outline" size={14} color={colors.textTertiary} />
          <Text style={styles.source}>Bureau of Indian Standards</Text>
        </View>
        <Text style={styles.body}>
          The Bureau of Indian Standards (BIS) has issued a notification extending mandatory BIS certification requirements to include all smart home IoT devices sold in India effective April 1, 2025.{'\n\n'}
          This amendment to the Compulsory Registration Order (CRO) covers a wide range of products including smart speakers, smart displays, home automation controllers, connected sensors, and all Wi-Fi or Bluetooth-enabled home devices.{'\n\n'}
          Manufacturers and importers must obtain BIS registration under IS 13252 (Part 1) and IS 16103 before placing their products in the Indian market after the cut-off date.{'\n\n'}
          Key Requirements:{'\n'}
          • Product testing at NABL-accredited laboratories{'\n'}
          • Factory audit for domestic manufacturers{'\n'}
          • Quarterly test reports for continued compliance{'\n'}
          • BIS mark on all product packaging and unit{'\n\n'}
          Companies currently importing or selling smart home devices should initiate certification immediately, as the process typically takes 3-6 months.
        </Text>
        <AIWidget
          title="What this means for your business"
          insight="Based on your registered products, your smart speaker and home hub imports will require BIS certification before April 2025. We recommend initiating applications in November to meet the deadline comfortably."
          confidence={91}
          onPress={() => navigation.navigate('Identifier')}
          
        />
        <Button
          title="Start BIS Application"
          onPress={() => navigation.navigate('NewApplication')}
          fullWidth
          
        />
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
      gap: 12,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? colors.bgCardLight : colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    content: { paddingHorizontal: 20, paddingTop: 8 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    impactBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: BorderRadius.full,
      backgroundColor: 'rgba(255,71,87,0.15)',
    },
    impactDot: { width: 6, height: 6, borderRadius: 3 },
    impactText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
    readTime: { fontSize: 12, color: colors.textTertiary },
    date: { fontSize: 12, color: colors.textTertiary },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.textPrimary,
      lineHeight: 30,
      marginBottom: 12,
    },
    sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
    source: { fontSize: 12, color: colors.textTertiary, fontStyle: 'italic' },
    body: {
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 26,
    },
  });

export default InsightDetailScreen;
