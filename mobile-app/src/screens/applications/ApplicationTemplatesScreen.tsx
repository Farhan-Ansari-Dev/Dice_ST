import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

interface AppTemplate {
  id: string;
  name: string;
  certType: string;
  lastUsed: string;
  usageCount: number;
  gradient: [string, string];
  icon: keyof typeof Ionicons.glyphMap;
}

const INITIAL_TEMPLATES: AppTemplate[] = [];

const ApplicationTemplatesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [templates, setTemplates] = useState(INITIAL_TEMPLATES);

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const handleUseTemplate = (template: AppTemplate) => {
    navigation.navigate('NewApplication', {
      templateId: template.id,
      certType: template.certType,
      templateName: template.name,
      prefilled: true,
    });
  };

  const handleDelete = (template: AppTemplate) => {
    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete "${template.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => setTemplates((prev) => prev.filter((t) => t.id !== template.id)),
        },
      ]
    );
  };

  const handleNewTemplate = () => {
    Alert.alert(
      'Save as Template',
      'This will save your current application data as a reusable template.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: () => {
            const newTemplate: AppTemplate = {
              id: Date.now().toString(),
              name: 'New Template',
              certType: 'BIS IS 13252',
              lastUsed: 'Just now',
              usageCount: 0,
              gradient: ['#6C63FF', '#4ECDC4'],
              icon: 'document-outline',
            };
            setTemplates((prev) => [newTemplate, ...prev]);
            Alert.alert('Saved', 'Template saved successfully.');
          },
        },
      ]
    );
  };

  const renderTemplate = ({ item }: { item: AppTemplate }) => (
    <TouchableOpacity
      style={[styles.templateCard, Shadows.sm]}
      onLongPress={() => handleDelete(item)}
      activeOpacity={0.85}
    >
      <LinearGradient
        colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
        style={styles.templateCardInner}
      >
        <View style={styles.cardLeft}>
          <LinearGradient colors={item.gradient} style={styles.templateIcon}>
            <Ionicons name={item.icon} size={22} color="#FFFFFF" />
          </LinearGradient>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.templateName}>{item.name}</Text>
          <Text style={styles.templateCert}>{item.certType}</Text>
          <View style={styles.templateMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={11} color={colors.textTertiary} />
              <Text style={styles.metaText}>{item.lastUsed}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="repeat-outline" size={11} color={colors.textTertiary} />
              <Text style={styles.metaText}>Used {item.usageCount}×</Text>
            </View>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.useBtn, { backgroundColor: `${item.gradient[0]}20` }]}
            onPress={() => handleUseTemplate(item)}
          >
            <Text style={[styles.useBtnText, { color: item.gradient[0] }]}>Use</Text>
            <Ionicons name="arrow-forward" size={13} color={item.gradient[0]} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

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
        <Text style={styles.headerTitle}>Application Templates</Text>
        <TouchableOpacity style={styles.addBtn} onPress={handleNewTemplate}>
          <Ionicons name="add" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="information-circle-outline" size={14} color={colors.textTertiary} />
        <Text style={styles.infoText}>Long-press a template to delete it</Text>
      </View>

      <FlatList
        data={templates}
        keyExtractor={(item) => item.id}
        renderItem={renderTemplate}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="document-outline" size={56} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No Templates Yet</Text>
            <Text style={styles.emptySubtitle}>Tap + to save an application as a template.</Text>
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity style={[styles.newTemplateBtn, Shadows.sm]} onPress={handleNewTemplate}>
            <LinearGradient
              colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
              style={styles.newTemplateBtnInner}
            >
              <View style={styles.newTemplateIcon}>
                <Ionicons name="add" size={22} color={colors.primary} />
              </View>
              <Text style={styles.newTemplateBtnText}>Save Current as Template</Text>
            </LinearGradient>
          </TouchableOpacity>
        }
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
    addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: `${colors.primary}20`, alignItems: 'center', justifyContent: 'center' },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, marginBottom: 12 },
    infoText: { fontSize: 12, color: colors.textTertiary },
    listContent: { paddingHorizontal: 20 },
    templateCard: {
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
      marginBottom: 12,
    },
    templateCardInner: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
    cardLeft: {},
    templateIcon: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    cardBody: { flex: 1 },
    templateName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 3 },
    templateCert: { fontSize: 12, color: colors.textTertiary, marginBottom: 8 },
    templateMeta: { flexDirection: 'row', gap: 12 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 11, color: colors.textTertiary },
    cardActions: { alignItems: 'flex-end', gap: 8 },
    useBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full },
    useBtnText: { fontSize: 12, fontWeight: '700' },
    deleteBtn: { padding: 4 },
    emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    emptySubtitle: { fontSize: 14, color: colors.textTertiary, textAlign: 'center' },
    newTemplateBtn: {
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.primary,
      marginTop: 4,
      marginBottom: 100,
    },
    newTemplateBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
    newTemplateIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: `${colors.primary}15`, alignItems: 'center', justifyContent: 'center' },
    newTemplateBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  });

export default ApplicationTemplatesScreen;
