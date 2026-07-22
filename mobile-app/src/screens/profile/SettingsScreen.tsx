import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import authService from '../../services/authService';
import Avatar from '../../components/common/Avatar';
import { useAuthStore } from '../../store/authStore';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user, updateUser, setUser } = useAuthStore();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [email, setEmail] = useState(user?.email ?? '');
  const [companyName, setCompanyName] = useState(user?.companyName ?? '');
  const [gstNumber, setGstNumber] = useState(user?.gstNumber ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [state, setState] = useState(user?.state ?? '');
  const [loading, setLoading] = useState(false);

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      updateUser({ avatar: result.assets[0].uri });
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access in Settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      updateUser({ avatar: result.assets[0].uri });
    }
  };

  const handleChangePhoto = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose from Library', 'Remove Photo'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 3,
        },
        (index) => {
          if (index === 1) takePhoto();
          else if (index === 2) pickFromLibrary();
          else if (index === 3) updateUser({ avatar: undefined });
        }
      );
    } else {
      Alert.alert('Change Photo', 'Choose an option', [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickFromLibrary },
        { text: 'Remove Photo', style: 'destructive', onPress: () => updateUser({ avatar: undefined }) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  // Previously this faked a save: an 800ms setTimeout followed by a local-only
  // updateUser(), so nothing ever reached the server and the change was lost on
  // the next profile refresh.
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your full name.');
      return;
    }
    setLoading(true);
    try {
      const updated = await authService.updateProfile({ name: name.trim(), companyName, gstNumber });
      setUser(updated);
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (err: any) {
      Alert.alert('Could not save', err?.response?.data?.message ?? 'Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Phone number change (verified by OTP to the new number) ──────────────
  const handleSendPhoneOtp = async () => {
    const trimmed = phone.replace(/[\s()-]/g, '').trim();
    if (!/^\+?[1-9]\d{7,14}$/.test(trimmed)) {
      Alert.alert('Invalid number', 'Enter a valid phone number including the country code, e.g. +919876543210.');
      return;
    }
    setPhoneBusy(true);
    try {
      await authService.sendPhoneOtp(trimmed);
      setPhoneOtpSent(true);
      Alert.alert('Code sent', `We sent a 6-digit code to ${trimmed}.`);
    } catch (err: any) {
      Alert.alert('Could not send code', err?.response?.data?.message ?? 'Please try again shortly.');
    } finally {
      setPhoneBusy(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (phoneOtp.trim().length !== 6) {
      Alert.alert('Enter the code', 'The verification code is 6 digits.');
      return;
    }
    setPhoneBusy(true);
    try {
      const updated = await authService.verifyPhoneOtp(phoneOtp.trim());
      setUser(updated);
      setPhoneOtpSent(false);
      setPhoneOtp('');
      setEditingPhone(false);
      Alert.alert('Phone updated', 'Your phone number has been verified and saved.');
    } catch (err: any) {
      Alert.alert('Verification failed', err?.response?.data?.message ?? 'That code is not correct.');
    } finally {
      setPhoneBusy(false);
    }
  };

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <Avatar name={user?.name ?? 'User'} uri={user?.avatar} size="xl" />
          <TouchableOpacity style={styles.changePhotoBtn} onPress={handleChangePhoto}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.changePhotoBtnGradient}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.changePhotoText}>Change Photo</Text>
        </View>

        {/* Personal Info */}
        <View style={[styles.section, Shadows.sm]}>
          <LinearGradient
            colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
            style={styles.sectionInner}
          >
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <Input label="Full Name" value={name} onChangeText={setName} placeholder="Your full name" leftIcon={<Ionicons name="person-outline" size={18} color={colors.textTertiary} />} required />
            <Input label="Email Address" value={email} onChangeText={setEmail} placeholder="your@email.com" keyboardType="email-address" leftIcon={<Ionicons name="mail-outline" size={18} color={colors.textTertiary} />} />
            <Input
              label="Phone Number"
              value={phone}
              onChangeText={(v) => { setPhone(v); setEditingPhone(true); setPhoneOtpSent(false); }}
              placeholder="+919876543210"
              keyboardType="phone-pad"
              leftIcon={<Ionicons name="phone-portrait-outline" size={18} color={colors.textTertiary} />}
              hint={user?.phone ? 'Changing this requires verifying the new number' : 'Add a number to enable SMS alerts'}
            />

            {editingPhone && phone.trim() !== (user?.phone ?? '') && (
              <View style={{ gap: 10, marginTop: 4 }}>
                {!phoneOtpSent ? (
                  <Button
                    title={phoneBusy ? 'Sending…' : 'Send verification code'}
                    onPress={handleSendPhoneOtp}
                    disabled={phoneBusy}
                    variant="outline"
                  />
                ) : (
                  <>
                    <Input
                      label="Verification code"
                      value={phoneOtp}
                      onChangeText={setPhoneOtp}
                      placeholder="6-digit code"
                      keyboardType="number-pad"
                      maxLength={6}
                      leftIcon={<Ionicons name="keypad-outline" size={18} color={colors.textTertiary} />}
                    />
                    <Button
                      title={phoneBusy ? 'Verifying…' : 'Verify & save number'}
                      onPress={handleVerifyPhoneOtp}
                      disabled={phoneBusy}
                    />
                    <TouchableOpacity onPress={handleSendPhoneOtp} disabled={phoneBusy}>
                      <Text style={{ color: colors.primary, fontSize: 12, textAlign: 'center' }}>Resend code</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </LinearGradient>
        </View>

        {/* Company Info */}
        <View style={[styles.section, Shadows.sm]}>
          <LinearGradient
            colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
            style={styles.sectionInner}
          >
            <Text style={styles.sectionTitle}>Company Information</Text>
            <Input label="Company Name" value={companyName} onChangeText={setCompanyName} placeholder="Your Company Pvt Ltd" leftIcon={<Ionicons name="business-outline" size={18} color={colors.textTertiary} />} required />
            <Input label="GST Number" value={gstNumber} onChangeText={setGstNumber} placeholder="27ABCDE1234F1Z5" autoCapitalize="characters" leftIcon={<Ionicons name="document-text-outline" size={18} color={colors.textTertiary} />} />
            <Input label="City" value={city} onChangeText={setCity} placeholder="Mumbai" leftIcon={<Ionicons name="location-outline" size={18} color={colors.textTertiary} />} />
            <Input label="State" value={state} onChangeText={setState} placeholder="Maharashtra" leftIcon={<Ionicons name="map-outline" size={18} color={colors.textTertiary} />} />
          </LinearGradient>
        </View>

        <Button title="Save Changes" onPress={handleSave} loading={loading} fullWidth size="lg" style={{ marginBottom: 20 }} />
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? colors.bgCardLight : colors.border, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary },
    content: { paddingHorizontal: 20, paddingTop: 8 },
    avatarSection: { alignItems: 'center', marginBottom: 28, position: 'relative' },
    changePhotoBtn: {
      position: 'absolute',
      bottom: 20,
      right: '35%',
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: colors.bgDark,
    },
    changePhotoBtnGradient: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
    changePhotoText: { fontSize: 12, color: colors.primary, fontWeight: '500', marginTop: 8 },
    section: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, marginBottom: 16 },
    sectionInner: { padding: 16 },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  });

export default SettingsScreen;
