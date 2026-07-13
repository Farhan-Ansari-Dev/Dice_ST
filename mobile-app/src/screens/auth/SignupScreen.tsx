import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const SignupScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const renderInput = (
    label: string,
    value: string,
    setter: (v: string) => void,
    icon: keyof typeof Ionicons.glyphMap,
    placeholder: string,
    options?: { secure?: boolean; showToggle?: boolean; onToggle?: () => void; keyboardType?: any }
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputWrapper}>
        <Ionicons name={icon} size={18} color={colors.textTertiary} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={setter}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry={options?.secure}
          keyboardType={options?.keyboardType}
          autoCapitalize={options?.secure ? 'none' : 'words'}
        />
        {options?.showToggle && (
          <TouchableOpacity onPress={options.onToggle}>
            <Ionicons name={options?.secure ? 'eye-outline' : 'eye-off-outline'} size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

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
          <Text style={styles.headerTitle}>Create Account</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.logoArea}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.logoGradient}>
              <Ionicons name="shield-checkmark" size={36} color="#FFFFFF" />
            </LinearGradient>
            <Text style={styles.subtitle}>Join Sanyog Conformity Solutions</Text>
          </View>

          <View style={[styles.formCard, Shadows.md]}>
            <LinearGradient
              colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
              style={styles.formCardInner}
            >
              {renderInput('Full Name', fullName, setFullName, 'person-outline', 'Enter your full name')}
              {renderInput('Email Address', email, setEmail, 'mail-outline', 'Enter your email', { keyboardType: 'email-address' })}
              {renderInput('Phone Number', phone, setPhone, 'call-outline', '+91 98765 43210', { keyboardType: 'phone-pad' })}
              {renderInput('Company Name', company, setCompany, 'business-outline', 'Your company name')}
              {renderInput('Password', password, setPassword, 'lock-closed-outline', 'Create a password', {
                secure: !showPassword,
                showToggle: true,
                onToggle: () => setShowPassword(!showPassword),
              })}
              {renderInput('Confirm Password', confirmPassword, setConfirmPassword, 'lock-closed-outline', 'Confirm your password', {
                secure: !showConfirm,
                showToggle: true,
                onToggle: () => setShowConfirm(!showConfirm),
              })}
            </LinearGradient>
          </View>

          <TouchableOpacity
            style={[styles.createBtn, Shadows.md]}
            onPress={() => navigation.navigate('UserTypeSelection')}
            activeOpacity={0.85}
          >
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.createBtnGradient}>
              <Text style={styles.createBtnText}>Create Account</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      gap: 12,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? colors.bgCardLight : colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
    content: { paddingHorizontal: 20, paddingTop: 8 },
    logoArea: { alignItems: 'center', marginBottom: 24, gap: 12 },
    logoGradient: {
      width: 72,
      height: 72,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 10,
    },
    subtitle: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
    formCard: {
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
      marginBottom: 20,
    },
    formCardInner: { padding: 20, gap: 4 },
    inputGroup: { marginBottom: 16 },
    inputLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.bgCardLight,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 10,
    },
    inputIcon: {},
    input: { flex: 1, fontSize: 14, color: colors.textPrimary, padding: 0 },
    createBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: 20 },
    createBtnGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      gap: 8,
    },
    createBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
    loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    loginText: { fontSize: 14, color: colors.textSecondary },
    loginLink: { fontSize: 14, color: colors.primary, fontWeight: '700' },
  });

export default SignupScreen;
