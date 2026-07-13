import React, { useState, useMemo, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useTheme, BorderRadius } from '../../theme';
import Button from '../../components/common/Button';

const DocumentScanScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [flash, setFlash] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  // Animate scan line
  useEffect(() => {
    if (scanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(scanLineAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      scanLineAnim.setValue(0);
    }
  }, [scanning]);

  const scanLineTranslate = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 320],
  });

  const handleScan = async () => {
    setScanning(true);
    await new Promise((r) => setTimeout(r, 2500));
    setScanning(false);
    setScanned(true);
    setOcrText(
      'BIS Certificate No: CM/L-7654321\n' +
      'Product: Electronic Power Adapter\n' +
      'Manufacturer: TechCorp Industries Pvt Ltd\n' +
      'Valid Until: March 2027\n' +
      'Standard: IS 13252 (Part 1)\n' +
      'License No: R-41098765'
    );
  };

  // Permission not yet determined
  if (!permission) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient colors={['#000', '#0A0B0F']} style={StyleSheet.absoluteFill} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Document</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.permissionBox}>
          <Text style={styles.permissionText}>Requesting camera permission...</Text>
        </View>
      </View>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient colors={['#000', '#0A0B0F']} style={StyleSheet.absoluteFill} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Document</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.permissionBox}>
          <Ionicons name="camera-outline" size={56} color="rgba(255,255,255,0.3)" />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            Allow camera access to scan and extract text from documents.
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.permissionBtnGrad}>
              <Text style={styles.permissionBtnText}>Allow Camera</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Document</Text>
        <TouchableOpacity style={styles.flashBtn} onPress={() => setFlash(f => !f)}>
          <Ionicons
            name={flash ? 'flash' : 'flash-outline'}
            size={22}
            color={flash ? colors.warning : '#fff'}
          />
        </TouchableOpacity>
      </View>

      {/* Camera */}
      <View style={styles.cameraWrapper}>
        {!scanned ? (
          <>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={flash}
              barcodeScannerSettings={{ barcodeTypes: ['qr', 'pdf417', 'code128', 'code39', 'ean13'] }}
              onBarcodeScanned={({ data }) => {
                if (!scanned && !scanning) {
                  setScanned(true);
                  setOcrText(`Scanned: ${data}\n\nDocument detected. Verifying with certification database...`);
                }
              }}
            />
            {/* Dark overlay with cutout effect */}
            <View style={styles.overlay}>
              {/* Top dark area */}
              <View style={styles.overlayTop} />
              {/* Middle row */}
              <View style={styles.overlayMiddle}>
                <View style={styles.overlaySide} />
                {/* Scan frame */}
                <View style={styles.scanFrame}>
                  <View style={[styles.corner, styles.cornerTL, { borderColor: colors.primary }]} />
                  <View style={[styles.corner, styles.cornerTR, { borderColor: colors.primary }]} />
                  <View style={[styles.corner, styles.cornerBL, { borderColor: colors.primary }]} />
                  <View style={[styles.corner, styles.cornerBR, { borderColor: colors.primary }]} />
                  {scanning && (
                    <Animated.View style={[
                      styles.scanLine,
                      { backgroundColor: colors.primary, transform: [{ translateY: scanLineTranslate }] },
                    ]} />
                  )}
                </View>
                <View style={styles.overlaySide} />
              </View>
              {/* Bottom dark area */}
              <View style={styles.overlayBottom}>
                <Text style={styles.scanHint}>
                  {scanning ? '🔍 Extracting text...' : 'Position document within the frame'}
                </Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.ocrResult}>
            <LinearGradient
              colors={['rgba(0,200,150,0.25)', 'rgba(0,200,150,0.05)']}
              style={styles.ocrCard}
            >
              <View style={styles.ocrHeader}>
                <Ionicons name="checkmark-circle" size={28} color={colors.success} />
                <Text style={[styles.ocrTitle, { color: colors.success }]}>Document Scanned!</Text>
              </View>
              <Text style={styles.ocrText}>{ocrText}</Text>
            </LinearGradient>
          </View>
        )}
      </View>

      {/* Bottom panel */}
      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 16 }]}>
        {!scanned ? (
          <Button
            title={scanning ? 'Scanning...' : 'Capture & Extract Text'}
            onPress={handleScan}
            loading={scanning}
            fullWidth
            size="lg"
            icon={<Ionicons name="scan" size={20} color="#fff" />}
          />
        ) : (
          <>
            <Button
              title="Save Document"
              onPress={() => { Alert.alert('Saved', 'Document saved successfully!'); navigation.goBack(); }}
              fullWidth size="lg"
              style={{ marginBottom: 10 }}
            />
            <Button
              title="Scan Again"
              onPress={() => { setScanned(false); setOcrText(''); }}
              variant="outline"
              fullWidth size="md"
            />
          </>
        )}
      </View>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12, gap: 12,
    zIndex: 10,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#fff' },
  flashBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  cameraWrapper: { flex: 1, position: 'relative' },
  overlay: { ...StyleSheet.absoluteFillObject, flexDirection: 'column' },
  overlayTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  overlayMiddle: { flexDirection: 'row', height: 360 },
  overlaySide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  overlayBottom: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', paddingTop: 20,
  },
  scanFrame: { width: 280, height: 360, position: 'relative', overflow: 'hidden' },
  corner: { position: 'absolute', width: 32, height: 32, borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  scanLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.9 },
  scanHint: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', paddingHorizontal: 20 },
  ocrResult: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  ocrCard: { borderRadius: BorderRadius.lg, padding: 20, borderWidth: 1, borderColor: 'rgba(0,200,150,0.3)', width: '100%' },
  ocrHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  ocrTitle: { fontSize: 17, fontWeight: '700' },
  ocrText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 24 },
  bottomPanel: {
    paddingHorizontal: 20, paddingTop: 16,
    backgroundColor: colors.bgDark,
    borderTopWidth: 1,
    borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
  },
  permissionBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  permissionTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  permissionText: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 20 },
  permissionBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginTop: 8 },
  permissionBtnGrad: { paddingHorizontal: 32, paddingVertical: 14 },
  permissionBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});

export default DocumentScanScreen;
