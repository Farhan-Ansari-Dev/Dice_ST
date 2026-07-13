import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ShipmentScreen from '../../screens/shipment/ShipmentScreen';
import ShipmentTrackingScreen from '../../screens/shipment/ShipmentTrackingScreen';
import ShipmentDetailsScreen from '../../screens/shipment/ShipmentDetailsScreen';
import ContainerTrackingScreen from '../../screens/shipment/ContainerTrackingScreen';
import CustomsClearanceScreen from '../../screens/shipment/CustomsClearanceScreen';
import PortClearanceScreen from '../../screens/shipment/PortClearanceScreen';
import CountryComplianceScreen from '../../screens/shipment/CountryComplianceScreen';
import ImportRiskAnalysisScreen from '../../screens/shipment/ImportRiskAnalysisScreen';
import ExportReadinessScreen from '../../screens/shipment/ExportReadinessScreen';
import CustomsDocumentationScreen from '../../screens/shipment/CustomsDocumentationScreen';
import ShippingDocumentsScreen from '../../screens/shipment/ShippingDocumentsScreen';
import ShipmentTimelineScreen from '../../screens/shipment/ShipmentTimelineScreen';
import ShipmentAnalyticsScreen from '../../screens/shipment/ShipmentAnalyticsScreen';
import ShipmentAlertsScreen from '../../screens/shipment/ShipmentAlertsScreen';
import ShipmentSuccessScreen from '../../screens/shipment/ShipmentSuccessScreen';

const Stack = createNativeStackNavigator();
const ShipmentStackNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ShipmentDashboard" component={ShipmentScreen} />
    <Stack.Screen name="ShipmentTracking" component={ShipmentTrackingScreen} />
    <Stack.Screen name="ShipmentDetails" component={ShipmentDetailsScreen} />
    <Stack.Screen name="ContainerTracking" component={ContainerTrackingScreen} />
    <Stack.Screen name="CustomsClearance" component={CustomsClearanceScreen} />
    <Stack.Screen name="PortClearance" component={PortClearanceScreen} />
    <Stack.Screen name="CountryCompliance" component={CountryComplianceScreen} />
    <Stack.Screen name="ImportRiskAnalysis" component={ImportRiskAnalysisScreen} />
    <Stack.Screen name="ExportReadiness" component={ExportReadinessScreen} />
    <Stack.Screen name="CustomsDocumentation" component={CustomsDocumentationScreen} />
    <Stack.Screen name="ShippingDocuments" component={ShippingDocumentsScreen} />
    <Stack.Screen name="ShipmentTimeline" component={ShipmentTimelineScreen} />
    <Stack.Screen name="ShipmentAnalytics" component={ShipmentAnalyticsScreen} />
    <Stack.Screen name="ShipmentAlerts" component={ShipmentAlertsScreen} />
    <Stack.Screen name="ShipmentSuccess" component={ShipmentSuccessScreen} />
  </Stack.Navigator>
);
export default ShipmentStackNavigator;
