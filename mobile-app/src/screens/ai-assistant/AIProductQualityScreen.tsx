import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
  Alert,
  Modal,
  Platform,
  TouchableWithoutFeedback,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence, 
  withSpring, 
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  FadeInDown
} from 'react-native-reanimated';

import { ComplianceDB, ComplianceDomain } from '../../data/ComplianceDB';
import { useTheme } from '../../theme';

const { width, height } = Dimensions.get('window');

const COLORS = {
  primary: '#2563EB',
  accent: '#4F46E5',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  background: '#F8FAFC',
  glassWhite: 'rgba(255, 255, 255, 0.7)',
  glassDark: 'rgba(15, 23, 42, 0.6)',
  borderLight: 'rgba(255, 255, 255, 0.2)',
  borderDark: 'rgba(255, 255, 255, 0.1)',
  textMain: '#0F172A',
  textSub: '#64748B',
  textDarkMain: '#F8FAFC',
  textDarkSub: '#94A3B8',
};

const CAPABILITIES = [
  { id: '1', title: 'Product Detection', desc: 'Auto-identifies categories', icon: 'scan-outline' },
  { id: '2', title: 'Compliance Intelligence', desc: 'Matches global regulations', icon: 'globe-outline' },
  { id: '3', title: 'Certification Recs', desc: 'Suggests required certs', icon: 'shield-checkmark-outline' },
  { id: '4', title: 'Quality Evaluation', desc: 'Analyzes safety indicators', icon: 'analytics-outline' },
  { id: '5', title: 'Risk Assessment', desc: 'Detects compliance risks', icon: 'warning-outline' },
];

const LOADING_STEPS = [
  'Initializing AI Engine...',
  'Reading Product Data...',
  'Detecting Category...',
  'Checking Regulations...',
  'Evaluating Quality...',
  'Matching Certifications...',
  'Preparing Report...',
];

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

const ScoreRing = ({ value, label, color, size = 100 }: { value: number, label: string, color: string, size?: number }) => {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size, borderRadius: size/2, borderWidth: 8, borderColor: `${color}20`, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          position: 'absolute', width: size, height: size, borderRadius: size/2, borderWidth: 8, borderColor: color,
          borderRightColor: 'transparent', borderBottomColor: value > 50 ? color : 'transparent', borderLeftColor: value > 75 ? color : 'transparent',
          transform: [{ rotate: '-45deg' }]
        }} />
        <Text style={{ fontSize: 24, fontWeight: '900', color }}>{value}</Text>
      </View>
      <Text style={{ marginTop: 8, fontSize: 12, fontWeight: '700', color: COLORS.textSub, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
    </View>
  );
};

const AIProductQualityScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const [phase, setPhase] = useState<'pick' | 'analysing' | 'result'>('pick');
  const [loadingStep, setLoadingStep] = useState(0);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [isManualExpanded, setIsManualExpanded] = useState(false);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [domain, setDomain] = useState<ComplianceDomain>('tech');

  // Reanimated Values
  const pulseScale = useSharedValue(1);
  const laserTranslateY = useSharedValue(-100);
  const buttonScale = useSharedValue(1);
  const manualHeight = useSharedValue(0);

  useEffect(() => {
    if (phase === 'pick') {
      pulseScale.value = withRepeat(withSequence(
        withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ), -1, true);

      laserTranslateY.value = withRepeat(withSequence(
        withTiming(150, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(-150, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ), -1, true);
    }
  }, [phase]);

  const toggleManual = () => {
    setIsManualExpanded(!isManualExpanded);
    manualHeight.value = withSpring(isManualExpanded ? 0 : 120, { damping: 20, stiffness: 100 });
  };

  const startAnalysis = () => {
    if (!imageUri && !manualInput.trim()) {
      Alert.alert('Action Required', 'Please scan an item or enter manual details first.');
      return;
    }
    
    setPhase('analysing');
    setLoadingStep(0);
    
    // Simulate AI Workflow Steps
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep += 1;
      if (currentStep < LOADING_STEPS.length) {
        setLoadingStep(currentStep);
      } else {
        clearInterval(interval);
        const domains: ComplianceDomain[] = ['tech', 'food', 'cosmetics', 'toys', 'apparel', 'medical'];
        setDomain(domains[Math.floor(Math.random() * domains.length)]);
        setPhase('result');
      }
    }, 800); // 800ms per step
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Required', 'Gallery access is needed.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets[0]) { setImageUri(result.assets[0].uri); setShowPickerModal(false); }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Required', 'Camera access is needed.'); return; }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) { setImageUri(result.assets[0].uri); setShowPickerModal(false); }
  };

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseScale.value }] }));
  const laserStyle = useAnimatedStyle(() => ({ transform: [{ translateY: laserTranslateY.value }] }));
  const buttonAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: buttonScale.value }] }));
  const manualAnimatedStyle = useAnimatedStyle(() => ({ height: manualHeight.value, opacity: manualHeight.value > 10 ? 1 : 0 }));

  const resultData = ComplianceDB[domain];

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#020617' : COLORS.background, paddingTop: insets.top }]}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#FFF' : COLORS.textMain} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <View style={styles.aiBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.aiBadgeText}>DICE AI ONLINE</Text>
          </View>
          <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : COLORS.textMain }]}>AI Quality Analyzer</Text>
        </View>

        {phase === 'result' && (
          <TouchableOpacity onPress={() => { setPhase('pick'); setImageUri(null); setManualInput(''); }}>
            <Ionicons name="refresh" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        
        {/* PHASE 1: PICK / SCAN */}
        {phase === 'pick' && (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.contentPadding}>
            <Text style={[styles.heroSubtitle, { color: isDark ? COLORS.textDarkSub : COLORS.textSub }]}>
              Scan a product, label, packaging or manual to instantly identify certifications, regulations, and market readiness.
            </Text>

            {/* HERO SCANNER */}
            <TouchableOpacity activeOpacity={0.9} onPress={() => setShowPickerModal(true)}>
              <AnimatedBlurView intensity={isDark ? 20 : 60} tint={isDark ? "dark" : "light"} style={[styles.heroScanner, pulseStyle]}>
                <View style={[styles.scannerCorner, styles.tl]} />
                <View style={[styles.scannerCorner, styles.tr]} />
                <View style={[styles.scannerCorner, styles.bl]} />
                <View style={[styles.scannerCorner, styles.br]} />
                
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFillObject} borderRadius={24} />
                ) : (
                  <>
                    <View style={styles.heroCenter}>
                      <View style={styles.heroIconWrap}>
                        <Ionicons name="scan" size={48} color={COLORS.primary} />
                      </View>
                      <Text style={[styles.heroTitle, { color: isDark ? '#FFF' : COLORS.textMain }]}>Tap to Smart Scan</Text>
                      <Text style={styles.heroSubText}>Camera • Gallery • Label • Packaging</Text>
                    </View>
                    <Animated.View style={[styles.laserLine, laserStyle]}>
                      <LinearGradient colors={['transparent', COLORS.primary, 'transparent']} start={{x:0, y:0.5}} end={{x:1, y:0.5}} style={{flex:1}} />
                    </Animated.View>
                  </>
                )}
              </AnimatedBlurView>
            </TouchableOpacity>

            {/* QUICK ACTIONS */}
            <View style={styles.quickActions}>
              {[
                { icon: 'camera', label: 'Camera', action: handleTakePhoto },
                { icon: 'images', label: 'Gallery', action: handlePickImage },
                { icon: 'barcode', label: 'Label', action: handleTakePhoto },
                { icon: 'cube', label: 'Package', action: handleTakePhoto }
              ].map((item, i) => (
                <TouchableOpacity key={i} style={[styles.quickChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFF' }]} onPress={item.action}>
                  <Ionicons name={item.icon as any} size={18} color={COLORS.primary} />
                  <Text style={[styles.quickChipText, { color: isDark ? '#FFF' : COLORS.textMain }]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* AI CAPABILITIES CAROUSEL */}
            <Text style={[styles.sectionTitle, { color: isDark ? '#FFF' : COLORS.textMain }]}>AI Capabilities</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.carousel} contentContainerStyle={{ paddingHorizontal: 24 }}>
              {CAPABILITIES.map((cap, i) => (
                <Animated.View key={cap.id} entering={FadeInDown.delay(i * 100)} style={{ marginRight: 12 }}>
                  <TouchableOpacity activeOpacity={0.7}>
                    <BlurView intensity={isDark ? 30 : 80} tint={isDark ? "dark" : "light"} style={styles.capCard}>
                      <View style={styles.capIcon}>
                        <Ionicons name={cap.icon as any} size={24} color={COLORS.primary} />
                      </View>
                      <Text style={[styles.capTitle, { color: isDark ? '#FFF' : COLORS.textMain }]}>{cap.title}</Text>
                      <Text style={styles.capDesc}>{cap.desc}</Text>
                    </BlurView>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </ScrollView>

            {/* PRODUCT DETAILS EXPANDABLE */}
            <TouchableOpacity activeOpacity={0.8} onPress={toggleManual}>
              <BlurView intensity={isDark ? 20 : 80} tint={isDark ? "dark" : "light"} style={styles.manualCard}>
                <View style={styles.manualHeader}>
                  <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                  <Text style={[styles.manualTitle, { color: isDark ? '#FFF' : COLORS.textMain }]}>Product Details</Text>
                  <Ionicons name={isManualExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textSub} style={{ marginLeft: 'auto' }} />
                </View>
                <Animated.View style={[styles.manualContent, manualAnimatedStyle]}>
                  <TextInput
                    style={[styles.manualInput, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#F1F5F9', color: isDark ? '#FFF' : COLORS.textMain }]}
                    placeholder="e.g. Wireless Bluetooth Speaker, LED Driver..."
                    placeholderTextColor={COLORS.textSub}
                    multiline
                    value={manualInput}
                    onChangeText={setManualInput}
                  />
                </Animated.View>
              </BlurView>
            </TouchableOpacity>

            {/* BOTTOM CTA */}
            <TouchableOpacity 
              activeOpacity={0.9} 
              onPressIn={() => { buttonScale.value = withSpring(0.95); }}
              onPressOut={() => { buttonScale.value = withSpring(1); }}
              onPress={startAnalysis}
            >
              <Animated.View style={[styles.ctaButton, buttonAnimatedStyle]}>
                <LinearGradient colors={[COLORS.primary, COLORS.accent]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                <Text style={styles.ctaText}>Analyze with DICE AI</Text>
                <Ionicons name="sparkles" size={18} color="#FFF" />
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* PHASE 2: ANALYSING */}
        {phase === 'analysing' && (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.analysingContainer}>
            <View style={styles.aiOrbWrap}>
              <Animated.View style={[styles.aiOrbGlow, pulseStyle]} />
              <LinearGradient colors={[COLORS.primary, COLORS.accent]} style={styles.aiOrb}>
                <Ionicons name="hardware-chip" size={48} color="#FFF" />
              </LinearGradient>
            </View>
            <Text style={[styles.loadingTitle, { color: isDark ? '#FFF' : COLORS.textMain }]}>DICE AI Processing</Text>
            
            <View style={styles.stepsContainer}>
              {LOADING_STEPS.map((step, i) => {
                const isActive = i === loadingStep;
                const isPassed = i < loadingStep;
                return (
                  <View key={i} style={[styles.stepRow, { opacity: isActive ? 1 : isPassed ? 0.5 : 0.2 }]}>
                    <Ionicons name={isPassed ? "checkmark-circle" : "radio-button-off"} size={16} color={isPassed ? COLORS.success : COLORS.primary} />
                    <Text style={[styles.stepText, { color: isDark ? '#FFF' : COLORS.textMain }]}>{step}</Text>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* PHASE 3: RESULTS DASHBOARD */}
        {phase === 'result' && (
          <Animated.View entering={SlideInDown.springify().damping(20)} style={styles.contentPadding}>
            
            {/* Top Scores */}
            <View style={styles.scoreRow}>
              <BlurView intensity={isDark ? 20 : 80} tint={isDark ? "dark" : "light"} style={styles.scoreCard}>
                <ScoreRing value={94} label="Compliance" color={COLORS.success} />
              </BlurView>
              <BlurView intensity={isDark ? 20 : 80} tint={isDark ? "dark" : "light"} style={styles.scoreCard}>
                <ScoreRing value={88} label="Quality" color={COLORS.primary} />
              </BlurView>
            </View>

            {/* Product Identity */}
            <BlurView intensity={isDark ? 20 : 80} tint={isDark ? "dark" : "light"} style={styles.resultCard}>
              <View style={styles.identityHeader}>
                <View style={[styles.iconBox, { backgroundColor: `${COLORS.accent}20` }]}>
                  <Ionicons name={resultData.icon as any} size={28} color={COLORS.accent} />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={[styles.resultProductTitle, { color: isDark ? '#FFF' : COLORS.textMain }]}>{resultData.productName}</Text>
                  <Text style={styles.confidenceText}>Confidence: 99.8%</Text>
                </View>
              </View>
            </BlurView>

            {/* Certifications (Required vs Missing) */}
            <BlurView intensity={isDark ? 20 : 80} tint={isDark ? "dark" : "light"} style={styles.resultCard}>
              <Text style={[styles.cardTitle, { color: isDark ? '#FFF' : COLORS.textMain }]}>Applicable Certifications</Text>
              <View style={styles.certGrid}>
                {resultData.certifications.map((cert: string, i: number) => (
                  <View key={i} style={[styles.certChip, { borderColor: `${COLORS.success}40`, backgroundColor: `${COLORS.success}10` }]}>
                    <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                    <Text style={[styles.certText, { color: COLORS.success }]}>{cert}</Text>
                  </View>
                ))}
                <View style={[styles.certChip, { borderColor: `${COLORS.warning}40`, backgroundColor: `${COLORS.warning}10` }]}>
                  <Ionicons name="warning" size={14} color={COLORS.warning} />
                  <Text style={[styles.certText, { color: COLORS.warning }]}>FCC (Missing)</Text>
                </View>
              </View>
            </BlurView>

            {/* Compliance Intelligence */}
            <BlurView intensity={isDark ? 20 : 80} tint={isDark ? "dark" : "light"} style={styles.resultCard}>
              <Text style={[styles.cardTitle, { color: isDark ? '#FFF' : COLORS.textMain }]}>Risk Assessment & Next Steps</Text>
              {resultData.insights.map((insight: any, i: number) => (
                <View key={i} style={styles.insightRow}>
                  <View style={[styles.insightIcon, { backgroundColor: `${insight.color}15` }]}>
                    <Ionicons name={insight.icon as any} size={18} color={insight.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.insightTitle, { color: isDark ? '#FFF' : COLORS.textMain }]}>{insight.title}</Text>
                    <Text style={styles.insightDesc}>{insight.desc}</Text>
                  </View>
                </View>
              ))}
            </BlurView>

            {/* Final Actions */}
            <TouchableOpacity style={styles.exportBtn}>
              <LinearGradient colors={['#0F172A', '#1E293B'] as const} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} />
              <Ionicons name="document-text" size={18} color="#FFF" />
              <Text style={styles.exportBtnText}>Export Comprehensive Report</Text>
            </TouchableOpacity>

          </Animated.View>
        )}

      </ScrollView>

      {/* MODAL */}
      <Modal visible={showPickerModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalBg} onPress={() => setShowPickerModal(false)} activeOpacity={1}>
          <TouchableWithoutFeedback>
            <BlurView intensity={60} tint="dark" style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Input Method</Text>
              <TouchableOpacity style={styles.modalOption} onPress={handleTakePhoto}>
                <Ionicons name="camera" size={24} color="#FFF" />
                <Text style={styles.modalOptionText}>Launch Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalOption} onPress={handlePickImage}>
                <Ionicons name="image" size={24} color="#FFF" />
                <Text style={styles.modalOptionText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </BlurView>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentPadding: { paddingHorizontal: 24, paddingTop: 12 },
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerContent: { flex: 1 },
  aiBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: `${COLORS.success}20`, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginBottom: 4 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success, marginRight: 6 },
  aiBadgeText: { fontSize: 10, fontWeight: '800', color: COLORS.success, letterSpacing: 0.5 },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  heroSubtitle: { fontSize: 14, lineHeight: 22, marginBottom: 24 },

  // Scanner
  heroScanner: { height: 280, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.borderDark, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  scannerCorner: { position: 'absolute', width: 40, height: 40, borderColor: COLORS.primary },
  tl: { top: 20, left: 20, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 16 },
  tr: { top: 20, right: 20, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 16 },
  bl: { bottom: 20, left: 20, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 16 },
  br: { bottom: 20, right: 20, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 16 },
  heroCenter: { alignItems: 'center' },
  heroIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: `${COLORS.primary}20`, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  heroSubText: { fontSize: 12, color: COLORS.textSub, fontWeight: '600' },
  laserLine: { position: 'absolute', width: '100%', height: 3, top: '50%' },

  // Quick Actions
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 },
  quickChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, gap: 6, borderWidth: 1, borderColor: COLORS.borderDark },
  quickChipText: { fontSize: 13, fontWeight: '600' },

  // Capabilities
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 16 },
  carousel: { marginHorizontal: -24, marginBottom: 32 },
  capCard: { width: 160, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: COLORS.borderDark, overflow: 'hidden' },
  capIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: `${COLORS.primary}15`, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  capTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  capDesc: { fontSize: 12, color: COLORS.textSub, lineHeight: 18 },

  // Manual Input
  manualCard: { borderRadius: 20, borderWidth: 1, borderColor: COLORS.borderDark, overflow: 'hidden', marginBottom: 32 },
  manualHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  manualTitle: { fontSize: 15, fontWeight: '700' },
  manualContent: { paddingHorizontal: 16, overflow: 'hidden' },
  manualInput: { height: 100, borderRadius: 12, padding: 16, textAlignVertical: 'top', fontSize: 14 },

  // CTA
  ctaButton: { height: 60, borderRadius: 16, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, elevation: 4 },
  ctaText: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

  // Loading
  analysingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  aiOrbWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  aiOrbGlow: { position: 'absolute', width: '100%', height: '100%', borderRadius: 60, backgroundColor: COLORS.primary, opacity: 0.4 },
  aiOrb: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  loadingTitle: { fontSize: 24, fontWeight: '800', marginBottom: 40 },
  stepsContainer: { width: '80%', gap: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepText: { fontSize: 14, fontWeight: '600' },

  // Results
  scoreRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  scoreCard: { flex: 1, padding: 20, borderRadius: 24, borderWidth: 1, borderColor: COLORS.borderDark, overflow: 'hidden' },
  resultCard: { padding: 20, borderRadius: 24, borderWidth: 1, borderColor: COLORS.borderDark, overflow: 'hidden', marginBottom: 16 },
  identityHeader: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  resultProductTitle: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  confidenceText: { fontSize: 13, color: COLORS.success, fontWeight: '700' },
  cardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 16 },
  certGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  certChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  certText: { fontSize: 12, fontWeight: '700' },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  insightIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  insightTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  insightDesc: { fontSize: 13, color: COLORS.textSub, lineHeight: 20 },
  exportBtn: { height: 56, borderRadius: 16, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10 },
  exportBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  modalContent: { width: '80%', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: COLORS.borderDark, overflow: 'hidden' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#FFF', marginBottom: 24, textAlign: 'center' },
  modalOption: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, marginBottom: 12, gap: 16 },
  modalOptionText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
});

export default AIProductQualityScreen;
