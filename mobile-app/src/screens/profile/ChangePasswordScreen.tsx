import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const ChangePasswordScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const strength = newPass.length === 0 ? 0 : newPass.length < 6 ? 1 : newPass.length < 10 ? 2 : 3;
  const strengthColors = ['', colors.error, colors.warning, colors.success];
  const strengthLabels = ['', 'Weak', 'Medium', 'Strong'];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Change Password</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={[styles.formCard, Shadows.md]}>
            <LinearGradient
              colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
              style={styles.formCardInner}
            >
              {[
                { label: 'Current Password', value: current, setter: setCurrent, show: showCurrent, toggle: () => setShowCurrent(!showCurrent) },
                { label: 'New Password', value: newPass, setter: setNewPass, show: showNew, toggle: () => setShowNew(!showNew) },
                { label: 'Confirm New Password', value: confirm, setter: setConfirm, show: showConfirm, toggle: () => setShowConfirm(!showConfirm) },
              ].map((field, i) => (
                <View key={i} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} />
                    <TextInput
                      style={styles.input}
                      value={field.value}
                      onChangeText={field.setter}
                      secureTextEntry={!field.show}
                      placeholderTextColor={colors.textTertiary}
                      placeholder={field.label}
                    />
                    <TouchableOpacity onPress={field.toggle}>
                      <Ionicons name={field.show ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textTertiary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {newPass.length > 0 && (
                <View style={styles.strengthSection}>
                  <View style={styles.strengthBars}>
                    {[1, 2, 3].map((level) => (
                      <View key={level} style={[styles.strengthBar, { backgroundColor: strength >= level ? strengthColors[strength] : colors.bgCardLight }]} />
                    ))}
                  </View>
                  <Text style={[styles.strengthLabel, { color: strengthColors[strength] }]}>
                    {strengthLabels[strength]}
                  </Text>
                </View>
              )}

              <View style={styles.requirementsSection}>
                <Text style={styles.requirementsTitle}>Password Requirements</Text>
                {['Minimum 8 characters', 'One uppercase letter', 'One lowercase letter', 'One number or special character'].map((req) => (
                  <View key={req} style={styles.reqRow}>
                    <Ionicons name="checkmark-circle-outline" size={14} color={colors.textTertiary} />
                    <Text style={styles.reqText}>{req}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          </View>

          <TouchableOpacity style={[styles.updateBtn, Shadows.md]} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.updateBtnGradient}>
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              <Text style={styles.updateBtnText}>Update Password</Text>
            </LinearGradient>
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
    formCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, marginBottom: 20 },
    formCardInner: { padding: 20 },
    fieldGroup: { marginBottom: 16 },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.bgCardLight, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border, paddingHorizontal: 14, paddingVertical: 12 },
    input: { flex: 1, fontSize: 14, color: colors.textPrimary, padding: 0 },
    strengthSection: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    strengthBars: { flexDirection: 'row', gap: 4, flex: 1 },
    strengthBar: { flex: 1, height: 4, borderRadius: 2 },
    strengthLabel: { fontSize: 12, fontWeight: '600' },
    requirementsSection: { paddingTop: 16, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    requirementsTitle: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 10 },
    reqRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    reqText: { fontSize: 12, color: colors.textTertiary },
    updateBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
    updateBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
    updateBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  });

export default ChangePasswordScreen;
