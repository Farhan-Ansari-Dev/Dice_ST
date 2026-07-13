import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CertificationsDashboardScreen from '../../screens/certifications/CertificationsDashboardScreen';
import CertificationsListScreen from '../../screens/certifications/CertificationsListScreen';
import CertificationDetailScreen from '../../screens/certifications/CertificationDetailScreen';
import NewCertificationScreen from '../../screens/certifications/NewCertificationScreen';
import UploadDocumentsScreen from '../../screens/certifications/UploadDocumentsScreen';
import ChoosePartnerScreen from '../../screens/certifications/ChoosePartnerScreen';
import TermsAndConditionsScreen from '../../screens/certifications/TermsAndConditionsScreen';
import DomesticCertificationsScreen from '../../screens/certifications/DomesticCertificationsScreen';
import InternationalCertificationsScreen from '../../screens/certifications/InternationalCertificationsScreen';
import CertificationCategoriesScreen from '../../screens/certifications/CertificationCategoriesScreen';
import CertificationEligibilityCheckerScreen from '../../screens/certifications/CertificationEligibilityCheckerScreen';
import CertificationFAQScreen from '../../screens/certifications/CertificationFAQScreen';
import CertificationTimelineScreen from '../../screens/certifications/CertificationTimelineScreen';
import CertificationProgressScreen from '../../screens/certifications/CertificationProgressScreen';
import CertificationDocumentsScreen from '../../screens/certifications/CertificationDocumentsScreen';
import GovernmentQueriesScreen from '../../screens/certifications/GovernmentQueriesScreen';
import RejectedCertificationsScreen from '../../screens/certifications/RejectedCertificationsScreen';
import RenewalCenterScreen from '../../screens/certifications/RenewalCenterScreen';
import CBComparisonScreen from '../../screens/certifications/CBComparisonScreen';
import CostEstimatorScreen from '../../screens/certifications/CostEstimatorScreen';
import RenewalCalendarScreen from '../../screens/certifications/RenewalCalendarScreen';

const Stack = createNativeStackNavigator();
const CertificationsStackNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="CertificationsDashboard" component={CertificationsDashboardScreen} />
    <Stack.Screen name="CertificationsList" component={CertificationsListScreen} />
    <Stack.Screen name="CBComparison" component={CBComparisonScreen} />
    <Stack.Screen name="CertificationDetail" component={CertificationDetailScreen} />
    <Stack.Screen name="NewCertification" component={NewCertificationScreen} />
    <Stack.Screen name="UploadDocuments" component={UploadDocumentsScreen} />
    <Stack.Screen name="ChoosePartner" component={ChoosePartnerScreen} />
    <Stack.Screen name="TermsAndConditions" component={TermsAndConditionsScreen} options={{ presentation: 'modal' }} />
    <Stack.Screen name="DomesticCertifications" component={DomesticCertificationsScreen} />
    <Stack.Screen name="InternationalCertifications" component={InternationalCertificationsScreen} />
    <Stack.Screen name="CertificationCategories" component={CertificationCategoriesScreen} />
    <Stack.Screen name="CertificationEligibility" component={CertificationEligibilityCheckerScreen} />
    <Stack.Screen name="CertificationFAQ" component={CertificationFAQScreen} />
    <Stack.Screen name="CertificationTimeline" component={CertificationTimelineScreen} />
    <Stack.Screen name="CertificationProgress" component={CertificationProgressScreen} />
    <Stack.Screen name="CertificationDocuments" component={CertificationDocumentsScreen} />
    <Stack.Screen name="GovernmentQueries" component={GovernmentQueriesScreen} />
    <Stack.Screen name="RejectedCertifications" component={RejectedCertificationsScreen} />
    <Stack.Screen name="RenewalCenter" component={RenewalCenterScreen} />
    <Stack.Screen name="CostEstimator" component={CostEstimatorScreen} />
    <Stack.Screen name="RenewalCalendar" component={RenewalCalendarScreen} />
  </Stack.Navigator>
);
export default CertificationsStackNavigator;
