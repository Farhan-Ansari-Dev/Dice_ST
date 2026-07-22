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

import { Linking, Share } from 'react-native';
import { useTheme } from '../../theme';
import productAnalysisService, { ProductAnalysis, Finding } from '../../services/productAnalysisService';

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

// Shown while the request is genuinely in flight. These describe the real
// backend stages; the sequence stops advancing at the last step and waits for
// the response rather than pretending to finish.
const LOADING_STEPS = [
  'Uploading image...',
  'Reading labels and markings...',
  'Identifying product category...',
  'Matching applicable regulations...',
  'Assessing missing declarations...',
  'Generating report...',
];

const SEVERITY_STYLE: Record<Finding['severity'], { color: string; icon: string; label: string }> = {
  critical:  { color: '#DC2626', icon: 'alert-circle',   label: 'Critical' },
  important: { color: '#EA580C', icon: 'warning',        label: 'Important' },
  advisory:  { color: '#CA8A04', icon: 'information-circle', label: 'Advisory' },
  info:      { color: '#0284C7', icon: 'ellipse-outline',    label: 'Info' },
};

const riskBand = (score: number) =>
  score >= 70 ? { label: 'High', color: '#DC2626' }
  : score >= 40 ? { label: 'Moderate', color: '#EA580C' }
  : score >= 15 ? { label: 'Low', color: '#CA8A04' }
  : { label: 'Minimal', color: '#16A34A' };

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

/**
 * Renders a group of findings. Every finding shows its severity, confidence and
 * the evidence it rests on — the user must be able to judge how much weight to
 * put on each statement.
 */
