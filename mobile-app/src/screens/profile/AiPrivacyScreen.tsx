/**
 * Settings → AI Features & Privacy.
 *
 * Lets a user review the AI disclosure after first use, see their current
 * consent status (from the backend — authoritative), and allow or withdraw
 * consent. Withdrawing means the next AI use will show the disclosure again.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Spacing, Shadows } from '../../theme';
import Button from '../../components/common/Button';
import { useAiConsent } from '../../components/ai/AiConsentProvider';
import aiConsentService, { AiConsentStatus } from '../../services/aiConsentService';
import {
  AI_CONSENT_TITLE,
  AI_CONSENT_INTRO,
  AI_DATA_CATEGORIES,
  AI_CONSENT_PURPOSE,
  AI_CONSENT_NOTES,
  AI_PROVIDER_NAME,
} from '../../components/ai/consentContent';

type LoadState = 'loading' | 'ready' | 'error';

const AiPrivacyScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { invalidateConsentCache } = useAiConsent();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const [status, setStatus] = useState<AiConsentStatus | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoadState('loading');
    try {
      setStatus(await aiConsentService.getStatus());
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onAllow = useCallback(async () => {
    setBusy(true);
    try {
      const next = await aiConsentService.accept();
      invalidateConsentCache();
      setStatus(next);
    } catch {
      Alert.alert('Could not save', 'Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }, [invalidateConsentCache]);

  const onWithdraw = useCallback(() => {
    Alert.alert(
      'Withdraw AI consent?',
      'AI-powered features will ask for your permission again the next time you use them. The rest of the app is unaffected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              const next = await aiConsentService.withdraw();
              invalidateConsentCache();
              setStatus(next);
            } catch {
              Alert.alert('Could not save', 'Please check your connection and try again.');
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }, [invalidateConsentCache]);

  const isCurrent = status?.is_current === true;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Features & Privacy</Text>
        <View style={{ width: 40 }} />
      </View>

      {loadState === 'loading' && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {loadState === 'error' && (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.textTertiary} />
          <Text style={styles.errorText}>Couldn't load your AI settings.</Text>
          <Button title="Retry" variant="outline" onPress={load} />
        </View>
      )}

      {loadState === 'ready' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* Status card */}
          <View style={[styles.statusCard, Shadows.sm]}>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isCurrent ? colors.success : colors.textTertiary },
                ]}
              />
              <Text style={styles.statusLabel}>
                {isCurrent ? 'AI features are allowed' : 'AI features are off'}
              </Text>
            </View>
            <Text style={styles.statusMeta}>
              {isCurrent
                ? `You allowed AI processing by ${AI_PROVIDER_NAME}.`
                : 'You will be asked for permission the next time you use an AI feature.'}
            </Text>
            <Text style={styles.statusVersion}>
              Current terms version: {status?.current_version ?? '—'}
              {status?.version ? `  ·  You accepted: v${status.version}` : ''}
            </Text>
          </View>

          {/* Disclosure */}
          <Text style={styles.sectionHeader}>{AI_CONSENT_TITLE}</Text>
          <Text style={styles.intro}>{AI_CONSENT_INTRO}</Text>

          <Text style={styles.sectionLabel}>What is shared</Text>
          {AI_DATA_CATEGORIES.map((c) => (
            <View key={c.label} style={styles.catRow}>
              <View style={styles.catIcon}>
                <Ionicons name={c.icon as any} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.catLabel}>{c.label}</Text>
                <Text style={styles.catDetail}>{c.detail}</Text>
              </View>
            </View>
          ))}

          <Text style={styles.sectionLabel}>Why</Text>
          <Text style={styles.body}>{AI_CONSENT_PURPOSE}</Text>

          <View style={styles.notes}>
            {AI_CONSENT_NOTES.map((n, i) => (
              <View key={i} style={styles.noteRow}>
                <Ionicons name="ellipse" size={5} color={colors.textTertiary} style={{ marginTop: 8 }} />
                <Text style={styles.noteText}>{n}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.policyLink}
            onPress={() => navigation.navigate('PrivacyPolicy')}
            accessibilityRole="link"
          >
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
            <Text style={styles.policyLinkText}>Read the Privacy Policy</Text>
          </TouchableOpacity>

          {/* Actions */}
          <View style={styles.actions}>
            {isCurrent ? (
              <Button
                title="Withdraw consent"
                variant="outline"
                onPress={onWithdraw}
                loading={busy}
                disabled={busy}
                fullWidth
              />
            ) : (
              <Button title="Allow AI Features" onPress={onAllow} loading={busy} disabled={busy} fullWidth size="lg" />
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
};

const makeStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? colors.bgCardLight : colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
    errorText: { fontSize: 14, color: colors.textSecondary },
    content: { paddingHorizontal: 20, paddingTop: 8 },
    statusCard: {
      backgroundColor: colors.bgCard,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
      marginBottom: Spacing.xl,
    },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 6 },
    statusDot: { width: 10, height: 10, borderRadius: 5 },
    statusLabel: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
    statusMeta: { fontSize: 13, lineHeight: 19, color: colors.textSecondary, marginBottom: 8 },
    statusVersion: { fontSize: 12, color: colors.textTertiary },
    sectionHeader: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 6 },
    intro: { fontSize: 14, lineHeight: 21, color: colors.textSecondary, marginBottom: Spacing.lg },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.textTertiary,
      marginBottom: Spacing.sm,
      marginTop: Spacing.xs,
    },
    catRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md, alignItems: 'flex-start' },
    catIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: `${colors.primary}14`,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    catLabel: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
    catDetail: { fontSize: 13, lineHeight: 19, color: colors.textSecondary },
    body: { fontSize: 13, lineHeight: 20, color: colors.textSecondary, marginBottom: Spacing.md },
    notes: {
      marginTop: Spacing.xs,
      padding: Spacing.md,
      borderRadius: BorderRadius.lg,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
      gap: Spacing.sm,
    },
    noteRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
    noteText: { flex: 1, fontSize: 12.5, lineHeight: 19, color: colors.textSecondary },
    policyLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.lg },
    policyLinkText: { fontSize: 14, fontWeight: '600', color: colors.primary },
    actions: { marginTop: Spacing.xl },
  });

export default AiPrivacyScreen;
