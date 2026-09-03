/**
 * The shared AI consent/disclosure sheet — the ONE UI every AI entry point and
 * the Settings screen present. Plain-language, no pre-selected choice, decline
 * always visible, no dark patterns.
 */
import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Spacing, Shadows } from '../../theme';
import Button from '../common/Button';
import {
  AI_CONSENT_TITLE,
  AI_CONSENT_INTRO,
  AI_DATA_CATEGORIES,
  AI_CONSENT_PURPOSE,
  AI_CONSENT_NOTES,
  AI_CONSENT_ALLOW_LABEL,
  AI_CONSENT_DECLINE_LABEL,
} from './consentContent';

interface Props {
  visible: boolean;
  /** true while the accept POST is in flight — buttons disable, primary shows a spinner. */
  submitting?: boolean;
  onAllow: () => void;
  onDecline: () => void;
  onOpenPrivacyPolicy?: () => void;
}

const AiConsentSheet: React.FC<Props> = ({
  visible,
  submitting = false,
  onAllow,
  onDecline,
  onOpenPrivacyPolicy,
}) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={submitting ? undefined : onDecline}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
          <View style={styles.grabber} />

          <View style={styles.headerRow}>
            <View style={styles.iconBadge}>
              <Ionicons name="sparkles-outline" size={22} color={colors.primary} />
            </View>
            <Text style={styles.title} accessibilityRole="header">
              {AI_CONSENT_TITLE}
            </Text>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.intro}>{AI_CONSENT_INTRO}</Text>

            <Text style={styles.sectionLabel}>What is shared</Text>
            {AI_DATA_CATEGORIES.map((c) => (
              <View key={c.label} style={styles.catRow}>
                <View style={styles.catIcon}>
                  <Ionicons name={c.icon as any} size={18} color={colors.primary} />
                </View>
                <View style={styles.catText}>
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
                  <Ionicons
                    name="ellipse"
                    size={5}
                    color={colors.textTertiary}
                    style={{ marginTop: 8 }}
                  />
                  <Text style={styles.noteText}>{n}</Text>
                </View>
              ))}
            </View>

            {onOpenPrivacyPolicy && (
              <TouchableOpacity
                style={styles.policyLink}
                onPress={onOpenPrivacyPolicy}
                disabled={submitting}
                accessibilityRole="link"
              >
                <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
                <Text style={styles.policyLinkText}>Read the Privacy Policy</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <View style={styles.actions}>
            <Button
              title={AI_CONSENT_ALLOW_LABEL}
              onPress={onAllow}
              loading={submitting}
              disabled={submitting}
              fullWidth
              size="lg"
            />
            <TouchableOpacity
              style={styles.declineBtn}
              onPress={onDecline}
              disabled={submitting}
              accessibilityRole="button"
            >
              <Text style={styles.declineText}>{AI_CONSENT_DECLINE_LABEL}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const makeStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.bgCard,
      borderTopLeftRadius: BorderRadius['2xl'],
      borderTopRightRadius: BorderRadius['2xl'],
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.md,
      maxHeight: '90%',
      ...Shadows.lg,
    },
    grabber: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)',
      marginBottom: Spacing.md,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
    iconBadge: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: `${colors.primary}1A`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    scroll: { flexGrow: 0 },
    scrollContent: { paddingBottom: Spacing.md },
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
    catText: { flex: 1 },
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
    actions: { marginTop: Spacing.lg, gap: Spacing.sm },
    declineBtn: { alignItems: 'center', paddingVertical: Spacing.md },
    declineText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  });

export default AiConsentSheet;
