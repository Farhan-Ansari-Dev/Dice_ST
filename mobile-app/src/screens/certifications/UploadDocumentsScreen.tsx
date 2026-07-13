import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  UIManager,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Shadows } from '../../theme';
import Button from '../../components/common/Button';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import * as DocumentPicker from 'expo-document-picker';

interface IDocumentRequirement {
  name: string;
  description?: string;
  required: boolean;
  is_mandatory?: boolean;
}

interface Standard {
  required_documents: IDocumentRequirement[];
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const UploadDocumentsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, any>>({});

  const { selectedType, mainCategory, productName, hsCode, description, certificationId } = route.params || {};

  const { data: standard, isLoading } = useQuery({
    queryKey: ['certificationStandard', certificationId],
    queryFn: async () => {
      // Mock implementation - replace with actual API call
      return {
        required_documents: [
          { name: 'Certificate of Origin', description: 'Certificate showing product origin', required: true },
          { name: 'Test Report', description: 'Laboratory test report', required: true },
          { name: 'Manufacturing Details', description: 'Manufacturing specifications', required: false },
        ] as IDocumentRequirement[],
      } as Standard;
    },
    enabled: !!certificationId,
  });  

  const handleNext = () => {
    navigation.navigate('ChoosePartner', {
      mainCategory,
      selectedType,
      productName,
      hsCode,
      description,
      documents: Object.values(uploadedFiles),
    });
  };

  const handlePickDocument = async (docName: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({});
      if (result.assets && result.assets.length > 0) {
        setUploadedFiles(prev => ({ ...prev, [docName]: result.assets?.[0] }));
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const renderChecklist = () => {
    if (isLoading) {
      return <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />;
    }

    if (!standard?.required_documents || standard.required_documents.length === 0) {
      return (
        <View style={[styles.heroCard, Shadows.sm]}>
          <LinearGradient
            colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#FFFFFF']}
            style={styles.heroCardInner}
          >
            <View style={styles.heroRow}>
              <View style={styles.heroIconWrap}>
                <Ionicons name="cloud-done-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>No specific documents required</Text>
                <Text style={styles.heroText}>
                  You can continue now and share any documents later if requested by the chosen partner.
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      );
    }

    return (
      <View style={[styles.heroCard, { padding: 16 }]}>
        <Text style={styles.checklistTitle}>Required Documents</Text>
        <Text style={styles.checklistSubtitle}>You can upload these now or provide them later. Uploading is optional at this stage.</Text>
        {standard.required_documents.map((doc: IDocumentRequirement) => {
          const isUploaded = uploadedFiles[doc.name];
          return (
            <View key={doc.name} style={styles.checklistItem}>
              <Ionicons name={isUploaded ? "checkmark-circle" : "ellipse-outline"} size={24} color={isUploaded ? colors.success : colors.textSecondary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.docName}>{doc.name} {!(doc.is_mandatory ?? doc.required) && <Text style={{color: colors.textSecondary}}>(Optional)</Text>}</Text>
                <Text style={styles.docDesc}>{doc.description}</Text>
              </View>
              {!isUploaded && (
                <Button title="Upload" onPress={() => handlePickDocument(doc.name)} size="sm" />
              )}
              {isUploaded && (
                 <TouchableOpacity onPress={() => setUploadedFiles(p => { const newP = {...p}; delete newP[doc.name]; return newP;})}>
                    <Ionicons name="close-circle" size={24} color={colors.error} />
                 </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    );
  };

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

      <ScrollView style={styles.contentContainer} contentContainerStyle={styles.content}>
        {renderChecklist()}
      </ScrollView>

      {/* Sticky Action Bar */}
      <View style={[styles.stickyFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button
          title="Proceed to Partner Selection"
          onPress={handleNext}
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
    contentContainer: { flex: 1 },
    content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 120 },
    heroCard: { borderRadius: 24, overflow: 'hidden', marginTop: 8, backgroundColor: isDark ? colors.bgCard : '#FFFFFF' },
    heroCardInner: { padding: 16, gap: 12 },
    heroRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    heroIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: `${colors.primary}18` },
    heroTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
    heroText: { fontSize: 13, lineHeight: 20, color: colors.textSecondary },
    noteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 16, backgroundColor: isDark ? 'rgba(0, 212, 255, 0.08)' : 'rgba(0, 212, 255, 0.12)' },
    noteText: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.textSecondary },
    checklistTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 4 },
    checklistSubtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 16 },
    checklistItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    docName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    docDesc: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    stickyFooter: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 20,
      paddingTop: 16,
      backgroundColor: isDark ? colors.bgDark : '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      ...Shadows.md,
    },
  });

export default UploadDocumentsScreen;
