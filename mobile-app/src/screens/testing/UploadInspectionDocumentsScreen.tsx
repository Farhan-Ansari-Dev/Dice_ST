import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Shadows } from '../../theme';
import Button from '../../components/common/Button';


const UploadInspectionDocumentsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const { productName, factoryName, description, inspections } = route.params || {};

  const [documents, setDocuments] = useState<{ id: number; name: string; uploaded: boolean; loading: boolean }[]>([]);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    // Simulated AI determination of required inspection documents
    const docs = [
      'Factory Layout',
      'Manufacturing Process Flow',
      'Quality Control Plan',
      'Factory Registration Certificate',
      'Product Specification / Datasheet',
    ];

    const parsedDocs = docs.map((name, index) => ({
      id: index,
      name,
      uploaded: false,
      loading: false,
    }));
    setDocuments(parsedDocs);
  }, [inspections]);

  const handleUpload = (id: number) => {
    setDocuments(prev => prev.map(doc => doc.id === id ? { ...doc, loading: true } : doc));
    setTimeout(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setDocuments(prev => prev.map(doc => doc.id === id ? { ...doc, loading: false, uploaded: true } : doc));
    }, 1200);
  };

  const promptUploadOptions = (id: number) => {
    Alert.alert(
      'Upload Document',
      'Choose a method to provide this document',
      [
        { text: 'Take Photo (Camera)', onPress: () => handleUpload(id) },
        { text: 'Choose from Files/Gallery', onPress: () => handleUpload(id) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleNext = () => {
    navigation.navigate('ChooseInspectionBody', {
      productName,
      factoryName,
      description,
      inspections,
    });
  };

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const allUploaded = documents.every(d => d.uploaded);

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
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Upload Documents</Text>
          <Text style={styles.headerSub}>Step 2 of 3</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#00D4FF" />
          <Text style={styles.infoText}>
            Upload any order documents you already have. These are optional at this stage and can be requested later.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Optional Documents List</Text>
        
        <View style={[styles.formCard, Shadows.sm]}>
          <LinearGradient
            colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#FFFFFF']}
            style={styles.formCardInner}
          >
            {documents.map((doc, index) => (
              <View key={doc.id}>
                <View style={styles.docRow}>
                  <View style={styles.docIconWrapper}>
                    <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                  </View>
                  <Text style={styles.docName}>{doc.name}</Text>
                  
                  {doc.uploaded ? (
                    <View style={styles.uploadedBadge}>
                      <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                    </View>
                  ) : doc.loading ? (
                    <View style={styles.uploadBtn}>
                      <Ionicons name="sync" size={20} color={colors.textTertiary} />
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.uploadBtn} 
                      onPress={() => promptUploadOptions(doc.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>
                {index < documents.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </LinearGradient>
        </View>

        <TouchableOpacity 
          style={styles.termsContainer} 
          activeOpacity={0.8}
          onPress={() => setAgreed(!agreed)}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxActive]}>
            {agreed && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
          </View>
          <Text style={styles.termsText}>
            I confirm that these order documents and specifications are completely accurate and ready for the inspector.
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Sticky Action Bar */}
      <View style={[styles.stickyFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button
          title="Proceed to Partner Selection"
          onPress={handleNext}
          disabled={!agreed}
          fullWidth
          size="lg"
        />
      </View>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? colors.bgCardLight : '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: isDark ? 0 : 1,
      borderColor: 'rgba(0,0,0,0.05)',
      ...Shadows.sm,
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    headerSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    content: { paddingHorizontal: 20, paddingTop: 16 },
    infoBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 212, 255, 0.1)',
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(0, 212, 255, 0.2)',
      marginBottom: 20,
    },
    infoText: {
      flex: 1,
      marginLeft: 10,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 12,
    },
    formCard: {
      borderRadius: 24,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
      marginBottom: 24,
    },
    formCardInner: { padding: 8 },
    docRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
    },
    docIconWrapper: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: isDark ? `${colors.primary}20` : `${colors.primary}15`,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    docName: {
      flex: 1,
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    uploadBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    uploadedBadge: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    divider: {
      height: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      marginHorizontal: 12,
    },
    termsContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: 8,
      paddingHorizontal: 8,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.textTertiary,
      marginRight: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    checkboxActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    termsText: {
      flex: 1,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    stickyFooter: {
      paddingHorizontal: 20,
      paddingTop: 16,
      backgroundColor: isDark ? colors.bgDark : '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      ...Shadows.md,
    },
  });

export default UploadInspectionDocumentsScreen;
