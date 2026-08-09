import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '../../screens/profile/ProfileScreen';
import SettingsScreen from '../../screens/profile/SettingsScreen';
import CompanyProfileScreen from '../../screens/profile/CompanyProfileScreen';
import TeamMembersScreen from '../../screens/profile/TeamMembersScreen';
import RolesPermissionsScreen from '../../screens/profile/RolesPermissionsScreen';
import NotificationSettingsScreen from '../../screens/profile/NotificationSettingsScreen';
import SecuritySettingsScreen from '../../screens/profile/SecuritySettingsScreen';
import ChangePasswordScreen from '../../screens/profile/ChangePasswordScreen';
import DeviceSessionsScreen from '../../screens/profile/DeviceSessionsScreen';
import LanguageSettingsScreen from '../../screens/profile/LanguageSettingsScreen';
import ThemeSettingsScreen from '../../screens/profile/ThemeSettingsScreen';
import PrivacyPolicyScreen from '../../screens/profile/PrivacyPolicyScreen';
import TermsConditionsScreen from '../../screens/profile/TermsConditionsScreen';
import DeleteAccountScreen from '../../screens/profile/DeleteAccountScreen';
import AboutScreen from '../../screens/profile/AboutScreen';
import SupportCenterScreen from '../../screens/communication/SupportCenterScreen';
import LiveChatScreen from '../../screens/communication/LiveChatScreen';
import VideoConsultationScreen from '../../screens/communication/VideoConsultationScreen';
import RaiseTicketScreen from '../../screens/communication/RaiseTicketScreen';
import ChatListScreen from '../../screens/communication/ChatListScreen';
import GSTINLookupScreen from '../../screens/profile/GSTINLookupScreen';
import MCASearchScreen from '../../screens/profile/MCASearchScreen';
import ReferralScreen from '../../screens/profile/ReferralScreen';
import PartnerOnboardingScreen from '../../screens/profile/PartnerOnboardingScreen';
import VaultStackNavigator from '../../navigation/stacks/VaultStackNavigator';
import ConsultantVerificationScreen from '../../screens/consultant/VerificationScreen';
import { useConfigStore } from '../../store/configStore';

const Stack = createNativeStackNavigator();
const ProfileStackNavigator: React.FC = () => {
  // MCA/GSTIN lookup routes are registered only when the company-lookup feature
  // flag is on (default OFF). They stay out of the production build's route tree
  // — no dead route, no reachable empty screen — and re-enable via Remote Config
  // once the external MCA21 / GST APIs are integrated. Screen code is untouched.
  const mcaGstinLookupEnabled = useConfigStore((s) => s.featureFlags.enable_mca_gstin_lookup);
  return (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProfileHome" component={ProfileScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="CompanyProfile" component={CompanyProfileScreen} />
    <Stack.Screen name="TeamMembers" component={TeamMembersScreen} />
    <Stack.Screen name="RolesPermissions" component={RolesPermissionsScreen} />
    <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
    <Stack.Screen name="SecuritySettings" component={SecuritySettingsScreen} />
    <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
    <Stack.Screen name="DeviceSessions" component={DeviceSessionsScreen} />
    <Stack.Screen name="LanguageSettings" component={LanguageSettingsScreen} />
    <Stack.Screen name="ThemeSettings" component={ThemeSettingsScreen} />
    <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
    <Stack.Screen name="TermsConditions" component={TermsConditionsScreen} />
    <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
    <Stack.Screen name="About" component={AboutScreen} />
    <Stack.Screen name="SupportCenter" component={SupportCenterScreen} />
    <Stack.Screen name="LiveChat" component={LiveChatScreen} />
    <Stack.Screen name="VideoConsultation" component={VideoConsultationScreen} />
    <Stack.Screen name="RaiseTicket" component={RaiseTicketScreen} />
    {mcaGstinLookupEnabled && (
      <>
        <Stack.Screen name="GSTINLookup" component={GSTINLookupScreen} />
        <Stack.Screen name="MCASearch" component={MCASearchScreen} />
      </>
    )}
    <Stack.Screen name="Referral" component={ReferralScreen} />
    <Stack.Screen name="PartnerOnboarding" component={PartnerOnboardingScreen} />
    <Stack.Screen name="Vault" component={VaultStackNavigator} />
    <Stack.Screen name="ConsultantVerification" component={ConsultantVerificationScreen} />
  </Stack.Navigator>
  );
};
export default ProfileStackNavigator;
