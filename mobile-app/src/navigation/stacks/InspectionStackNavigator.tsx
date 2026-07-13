import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import InspectionDashboardScreen from '../../screens/inspection/InspectionDashboardScreen';

const Stack = createNativeStackNavigator();

const InspectionStackNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="InspectionDashboard" component={InspectionDashboardScreen} />
  </Stack.Navigator>
);

export default InspectionStackNavigator;
