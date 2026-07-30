import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import InspectionDashboardScreen from '../../screens/inspection/InspectionDashboardScreen';
import NewInspectionScreen from '../../screens/testing/NewInspectionScreen';
import UploadInspectionDocumentsScreen from '../../screens/testing/UploadInspectionDocumentsScreen';
import ChooseInspectionBodyScreen from '../../screens/testing/ChooseInspectionBodyScreen';
import InspectionBookingScreen from '../../screens/testing/InspectionBookingScreen';
import InspectionScheduleScreen from '../../screens/testing/InspectionScheduleScreen';
import InspectionReportsScreen from '../../screens/testing/InspectionReportsScreen';
import FactoryInspectionScreen from '../../screens/testing/FactoryInspectionScreen';
import QualityInspectionScreen from '../../screens/testing/QualityInspectionScreen';
import InspectionDetailsScreen from '../../screens/testing/InspectionDetailsScreen';
import InspectionSuccessScreen from '../../screens/testing/InspectionSuccessScreen';

const Stack = createNativeStackNavigator();

const InspectionStackNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="InspectionDashboard" component={InspectionDashboardScreen} />
    <Stack.Screen name="NewInspection" component={NewInspectionScreen} />
    <Stack.Screen name="UploadInspectionDocuments" component={UploadInspectionDocumentsScreen} />
    <Stack.Screen name="ChooseInspectionBody" component={ChooseInspectionBodyScreen} />
    <Stack.Screen name="InspectionBooking" component={InspectionBookingScreen} />
    <Stack.Screen name="InspectionSchedule" component={InspectionScheduleScreen} />
    <Stack.Screen name="InspectionReports" component={InspectionReportsScreen} />
    <Stack.Screen name="FactoryInspection" component={FactoryInspectionScreen} />
    <Stack.Screen name="QualityInspection" component={QualityInspectionScreen} />
    <Stack.Screen name="InspectionDetails" component={InspectionDetailsScreen} />
    <Stack.Screen name="InspectionSuccess" component={InspectionSuccessScreen} />
  </Stack.Navigator>
);

export default InspectionStackNavigator;
