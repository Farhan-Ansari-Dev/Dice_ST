import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, LayoutAnimation, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Shadows, BorderRadius } from '../../theme';
import { centeredContent } from '../../utils/layout';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import ProductCategorySelector from '../../components/certifications/ProductCategorySelector';
import TargetMarketSelector from '../../components/certifications/TargetMarketSelector';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/common/ToastProvider';
import { useQueryClient } from '@tanstack/react-query';
import leadsService from '../../services/leadsService';
import api from '../../services/api';
import { useAiConsent } from '../../components/ai/AiConsentProvider';


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

// The onboarding wizard (UserTypeScreen / constants.TARGET_MARKETS) stores
// region-style ids ('india', 'europe', 'usa'…). The certification resolver and
// this screen speak ISO alpha-2 codes (backend utils/marketCatalog). Prefilling
// the raw onboarding ids sent malformed markets like "europe" that never resolve.
//
// We ONLY auto-translate ids that map UNAMBIGUOUSLY to a single catalogued
// country. Regulatory blocs/regions are deliberately NOT converted to a
// representative country: 'Europe' is an EU market with no single ISO code
// (mapping it to DE/Germany would analyse the wrong regulatory geography), and
// 'gcc'/'africa'/'sea' are not backend markets at all. Those (and uncatalogued
// 'china') are dropped from the prefill; the user selects the specific
// country(ies) they target in the ISO selector below. Never guess geography.
const ONBOARDING_MARKET_TO_ISO: Record<string, string> = {
  india: 'IN', uae: 'AE', saudi: 'SA', usa: 'US', uk: 'GB',
  australia: 'AU', canada: 'CA', japan: 'JP', brazil: 'BR',
  // europe / africa / gcc / sea / china: intentionally omitted (bloc/region or
  // uncatalogued → require explicit per-country selection).
};

/** Normalise any incoming market value to a supported ISO code, or null. */
const toIsoMarket = (raw: string): string | null => {
  const up = String(raw ?? '').trim().toUpperCase();
  if (ALL_COUNTRIES.includes(up)) return up;                 // already ISO
  return ONBOARDING_MARKET_TO_ISO[String(raw ?? '').trim().toLowerCase()] ?? null;
};
const normalizeMarkets = (list: string[]): string[] =>
  Array.from(new Set((list ?? []).map(toIsoMarket).filter((c): c is string => !!c)));

const NewCertificationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const { run } = useAiConsent();
  const queryClient = useQueryClient();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const [step, setStep] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  // Prefill target markets from the customer's onboarding profile so they don't
  // re-enter data they already gave. Onboarding stores region ids, so translate
  // them to ISO market codes (else the analyze receives malformed markets like
  // "europe" that can never resolve). They can still adjust the selection.
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>(() => normalizeMarkets(user?.targetMarkets ?? []));
  
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

    // Defensive: only send ISO market codes the resolver understands.
    const isoMarkets = normalizeMarkets(selectedMarkets);
    if (isoMarkets.length === 0) {
      Alert.alert('Unsupported market', 'The selected markets are not supported yet. Please pick a target market from the list.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const gated = await run(() =>
        api.post<{ success: boolean; data: any }>('/ai/analyze-certifications', {
          productName: selectedProduct,
          markets: isoMarkets,
        }),
      );
      if (gated.status === 'declined') {
        setIsAnalyzing(false);
        return; // user declined the AI disclosure — nothing sent
      }
      const response = gated.value;

      if (!response.data?.isValid) {
        Alert.alert('Invalid Product Category', response.data?.message || 'This product is not supported.');
        setIsAnalyzing(false);
        return;
      }

      // Prefer the richer `intelligence` shape (regulatory authority + required
      // documents per market) over the flat `certifications` list; fall back to
      // the flat list if intelligence is absent. All of this is verified DB data.
      const intelligence = response.data?.intelligence;
      const enriched: any[] = [];
      for (const m of (intelligence?.markets ?? [])) {
        for (const c of (m.requiredCertifications ?? [])) {
          enriched.push({
            code: c.code,
            name: c.name,
            market: m.marketCode ?? c.market,
            authority: c.authority,
            requiredDocuments: c.requiredDocuments ?? [],
          });
        }
      }
      const certs = enriched.length ? enriched : (response.data?.certifications || []);

      // Workflow gate: never advance to Step 2 (Review & Apply) with zero
      // certifications. The backend deliberately returns isValid:true even when
      // it has no verified mapping (certifications:[]), so gating on isValid let
      // the user reach Apply and dead-end. Gate on the actual result instead and
      // offer recovery actions rather than a dead-end popup.
      if (certs.length === 0) {
        setIsAnalyzing(false);
        // Level 3 — Expert Review. We could not confidently determine verified
        // requirements for this product/market, so recommend expert review
        // (never a dead-end "no certifications found"). Every action here is real.
        Alert.alert(
          'Expert Review Recommended',
          `We couldn't confidently determine the exact certification requirements for "${selectedProduct}" in ${selectedMarkets.join(', ')}. ` +
            'Our certification team can review your product and identify the exact certifications for you. Nothing you entered is lost.',
          [
            { text: 'Change Product', onPress: () => setSelectedProduct(null) },
            { text: 'Change Markets', onPress: () => setSelectedMarkets([]) },
            { text: 'Continue as Manual Application', onPress: () => { handleManualApply(); } },
            { text: 'Contact Sanyog Expert', onPress: () => { handleContactExpert(); } },
          ],
        );
        return;
      }

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setRecommendedCerts(certs);
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

  /** Continue as Manual Application when no certification mapping was found.
   *  Preserves the entered product + markets; the backend creates a
   *  pending-validation draft (tagged manual_review) and notifies a manager, who
   *  identifies the product, assigns an HS code, and attaches certifications. */
  const handleManualApply = async () => {
    if (!user?.email) {
      showToast('Sign in required', 'Please sign in before applying.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await leadsService.create({
        serviceId: 'MANUAL_REVIEW',
        serviceName: `Manual review — ${selectedProduct ?? 'product'}`,
        contactName: user.name ?? user.email.split('@')[0],
        contactEmail: user.email,
        contactPhone: user.phone,
        companyName: user.companyName,
        productDescription: selectedProduct ?? undefined,
        targetMarkets: selectedMarkets,
        notes: `Certification request — product: "${selectedProduct}", target markets: ${selectedMarkets.join(', ')}. Pending product validation and certification mapping by the team.`,
        manualReview: true,
      });

      queryClient.invalidateQueries({ queryKey: ['mywork'] });
      showToast(
        'Request submitted',
        'Your product and markets are with our team. They’ll confirm the required certifications — track it in My Work.',
        'success',
      );
      navigation.navigate('MainTabs', { screen: 'Home', params: { screen: 'MyWork' } });
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

  /** Contact Sanyog Expert — a REAL action (the button previously navigated to a
   *  non-existent 'Communication' route). Creates an expert-consultation Lead
   *  via the existing lead system (visible to the admin/certification team) with
   *  the product + markets prefilled, then routes to the existing Support Center
   *  for follow-up. */
  const handleContactExpert = async () => {
    if (!user?.email) {
      showToast('Sign in required', 'Please sign in to contact an expert.', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await leadsService.create({
        serviceId: 'EXPERT_CONSULTATION',
        serviceName: `Certification expert consultation — ${selectedProduct ?? 'product'}`,
        contactName: user.name ?? user.email.split('@')[0],
        contactEmail: user.email,
        contactPhone: user.phone,
        companyName: user.companyName,
        productDescription: selectedProduct ?? undefined,
        targetMarkets: selectedMarkets,
        notes: `Expert consultation requested — product "${selectedProduct}" for ${selectedMarkets.join(', ')}. No verified mapping; needs specialist review.`,
      });
      Alert.alert(
        'Request received',
        `Our certification expert will reach out at ${user.email} about "${selectedProduct}". You can also start a chat from the Support Center.`,
        [{ text: 'Open Support Center', onPress: () => navigation.navigate('Profile', { screen: 'SupportCenter' }) }, { text: 'Done' }],
      );
    } catch (err: any) {
      showToast(
        'Could not send request',
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
          <Text style={styles.headerSub}>Product & target markets</Text>
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
                Select your product and target markets, then tap Apply. Our certification team confirms the exact certifications you need and guides you through the process — track it in My Work.
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
            
            <View style={{ paddingHorizontal: 20, marginTop: 40 }}>
              {(() => {
                const canApply = !!selectedProduct && selectedMarkets.length > 0 && !isSubmitting;
                return (
                  <TouchableOpacity
                    onPress={handleManualApply}
                    disabled={!canApply}
                    activeOpacity={0.9}
                    style={[styles.applyBtn, canApply ? Shadows.primary : { opacity: 0.45 }]}
                  >
                    <LinearGradient
                      colors={colors.gradientHero}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFill}
                    />
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
                        <Text style={styles.applyBtnText}>Apply</Text>
                      </>
                    )}
                  </TouchableOpacity>
                );
              })()}
              {(!selectedProduct || selectedMarkets.length === 0) && (
                <Text style={styles.applyHint}>Select a product and at least one market to continue.</Text>
              )}
            </View>
          </View>
        )}

        {/* STEP 2 - Verified certification requirements + Apply */}
        {step === 2 && (
          <View>
            <Text style={styles.sectionLabel}>Verified Certification Requirements</Text>
            {/* Source label — these come from the verified compliance database,
                not an AI guess. */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, marginBottom: 12 }}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={{ fontSize: 12, color: colors.success, fontWeight: '700' }}>Verified from the DICE compliance database</Text>
            </View>
            <View style={styles.recommendationList}>
              {recommendedCerts.map((cert, idx) => (
                <View key={idx} style={[styles.certCard, { backgroundColor: isDark ? colors.bgCardLight : '#FFF' }]}>
                  <View style={styles.certIconWrap}>
                    <Ionicons name="shield-checkmark" size={20} color={colors.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.certName}>{cert.name}</Text>
                    <Text style={styles.certCode}>{cert.code}</Text>
                    {!!cert.authority && (
                      <Text style={styles.certMeta}>Authority: {cert.authority}</Text>
                    )}
                    {Array.isArray(cert.requiredDocuments) && cert.requiredDocuments.length > 0 && (
                      <Text style={styles.certMeta}>{cert.requiredDocuments.length} required document{cert.requiredDocuments.length === 1 ? '' : 's'}</Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Badge label={cert.market} variant="info" size="sm" />
                    <Badge label="Verified" variant="success" size="sm" />
                  </View>
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
  content: { paddingVertical: 16, ...centeredContent },
  applyBtn: { height: 56, borderRadius: BorderRadius.base, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden' },
  applyBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },
  applyHint: { fontSize: 12, color: colors.textTertiary, textAlign: 'center', marginTop: 10 },
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
  certMeta: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 3,
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
