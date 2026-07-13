import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import EmptyState from '../../components/common/EmptyState';

const DOCS: any[] = [];

const ProductDocumentsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => { setRefreshing(true); await new Promise(r => setTimeout(r, 800)); setRefreshing(false); };
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Documents</Text>
        <TouchableOpacity onPress={() => Alert.alert('Upload', 'Upload new document')} style={styles.addBtn}>
          <Ionicons name="add" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={DOCS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState icon="cube-outline" title="No Product Documents" subtitle="Upload product documents to continue." />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        renderItem={({ item }) => (
          <View style={[styles.docCard, Shadows.sm]}>
            <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.docCardInner}>
              <View style={[styles.docIcon, { backgroundColor: item.status === 'uploaded' ? `${colors.primary}20` : `${colors.error}20` }]}>
                <Ionicons name="document" size={22} color={item.status === 'uploaded' ? colors.primary : colors.error} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.docName}>{item.name}</Text>
                {item.size ? <Text style={styles.docMeta}>{item.size} • {item.date}</Text> : <Text style={[styles.docMeta, { color: colors.error }]}>Document missing</Text>}
              </View>
              {item.status === 'missing' ? (
                <TouchableOpacity onPress={() => Alert.alert('Upload', `Upload ${item.name}`)} style={[styles.uploadBtn, { backgroundColor: `${colors.primary}20` }]}>
                  <Ionicons name="cloud-upload-outline" size={16} color={colors.primary} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => Alert.alert('Download', `Download ${item.name}`)} style={[styles.uploadBtn, { backgroundColor: `${colors.success}20` }]}>
                  <Ionicons name="download-outline" size={16} color={colors.success} />
                </TouchableOpacity>
              )}
            </LinearGradient>
          </View>
        )}
      />
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? colors.bgCardLight : colors.border, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    addBtn: { padding: 8 },
    listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
    docCard: { marginBottom: 10, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    docCardInner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
    docIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    docName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
    docMeta: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    uploadBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  });

export default ProductDocumentsScreen;
