import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/common/ToastProvider';
import leadsService from '../../services/leadsService';

const STEPS = [
  { icon: 'person-outline', text: 'Your request goes to a Sanyog certification manager.' },
  { icon: 'document-text-outline', text: 'They confirm the exact requirements and documents for your product and market.' },
  { icon: 'navigate-outline', text: 'You are guided through submission and can track progress from My Work.' },
];

const ServiceDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const { user } = useAuthStore();
  const { showToast } = useToast();

  const name: string = route.params?.name ?? 'Service';
  const category: string = route.params?.category ?? '';
  const [submitting, setSubmitting] = useState(false);

  const handleApply = async () => {
    if (!user?.email) {
      showToast('Sign in required', 'Please sign in before applying.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await leadsService.create({
        serviceId: name.replace(/[^A-Za-z0-9]+/g, '_').toUpperCase(),
        serviceName: name,
        contactName: user.name ?? user.email.split('@')[0],
        contactEmail: user.email,
        contactPhone: user.phone,
        companyName: user.companyName,
        source: 'services_directory',
        notes: `Service enquiry from the Services directory: ${name}${category ? ` (${category})` : ''}.`,
      });
      showToast('Request submitted', 'Our team will reach out with the next steps.', 'success');
      navigation.goBack();
    } catch (err: any) {
      showToast('Could not submit', err?.response?.data?.message ?? 'Please check your connection and try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8} disabled={submitting}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          {!!category && <Text style={styles.eyebrow}>{category.toUpperCase()}</Text>}
          <Text style={styles.title} numberOfLines={2}>{name}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}>
        <View style={styles.card}>
          <Text style={styles.brief}>
            Apply to start your {name} process with Sanyog. Our certification team confirms the exact
            requirements for your product and target market, tells you which documents you need, and
            manages the process end to end.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>What happens after you apply</Text>
        <View style={styles.card}>
          {STEPS.map((s, i) => (
            <View key={i} style={[styles.step, i < STEPS.length - 1 && styles.stepDivider]}>
              <View style={styles.stepIcon}>
                <Ionicons name={s.icon as any} size={18} color={colors.primary} />
              </View>
              <Text style={styles.stepText}>{s.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.noteRow}>
          <Ionicons name="lock-closed-outline" size={13} color={colors.textTertiary} />
          <Text style={styles.noteText}>Applying submits your account details to Sanyog’s team — no upfront documents needed.</Text>
        </View>
      </ScrollView>

      <View style={[styles.applyBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity style={[styles.applyBtn, submitting && { opacity: 0.7 }]} onPress={handleApply} disabled={submitting} activeOpacity={0.9}>
          {submitting ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <>
              <Ionicons name="paper-plane-outline" size={18} color={colors.textInverse} />
              <Text style={styles.applyText}>Apply</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1, color: colors.primary, marginBottom: 3 },
    title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
    card: { backgroundColor: colors.bgCard, borderRadius: BorderRadius.base, borderWidth: 1, borderColor: colors.border, padding: 20, marginTop: 16, ...Shadows.sm },
    brief: { fontSize: 14, lineHeight: 21, color: colors.textSecondary },
    sectionLabel: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginTop: 24, marginBottom: 2 },
    step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
    stepDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    stepIcon: { width: 34, height: 34, borderRadius: BorderRadius.md, backgroundColor: `${colors.primary}14`, alignItems: 'center', justifyContent: 'center' },
    stepText: { fontSize: 13, lineHeight: 19, color: colors.textPrimary, flex: 1, paddingTop: 6 },
    noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 20, paddingHorizontal: 2 },
    noteText: { fontSize: 11, color: colors.textTertiary, flex: 1, lineHeight: 16 },
    applyBar: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingTop: 12, paddingHorizontal: 20, backgroundColor: isDark ? 'rgba(10,11,15,0.92)' : 'rgba(240,242,248,0.92)', borderTopWidth: 1, borderTopColor: colors.border },
    applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: BorderRadius.base, backgroundColor: colors.primary, alignSelf: 'stretch', maxWidth: 320, ...Shadows.sm },
    applyText: { fontSize: 16, fontWeight: '700', color: colors.textInverse },
  });

export default ServiceDetailScreen;
