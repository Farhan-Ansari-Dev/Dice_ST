import React, { useMemo, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import { useVaultStore } from '../../store/vaultStore';

const VaultListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { documents, addDocument, markAsUploaded, loadDocuments, isLoading, hasLoaded, error } = useVaultStore();

  // Documents come from the server. Refetch on focus so an upload made
  // elsewhere in the app is reflected when the user returns here.
  useFocusEffect(
    useCallback(() => {
      loadDocuments();
    }, [loadDocuments]),
  );
  const uploadedDocuments = documents.filter((document) => document.uploaded);
  const pendingDocuments = documents.filter((document) => !document.uploaded);

  const handleUpload = (id: string) => {
    Alert.alert(
      'Upload Document',
      'Choose a method to provide this document',
      [
        { text: 'Take Photo', onPress: () => markAsUploaded(id) },
        { text: 'Choose from Files', onPress: () => markAsUploaded(id) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const addPickedDocument = (document: {
    name: string;
    uri: string;
    mimeType?: string | null;
    source: 'camera' | 'image-library' | 'file-picker';
  }) => {
    const isImage = document.mimeType?.startsWith('image/') ?? false;
    addDocument({
      name: document.name,
      type: document.mimeType === 'application/pdf' ? 'PDF document' : isImage ? 'Scanned image' : 'Document',
      uri: document.uri,
      mimeType: document.mimeType,
      source: document.source,
      ocrStatus: isImage ? 'queued' : 'ready',
      dateAdded: new Date().toISOString(),
      uploaded: true,
    });
    Alert.alert(
      isImage ? 'Scan saved' : 'Document added',
      isImage
        ? 'Your image was added to the Vault and is ready for OCR extraction.'
        : 'Your document is now available in the Vault.'
    );
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera permission required', 'Allow camera access to scan documents into the Vault.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      addPickedDocument({
        name: `Scan ${new Date().toLocaleDateString()}.jpg`,
        uri: asset.uri,
        mimeType: asset.mimeType ?? 'image/jpeg',
        source: 'camera',
      });
    }
  };

  const chooseImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photos permission required', 'Allow access to import an image into the Vault.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      addPickedDocument({
        name: asset.fileName ?? `Image ${new Date().toLocaleDateString()}.jpg`,
        uri: asset.uri,
        mimeType: asset.mimeType ?? 'image/jpeg',
        source: 'image-library',
      });
    }
  };

  const chooseFile = async (pdfOnly = false) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: pdfOnly ? 'application/pdf' : '*/*',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      addPickedDocument({
        name: asset.name,
        uri: asset.uri,
        mimeType: asset.mimeType,
        source: 'file-picker',
      });
    }
  };

  const handleAddDocument = () => {
    Alert.alert('Add to Vault', 'Choose how you would like to add a document.', [
      { text: 'Scan with Camera (OCR)', onPress: takePhoto },
      { text: 'Choose Image (OCR)', onPress: chooseImage },
      { text: 'Import PDF', onPress: () => chooseFile(true) },
      { text: 'Choose Any File', onPress: () => chooseFile(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleDocumentClick = (doc: any) => {
    if (doc.uploaded) {
      navigation.navigate('VaultDetails', { docId: doc.id, docName: doc.name });
    } else {
      Alert.alert('Not Uploaded', 'Please upload this document first before viewing details.');
    }
  };

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : ['#F9FAFF', '#F0F3FA']} style={StyleSheet.absoluteFill} />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>COMPLIANCE WORKSPACE</Text>
          <Text style={styles.headerTitle}>Document Vault</Text>
          <Text style={styles.headerSub}>Files, certificates, and secure sharing</Text>
        </View>
        <TouchableOpacity
          accessibilityLabel="Add a document"
          style={styles.addBtn}
          onPress={handleAddDocument}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={isLoading && hasLoaded} onRefresh={loadDocuments} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={[styles.summaryCard, Shadows.md]}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryIcon}>
              <Ionicons name="shield-checkmark" size={23} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryTitle}>Your compliance records</Text>
              <Text style={styles.summaryText}>Securely stored and ready to use</Text>
            </View>
          </View>
          <View style={styles.summaryStats}>
            <View>
              <Text style={styles.statValue}>{documents.length}</Text>
              <Text style={styles.statLabel}>TOTAL</Text>
            </View>
            <View style={styles.statDivider} />
            <View>
              <Text style={styles.statValue}>{uploadedDocuments.length}</Text>
              <Text style={styles.statLabel}>READY</Text>
            </View>
            <View style={styles.statDivider} />
            <View>
              <Text style={styles.statValue}>{pendingDocuments.length}</Text>
              <Text style={styles.statLabel}>NEEDED</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionLabel}>YOUR DOCUMENTS</Text>
            <Text style={styles.sectionHint}>Tap a ready file to view, share, or export it.</Text>
          </View>
          <TouchableOpacity onPress={() => Alert.alert('Filter', 'Document filters will be available here.')}>
            <Ionicons name="options-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={[styles.listCard, Shadows.sm]}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#FFFFFF']} style={styles.listCardInner}>
            {isLoading && !hasLoaded ? (
              <View style={styles.stateBox}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.stateText}>Loading your documents…</Text>
              </View>
            ) : error ? (
              <View style={styles.stateBox}>
                <Ionicons name="cloud-offline-outline" size={30} color={colors.textTertiary} />
                <Text style={styles.stateText}>{error}</Text>
                <TouchableOpacity onPress={loadDocuments} style={styles.retryBtn}>
                  <Text style={styles.retryText}>Try again</Text>
                </TouchableOpacity>
              </View>
            ) : documents.length === 0 ? (
              <View style={styles.stateBox}>
                <Ionicons name="folder-open-outline" size={30} color={colors.textTertiary} />
                <Text style={styles.stateTitle}>No documents yet</Text>
                <Text style={styles.stateText}>
                  Upload a certificate, test report or company document and it will appear here.
                </Text>
              </View>
            ) : documents.map((doc, index) => (
              <View key={doc.id}>
                <TouchableOpacity style={styles.docRow} onPress={() => handleDocumentClick(doc)}>
                  <View style={[styles.docIconWrapper, doc.uploaded && styles.readyIconWrapper]}>
                    <Ionicons name={doc.uploaded ? 'checkmark-done' : 'document-text'} size={20} color={doc.uploaded ? colors.success : colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docName}>{doc.name}</Text>
                    <View style={styles.metadata}>
                      <Text style={styles.docType}>{doc.type}</Text>
                      {doc.uploaded && <Text style={styles.readyText}>READY</Text>}
                      {doc.ocrStatus === 'queued' && <Text style={styles.ocrText}>OCR READY</Text>}
                    </View>
                  </View>
                  
                  {doc.uploaded ? (
                    <View style={styles.openButton}>
                      <Text style={styles.openButtonText}>Open</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.uploadBtn} onPress={() => handleUpload(doc.id)}>
                      <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
                      <Text style={styles.uploadBtnText}>Upload</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
                {index < documents.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </LinearGradient>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: colors.primary, marginBottom: 4 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  headerSub: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  addBtn: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, ...Shadows.sm },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 48 },
  summaryCard: { borderRadius: BorderRadius.lg, padding: 20, marginBottom: 24 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  summaryIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  summaryText: { fontSize: 12, color: 'rgba(255,255,255,0.74)', marginTop: 3 },
  summaryStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statValue: { fontSize: 21, fontWeight: '800', color: '#FFFFFF' },
  statLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, color: 'rgba(255,255,255,0.68)', marginTop: 3 },
  statDivider: { height: 30, width: 1, backgroundColor: 'rgba(255,255,255,0.24)' },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, letterSpacing: 0.8 },
  sectionHint: { fontSize: 12, color: colors.textTertiary, marginTop: 4 },
  listCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
  listCardInner: { padding: 8 },
  docRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  docIconWrapper: { width: 42, height: 42, borderRadius: 13, backgroundColor: isDark ? `${colors.primary}20` : `${colors.primary}12`, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  readyIconWrapper: { backgroundColor: isDark ? `${colors.success}20` : `${colors.success}12` },
  docName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  metadata: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  docType: { fontSize: 11, color: colors.textTertiary },
  readyText: { fontSize: 10, fontWeight: '700', color: colors.success, letterSpacing: 0.6 },
  ocrText: { fontSize: 10, fontWeight: '700', color: colors.primary, letterSpacing: 0.6 },
  openButton: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: 8 },
  openButtonText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' },
  uploadBtnText: { fontSize: 12, fontWeight: '600', color: colors.primary, marginLeft: 6 },
  stateBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 24, gap: 10 },
  stateTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  stateText: { fontSize: 13, lineHeight: 19, color: colors.textSecondary, textAlign: 'center' },
  retryBtn: { marginTop: 4, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: `${colors.primary}18` },
  retryText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  divider: { height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', marginHorizontal: 12 },
});
export default VaultListScreen;
