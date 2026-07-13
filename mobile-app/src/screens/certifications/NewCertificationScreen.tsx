import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, LayoutAnimation, Platform, UIManager } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Shadows } from '../../theme';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import ProductCategorySelector from '../../components/certifications/ProductCategorySelector';
import TargetMarketSelector from '../../components/certifications/TargetMarketSelector';
import api from '../../services/api';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Mock Data - In a real app, this would come from an API
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
  'IN', 'AE', 'SA', 'US', 'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'CA', 'AU', 'JP', 'KR', 'SG', 'MY', 'TH', 'VN', 'ID', 'PH', 'ZA', 'BR', 'MX', 'CL', 'EG', 'KE', 'NG', 'TR', 'QA', 'OM', 'KW',
];

const MARKET_RULES: Record<string, Record<string, any[]>> = {};

const NewCertificationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const [step, setStep] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  
  const [productSearch, setProductSearch] = useState('');
  const [marketSearch, setMarketSearch] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [recommendedCerts, setRecommendedCerts] = useState<any[]>([]);
  const [productName, setProductName] = useState('');
  const [hsCode, setHsCode] = useState('');
  const [description, setDescription] = useState('');

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim();
    let results = ALL_PRODUCTS.filter(p => p.toLowerCase().includes(query.toLowerCase()));
    
    if (query.length > 0 && !results.some(p => p.toLowerCase() === query.toLowerCase())) {
      results = [query, ...results];
    }
    
    return results;
  }, [productSearch]);

  const filteredMarkets = useMemo(() => {
    return ALL_COUNTRIES.filter(c => c.toLowerCase().includes(marketSearch.toLowerCase()));
  }, [marketSearch]);

  const handleMarketToggle = (market: string) => {
    setSelectedMarkets(prev => 
      prev.includes(market) ? prev.filter(m => m !== market) : [...prev, market]
    );
  };

  const handleAnalyze = async () => {
    if (!selectedProduct) {
      Alert.alert('Required', 'Please select a product category.');
      return;
    }
    if (selectedMarkets.length === 0) {
      Alert.alert('Required', 'Please select at least one target market.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await api.post<{ success: boolean; data: any }>('/ai/analyze-certifications', {
        productName: selectedProduct,
        markets: selectedMarkets
      });

      if (!response.data?.isValid) {
        Alert.alert('Invalid Product Category', response.data?.message || 'This product is not supported.');
        setIsAnalyzing(false);
        return;
      }

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setRecommendedCerts(response.data?.certifications || []);
      setStep(2);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to analyze requirements.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = () => {
    if (!productName.trim()) {
      Alert.alert('Required', 'Please enter product name.');
      return;
    }
    navigation.navigate('UploadDocuments', {
      mainCategory: 'Certifications',
      selectedType: recommendedCerts[0]?.code || 'GENERAL',
      productName,
      hsCode,
      description,
      certs: recommendedCerts,
      certificationId: 'some-id-from-rules' // This needs to be determined from the analysis step
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
          <Text style={styles.headerTitle}>New Application</Text>
          <Text style={styles.headerSub}>Step 1 of 3</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        
        {step === 1 && (
          <View>
            <View style={[styles.infoBox, { marginBottom: 24 }]}>
              <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name="sparkles" size={20} color={colors.primary} />
              </View>
              <Text style={styles.infoText}>
                Select your product and target markets. Our AI Market Engine will automatically recommend the exact certifications you need to apply for.
              </Text>
            </View>

            <Text style={styles.sectionLabel}>1. Product Category</Text>
            <ProductCategorySelector 
              data={filteredProducts}
              selected={selectedProduct}
              onSelect={setSelectedProduct}
              onSearch={setProductSearch}
            />

            <Text style={[styles.sectionLabel, { marginTop: 32, marginHorizontal: 20 }]}>2. Target Markets</Text>
            <TargetMarketSelector
              data={filteredMarkets}
              selected={selectedMarkets}
              onToggle={handleMarketToggle}
              onSearch={setMarketSearch}
            />
            
            <View style={{ paddingHorizontal: 20 }}>
              <Button 
                title={isAnalyzing ? "Analyzing with AI..." : "Analyze Requirements"} 
                onPress={handleAnalyze} 
                size="lg" 
                style={{ marginTop: 40 }} 
                icon={!isAnalyzing && <Ionicons name="analytics-outline" size={20} color="#FFFFFF" />} 
                disabled={isAnalyzing}
              />
            </View>
          </View>
        )}

        {/* STEP 2 - RESULTS */}
        {step === 2 && (
          <View>
            <Text style={styles.sectionLabel}>AI Recommended Certifications</Text>
            <View style={styles.recommendationList}>
              {recommendedCerts.map((cert, idx) => (
                <View key={idx} style={[styles.certCard, { backgroundColor: isDark ? colors.bgCardLight : '#FFF' }]}>
                  <View style={styles.certIconWrap}>
                    <Ionicons name="shield-checkmark" size={20} color={colors.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.certName}>{cert.name}</Text>
                    <Text style={styles.certCode}>{cert.code}</Text>
                  </View>
                  <Badge label={cert.market} variant="info" size="sm" />
                </View>
              ))}
            </View>

            <View style={[styles.formCard, { marginTop: 32, backgroundColor: isDark ? colors.bgCard : '#FFF' }]}>
              <Text style={styles.sectionLabel}>Product Information</Text>
              <Input label="Product Name *" value={productName} onChangeText={setProductName} placeholder="e.g. BassBooster 3000" />
              <Input label="HS Code" value={hsCode} onChangeText={setHsCode} placeholder="e.g. 8504.40" />
              <Input label="Description" value={description} onChangeText={setDescription} placeholder="Brief product description..." multiline numberOfLines={3} style={{ height: 80, textAlignVertical: 'top' }} />
            </View>

            <Button title="Proceed to Document Upload" onPress={handleSubmit} size="lg" style={{ marginTop: 24 }} icon={<Ionicons name="arrow-forward" size={20} color="#FFFFFF" />} />
          </View>
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDark },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? colors.bgCardLight : '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: isDark ? 0 : 1, borderColor: 'rgba(0,0,0,0.05)', ...Shadows.sm },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  headerSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2, textAlign: 'center', fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  content: { paddingVertical: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, marginHorizontal: 20 },
  
  infoBox: { marginHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: isDark ? 'rgba(99, 102, 241, 0.1)' : '#EEF2FF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.2)' },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  infoText: { flex: 1, fontSize: 13, color: isDark ? '#E0E7FF' : '#4338CA', lineHeight: 18, fontWeight: '500' },
  
  recommendationList: { gap: 12, marginHorizontal: 20 },
  certCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    ...Shadows.sm,
  },
  certIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.success}1A`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  certName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  certCode: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  formCard: {
    padding: 20,
    borderRadius: 20,
    marginHorizontal: 20,
    gap: 16,
  },
});

export default NewCertificationScreen;
