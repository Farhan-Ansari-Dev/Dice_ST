import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TestingDashboardScreen from '../../screens/testing/TestingDashboardScreen';
import TestingScreen from '../../screens/testing/TestingScreen';
import AssignedLabsScreen from '../../screens/testing/AssignedLabsScreen';
import SampleDispatchScreen from '../../screens/testing/SampleDispatchScreen';
import SampleTrackingScreen from '../../screens/testing/SampleTrackingScreen';
import LabReportsScreen from '../../screens/testing/LabReportsScreen';
import TestDetailsScreen from '../../screens/testing/TestDetailsScreen';
import FailedReportsScreen from '../../screens/testing/FailedReportsScreen';
import RetestingRequestScreen from '../../screens/testing/RetestingRequestScreen';
import InspectionBookingScreen from '../../screens/testing/InspectionBookingScreen';
import InspectionScheduleScreen from '../../screens/testing/InspectionScheduleScreen';
import InspectionReportsScreen from '../../screens/testing/InspectionReportsScreen';
import FactoryInspectionScreen from '../../screens/testing/FactoryInspectionScreen';
import QualityInspectionScreen from '../../screens/testing/QualityInspectionScreen';
import InspectionDetailsScreen from '../../screens/testing/InspectionDetailsScreen';
import InspectionSuccessScreen from '../../screens/testing/InspectionSuccessScreen';
import NewTestingScreen from '../../screens/testing/NewTestingScreen';
import UploadTestingDocumentsScreen from '../../screens/testing/UploadTestingDocumentsScreen';
import ChooseLabScreen from '../../screens/testing/ChooseLabScreen';
import NewInspectionScreen from '../../screens/testing/NewInspectionScreen';
import UploadInspectionDocumentsScreen from '../../screens/testing/UploadInspectionDocumentsScreen';
import ChooseInspectionBodyScreen from '../../screens/testing/ChooseInspectionBodyScreen';

const Stack = createNativeStackNavigator();
const TestingStackNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="TestingDashboard" component={TestingDashboardScreen} />
    <Stack.Screen name="TestingList" component={TestingScreen} />
    <Stack.Screen name="NewTesting" component={NewTestingScreen} />
    <Stack.Screen name="UploadTestingDocuments" component={UploadTestingDocumentsScreen} />
    <Stack.Screen name="ChooseLab" component={ChooseLabScreen} />
    <Stack.Screen name="TestDetail" component={TestDetailsScreen} />
    <Stack.Screen name="AssignedLabs" component={AssignedLabsScreen} />
    <Stack.Screen name="SampleDispatch" component={SampleDispatchScreen} />
    <Stack.Screen name="SampleTracking" component={SampleTrackingScreen} />
    <Stack.Screen name="LabReports" component={LabReportsScreen} />
    <Stack.Screen name="FailedReports" component={FailedReportsScreen} />
    <Stack.Screen name="RetestingRequest" component={RetestingRequestScreen} />
  </Stack.Navigator>
);
export default TestingStackNavigator;
