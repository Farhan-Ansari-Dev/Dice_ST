import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../../screens/home/HomeScreen';
import ComplianceOverviewScreen from '../../screens/home/ComplianceOverviewScreen';
import RecentActivitiesScreen from '../../screens/home/RecentActivitiesScreen';
import RenewalAlertsScreen from '../../screens/home/RenewalAlertsScreen';
import ComplianceScoreScreen from '../../screens/home/ComplianceScoreScreen';
import NotificationsScreen from '../../screens/notifications/NotificationsScreen';
import NotificationDetailScreen from '../../screens/communication/NotificationDetailScreen';
import AISearchScreen from '../../screens/ai-assistant/AISearchScreen';
import MyWorkScreen from '../../screens/home/MyWorkScreen';

const Stack = createNativeStackNavigator();
const HomeStackNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen 
      name="HomeDashboard" 
      component={HomeScreen} 
      options={{ headerShown: false }} 
    />
    <Stack.Screen name="ComplianceOverview" component={ComplianceOverviewScreen} />
    <Stack.Screen name="RecentActivities" component={RecentActivitiesScreen} />
    <Stack.Screen name="RenewalAlerts" component={RenewalAlertsScreen} />
    <Stack.Screen name="ComplianceScore" component={ComplianceScoreScreen} />
    <Stack.Screen 
      name="Notifications" 
      component={NotificationsScreen} 
      options={{ 
        title: 'Notifications',
        headerLargeTitle: true,
        headerTransparent: true,
      }} 
    />
    <Stack.Screen name="NotificationDetail" component={NotificationDetailScreen} />
    <Stack.Screen name="AISearch" component={AISearchScreen} />
    <Stack.Screen name="MyWork" component={MyWorkScreen} />
  </Stack.Navigator>
);
export default HomeStackNavigator;
