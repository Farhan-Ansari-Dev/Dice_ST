import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, LayoutAnimation, Platform, UIManager } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Shadows } from '../../theme';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import ProductCategorySelector from '../../components/certifications/ProductCategorySelector';
import TargetMarketSelector from '../../components/certifications/TargetMarketSelector';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/common/ToastProvider';
import { useQueryClient } from '@tanstack/react-query';
import leadsService from '../../services/leadsService';
import api from '../../services/api';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

const NewCertificationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const [step, setStep] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  
  const [productSearch, setProductSearch] = useState('');
  const [marketSearch, setMarketSearch] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [recommendedCerts, setRecommendedCerts] = useState<any[]>([]);

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

  /** Create a Lead (which auto-creates a Draft Application on the backend),
   *  then navigate to My Work so the customer can see and continue it. */
  const handleApply = async () => {
    if (!user?.email) {
      showToast('Sign in required', 'Please sign in before applying.', 'error');
      return;
    }
    if (recommendedCerts.length === 0) {
      Alert.alert('Error', 'No certifications were recommended. Please go back and re-analyze.');
      return;
    }

    setIsSubmitting(true);
    try {
      const certType = recommendedCerts[0]?.code || selectedProduct || 'GENERAL';
      await leadsService.create({
        serviceId: certType,
        serviceName: recommendedCerts.map((c: any) => c.name).join(', '),
        contactName: user.name ?? user.email.split('@')[0],
        contactEmail: user.email,
        contactPhone: user.phone,
        companyName: user.companyName,
        productDescription: selectedProduct ?? undefined,
        targetMarkets: selectedMarkets,
        notes: `AI-analyzed certifications: ${recommendedCerts.map((c: any) => c.code).join(', ')}`,
      });

      // Invalidate My Work queries so the new Draft Application appears immediately
      queryClient.invalidateQueries({ queryKey: ['mywork'] });

      showToast(
        'Application created',
        'Your draft application is ready. Continue from My Work.',
        'success',
      );

      // Navigate to My Work — the customer's single hub for all applications
      navigation.navigate('MainTabs', {
        screen: 'Home',
        params: { screen: 'MyWork' },
      });
    } catch (err: any) {
      showToast(
        'Could not submit',
        err?.response?.data?.message ?? 'Please check your connection and try again.',
        'error',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#F8FAFC']} style={StyleSheet.absoluteFill} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => step === 2 ? (LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut), setStep(1)) : navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>New Certification</Text>
          <Text style={styles.headerSub}>{step === 1 ? 'Step 1 of 2 — Analyze' : 'Step 2 of 2 — Review & Apply'}</Text>
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

        {/* STEP 2 - AI Results + Apply */}
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

            {/* Summary card */}
            <View style={[styles.summaryCard, { backgroundColor: isDark ? colors.bgCard : '#FFF' }]}>
              <View style={styles.summaryRow}>
                <Ionicons name="cube-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.summaryLabel}>Product</Text>
                <Text style={styles.summaryValue}>{selectedProduct}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Ionicons name="globe-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.summaryLabel}>Markets</Text>
                <Text style={styles.summaryValue}>{selectedMarkets.join(', ')}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.textSecondary} />
                <Text style={styles.summaryLabel}>Certifications</Text>
                <Text style={styles.summaryValue}>{recommendedCerts.length}</Text>
              </View>
            </View>

            {/* What happens next */}
            <View style={[styles.infoBox, { marginHorizontal: 20, marginTop: 24 }]}>
              <View style={[styles.iconWrap, { backgroundColor: `${colors.success}20` }]}>
                <Ionicons name="information-circle" size={20} color={colors.success} />
              </View>
              <Text style={styles.infoText}>
                Applying creates a draft application that our certification team will review. You can upload documents, track progress, and communicate with your manager from My Work.
              </Text>
            </View>

            <View style={{ paddingHorizontal: 20 }}>
              <Button 
                title={isSubmitting ? "Submitting..." : "Apply for Certification"} 
                onPress={handleApply} 
                size="lg" 
                style={{ marginTop: 32 }}
                icon={!isSubmitting && <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />}
                disabled={isSubmitting}
              />
            </View>
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
  summaryCard: {
    marginHorizontal: 20,
    marginTop: 24,
    padding: 18,
    borderRadius: 16,
    gap: 14,
    ...Shadows.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
    width: 100,
  },
  summaryValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});

export default NewCertificationScreen;
