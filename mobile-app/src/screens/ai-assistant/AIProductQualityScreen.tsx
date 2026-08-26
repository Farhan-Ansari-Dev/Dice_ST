import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Modal,
  Platform,
  TouchableWithoutFeedback,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Linking, Share } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  FadeInDown,
} from 'react-native-reanimated';
import { useTheme, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import { centeredContent, gridColumns, gridItemWidth } from '../../utils/layout';
import productAnalysisService, { ProductAnalysis, Finding } from '../../services/productAnalysisService';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

const CAPABILITIES: { title: string; desc: string; icon: string }[] = [
  { title: 'Identifies the product', desc: 'Reads labels, marks and packaging to classify what it is', icon: 'scan-outline' },
  { title: 'Matches regulations', desc: 'Finds the standards and rules that apply in your markets', icon: 'globe-outline' },
  { title: 'Flags whatʼs missing', desc: 'Spots absent certification marks and required declarations', icon: 'alert-circle-outline' },
  { title: 'Recommends certifications', desc: 'Tells you exactly which certificates to pursue next', icon: 'shield-checkmark-outline' },
];

// Shown while the request is genuinely in flight. These describe the real
// backend stages; the sequence stops advancing at the last step and waits for
// the response rather than pretending to finish.
const LOADING_STEPS = [
  'Uploading image',
  'Reading labels and markings',
  'Identifying product category',
  'Matching applicable regulations',
  'Assessing missing declarations',
  'Generating report',
];

/**
 * Severity → semantic theme colour + icon + label. Four distinct compliance
 * levels are preserved (critical/important/advisory/info) using theme tokens
 * only — no ad-hoc hex.
 */
const severityMeta = (severity: Finding['severity'], colors: ThemeColors) => {
  const map: Record<Finding['severity'], { color: string; icon: string; label: string }> = {
    critical:  { color: colors.error,       icon: 'alert-circle',        label: 'Critical' },
    important: { color: colors.warningDark,  icon: 'warning',             label: 'Important' },
    advisory:  { color: colors.warning,      icon: 'information-circle',  label: 'Advisory' },
    info:      { color: colors.info,         icon: 'ellipse-outline',     label: 'Info' },
  };
  return map[severity];
};

const riskBand = (score: number, colors: ThemeColors) =>
  score >= 70 ? { label: 'High risk', color: colors.error }
  : score >= 40 ? { label: 'Moderate risk', color: colors.warningDark }
  : score >= 15 ? { label: 'Low risk', color: colors.warning }
  : { label: 'Minimal risk', color: colors.success };

const FindingSection: React.FC<{
  title: string;
  findings: Finding[];
  colors: ThemeColors;
  styles: ReturnType<typeof makeStyles>;
  emptyNote: string;
}> = ({ title, findings, colors, styles, emptyNote }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>{title}</Text>
    {findings.length === 0 ? (
      <View style={styles.emptyRow}>
        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
        <Text style={styles.insightDesc}>{emptyNote}</Text>
      </View>
    ) : (
      findings.map((f) => {
        const sev = severityMeta(f.severity, colors);
        return (
          <View key={f.id} style={styles.insightRow}>
            <View style={[styles.insightIcon, { backgroundColor: `${sev.color}1A` }]}>
              <Ionicons name={sev.icon as any} size={18} color={sev.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.severityTag, { color: sev.color }]}>
                {sev.label} · {Math.round(f.confidence * 100)}% confidence
              </Text>
              <Text style={styles.insightTitle}>{f.title}</Text>
              <Text style={styles.insightDesc}>{f.detail}</Text>
              {!!f.reference && <Text style={styles.referenceText}>Reference: {f.reference}</Text>}
              <Text style={styles.evidenceText}>Evidence: {f.evidence}</Text>
            </View>
          </View>
        );
      })
    )}
  </View>
);

