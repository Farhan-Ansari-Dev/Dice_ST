import React from 'react';
import { Platform } from 'react-native';
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
  Profile: undefined;
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
      <Tab.Screen name="Profile" component={ProfileStackNavigator} />
    </Tab.Navigator>
  );
};

export default MainNavigator;
