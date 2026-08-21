import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../theme';
import Button from '../../components/common/Button';
import useSavedOpportunities from '../../hooks/useSavedOpportunities';

export default function BusinessOpportunityScreen() {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { title = 'Opportunity', oppData = {} } = route.params || {};

  const industry = oppData.industry || 'General';
  const overview = oppData.overview || 'Detailed overview coming soon.';
  const investment = oppData.investment || 0;
  const demand = oppData.demand || 'Medium';
  const profitMargin = oppData.profitMargin || '10-20%';
  const requiredCerts = oppData.requiredCertifications || ['General Compliance'];

  // Save/bookmark — persisted per user via the backend. Only saveable when we
  // have the real opportunity id (guards the OpportunitiesList param path).
  const oppId: string | undefined = oppData?._id;
  const { isSaved, toggle } = useSavedOpportunities();
  const saved = oppId ? isSaved(oppId) : false;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconBtn}
            disabled={!oppId}
            onPress={() =>
              oppId &&
              toggle(oppId, {
                title,
                country: oppData.country,
                industry,
                investment,
                demand,
                profitMargin,
                overview,
                requiredCertifications: requiredCerts,
              })
            }
          >
            <Ionicons
              name={saved ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={saved ? colors.primary : (oppId ? colors.textPrimary : colors.textSecondary)}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.banner}>
          <Ionicons name="bulb-outline" size={48} color="#fff" />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.industry}>{industry} • {demand} Demand</Text>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Investment</Text>
            <Text style={styles.metricValue}>₹{investment}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Profit Margin</Text>
            <Text style={[styles.metricValue, { color: colors.success }]}>{profitMargin}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.text}>{overview}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Required Certifications</Text>
          <View style={styles.certList}>
            {requiredCerts.map((cert: string, index: number) => (
              <View key={index} style={styles.certBadge}><Text style={styles.certText}>{cert}</Text></View>
            ))}
          </View>
        </View>

        <Button title="Apply Certification Now" onPress={() => {}} style={{ marginTop: 8 }} />
        <Button title="View Business Guide" variant="secondary" onPress={() => {}} style={{ marginTop: 12, marginBottom: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDark },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: 4 },
  headerRight: { flexDirection: 'row' },
  iconBtn: { padding: 4, marginLeft: 16 },
  content: { padding: 16 },
  banner: { height: 160, backgroundColor: colors.primary, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
  industry: { fontSize: 14, color: colors.primary, fontWeight: '600', marginBottom: 20 },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  metricCard: { flex: 1, backgroundColor: colors.bgCard, padding: 16, borderRadius: 12, marginHorizontal: 4, alignItems: 'center' },
  metricLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  metricValue: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  card: { backgroundColor: colors.bgCard, padding: 16, borderRadius: 12, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  text: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
  certList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  certBadge: { backgroundColor: colors.primary + '20', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 4 },
  certText: { color: colors.primary, fontWeight: 'bold' },
});
