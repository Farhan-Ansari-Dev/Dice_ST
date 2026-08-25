import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../../components/common/ToastProvider';
import authService from '../../services/authService';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../../utils/constants';

/**
 * Self-service account deletion (App Store 5.1.1(v)). Reachable directly from
 * Profile → Account & Security → Delete Account.
 *
 * Behaviour is honest and matches the backend DELETE /users/me:
 *   • Removes/anonymises the account and personal data (name, email, phone) and
 *     every auth secret + push registration; the session is invalidated at once.
 *   • Business/compliance records already created (applications, documents,
 *     certificates) may be RETAINED in de-identified form where Sanyog is
 *     legally required to keep them for regulatory/audit obligations — they are
 *     no longer linked to your identity.
 * No password is requested because DICE authenticates via Apple / Google /
 * Email OTP (there is no password login).
 */
const WHAT_HAPPENS = [
  { icon: 'person-remove-outline', text: 'Your profile and personal details (name, email, phone) are permanently removed or anonymised.' },
  { icon: 'log-out-outline', text: 'You are signed out on this device and your login stops working immediately.' },
  { icon: 'archive-outline', text: 'Compliance records already created (applications, documents, certificates) may be retained in de-identified form where regulations require, no longer linked to you.' },
  { icon: 'refresh-circle-outline', text: 'This cannot be undone. To use DICE again you would create a new account.' },
];

const DeleteAccountScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { logout } = useAuthStore();
  const { showToast } = useToast();
  const [confirmed, setConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  // Actually deletes the account on the backend, then clears the local session.
  const performAccountDeletion = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await authService.deleteAccount();
      // Drop the cached push token before logout so its unregister call has
      // nothing to send to the now-dead session (keeps sign-out instant).
      await SecureStore.deleteItemAsync(STORAGE_KEYS.PUSH_TOKEN).catch(() => {});
      showToast('Account deleted', 'Your account has been deleted successfully.', 'success');
      // Clears secure tokens + cached profile and resets auth state; the root
      // navigator reacts to isAuthenticated=false and returns to Login.
      await logout();
    } catch (e) {
      setDeleting(false);
      showToast('Deletion failed', 'Unable to delete your account. Check your connection and try again.', 'error');
    }
  };

  // Two explicit confirmations before anything is deleted.
  const confirmDelete = () => {
    if (deleting) return;
    Alert.alert(
      'Delete account?',
      'This permanently deletes your DICE account and personal data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performAccountDeletion },
      ],
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8} disabled={deleting}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delete Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Warning */}
        <View style={[styles.warningCard, { backgroundColor: `${colors.error}12`, borderColor: `${colors.error}40` }]}>
          <View style={styles.warningHeader}>
            <Ionicons name="warning" size={26} color={colors.error} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.warningTitle, { color: colors.error }]}>This is permanent</Text>
              <Text style={styles.warningSubtitle}>Deleting your account cannot be undone.</Text>
            </View>
          </View>
        </View>

        {/* What happens */}
        <Text style={styles.sectionLabel}>What happens when you delete</Text>
        <View style={styles.card}>
          {WHAT_HAPPENS.map((row, i) => (
            <View key={i} style={[styles.row, i < WHAT_HAPPENS.length - 1 && styles.rowDivider]}>
              <Ionicons name={row.icon as any} size={20} color={colors.textSecondary} style={{ marginTop: 1 }} />
              <Text style={styles.rowText}>{row.text}</Text>
            </View>
          ))}
        </View>

        {/* Confirm */}
        <TouchableOpacity style={styles.confirmRow} onPress={() => setConfirmed(!confirmed)} activeOpacity={0.7} disabled={deleting}>
          <View style={[styles.checkbox, confirmed && { backgroundColor: colors.error, borderColor: colors.error }]}>
            {confirmed && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
          </View>
          <Text style={styles.confirmText}>I understand this is permanent and cannot be reversed.</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.deleteBtn, { backgroundColor: confirmed && !deleting ? colors.error : colors.bgCardLight }]}
          onPress={confirmDelete}
          disabled={!confirmed || deleting}
          activeOpacity={0.85}
        >
          {deleting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={18} color={confirmed ? '#FFFFFF' : colors.textTertiary} />
              <Text style={[styles.deleteBtnText, { color: confirmed ? '#FFFFFF' : colors.textTertiary }]}>Delete my account</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footNote}>
          Need help instead? Contact Sanyog support from Profile → Help &amp; Support before deleting.
        </Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    content: { paddingHorizontal: 20, paddingTop: 8 },
    warningCard: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: 16, marginBottom: 8 },
    warningHeader: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    warningTitle: { fontSize: 16, fontWeight: '800' },
    warningSubtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 20, marginBottom: 10 },
    card: { backgroundColor: colors.bgCard, borderRadius: BorderRadius.base, borderWidth: 1, borderColor: colors.border, ...Shadows.sm },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 16 },
    rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    rowText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.textPrimary },
    confirmRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 20 },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.borderLight, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
    confirmText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
    deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: BorderRadius.base, marginTop: 20 },
    deleteBtnText: { fontSize: 16, fontWeight: '700' },
    footNote: { fontSize: 12, color: colors.textTertiary, textAlign: 'center', marginTop: 16, lineHeight: 18 },
  });

export default DeleteAccountScreen;
