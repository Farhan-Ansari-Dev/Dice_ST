import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import MainNavigator from './MainNavigator';
import ApplicationsStackNavigator from './stacks/ApplicationsStackNavigator';
import DocumentsStackNavigator from './stacks/DocumentsStackNavigator';
import ShipmentStackNavigator from './stacks/ShipmentStackNavigator';
import AIStackNavigator from './stacks/AIStackNavigator';
import TestingStackNavigator from './stacks/TestingStackNavigator';
import MarketAccessStackNavigator from './stacks/MarketAccessStackNavigator';
import InspectionStackNavigator from './stacks/InspectionStackNavigator';
import PaymentsStackNavigator from './stacks/PaymentsStackNavigator';

import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import DrawerContent from '../components/navigation/DrawerContent';
import { useConfigStore } from '../store/configStore';

const Drawer = createDrawerNavigator();

const DrawerNavigator: React.FC = () => {
  const { featureFlags } = useConfigStore();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        drawerStyle: { width: 300, backgroundColor: 'transparent' },
        overlayColor: 'rgba(0,0,0,0.6)',
        swipeEdgeWidth: 50,
      }}
    >
      <Drawer.Screen name="MainTabs" component={MainNavigator} />
      <Drawer.Screen name="Applications" component={ApplicationsStackNavigator} />
      <Drawer.Screen name="Documents" component={DocumentsStackNavigator} />
      <Drawer.Screen name="MarketAccess" component={MarketAccessStackNavigator} />
      <Drawer.Screen name="Shipment" component={ShipmentStackNavigator} />
      
      <Drawer.Screen name="Testing" component={TestingStackNavigator} />
      <Drawer.Screen name="Inspection" component={InspectionStackNavigator} />
      <Drawer.Screen name="Payments" component={PaymentsStackNavigator} />
      
      <Drawer.Screen name="Notifications" component={NotificationsScreen} />
    </Drawer.Navigator>
  );
};

export default DrawerNavigator;
