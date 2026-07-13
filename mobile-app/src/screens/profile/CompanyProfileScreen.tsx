import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput , KeyboardAvoidingView, Platform} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const CompanyProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [editing, setEditing] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [gst, setGst] = useState('');
  const [cin, setCin] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [industry, setIndustry] = useState('');

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const renderField = (label: string, value: string, setter: (v: string) => void, icon: keyof typeof Ionicons.glyphMap) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.fieldWrapper, editing && styles.fieldWrapperActive]}>
        <Ionicons name={icon} size={16} color={colors.textTertiary} />
        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={setter}
          editable={editing}
          placeholderTextColor={colors.textTertiary}
        />
        {editing && <Ionicons name="pencil-outline" size={14} color={colors.primary} />}
      </View>
    </View>
  );

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
        <Text style={styles.headerTitle}>Company Profile</Text>
        <TouchableOpacity onPress={() => setEditing(!editing)} style={styles.editBtn}>
          <Ionicons name={editing ? 'close-outline' : 'create-outline'} size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <TouchableOpacity style={styles.logoWrapper} activeOpacity={editing ? 0.7 : 1}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.logoGradient}>
              <Text style={styles.logoInitials}>SCS</Text>
            </LinearGradient>
            {editing && (
              <View style={styles.editOverlay}>
                <Ionicons name="camera" size={18} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.logoName}>{companyName}</Text>
          <View style={[styles.verifiedBadge, { backgroundColor: `${colors.success}20` }]}>
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={[styles.verifiedText, { color: colors.success }]}>Verified Company</Text>
          </View>
        </View>

        <View style={[styles.formCard, Shadows.md]}>
          <LinearGradient
            colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
            style={styles.formCardInner}
          >
            <Text style={styles.sectionTitle}>Company Information</Text>
            {renderField('Company Name', companyName, setCompanyName, 'business-outline')}
            {renderField('GST Number', gst, setGst, 'card-outline')}
            {renderField('CIN Number', cin, setCin, 'document-outline')}
            {renderField('Industry Type', industry, setIndustry, 'layers-outline')}
          </LinearGradient>
        </View>

        <View style={[styles.formCard, Shadows.md]}>
          <LinearGradient
            colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
            style={styles.formCardInner}
          >
            <Text style={styles.sectionTitle}>Address Details</Text>
            {renderField('Street Address', address, setAddress, 'location-outline')}
            {renderField('City', city, setCity, 'pin-outline')}
            {renderField('State', state, setState, 'map-outline')}
            {renderField('Pincode', pincode, setPincode, 'navigate-outline')}
          </LinearGradient>
        </View>

        {editing && (
          <TouchableOpacity style={[styles.saveBtn, Shadows.md]} onPress={() => setEditing(false)} activeOpacity={0.85}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.saveBtnGradient}>
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

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
    editBtn: { padding: 8 },
    content: { paddingHorizontal: 20, paddingTop: 8 },
    logoSection: { alignItems: 'center', marginBottom: 24, gap: 10 },
    logoWrapper: { position: 'relative' },
    logoGradient: { width: 90, height: 90, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
    logoInitials: { fontSize: 28, fontWeight: '900', color: '#FFFFFF' },
    editOverlay: {
      position: 'absolute', bottom: 0, right: 0,
      width: 30, height: 30, borderRadius: 15,
      backgroundColor: colors.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    logoName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
    verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: BorderRadius.full },
    verifiedText: { fontSize: 12, fontWeight: '600' },
    formCard: {
      borderRadius: BorderRadius.lg, overflow: 'hidden',
      borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, marginBottom: 16,
    },
    formCardInner: { padding: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 16 },
    fieldGroup: { marginBottom: 16 },
    fieldLabel: { fontSize: 11, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
    fieldWrapper: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.bgCardLight,
      borderRadius: BorderRadius.md, borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
      paddingHorizontal: 14, paddingVertical: 12,
    },
    fieldWrapperActive: { borderColor: colors.primary },
    fieldInput: { flex: 1, fontSize: 14, color: colors.textPrimary, padding: 0 },
    saveBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: 8 },
    saveBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
    saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  });

export default CompanyProfileScreen;
