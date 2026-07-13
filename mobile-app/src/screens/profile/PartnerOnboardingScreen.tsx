import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const PARTNER_TYPES = ['Certification Body (CB)', 'Testing Laboratory', 'Inspection Body (IB)'];

const PartnerOnboardingScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [partnerType, setPartnerType] = useState(PARTNER_TYPES[0]);
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const handleSubmit = async () => {
    if (!companyName || !contactName || !email || !phone) {
      Alert.alert('Missing Info', 'Please fill out all fields.');
      return;
    }
    
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);

    Alert.alert('Application Submitted', 'Thank you! Our partnership team will review your application and contact you shortly.', [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']}
          style={StyleSheet.absoluteFill}
        />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Partner Onboarding</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          
          <View style={styles.heroSection}>
            <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}15` }]}>
              <Ionicons name="business" size={32} color={colors.primary} />
            </View>
            <Text style={styles.heroTitle}>Grow with Sanyog</Text>
            <Text style={styles.heroSub}>Join our global network of compliance partners and access thousands of active applications.</Text>
          </View>

          <View style={[styles.formCard, Shadows.sm]}>
            <LinearGradient
              colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F8FAFC']}
              style={styles.formCardInner}
            >
              <Text style={styles.sectionLabel}>PARTNER TYPE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
                {PARTNER_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setPartnerType(type)}
                    style={[
                      styles.typeChip,
                      partnerType === type ? styles.typeChipActive : { borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border }
                    ]}
                  >
                    <Text style={[styles.typeText, partnerType === type && styles.typeTextActive]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Company / Lab Name *</Text>
                <TextInput
                  style={[styles.input, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border, color: colors.textPrimary }]}
                  placeholder="e.g. Sanyog Conformity Testing Labs"
                  placeholderTextColor={colors.textTertiary}
                  value={companyName}
                  onChangeText={setCompanyName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contact Person *</Text>
                <TextInput
                  style={[styles.input, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border, color: colors.textPrimary }]}
                  placeholder="John Doe"
                  placeholderTextColor={colors.textTertiary}
                  value={contactName}
                  onChangeText={setContactName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Business Email *</Text>
                <TextInput
                  style={[styles.input, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border, color: colors.textPrimary }]}
                  placeholder="john@lab.com"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number *</Text>
                <TextInput
                  style={[styles.input, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border, color: colors.textPrimary }]}
                  placeholder="+91 99999 99999"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>

            </LinearGradient>
          </View>

        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.submitBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.submitBtnText}>{loading ? 'Submitting...' : 'Apply for Partnership'}</Text>
              {!loading && <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const makeStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      justifyContent: 'space-between',
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? colors.bgCardLight : colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    content: { paddingHorizontal: 20, paddingBottom: 40 },
    heroSection: { alignItems: 'center', paddingVertical: 24 },
    iconWrap: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    heroTitle: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, marginBottom: 8 },
    heroSub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
    formCard: {
      borderRadius: BorderRadius.xl,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
    },
    formCardInner: { padding: 20 },
    sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.textTertiary, letterSpacing: 1, marginBottom: 12 },
    typeScroll: { marginBottom: 24 },
    typeChip: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: BorderRadius.lg,
      borderWidth: 1.5,
      marginRight: 10,
    },
    typeChipActive: { borderColor: colors.primary, backgroundColor: `${colors.primary}10` },
    typeText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
    typeTextActive: { color: colors.primary, fontWeight: '800' },
    inputGroup: { marginBottom: 16 },
    inputLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 },
    input: {
      borderWidth: 1,
      borderRadius: BorderRadius.md,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      backgroundColor: isDark ? colors.bgDark : '#FFFFFF',
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border,
      backgroundColor: isDark ? colors.bgCard : '#FFFFFF',
    },
    submitBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
    submitBtnGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 16,
    },
    submitBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  });

export default PartnerOnboardingScreen;
