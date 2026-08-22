import React, { useMemo } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import EmptyState from '../../components/common/EmptyState';
import { useDocuments } from '../../hooks/useDocuments';
import { openDocument } from '../../utils/documentDisplay';

const ShipmentDocumentsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { items: DOCS, loading, refreshing, error, refresh } = useDocuments('shipment');
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shipment Documents</Text>
        <TouchableOpacity onPress={() => Alert.alert('Upload', 'Upload new document')} style={styles.addBtn}>
          <Ionicons name="add" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
      <FlatList
        data={DOCS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState icon={error ? 'cloud-offline-outline' : 'boat-outline'} title={error ? 'Could not load' : 'No Shipment Documents'} subtitle={error ?? 'Shipment documents will appear here.'} />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
        renderItem={({ item }) => (
          <View style={[styles.docCard, Shadows.sm]}>
            <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.docCardInner}>
              <View style={[styles.docIcon, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name="document" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.docName}>{item.name}</Text>
                <Text style={styles.docMeta}>{item.size} • {item.date}</Text>
                {item.category && <Text style={styles.docCategory}>{item.category}</Text>}
              </View>
              <TouchableOpacity onPress={() => openDocument(item.id, item.name)} style={styles.downloadBtn}>
                <Ionicons name="download-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}
      />
      )}
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
    docCategory: { fontSize: 11, color: colors.primary, marginTop: 2 },
    downloadBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: `${colors.primary}15`, alignItems: 'center', justifyContent: 'center' },
  });

export default ShipmentDocumentsScreen;
