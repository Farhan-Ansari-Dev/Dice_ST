import React from 'react';
import { Platform } from 'react-native';
import { NavigatorScreenParams } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';
import HomeStackNavigator from './stacks/HomeStackNavigator';
import InsightsStackNavigator from './stacks/InsightsStackNavigator';
import CertificationsStackNavigator from './stacks/CertificationsStackNavigator';
import AIStackNavigator from './stacks/AIStackNavigator';
import ProfileStackNavigator from './stacks/ProfileStackNavigator';
import BottomTabBar from '../components/navigation/BottomTabBar';

export type MainTabParamList = {
  Home: undefined;
  Insights: undefined;
  Certifications: undefined;
  Identifier: undefined;
  Profile: NavigatorScreenParams<{ ProfileHome: undefined }> | undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<string, { active: any; inactive: any }> = {
  Home:           { active: 'home-outline',              inactive: 'home-outline' },
  Insights:       { active: 'newspaper',                 inactive: 'newspaper-outline' },
  Certifications: { active: 'document-text',             inactive: 'document-text-outline' },
  Identifier:     { active: 'scan',                      inactive: 'scan-outline' },
  Profile:        { active: 'person-outline',            inactive: 'person-outline' },
};

const MainNavigator: React.FC = () => {
  const { colors, isDark } = useTheme();

  return (
    <Tab.Navigator
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeStackNavigator} />
      <Tab.Screen name="Insights" component={InsightsStackNavigator} />
      <Tab.Screen name="Certifications" component={CertificationsStackNavigator} />
      <Tab.Screen name="Identifier" component={AIStackNavigator} />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        listeners={({ navigation }) => ({
          // The Profile tab must ALWAYS open the Profile root screen. Deep-links
          // into the Profile stack from elsewhere — e.g. the Home "Consultant
          // Workspace" card navigating to ConsultantVerification — otherwise
          // leave sticky nested params/state so the tab re-opens that sub-screen
          // instead of Profile. Resetting to ProfileHome on tab press keeps
          // Consultant Verification an explicit workflow entry, never a Profile
          // navigation guard. (Sub-screens like Security Settings → Delete
          // Account are reached by in-stack navigation, which is unaffected.)
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('Profile', { screen: 'ProfileHome' });
          },
        })}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;
