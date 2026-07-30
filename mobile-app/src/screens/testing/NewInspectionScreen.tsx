import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, LayoutAnimation, Platform, UIManager, Modal, TextInput, FlatList, KeyboardAvoidingView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Shadows } from '../../theme';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';

// presentationStyle 'pageSheet' is iOS-only. On Android it is ignored and the
// Modal falls back to its opaque default window background, which shows as a
// grey panel behind the picker (most visible during the slide animation).
// Android uses a full-screen modal whose own themed background covers it.
const MODAL_PRESENTATION = Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// -------------------------------------------------------------
// HARDCODED DEMO DATA
// -------------------------------------------------------------
const ALL_PRODUCTS = [
  'Air Fryer', 'Action Camera', 'Air Purifier', 'Bluetooth Speaker', 'Blender', 'Coffee Maker',
  'Digital Camera', 'Drone', 'Electric Kettle', 'Electric Scooter', 'Electric Toothbrush',
  'Fitness Tracker', 'Gaming Console', 'Hair Dryer', 'Headphones', 'Induction Cooktop',
  'Iron', 'Juicer', 'Laptop', 'LED Bulb', 'LED TV', 'Microwave Oven', 'Mobile Phone',
  'Power Bank', 'Pressure Cooker', 'Projector', 'Refrigerator', 'Rice Cooker',
  'Smart Watch', 'Smart Speaker', 'Tablet', 'Vacuum Cleaner', 'Washing Machine', 'Wireless Earbuds',
  'Xylophone', 'X-Ray Machine', 'Yoga Mat',
];

const ALL_COUNTRIES = [
  '🇮🇳 India', '🇦🇪 United Arab Emirates', '🇸🇦 Saudi Arabia', '🇺🇸 United States', '🇬🇧 United Kingdom',
  '🇩🇪 Germany', '🇫🇷 France', '🇮🇹 Italy', '🇪🇸 Spain', '🇳🇱 Netherlands',
  '🇨🇦 Canada', '🇦🇺 Australia', '🇯🇵 Japan', '🇰🇷 South Korea', '🇸🇬 Singapore',
  '🇲🇾 Malaysia', '🇹🇭 Thailand', '🇻🇳 Vietnam', '🇮🇩 Indonesia', '🇵🇭 Philippines',
  '🇿🇦 South Africa', '🇧🇷 Brazil', '🇲🇽 Mexico', '🇨🇱 Chile', '🇪🇬 Egypt',
  '🇰🇪 Kenya', '🇳🇬 Nigeria', '🇹🇷 Turkey', '🇶🇦 Qatar', '🇴🇲 Oman', '🇰🇼 Kuwait',
];

const MARKET_RULES: Record<string, Record<string, any[]>> = {};

const NewInspectionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const [step, setStep] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  
  // Modal states
  const [isProductModalVisible, setProductModalVisible] = useState(false);
  const [isMarketModalVisible, setMarketModalVisible] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [marketSearch, setMarketSearch] = useState('');

  const [recommendedInspections, setRecommendedInspections] = useState<any[]>([]);
  const [productName, setProductName] = useState('');
  const [factoryName, setFactoryName] = useState('');
  const [description, setDescription] = useState('');

  // Filtering
  const filteredProducts = useMemo(() => {
    return ALL_PRODUCTS.filter(p => p.toLowerCase().includes(productSearch.toLowerCase()));
  }, [productSearch]);

  const filteredMarkets = useMemo(() => {
    return ALL_COUNTRIES.filter(c => c.toLowerCase().includes(marketSearch.toLowerCase()));
  }, [marketSearch]);

  const handleMarketToggle = (market: string) => {
    if (selectedMarkets.includes(market)) {
      setSelectedMarkets(prev => prev.filter(m => m !== market));
    } else {
      setSelectedMarkets(prev => [...prev, market]);
    }
  };

  const handleAnalyze = () => {
    if (!selectedProduct) {
      Alert.alert('Required', 'Please select a product category.');
      return;
    }
    if (selectedMarkets.length === 0) {
      Alert.alert('Required', 'Please select at least one target market or origin.');
      return;
    }

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    let inspections: any[] = [];
    const rulesForProduct = MARKET_RULES[selectedProduct] || {};
    
    selectedMarkets.forEach(market => {
      if (rulesForProduct[market]) {
        rulesForProduct[market].forEach((i: any) => {
          inspections.push({ ...i, market });
        });
      } else {
        inspections.push({ code: `INSP_PSI`, name: `Pre-Shipment Inspection`, market });
        inspections.push({ code: `INSP_FA`, name: `Factory Audit`, market });
      }
    });
    
    setRecommendedInspections(inspections);
    setStep(2);
  };

  const handleSubmit = () => {
    if (!productName.trim()) {
      Alert.alert('Required', 'Please enter product name.');
      return;
    }
    navigation.navigate('UploadInspectionDocuments', {
      productName,
      factoryName,
      description,
      inspections: recommendedInspections
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#F8FAFC']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => step === 2 ? (LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut), setStep(1)) : navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>New Inspection Request</Text>
          <Text style={styles.headerSub}>Step 1 of 3</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        
        {step === 1 && (
          <View>
            <View style={[styles.infoBox, { marginBottom: 24 }]}>
              <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name="search" size={20} color={colors.primary} />
              </View>
              <Text style={styles.infoText}>
                Select your product type and target markets. Our engine will automatically determine the recommended Quality Inspections required.
              </Text>
            </View>

            {/* PRODUCT SELECTOR */}
            <Text style={styles.sectionLabel}>1. Product Category</Text>
            <TouchableOpacity 
              style={[styles.selectorBtn, selectedProduct ? styles.selectorBtnActive : {}]} 
              activeOpacity={0.8}
              onPress={() => {
                setProductSearch('');
                setProductModalVisible(true);
              }}
            >
              <View style={{ flex: 1 }}>
                {selectedProduct ? (
                  <Text style={styles.selectorValueText}>{selectedProduct}</Text>
                ) : (
                  <Text style={styles.selectorPlaceholder}>Search product categories...</Text>
                )}
              </View>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* MARKETS SELECTOR */}
            <Text style={[styles.sectionLabel, { marginTop: 32 }]}>2. Origin / Target Markets</Text>
            <TouchableOpacity 
              style={[styles.selectorBtn, selectedMarkets.length > 0 ? styles.selectorBtnActive : {}]} 
              activeOpacity={0.8}
              onPress={() => {
                setMarketSearch('');
                setMarketModalVisible(true);
              }}
            >
              <View style={{ flex: 1 }}>
                {selectedMarkets.length > 0 ? (
                  <View style={styles.selectedInlineChips}>
                    {selectedMarkets.slice(0, 2).map(m => (
                      <View key={m} style={styles.inlineChip}>
                        <Text style={styles.inlineChipText}>{m}</Text>
                      </View>
                    ))}
                    {selectedMarkets.length > 2 && (
                      <View style={styles.inlineChipMore}>
                        <Text style={styles.inlineChipMoreText}>+{selectedMarkets.length - 2}</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <Text style={styles.selectorPlaceholder}>Select target countries...</Text>
                )}
              </View>
              <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <Button title="Analyze Inspection Needs" onPress={handleAnalyze} size="lg" style={{ marginTop: 40 }} icon={<Ionicons name="analytics-outline" size={20} color="#FFFFFF" />} />
          </View>
        )}

        {/* STEP 2 - RESULTS */}
        {step === 2 && (
          <View>
            <Text style={styles.sectionLabel}>Recommended Inspections</Text>
            <View style={styles.recommendationList}>
              {recommendedInspections.map((insp, idx) => (
                <View key={idx} style={[styles.certCard, { backgroundColor: isDark ? colors.bgCardLight : '#FFF' }]}>
                  <View style={styles.certIconWrap}>
                    <Ionicons name="clipboard-outline" size={20} color={colors.warning} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.certName}>{insp.name}</Text>
                    <Text style={styles.certCode}>{insp.code}</Text>
                  </View>
                  <Badge label={insp.market} variant="info" size="sm" />
                </View>
              ))}
            </View>

            <View style={[styles.formCard, { marginTop: 32, backgroundColor: isDark ? colors.bgCard : '#FFF' }]}>
              <Text style={styles.sectionLabel}>Order Information</Text>
              <Input label="Product / Order Name *" value={productName} onChangeText={setProductName} placeholder="e.g. Summer Collection 2026" />
              <Input label="Factory Name" value={factoryName} onChangeText={setFactoryName} placeholder="e.g. Shenzhen Textiles Co." />
              <Input label="Order Description" value={description} onChangeText={setDescription} placeholder="Brief description of the goods..." multiline numberOfLines={3} style={{ height: 80, textAlignVertical: 'top' }} />
            </View>

            <Button title="Proceed to Upload Documents" onPress={handleSubmit} size="lg" style={{ marginTop: 24 }} icon={<Ionicons name="arrow-forward" size={20} color="#FFFFFF" />} />
          </View>
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ---------------- PRODUCT SEARCH MODAL ---------------- */}
      <Modal visible={isProductModalVisible} animationType="slide" presentationStyle={MODAL_PRESENTATION} statusBarTranslucent onRequestClose={() => setProductModalVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? colors.bgDark : '#F8FAFC' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Product</Text>
              <TouchableOpacity onPress={() => setProductModalVisible(false)}>
                <Text style={styles.modalCloseBtn}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalSearchBox}>
              <Ionicons name="search" size={20} color={colors.textTertiary} style={{ marginRight: 8 }} />
              <TextInput 
                style={styles.modalSearchInput}
                placeholder="Search products..."
                placeholderTextColor={colors.textTertiary}
                value={productSearch}
                onChangeText={setProductSearch}
                autoFocus
              />
            </View>
            <FlatList
              data={filteredProducts}
              keyExtractor={item => item}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={15}
              maxToRenderPerBatch={15}
              windowSize={10}
              bounces={true}
              overScrollMode="never"
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.modalListItem}
                  onPress={() => {
                    setSelectedProduct(item);
                    setProductModalVisible(false);
                  }}
                >
                  <Text style={[styles.modalListItemText, selectedProduct === item && { color: colors.primary, fontWeight: '700' }]}>{item}</Text>
                  {selectedProduct === item && <Ionicons name="checkmark-circle" size={24} color={colors.primary} />}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.modalSeparator} />}
            />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* ---------------- MARKET SEARCH MODAL ---------------- */}
      <Modal visible={isMarketModalVisible} animationType="slide" presentationStyle={MODAL_PRESENTATION} statusBarTranslucent onRequestClose={() => setMarketModalVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? colors.bgDark : '#F8FAFC' }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Target Markets</Text>
              <TouchableOpacity onPress={() => setMarketModalVisible(false)}>
                <Text style={styles.modalDoneBtn}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalSearchBox}>
              <Ionicons name="search" size={20} color={colors.textTertiary} style={{ marginRight: 8 }} />
              <TextInput 
                style={styles.modalSearchInput}
                placeholder="Search countries..."
                placeholderTextColor={colors.textTertiary}
                value={marketSearch}
                onChangeText={setMarketSearch}
              />
            </View>
            <View style={styles.selectedMarketsBanner}>
              <Text style={styles.selectedMarketsText}>{selectedMarkets.length} selected</Text>
            </View>
            <FlatList
              data={filteredMarkets}
              keyExtractor={item => item}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={15}
              maxToRenderPerBatch={15}
              windowSize={10}
              bounces={true}
              overScrollMode="never"
              renderItem={({ item }) => {
                const isSelected = selectedMarkets.includes(item);
                return (
                  <TouchableOpacity 
                    style={styles.modalListItem}
                    onPress={() => handleMarketToggle(item)}
                  >
                    <Text style={[styles.modalListItemText, isSelected && { color: colors.primary, fontWeight: '700' }]}>{item}</Text>
                    {isSelected ? (
                      <Ionicons name="checkbox" size={24} color={colors.primary} />
                    ) : (
                      <Ionicons name="square-outline" size={24} color={colors.textTertiary} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.modalSeparator} />}
            />
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

    </View>
  );
};

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDark },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? colors.bgCardLight : '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: isDark ? 0 : 1, borderColor: 'rgba(0,0,0,0.05)', ...Shadows.sm },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  headerSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2, textAlign: 'center', fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  
  infoBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : '#EEF2FF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.2)' },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  infoText: { flex: 1, fontSize: 13, color: isDark ? '#E0E7FF' : '#4338CA', lineHeight: 18, fontWeight: '500' },
  
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? colors.bgCardLight : '#FFFFFF',
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    minHeight: 64,
    ...Shadows.sm
  },
  selectorBtnActive: {
    borderColor: colors.primary,
    backgroundColor: isDark ? 'rgba(108, 99, 255, 0.05)' : '#F5F3FF',
  },
  selectorPlaceholder: {
    fontSize: 15,
    color: colors.textTertiary,
  },
  selectorValueText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  inlineChip: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  inlineChipText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  inlineChipMore: {
    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  inlineChipMoreText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  selectedInlineChips: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  recommendationList: { gap: 12 },
  certCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', ...Shadows.sm },
  certIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#FFFBEB', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  certName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  certCode: { fontSize: 12, color: colors.textTertiary },

  formCard: { padding: 20, borderRadius: 20, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', ...Shadows.sm },

  // MODAL STYLES
  modalContainer: {
    flex: 1,
    backgroundColor: isDark ? colors.bgDark : '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12, 
    paddingBottom: 16,
    backgroundColor: isDark ? colors.bgCard : '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalCloseBtn: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  modalDoneBtn: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? colors.bgCardLight : '#FFFFFF',
    margin: 16,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
  },
  modalListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: isDark ? colors.bgCard : '#FFFFFF',
  },
  modalListItemText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  modalSeparator: {
    height: 1,
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    marginLeft: 20,
  },
  selectedMarketsBanner: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  selectedMarketsText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  }
});

export default NewInspectionScreen;
