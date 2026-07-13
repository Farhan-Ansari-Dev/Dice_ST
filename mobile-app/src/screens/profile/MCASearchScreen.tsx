import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

interface CompanyResult {
  cin: string;
  name: string;
  status: 'Active' | 'Struck Off' | 'Under Process';
  incorporationDate: string;
  registeredState: string;
  category: string;
  directors: { name: string; din: string }[];
  registeredAddress: string;
  authorizedCapital: string;
  paidUpCapital: string;
}

const MOCK_COMPANIES: CompanyResult[] = [];

const statusColor = (status: string, colors: any) => {
  if (status === 'Active') return colors.success;
  if (status === 'Struck Off') return colors.error ?? '#FF5A5A';
  return colors.warning;
};

const MCASearchScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyResult | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(false);
    setResults([]);
    await new Promise((r) => setTimeout(r, 1000));
    const q = query.toLowerCase();
    const found = MOCK_COMPANIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.cin.toLowerCase().includes(q)
    );
    setResults(found.length > 0 ? found : []);
    setLoading(false);
    setSearched(true);
  };

  const openDetails = (company: CompanyResult) => {
    setSelectedCompany(company);
    setModalVisible(true);
  };

  const handleImport = (company: CompanyResult) => {
    setModalVisible(false);
    Alert.alert('Imported', `${company.name} details have been imported to your app profile.`);
  };

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
        <Text style={styles.headerTitle}>MCA Company Search</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchBarWrap}>
        <View style={[styles.searchBar, Shadows.sm]}>
          <LinearGradient
            colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
            style={styles.searchBarInner}
          >
            <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Search by CIN or company name..."
              placeholderTextColor={colors.textTertiary}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSearched(false); }}>
                <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </LinearGradient>
        </View>
        <TouchableOpacity style={[styles.searchBtn, Shadows.primary]} onPress={handleSearch}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.searchBtnGrad}>
            {loading ? <ActivityIndicator color="#FFF" size="small" /> : <Ionicons name="search" size={18} color="#FFF" />}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.cin}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          searched && !loading ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="business-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyText}>No companies found</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.resultCard, Shadows.sm]}
            onPress={() => openDetails(item)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
              style={styles.resultCardInner}
            >
              <View style={styles.resultTop}>
                <View style={styles.resultIconWrap}>
                  <Ionicons name="business-outline" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.resultCIN}>{item.cin}</Text>
                </View>
                <View style={[styles.statusChip, { backgroundColor: `${statusColor(item.status, colors)}20` }]}>
                  <Text style={[styles.statusText, { color: statusColor(item.status, colors) }]}>{item.status}</Text>
                </View>
              </View>
              <View style={styles.resultMeta}>
                <Text style={styles.metaText}>
                  <Ionicons name="location-outline" size={11} color={colors.textTertiary} /> {item.registeredState}
                </Text>
                <Text style={styles.metaText}>
                  <Ionicons name="calendar-outline" size={11} color={colors.textTertiary} /> Incorporated {item.incorporationDate}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}
        ListFooterComponent={<View style={{ height: 100 }} />}
      />

      {/* Detail Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, Shadows.lg]}>
            <LinearGradient
              colors={isDark ? [colors.bgCard, '#12131E'] : ['#FFFFFF', '#F0F2FA']}
              style={styles.modalInner}
            >
              {selectedCompany && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.modalTitleRow}>
                    <Text style={styles.modalTitle} numberOfLines={2}>{selectedCompany.name}</Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                      <Ionicons name="close" size={22} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.modalCIN}>{selectedCompany.cin}</Text>

                  {[
                    { label: 'Status', value: selectedCompany.status },
                    { label: 'Incorporated', value: selectedCompany.incorporationDate },
                    { label: 'State', value: selectedCompany.registeredState },
                    { label: 'Category', value: selectedCompany.category },
                    { label: 'Authorized Capital', value: selectedCompany.authorizedCapital },
                    { label: 'Paid-up Capital', value: selectedCompany.paidUpCapital },
                    { label: 'Registered Address', value: selectedCompany.registeredAddress },
                  ].map((row) => (
                    <View key={row.label} style={styles.modalRow}>
                      <Text style={styles.modalRowLabel}>{row.label}</Text>
                      <Text style={styles.modalRowValue}>{row.value}</Text>
                    </View>
                  ))}

                  <Text style={styles.sectionHead}>Directors</Text>
                  {selectedCompany.directors.map((d) => (
                    <View key={d.din} style={styles.directorRow}>
                      <Ionicons name="person-circle-outline" size={20} color={colors.primary} />
                      <View>
                        <Text style={styles.directorName}>{d.name}</Text>
                        <Text style={styles.directorDIN}>{d.din}</Text>
                      </View>
                    </View>
                  ))}

                  <TouchableOpacity
                    style={[styles.importBtn, Shadows.primary]}
                    onPress={() => handleImport(selectedCompany)}
                  >
                    <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.importBtnGrad}>
                      <Ionicons name="cloud-download-outline" size={16} color="#FFF" />
                      <Text style={styles.importBtnText}>Import to App</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <View style={{ height: 20 }} />
                </ScrollView>
              )}
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? colors.bgCardLight : colors.border, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    searchBarWrap: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 16 },
    searchBar: { flex: 1, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    searchBarInner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
    searchInput: { flex: 1, fontSize: 14, color: colors.textPrimary },
    searchBtn: { width: 46, height: 46, borderRadius: BorderRadius.lg, overflow: 'hidden' },
    searchBtnGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    listContent: { paddingHorizontal: 20 },
    emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: colors.textTertiary },
    resultCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, marginBottom: 12 },
    resultCardInner: { padding: 14 },
    resultTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
    resultIconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: `${colors.primary}15`, alignItems: 'center', justifyContent: 'center' },
    resultName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, lineHeight: 19 },
    resultCIN: { fontSize: 11, color: colors.textTertiary, marginTop: 2, fontFamily: 'monospace' },
    statusChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full },
    statusText: { fontSize: 11, fontWeight: '700' },
    resultMeta: { flexDirection: 'row', gap: 16 },
    metaText: { fontSize: 12, color: colors.textTertiary },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalSheet: { borderTopLeftRadius: BorderRadius['2xl'], borderTopRightRadius: BorderRadius['2xl'], overflow: 'hidden', maxHeight: '85%' },
    modalInner: { padding: 24, maxHeight: '100%' },
    modalTitleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 },
    modalTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.textPrimary },
    modalCIN: { fontSize: 12, color: colors.textTertiary, marginBottom: 16, fontFamily: 'monospace' },
    modalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border },
    modalRowLabel: { fontSize: 13, color: colors.textTertiary, flex: 1 },
    modalRowValue: { fontSize: 13, color: colors.textPrimary, fontWeight: '500', flex: 1, textAlign: 'right' },
    sectionHead: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginTop: 16, marginBottom: 10 },
    directorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border },
    directorName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
    directorDIN: { fontSize: 11, color: colors.textTertiary },
    importBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginTop: 20 },
    importBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
    importBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  });

export default MCASearchScreen;
