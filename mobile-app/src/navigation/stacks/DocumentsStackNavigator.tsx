import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DocumentsScreen from '../../screens/documents/DocumentsScreen';
import DocumentScanScreen from '../../screens/documents/DocumentScanScreen';
import AIDocumentValidationScreen from '../../screens/documents/AIDocumentValidationScreen';
import ProductDocumentsScreen from '../../screens/documents/ProductDocumentsScreen';
import CompanyDocumentsScreen from '../../screens/documents/CompanyDocumentsScreen';
import ShipmentDocumentsScreen from '../../screens/documents/ShipmentDocumentsScreen';
import GovernmentDocumentsScreen from '../../screens/documents/GovernmentDocumentsScreen';
import TestReportsScreen from '../../screens/documents/TestReportsScreen';
import CertificatesStorageScreen from '../../screens/documents/CertificatesStorageScreen';
import RejectedDocumentsScreen from '../../screens/documents/RejectedDocumentsScreen';
import ExpiryTrackerScreen from '../../screens/documents/ExpiryTrackerScreen';
import SearchDocumentsScreen from '../../screens/documents/SearchDocumentsScreen';
// DigiLocker is DEFERRED / out of scope for v1.0 — screen intentionally not registered.

const Stack = createNativeStackNavigator();
const DocumentsStackNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DocumentVault" component={DocumentsScreen} />
    <Stack.Screen name="DocumentScan" component={DocumentScanScreen} />
    <Stack.Screen name="AIDocumentValidation" component={AIDocumentValidationScreen} />
    <Stack.Screen name="ProductDocuments" component={ProductDocumentsScreen} />
    <Stack.Screen name="CompanyDocuments" component={CompanyDocumentsScreen} />
    <Stack.Screen name="ShipmentDocuments" component={ShipmentDocumentsScreen} />
    <Stack.Screen name="GovernmentDocuments" component={GovernmentDocumentsScreen} />
    <Stack.Screen name="TestReports" component={TestReportsScreen} />
    <Stack.Screen name="CertificatesStorage" component={CertificatesStorageScreen} />
    <Stack.Screen name="RejectedDocuments" component={RejectedDocumentsScreen} />
    <Stack.Screen name="ExpiryTracker" component={ExpiryTrackerScreen} />
    <Stack.Screen name="SearchDocuments" component={SearchDocumentsScreen} />
  </Stack.Navigator>
);
export default DocumentsStackNavigator;
