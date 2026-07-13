import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, Alert , KeyboardAvoidingView, Platform} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const REASONS = ['No longer need the service', 'Switching to competitor', 'Too expensive', 'Missing features', 'Privacy concerns', 'Other'];

const DeleteAccountScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Account',
      'This action is PERMANENT and cannot be undone. All your data will be deleted immediately.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Forever', style: 'destructive', onPress: () => navigation.navigate('Login') },
      ]
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delete Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Warning */}
        <View style={[styles.warningCard, { backgroundColor: `${colors.error}15`, borderColor: `${colors.error}40` }]}>
          <View style={styles.warningHeader}>
            <Ionicons name="warning" size={28} color={colors.error} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.warningTitle, { color: colors.error }]}>Permanent Action</Text>
              <Text style={[styles.warningSubtitle, { color: colors.error }]}>This cannot be undone</Text>
            </View>
          </View>
          <Text style={styles.warningBody}>
            Deleting your account will permanently remove all your data including certifications, documents, applications, payment history, and AI insights. Your active applications will be cancelled.
          </Text>
        </View>

        {/* What you'll lose */}
        <View style={[styles.loseCard, Shadows.sm]}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.loseCardInner}>
            <Text style={styles.loseTitle}>You will permanently lose:</Text>
            {['12 active certifications', '5 in-progress applications', 'All uploaded documents', 'Payment history & invoices', 'AI-generated insights', 'Team member access'].map((item) => (
              <View key={item} style={styles.loseRow}>
                <Ionicons name="close-circle" size={16} color={colors.error} />
                <Text style={styles.loseItem}>{item}</Text>
              </View>
            ))}
          </LinearGradient>
        </View>

        {/* Reason */}
        <View style={[styles.formCard, Shadows.sm]}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.formCardInner}>
            <Text style={styles.fieldLabel}>Reason for Leaving</Text>
            <View style={styles.reasonsList}>
              {REASONS.map((r) => (
                <TouchableOpacity key={r} style={[styles.reasonItem, reason === r && { borderColor: colors.error }]} onPress={() => setReason(r)}>
                  <View style={[styles.radioCircle, reason === r && { backgroundColor: colors.error, borderColor: colors.error }]}>
                    {reason === r && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
                  </View>
                  <Text style={styles.reasonText}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Confirm Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="Enter your password"
                placeholderTextColor={colors.textTertiary}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.confirmRow} onPress={() => setConfirmed(!confirmed)}>
              <View style={[styles.checkbox, confirmed && { backgroundColor: colors.error, borderColor: colors.error }]}>
                {confirmed && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
              </View>
              <Text style={styles.confirmText}>I understand this is permanent and cannot be reversed</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        <TouchableOpacity
          style={[styles.deleteBtn, (!confirmed || !password || !reason) && styles.deleteBtnDisabled]}
          onPress={handleDelete}
          disabled={!confirmed || !password || !reason}
          activeOpacity={0.85}
        >
          <View style={[styles.deleteBtnInner, { backgroundColor: confirmed && password && reason ? colors.error : colors.bgCardLight }]}>
            <Ionicons name="trash" size={18} color={confirmed && password && reason ? '#FFFFFF' : colors.textTertiary} />
            <Text style={[styles.deleteBtnText, { color: confirmed && password && reason ? '#FFFFFF' : colors.textTertiary }]}>
              Delete My Account
            </Text>
          </View>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
    </KeyboardAvoidingView>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? colors.bgCardLight : colors.border, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    content: { paddingHorizontal: 20, paddingTop: 8 },
    warningCard: { borderRadius: BorderRadius.lg, borderWidth: 1.5, padding: 16, marginBottom: 16 },
    warningHeader: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 12 },
    warningTitle: { fontSize: 16, fontWeight: '800' },
    warningSubtitle: { fontSize: 12, opacity: 0.8 },
    warningBody: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
    loseCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, marginBottom: 16 },
    loseCardInner: { padding: 16 },
    loseTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
    loseRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    loseItem: { fontSize: 13, color: colors.textSecondary },
    formCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, marginBottom: 20 },
    formCardInner: { padding: 16 },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
    reasonsList: { gap: 8 },
    reasonItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border },
    radioCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    reasonText: { fontSize: 13, color: colors.textPrimary },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.bgCardLight, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border, paddingHorizontal: 14, paddingVertical: 12 },
    input: { flex: 1, fontSize: 14, color: colors.textPrimary, padding: 0 },
    confirmRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 16 },
    checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
    confirmText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
    deleteBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
    deleteBtnDisabled: { opacity: 0.6 },
    deleteBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: BorderRadius.lg },
    deleteBtnText: { fontSize: 16, fontWeight: '700' },
  });

export default DeleteAccountScreen;