const FindingSection: React.FC<{
  title: string;
  findings: Finding[];
  isDark: boolean;
  emptyNote: string;
}> = ({ title, findings, isDark, emptyNote }) => (
  <BlurView intensity={isDark ? 20 : 80} tint={isDark ? 'dark' : 'light'} style={styles.resultCard}>
    <Text style={[styles.cardTitle, { color: isDark ? '#FFF' : COLORS.textMain }]}>{title}</Text>
    {findings.length === 0 ? (
      <Text style={styles.insightDesc}>{emptyNote}</Text>
    ) : (
      findings.map((f) => {
        const sev = SEVERITY_STYLE[f.severity];
        return (
          <View key={f.id} style={styles.insightRow}>
            <View style={[styles.insightIcon, { backgroundColor: `${sev.color}15` }]}>
              <Ionicons name={sev.icon as any} size={18} color={sev.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.severityTag, { color: sev.color }]}>
                {sev.label} · {Math.round(f.confidence * 100)}% confidence
              </Text>
              <Text style={[styles.insightTitle, { color: isDark ? '#FFF' : COLORS.textMain }]}>{f.title}</Text>
              <Text style={styles.insightDesc}>{f.detail}</Text>
              {!!f.reference && <Text style={styles.referenceText}>Reference: {f.reference}</Text>}
              <Text style={styles.evidenceText}>Evidence: {f.evidence}</Text>
            </View>
          </View>
        );
      })
    )}
  </BlurView>
);

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
  const [analysis, setAnalysis] = useState<ProductAnalysis | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

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

  const startAnalysis = async () => {
    if (!imageUri) {
      Alert.alert('Photo Required', 'Take or choose a product photo. The analysis reads the label, so an image is required.');
      return;
    }

    setPhase('analysing');
    setLoadingStep(0);
    setErrorMessage(null);
    setAnalysis(null);

    // Advances through the stage labels while the request is genuinely in
    // flight, then holds on the final stage until the server responds.
    const interval = setInterval(() => {
      setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1));
    }, 1400);

    try {
      const result = await productAnalysisService.analyzeImage(imageUri, manualInput);
      setAnalysis(result);
      setPhase('result');
    } catch (err: any) {
      const message =
        err?.response?.data?.message ??
        'Could not analyse this image. Check your connection and try again.';
      setErrorMessage(message);
      setPhase('pick');
      Alert.alert('Analysis Failed', message);
    } finally {
      clearInterval(interval);
    }
  };

  const handleExportReport = async () => {
    if (!analysis) return;
    setExporting(true);
    try {
      const report = analysis.report ?? (await productAnalysisService.generateReport(analysis));
      if (!report?.downloadUrl) throw new Error('No report URL returned');

      await Share.share({
        url: report.downloadUrl,
        message: `DICE compliance assessment — ${analysis.productType}\n${report.downloadUrl}`,
        title: 'DICE Compliance Report',
      });
    } catch {
      // Sharing unavailable or dismissed — fall back to opening the PDF.
      const url = analysis.report?.downloadUrl;
      if (url) {
        const canOpen = await Linking.canOpenURL(url).catch(() => false);
        if (canOpen) { await Linking.openURL(url); return; }
      }
      Alert.alert('Export Failed', 'Could not produce the report. Please try again.');
    } finally {
      setExporting(false);
    }
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
        {phase === 'result' && analysis && (
          <Animated.View entering={SlideInDown.springify().damping(20)} style={styles.contentPadding}>

            {/* Risk + category confidence — both server-computed */}
            <View style={styles.scoreRow}>
              <BlurView intensity={isDark ? 20 : 80} tint={isDark ? 'dark' : 'light'} style={styles.scoreCard}>
                <ScoreRing
                  value={analysis.riskScore}
                  label={`${riskBand(analysis.riskScore).label} risk`}
                  color={riskBand(analysis.riskScore).color}
                />
              </BlurView>
              <BlurView intensity={isDark ? 20 : 80} tint={isDark ? 'dark' : 'light'} style={styles.scoreCard}>
                <ScoreRing
                  value={Math.round(analysis.confidence * 100)}
                  label="ID confidence"
                  color={COLORS.primary}
                />
              </BlurView>
            </View>

            {/* Product identity */}
            <BlurView intensity={isDark ? 20 : 80} tint={isDark ? 'dark' : 'light'} style={styles.resultCard}>
              <View style={styles.identityHeader}>
                <View style={[styles.iconBox, { backgroundColor: `${COLORS.accent}20` }]}>
                  <Ionicons name="cube-outline" size={28} color={COLORS.accent} />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={[styles.resultProductTitle, { color: isDark ? '#FFF' : COLORS.textMain }]}>
                    {analysis.productType}
                  </Text>
                  <Text style={styles.confidenceText}>
                    {analysis.productCategory}
                    {analysis.brand ? ` · ${analysis.brand}` : ''}
                  </Text>
                </View>
              </View>

              {analysis.observations.imageQualityNotes ? (
                <Text style={[styles.insightDesc, { color: COLORS.warning, marginTop: 10 }]}>
                  {analysis.observations.imageQualityNotes}
                </Text>
              ) : null}
            </BlurView>

            {/* What the image showed */}
            <BlurView intensity={isDark ? 20 : 80} tint={isDark ? 'dark' : 'light'} style={styles.resultCard}>
              <Text style={[styles.cardTitle, { color: isDark ? '#FFF' : COLORS.textMain }]}>What the image shows</Text>
              {analysis.detectedText.length ? (
                <View style={styles.certGrid}>
                  {analysis.detectedText.slice(0, 12).map((t, i) => (
                    <View key={i} style={[styles.certChip, { borderColor: `${COLORS.primary}40`, backgroundColor: `${COLORS.primary}10` }]}>
                      <Ionicons name="text-outline" size={13} color={COLORS.primary} />
                      <Text style={[styles.certText, { color: COLORS.primary }]} numberOfLines={1}>{t}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.insightDesc}>No legible text was detected in this image.</Text>
              )}

              {analysis.observations.visibleCertifications.length > 0 && (
                <>
                  <Text style={[styles.cardTitle, { color: isDark ? '#FFF' : COLORS.textMain, fontSize: 13, marginTop: 14 }]}>
                    Marks present on artwork
                  </Text>
                  {analysis.observations.visibleCertifications.map((c, i) => (
                    <View key={i} style={styles.insightRow}>
                      <View style={[styles.insightIcon, { backgroundColor: `${COLORS.success}15` }]}>
                        <Ionicons name="ribbon-outline" size={18} color={COLORS.success} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.insightTitle, { color: isDark ? '#FFF' : COLORS.textMain }]}>
                          {c.mark} · {Math.round(c.confidence * 100)}%
                        </Text>
                        <Text style={styles.insightDesc}>{c.observation}</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </BlurView>

            <FindingSection
              title="Applicable certifications"
              findings={analysis.assessment.applicableCertifications}
              isDark={isDark}
              emptyNote="No certification scheme was identified for this category."
            />

            <FindingSection
              title="Markings & declarations not visible"
              findings={[...analysis.assessment.missingVisibleMarkings, ...analysis.assessment.missingDeclarations]}
              isDark={isDark}
              emptyNote="All expected markings and declarations were identified."
            />

            <FindingSection
              title="Applicable regulations & standards"
              findings={[...analysis.assessment.applicableRegulations, ...analysis.assessment.applicableStandards]}
              isDark={isDark}
              emptyNote="No specific regulation was identified."
            />

            <FindingSection
              title="Recommended next steps"
              findings={analysis.assessment.recommendedNextSteps}
              isDark={isDark}
              emptyNote="No further action identified."
            />

            {/* Scope — this is an indicative assessment, never a certificate */}
            <View style={styles.disclaimerBox}>
              <Ionicons name="information-circle" size={16} color="#991B1B" />
              <Text style={styles.disclaimerText}>{analysis.disclaimer}</Text>
            </View>

            {/* Final Actions */}
            <TouchableOpacity style={styles.exportBtn} onPress={handleExportReport} disabled={exporting}>
              <LinearGradient colors={['#0F172A', '#1E293B'] as const} style={[StyleSheet.absoluteFill, { borderRadius: 16 }]} />
              <Ionicons name={exporting ? 'hourglass-outline' : 'document-text'} size={18} color="#FFF" />
              <Text style={styles.exportBtnText}>
                {exporting ? 'Preparing report...' : 'Export Comprehensive Report'}
              </Text>
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
  severityTag: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase', marginBottom: 2 },
  referenceText: { fontSize: 11, color: '#6C63FF', fontWeight: '600', marginTop: 3 },
  evidenceText: { fontSize: 11, color: '#94A3B8', marginTop: 3, lineHeight: 15 },
  disclaimerBox: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  disclaimerText: { flex: 1, fontSize: 11, lineHeight: 16, color: '#7F1D1D' },
  exportBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  modalContent: { width: '80%', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: COLORS.borderDark, overflow: 'hidden' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#FFF', marginBottom: 24, textAlign: 'center' },
  modalOption: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, marginBottom: 12, gap: 16 },
  modalOptionText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
});

export default AIProductQualityScreen;
