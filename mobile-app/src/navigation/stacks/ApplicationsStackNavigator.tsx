import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ApplicationsScreen from '../../screens/applications/ApplicationsScreen';
import ApplicationDetailScreen from '../../screens/applications/ApplicationDetailScreen';
import NewApplicationScreen from '../../screens/applications/NewApplicationScreen';
import UploadDocumentsScreen from '../../screens/certifications/UploadDocumentsScreen';
import ChoosePartnerScreen from '../../screens/certifications/ChoosePartnerScreen';
import TermsAndConditionsScreen from '../../screens/certifications/TermsAndConditionsScreen';
import ActiveApplicationsScreen from '../../screens/applications/ActiveApplicationsScreen';
import PendingApplicationsScreen from '../../screens/applications/PendingApplicationsScreen';
import CompletedApplicationsScreen from '../../screens/applications/CompletedApplicationsScreen';
import ActionRequiredScreen from '../../screens/applications/ActionRequiredScreen';
import RejectedApplicationsScreen from '../../screens/applications/RejectedApplicationsScreen';
import ApplicationTimelineScreen from '../../screens/applications/ApplicationTimelineScreen';
import UploadAdditionalDocumentsScreen from '../../screens/applications/UploadAdditionalDocumentsScreen';
import AssignedManagerScreen from '../../screens/applications/AssignedManagerScreen';
import ApprovalWorkflowScreen from '../../screens/applications/ApprovalWorkflowScreen';
import ApplicationGovtQueriesScreen from '../../screens/applications/ApplicationGovtQueriesScreen';
import ApplicationNotesScreen from '../../screens/applications/ApplicationNotesScreen';
import ApplicationHistoryScreen from '../../screens/applications/ApplicationHistoryScreen';
import RenewalApplicationsScreen from '../../screens/applications/RenewalApplicationsScreen';
import ApplicationSuccessScreen from '../../screens/applications/ApplicationSuccessScreen';
import TechnicalReviewScreen from '../../screens/applications/TechnicalReviewScreen';
import ApplicationTemplatesScreen from '../../screens/applications/ApplicationTemplatesScreen';

const Stack = createNativeStackNavigator();
const ApplicationsStackNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ApplicationsList" component={ApplicationsScreen} />
    <Stack.Screen name="ApplicationDetail" component={ApplicationDetailScreen} />
    <Stack.Screen name="NewApplication" component={NewApplicationScreen} />
    <Stack.Screen name="UploadDocuments" component={UploadDocumentsScreen} />
    <Stack.Screen name="ChoosePartner" component={ChoosePartnerScreen} />
    <Stack.Screen name="TermsAndConditions" component={TermsAndConditionsScreen} options={{ presentation: 'modal' }} />
    <Stack.Screen name="ActiveApplications" component={ActiveApplicationsScreen} />
    <Stack.Screen name="PendingApplications" component={PendingApplicationsScreen} />
    <Stack.Screen name="CompletedApplications" component={CompletedApplicationsScreen} />
    <Stack.Screen name="RejectedApplications" component={RejectedApplicationsScreen} />
    <Stack.Screen name="ApplicationTimeline" component={ApplicationTimelineScreen} />
    <Stack.Screen name="UploadAdditionalDocuments" component={UploadAdditionalDocumentsScreen} />
    <Stack.Screen name="AssignedManager" component={AssignedManagerScreen} />
    <Stack.Screen name="ApprovalWorkflow" component={ApprovalWorkflowScreen} />
    <Stack.Screen name="ApplicationGovtQueries" component={ApplicationGovtQueriesScreen} />
    <Stack.Screen name="ApplicationNotes" component={ApplicationNotesScreen} />
    <Stack.Screen name="ApplicationHistory" component={ApplicationHistoryScreen} />
    <Stack.Screen name="RenewalApplications" component={RenewalApplicationsScreen} />
    <Stack.Screen name="ApplicationSuccess" component={ApplicationSuccessScreen} />
    <Stack.Screen name="TechnicalReview" component={TechnicalReviewScreen} />
    <Stack.Screen name="ApplicationTemplates" component={ApplicationTemplatesScreen} />
    <Stack.Screen name="ActionRequired" component={ActionRequiredScreen} />
  </Stack.Navigator>
);
export default ApplicationsStackNavigator;
