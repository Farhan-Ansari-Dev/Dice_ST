import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../../theme';
import Button from '../../components/common/Button';

export default function CountryDetailsScreen() {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { countryName = 'United States', flag = '🇺🇸' } = route.params || {};

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{flag} {countryName}</Text>
        <TouchableOpacity style={styles.bookmarkBtn}>
          <Ionicons name="bookmark-outline" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.text}>The {countryName} market presents significant opportunities for electronics and software. Growth rate is estimated at 12% YoY.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Market Intelligence</Text>
          <View style={styles.row}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Demand Level</Text>
              <Text style={[styles.metricValue, { color: colors.success }]}>High</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Import Opp</Text>
              <Text style={[styles.metricValue, { color: colors.warning }]}>Medium</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Export Opp</Text>
              <Text style={[styles.metricValue, { color: colors.success }]}>High</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Mandatory Certifications</Text>
          <View style={styles.certBadge}><Text style={styles.certText}>FCC</Text></View>
          <View style={styles.certBadge}><Text style={styles.certText}>UL</Text></View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Top Imported Products</Text>
          <Text style={styles.text}>• Electronics & Gadgets</Text>
          <Text style={styles.text}>• Machinery</Text>
          <Text style={styles.text}>• Pharmaceuticals</Text>
        </View>

        <Button title="Contact Expert" onPress={() => {}} style={{ marginTop: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { padding: 4 },
  bookmarkBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  content: { padding: 16 },
  card: { backgroundColor: colors.surface, padding: 16, borderRadius: 12, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  text: { fontSize: 14, color: colors.textSecondary, lineHeight: 22, marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  metric: { alignItems: 'center' },
  metricLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  metricValue: { fontSize: 16, fontWeight: 'bold' },
  certBadge: { backgroundColor: colors.primary + '20', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 8 },
  certText: { color: colors.primary, fontWeight: 'bold' },
});
