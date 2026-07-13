import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../hooks/useAuth';
import { useTheme, Shadows } from '../../theme';
import Button from '../../components/common/Button';

type Document = {
  uri: string;
  name: string;
  type?: string;
};

const ConsultantVerificationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const { user } = useAuth();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePickDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        multiple: true,
      });

      if (result.assets && result.assets.length > 0) {
        const newDocs = result.assets.map((file: any) => ({
          uri: file.uri,
          name: file.name,
          type: file.mimeType,
        }));
        setDocuments(prev => [...prev, ...newDocs]);
      }
    } catch (err) {
      console.error('Error picking documents:', err);
    }
  };

  const handleRemoveDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (documents.length === 0) {
      Alert.alert('No documents', 'Please upload at least one document.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Would call API in real app
      console.log('Submitting', documents.length, 'documents');
      Alert.alert('Success', 'Documents submitted for verification');
      setDocuments([]);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit documents');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Consultant Verification</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {user && (
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>
        )}

        <View style={[styles.card, Shadows.sm]}>
          <Text style={styles.cardTitle}>Upload Documents</Text>
          <Text style={styles.cardSubtitle}>
            Upload documents to verify your identity and qualifications
          </Text>

          <TouchableOpacity style={styles.uploadButton} onPress={handlePickDocuments}>
            <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
            <Text style={styles.uploadButtonText}>Select Documents</Text>
          </TouchableOpacity>

          {documents.length > 0 && (
            <View style={styles.fileList}>
              {documents.map((doc, index) => (
                <View key={index} style={styles.fileItem}>
                  <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />
                  <Text style={styles.fileName} numberOfLines={1}>{doc.name}</Text>
                  <TouchableOpacity onPress={() => handleRemoveDocument(index)}>
                    <Ionicons name="close-circle" size={22} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {documents.length > 0 && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Button
            title={isSubmitting ? 'Submitting...' : 'Submit for Verification'}
            onPress={handleSubmit}
            disabled={isSubmitting}
          />
        </View>
      )}
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
      backgroundColor: colors.bgCard 
    },
    backBtn: { 
      width: 40, 
      height: 40, 
      borderRadius: 20, 
      alignItems: 'center', 
      justifyContent: 'center', 
      marginRight: 12 
    },
    headerTitle: { 
      flex: 1, 
      fontSize: 18, 
      fontWeight: '700', 
      color: colors.textPrimary, 
      textAlign: 'center' 
    },
    content: { padding: 20 },
    userInfo: { marginBottom: 20 },
    userName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
    userEmail: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
    card: { 
      backgroundColor: colors.bgCard, 
      borderRadius: 16, 
      padding: 20, 
      marginBottom: 20 
    },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
    cardSubtitle: { 
      fontSize: 14, 
      color: colors.textSecondary, 
      marginTop: 8, 
      marginBottom: 20, 
      lineHeight: 20 
    },
    uploadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.primary,
      borderStyle: 'dashed',
      borderRadius: 12,
      paddingVertical: 24,
      backgroundColor: `${colors.primary}10`,
      gap: 8,
    },
    uploadButtonText: { 
      fontSize: 16, 
      fontWeight: '600', 
      color: colors.primary 
    },
    fileList: { marginTop: 20, gap: 8 },
    fileItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? colors.bgCardLight : '#F9FAFB',
      borderRadius: 8,
      padding: 12,
      gap: 8,
    },
    fileName: { 
      flex: 1, 
      color: colors.textPrimary,
      fontSize: 14,
    },
    footer: { 
      paddingHorizontal: 20, 
      paddingTop: 16, 
      borderTopWidth: 1, 
      borderTopColor: colors.border 
    },
  });

export default ConsultantVerificationScreen;