const ScoreRing = ({ value, label, color, colors, size = 108 }: { value: number; label: string; color: string; colors: ThemeColors; size?: number }) => (
  <View style={{ alignItems: 'center' }}>
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 9, borderColor: `${color}22`, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 9, borderColor: color,
        borderRightColor: 'transparent', borderBottomColor: value > 50 ? color : 'transparent', borderLeftColor: value > 75 ? color : 'transparent',
        transform: [{ rotate: '-45deg' }],
      }} />
      <Text style={{ fontSize: 30, fontWeight: '800', color }}>{value}</Text>
    </View>
    <Text style={{ marginTop: 10, fontSize: 12, fontWeight: '700', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</Text>
  </View>
);

const AIProductQualityScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const [phase, setPhase] = useState<'pick' | 'analysing' | 'result'>('pick');
  const [loadingStep, setLoadingStep] = useState(0);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [isManualExpanded, setIsManualExpanded] = useState(false);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [analysis, setAnalysis] = useState<ProductAnalysis | null>(null);
  const [exporting, setExporting] = useState(false);

  const buttonScale = useSharedValue(1);
  const manualHeight = useSharedValue(0);
  const orbPulse = useSharedValue(1);

  React.useEffect(() => {
    if (phase === 'analysing') {
      orbPulse.value = withRepeat(
        withTiming(1.12, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      orbPulse.value = 1;
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

  const resetToPick = () => { setPhase('pick'); setImageUri(null); setManualInput(''); setIsManualExpanded(false); };

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

  const buttonAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: buttonScale.value }] }));
  const manualAnimatedStyle = useAnimatedStyle(() => ({ height: manualHeight.value, opacity: manualHeight.value > 10 ? 1 : 0 }));
  const orbAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: orbPulse.value }] }));

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40, ...centeredContent }} keyboardShouldPersistTaps="handled">

          {/* PHASE 1: PICK */}
          {phase === 'pick' && (
            <Animated.View entering={FadeIn} exiting={FadeOut}>

              {/* BRAND HERO */}
              <LinearGradient colors={colors.gradientHero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + Spacing.base }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.heroBack} hitSlop={10}>
                  <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.heroBadge}>
                  <Ionicons name="sparkles" size={13} color="#FFFFFF" />
                  <Text style={styles.heroBadgeText}>DICE AI · COMPLIANCE INTELLIGENCE</Text>
                </View>
                <Text style={styles.heroTitle}>Scan a product.{'\n'}Know its compliance.</Text>
                <Text style={styles.heroSub}>
                  Photograph any product, label or packaging and DICE AI identifies the certifications, regulations and market readiness — in seconds.
                </Text>
              </LinearGradient>

              <View style={styles.body}>
                {/* SCAN CARD — floats over the hero edge */}
                {imageUri ? (
                  <View style={[styles.scanCard, styles.previewCard]}>
                    <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.previewReady}>Photo ready</Text>
                      <Text style={styles.previewHint}>Add product details below for a sharper result, or analyze now.</Text>
                      <TouchableOpacity onPress={() => setShowPickerModal(true)} style={styles.previewChange}>
                        <Ionicons name="swap-horizontal" size={14} color={colors.primary} />
                        <Text style={styles.previewChangeText}>Change photo</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity activeOpacity={0.9} onPress={() => setShowPickerModal(true)} style={styles.scanCard}>
                    <View style={styles.scanIconTile}>
                      <LinearGradient colors={colors.gradientHero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                      <Ionicons name="scan-outline" size={30} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.scanTitle}>Scan or upload a photo</Text>
                      <Text style={styles.scanSub}>Camera · Gallery · label, packaging or manual</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                  </TouchableOpacity>
                )}

                {/* QUICK ACTIONS */}
                <View style={styles.quickActions}>
                  <TouchableOpacity style={styles.quickChip} onPress={handleTakePhoto}>
                    <Ionicons name="camera-outline" size={18} color={colors.primary} />
                    <Text style={styles.quickChipText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.quickChip} onPress={handlePickImage}>
                    <Ionicons name="images-outline" size={18} color={colors.primary} />
                    <Text style={styles.quickChipText}>Gallery</Text>
                  </TouchableOpacity>
                </View>

                {/* PRODUCT DETAILS (optional) */}
                <TouchableOpacity activeOpacity={0.85} onPress={toggleManual} style={styles.card}>
                  <View style={styles.manualHeader}>
                    <Ionicons name="create-outline" size={20} color={colors.primary} />
                    <Text style={styles.manualTitle}>Product details (optional)</Text>
                    <Ionicons name={isManualExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textTertiary} style={{ marginLeft: 'auto' }} />
                  </View>
                  <Animated.View style={[styles.manualContent, manualAnimatedStyle]}>
                    <TextInput
                      style={styles.manualInput}
                      placeholder="e.g. Wireless Bluetooth speaker, LED driver, cosmetic cream…"
                      placeholderTextColor={colors.textTertiary}
                      multiline
                      value={manualInput}
                      onChangeText={setManualInput}
                    />
                  </Animated.View>
                </TouchableOpacity>

                {/* PRIMARY CTA */}
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPressIn={() => { buttonScale.value = withSpring(0.97); }}
                  onPressOut={() => { buttonScale.value = withSpring(1); }}
                  onPress={startAnalysis}
                >
                  <Animated.View style={[styles.ctaButton, buttonAnimatedStyle, !imageUri && styles.ctaButtonDisabled]}>
                    <LinearGradient colors={colors.gradientHero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                    <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                    <Text style={styles.ctaText}>Analyze with DICE AI</Text>
                  </Animated.View>
                </TouchableOpacity>

                {/* WHAT IT CHECKS */}
                <Text style={styles.sectionTitle}>What DICE AI checks</Text>
                {gridColumns(2) > 1 ? (
                  <View style={styles.capGrid}>
                    {CAPABILITIES.map((cap) => (
                      <View key={cap.title} style={[styles.capCard, { width: gridItemWidth(gridColumns(2), 12, Spacing.xl) }]}>
                        <View style={styles.capIcon}>
                          <Ionicons name={cap.icon as any} size={20} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.capTitle}>{cap.title}</Text>
                          <Text style={styles.capDesc}>{cap.desc}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.card}>
                    {CAPABILITIES.map((cap, i) => (
                      <Animated.View key={cap.title} entering={FadeInDown.delay(i * 70)}>
                        <View style={[styles.capRow, i < CAPABILITIES.length - 1 && styles.capRowDivider]}>
                          <View style={styles.capIcon}>
                            <Ionicons name={cap.icon as any} size={20} color={colors.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.capTitle}>{cap.title}</Text>
                            <Text style={styles.capDesc}>{cap.desc}</Text>
                          </View>
                        </View>
                      </Animated.View>
                    ))}
                  </View>
                )}

                {/* TRUST */}
                <View style={styles.trustRow}>
                  <Ionicons name="lock-closed-outline" size={13} color={colors.textTertiary} style={styles.trustIcon} />
                  <Text style={styles.trustText}>Indicative assessment — never a certificate. Your photo is processed securely.</Text>
                </View>
              </View>
            </Animated.View>
          )}

          {/* PHASE 2: ANALYSING */}
          {phase === 'analysing' && (
            <Animated.View entering={FadeIn} exiting={FadeOut} style={[styles.analysingContainer, { paddingTop: insets.top + 80 }]}>
              <Animated.View style={[styles.orb, orbAnimatedStyle]}>
                <LinearGradient colors={colors.gradientHero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                <ActivityIndicator size="large" color="#FFFFFF" />
              </Animated.View>
              <Text style={styles.loadingTitle}>Analyzing your product</Text>
              <Text style={styles.loadingSub}>DICE AI is reading the label and matching requirements.</Text>
              <View style={styles.stepsContainer}>
                {LOADING_STEPS.map((step, i) => {
                  const isActive = i === loadingStep;
                  const isPassed = i < loadingStep;
                  return (
                    <View key={i} style={[styles.stepRow, { opacity: isActive ? 1 : isPassed ? 0.6 : 0.3 }]}>
                      <Ionicons name={isPassed ? 'checkmark-circle' : isActive ? 'ellipse' : 'ellipse-outline'} size={16} color={isPassed ? colors.success : colors.primary} />
                      <Text style={[styles.stepText, isActive && { fontWeight: '700' }]}>{step}</Text>
                    </View>
                  );
                })}
              </View>
            </Animated.View>
          )}

          {/* PHASE 3: RESULTS */}
          {phase === 'result' && analysis && (
            <Animated.View entering={SlideInDown.springify().damping(20)}>

              {/* RESULT HERO */}
              <LinearGradient colors={colors.gradientHero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.resultHero, { paddingTop: insets.top + Spacing.base }]}>
                <View style={styles.resultHeroTop}>
                  <TouchableOpacity onPress={resetToPick} style={styles.heroBack} hitSlop={10}>
                    <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={resetToPick} style={styles.newScanBtn} hitSlop={10}>
                    <Ionicons name="scan-outline" size={15} color="#FFFFFF" />
                    <Text style={styles.newScanText}>New scan</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.resultProductTitle}>{analysis.productType}</Text>
                <Text style={styles.resultProductSub}>
                  {analysis.productCategory}{analysis.brand ? ` · ${analysis.brand}` : ''}
                </Text>
              </LinearGradient>

              <View style={styles.body}>
                {/* SCORES */}
                <View style={styles.scoreRow}>
                  <View style={[styles.card, styles.scoreCard]}>
                    <ScoreRing
                      value={analysis.riskScore}
                      label={riskBand(analysis.riskScore, colors).label}
                      color={riskBand(analysis.riskScore, colors).color}
                      colors={colors}
                    />
                  </View>
                  <View style={[styles.card, styles.scoreCard]}>
                    <ScoreRing
                      value={Math.round(analysis.confidence * 100)}
                      label="ID confidence"
                      color={colors.primary}
                      colors={colors}
                    />
                  </View>
                </View>

                {analysis.observations.imageQualityNotes ? (
                  <View style={styles.noteBox}>
                    <Ionicons name="alert-circle-outline" size={15} color={colors.warning} />
                    <Text style={styles.noteText}>{analysis.observations.imageQualityNotes}</Text>
                  </View>
                ) : null}

                {/* WHAT THE IMAGE SHOWS */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>What the image shows</Text>
                  {analysis.detectedText.length ? (
                    <View style={styles.certGrid}>
                      {analysis.detectedText.slice(0, 12).map((t, i) => (
                        <View key={i} style={styles.certChip}>
                          <Ionicons name="text-outline" size={13} color={colors.primary} />
                          <Text style={styles.certText} numberOfLines={1}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.insightDesc}>No legible text was detected in this image.</Text>
                  )}

                  {analysis.observations.visibleCertifications.length > 0 && (
                    <>
                      <Text style={[styles.cardTitle, { fontSize: 13, marginTop: Spacing.base }]}>Marks present on artwork</Text>
                      {analysis.observations.visibleCertifications.map((c, i) => (
                        <View key={i} style={styles.insightRow}>
                          <View style={[styles.insightIcon, { backgroundColor: `${colors.success}1A` }]}>
                            <Ionicons name="ribbon-outline" size={18} color={colors.success} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.insightTitle}>{c.mark} · {Math.round(c.confidence * 100)}%</Text>
                            <Text style={styles.insightDesc}>{c.observation}</Text>
                          </View>
                        </View>
                      ))}
                    </>
                  )}
                </View>

                <FindingSection title="Applicable certifications" findings={analysis.assessment.applicableCertifications} colors={colors} styles={styles} emptyNote="No certification scheme was identified for this category." />
                <FindingSection title="Markings & declarations not visible" findings={[...analysis.assessment.missingVisibleMarkings, ...analysis.assessment.missingDeclarations]} colors={colors} styles={styles} emptyNote="All expected markings and declarations were identified." />
                <FindingSection title="Applicable regulations & standards" findings={[...analysis.assessment.applicableRegulations, ...analysis.assessment.applicableStandards]} colors={colors} styles={styles} emptyNote="No specific regulation was identified." />
                <FindingSection title="Recommended next steps" findings={analysis.assessment.recommendedNextSteps} colors={colors} styles={styles} emptyNote="No further action identified." />

                {/* DISCLAIMER */}
                <View style={styles.disclaimerBox}>
                  <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
                  <Text style={styles.disclaimerText}>{analysis.disclaimer}</Text>
                </View>

                {/* EXPORT */}
                <TouchableOpacity style={styles.exportBtn} onPress={handleExportReport} disabled={exporting} activeOpacity={0.9}>
                  <LinearGradient colors={colors.gradientHero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                  <Ionicons name={exporting ? 'hourglass-outline' : 'document-text-outline'} size={18} color="#FFFFFF" />
                  <Text style={styles.exportBtnText}>{exporting ? 'Preparing report…' : 'Export full report'}</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* PICKER MODAL */}
      <Modal visible={showPickerModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalBg} onPress={() => setShowPickerModal(false)} activeOpacity={1}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Add a product photo</Text>
              <TouchableOpacity style={styles.modalOption} onPress={handleTakePhoto}>
                <View style={styles.modalOptIcon}><Ionicons name="camera-outline" size={22} color={colors.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalOptionText}>Take a photo</Text>
                  <Text style={styles.modalOptionSub}>Use the camera to capture the label</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalOption} onPress={handlePickImage}>
                <View style={styles.modalOptIcon}><Ionicons name="images-outline" size={22} color={colors.primary} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalOptionText}>Choose from gallery</Text>
                  <Text style={styles.modalOptionSub}>Pick an existing product photo</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

    </View>
  );
};

const makeStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDark },
  body: { paddingHorizontal: Spacing.xl, marginTop: -Spacing.xl },

  // Hero
  hero: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing['3xl'], borderBottomLeftRadius: BorderRadius['2xl'], borderBottomRightRadius: BorderRadius['2xl'] },
  heroBack: { width: 40, height: 40, marginLeft: -Spacing.sm, alignItems: 'flex-start', justifyContent: 'center' },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full, marginTop: Spacing.sm, marginBottom: Spacing.base },
  heroBadgeText: { fontSize: 10.5, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.6 },
  heroTitle: { fontSize: 30, lineHeight: 36, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  heroSub: { fontSize: 14, lineHeight: 21, color: 'rgba(255,255,255,0.9)', marginTop: Spacing.md },

  // Scan card
  scanCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.base, backgroundColor: colors.bgCard, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: colors.border, padding: Spacing.base, ...Shadows.md },
  scanIconTile: { width: 60, height: 60, borderRadius: BorderRadius.base, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', ...Shadows.primary },
  scanTitle: { ...Typography.h5, fontSize: 17, color: colors.textPrimary, marginBottom: 3 },
  scanSub: { ...Typography.caption, color: colors.textTertiary },
  previewCard: { alignItems: 'flex-start' },
  previewImage: { width: 68, height: 68, borderRadius: BorderRadius.md, backgroundColor: colors.bgCardLight },
  previewReady: { ...Typography.h5, fontSize: 16, color: colors.textPrimary, marginBottom: 3 },
  previewHint: { ...Typography.caption, color: colors.textSecondary, lineHeight: 17 },
  previewChange: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: Spacing.sm },
  previewChangeText: { ...Typography.caption, color: colors.primary, fontWeight: '700' },

  // Quick actions
  quickActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.base },
  quickChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md, borderRadius: BorderRadius.md, gap: Spacing.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard },
  quickChipText: { ...Typography.button, color: colors.textPrimary },

  // Card
  card: { backgroundColor: colors.bgCard, borderRadius: BorderRadius.base, borderWidth: 1, borderColor: colors.border, padding: Spacing.lg, marginTop: Spacing.base, ...Shadows.sm },

  // Manual
  manualHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  manualTitle: { ...Typography.h5, fontSize: 15, color: colors.textPrimary },
  manualContent: { overflow: 'hidden' },
  manualInput: { height: 100, marginTop: Spacing.md, borderRadius: BorderRadius.md, padding: Spacing.base, textAlignVertical: 'top', ...Typography.body2, color: colors.textPrimary, backgroundColor: colors.bgCardLight, borderWidth: 1, borderColor: colors.border },

  // CTA
  ctaButton: { height: 58, borderRadius: BorderRadius.base, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, overflow: 'hidden', marginTop: Spacing.lg, ...Shadows.primary },
  ctaButtonDisabled: { opacity: 0.55 },
  ctaText: { ...Typography.button, fontSize: 16, color: '#FFFFFF' },

  // Capabilities
  sectionTitle: { ...Typography.h5, color: colors.textPrimary, marginTop: Spacing['2xl'], marginBottom: Spacing.sm, paddingHorizontal: 2 },
  capGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  capCard: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, padding: Spacing.base, borderRadius: BorderRadius.base, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard, ...Shadows.sm },
  capRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.base, paddingVertical: Spacing.md },
  capRowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  capIcon: { width: 42, height: 42, borderRadius: BorderRadius.md, backgroundColor: `${colors.primary}14`, alignItems: 'center', justifyContent: 'center' },
  capTitle: { ...Typography.label, fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  capDesc: { ...Typography.caption, color: colors.textTertiary, lineHeight: 17 },

  // Trust
  trustRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, justifyContent: 'center', marginTop: Spacing.xl, paddingHorizontal: Spacing.base },
  trustIcon: { marginTop: 2 },
  trustText: { ...Typography.caption, fontSize: 11, lineHeight: 16, color: colors.textTertiary, textAlign: 'center', flexShrink: 1 },

  // Analysing
  analysingContainer: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.xl },
  orb: { width: 108, height: 108, borderRadius: 54, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl, ...Shadows.primary },
  loadingTitle: { ...Typography.h3, color: colors.textPrimary, marginBottom: Spacing.xs },
  loadingSub: { ...Typography.body2, color: colors.textSecondary, textAlign: 'center', marginBottom: Spacing['2xl'] },
  stepsContainer: { alignSelf: 'stretch', gap: Spacing.base, backgroundColor: colors.bgCard, borderRadius: BorderRadius.base, borderWidth: 1, borderColor: colors.border, padding: Spacing.lg, ...Shadows.sm },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stepText: { ...Typography.body2, color: colors.textPrimary },

  // Result hero
  resultHero: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing['3xl'], borderBottomLeftRadius: BorderRadius['2xl'], borderBottomRightRadius: BorderRadius['2xl'] },
  resultHeroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.base },
  newScanBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: BorderRadius.full },
  newScanText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  resultProductTitle: { fontSize: 26, lineHeight: 32, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.4 },
  resultProductSub: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 4 },

  // Scores
  scoreRow: { flexDirection: 'row', gap: Spacing.base },
  scoreCard: { flex: 1, alignItems: 'center', marginTop: 0 },
  noteBox: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start', backgroundColor: `${colors.warning}12`, borderColor: `${colors.warning}40`, borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, marginTop: Spacing.base },
  noteText: { flex: 1, ...Typography.caption, color: colors.textSecondary, lineHeight: 17 },

  // Result cards
  identityHeader: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { ...Typography.h5, fontSize: 16, color: colors.textPrimary, marginBottom: Spacing.base },
  certGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  certChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: `${colors.primary}40`, backgroundColor: `${colors.primary}10` },
  certText: { ...Typography.caption, fontWeight: '700', color: colors.primary, maxWidth: 150 },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.base },
  insightIcon: { width: 32, height: 32, borderRadius: BorderRadius.sm, alignItems: 'center', justifyContent: 'center' },
  severityTag: { ...Typography.overline, fontSize: 10, marginBottom: 2 },
  insightTitle: { ...Typography.label, fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  insightDesc: { ...Typography.caption, fontSize: 13, color: colors.textSecondary, lineHeight: 20, flex: 1 },
  referenceText: { ...Typography.caption, fontSize: 11, color: colors.primary, fontWeight: '600', marginTop: 3 },
  evidenceText: { ...Typography.caption, fontSize: 11, color: colors.textTertiary, marginTop: 3, lineHeight: 15 },
  disclaimerBox: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start', backgroundColor: `${colors.warning}12`, borderColor: `${colors.warning}40`, borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, marginTop: Spacing.base },
  disclaimerText: { flex: 1, ...Typography.caption, fontSize: 11, lineHeight: 16, color: colors.textSecondary },
  exportBtn: { height: 56, borderRadius: BorderRadius.base, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, overflow: 'hidden', marginTop: Spacing.base, ...Shadows.primary },
  exportBtnText: { ...Typography.button, fontSize: 15, color: '#FFFFFF' },

  // Modal
  modalBg: { flex: 1, backgroundColor: colors.bgOverlay, justifyContent: 'flex-end' },
  modalContent: { padding: Spacing.xl, paddingBottom: Spacing['3xl'], borderTopLeftRadius: BorderRadius['2xl'], borderTopRightRadius: BorderRadius['2xl'], backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, ...Shadows.lg },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderLight, alignSelf: 'center', marginBottom: Spacing.lg },
  modalTitle: { ...Typography.h4, color: colors.textPrimary, marginBottom: Spacing.lg },
  modalOption: { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, backgroundColor: colors.bgCardLight, borderRadius: BorderRadius.md, marginBottom: Spacing.md, gap: Spacing.base, borderWidth: 1, borderColor: colors.border },
  modalOptIcon: { width: 44, height: 44, borderRadius: BorderRadius.md, backgroundColor: `${colors.primary}14`, alignItems: 'center', justifyContent: 'center' },
  modalOptionText: { ...Typography.body1, fontWeight: '700', color: colors.textPrimary },
  modalOptionSub: { ...Typography.caption, color: colors.textTertiary, marginTop: 2 },
});

export default AIProductQualityScreen;
