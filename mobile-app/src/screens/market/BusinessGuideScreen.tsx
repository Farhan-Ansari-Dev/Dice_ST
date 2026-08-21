import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme, Typography, Shadows, BorderRadius, Spacing } from '../../theme';
import opportunitiesService, { BusinessGuide } from '../../services/opportunitiesService';

export default function BusinessGuideScreen() {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  // The guide may arrive already populated (from the opportunity object), or as
  // an id to fetch. Never fabricated — a missing guide shows an honest state.
  const paramGuide: BusinessGuide | null = route.params?.guide ?? null;
  const guideId: string | undefined =
    route.params?.guideId ?? (typeof route.params?.guide === 'string' ? route.params.guide : paramGuide?._id);

  const [guide, setGuide] = useState<BusinessGuide | null>(paramGuide && typeof paramGuide === 'object' ? paramGuide : null);
  const [loading, setLoading] = useState(!guide && !!guideId);

  useEffect(() => {
    let active = true;
    if (!guide && guideId) {
      setLoading(true);
      opportunitiesService.getGuide(guideId).then((g) => {
        if (active) {
          setGuide(g);
          setLoading(false);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [guide, guideId]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.glassBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Business Guide</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : !guide ? (
        <View style={styles.center}>
          <Ionicons name="document-text-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>Guide currently unavailable</Text>
          <Text style={styles.emptySub}>
            A detailed business guide for this opportunity hasn’t been published yet. You can still apply and our team
            will guide you through the requirements.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{guide.title}</Text>
          {guide.content ? <Text style={styles.body}>{guide.content}</Text> : null}

          {guide.faqs && guide.faqs.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>FAQs</Text>
              {guide.faqs.map((f, i) => (
                <View key={i} style={styles.faq}>
                  <Text style={styles.faqQ}>{f.question}</Text>
                  <Text style={styles.faqA}>{f.answer}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {guide.downloads && guide.downloads.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Downloads</Text>
              {guide.downloads.map((d, i) => (
                <TouchableOpacity key={i} style={styles.download} onPress={() => d.url && Linking.openURL(d.url)}>
                  <Ionicons name="download-outline" size={18} color={colors.primary} />
                  <Text style={styles.downloadText}>{d.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#0A0A0A' : '#F7F9FC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border },
  glassBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...Typography.h4, color: colors.textPrimary, flex: 1, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  content: { padding: Spacing.xl },
  title: { ...Typography.h2, color: colors.textPrimary, marginBottom: Spacing.md },
  body: { ...Typography.body1, color: colors.textSecondary, lineHeight: 24 },
  section: { marginTop: Spacing.xl },
  sectionTitle: { ...Typography.h4, color: colors.textPrimary, marginBottom: Spacing.md },
  faq: { backgroundColor: colors.bgCard, padding: Spacing.lg, borderRadius: BorderRadius.lg, marginBottom: Spacing.sm, ...Shadows.sm },
  faqQ: { ...Typography.body2, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  faqA: { ...Typography.body2, color: colors.textSecondary, lineHeight: 20 },
  download: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: colors.bgCard, padding: Spacing.md, borderRadius: BorderRadius.lg, marginBottom: Spacing.sm },
  downloadText: { ...Typography.body2, color: colors.primary, fontWeight: '600' },
  emptyTitle: { ...Typography.h4, color: colors.textPrimary, marginTop: Spacing.md },
  emptySub: { ...Typography.body2, color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 22 },
});
