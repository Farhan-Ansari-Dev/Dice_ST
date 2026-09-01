import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CertificationOverviewScreen from '../../screens/certifications/CertificationOverviewScreen';
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
// Find Your CB (customer flow)
import FindCBRequirementsScreen from '../../screens/find-cb/FindCBRequirementsScreen';
import FindCBResultsScreen from '../../screens/find-cb/FindCBResultsScreen';
import CBProfileScreen from '../../screens/find-cb/CBProfileScreen';
import CBCompareScreen from '../../screens/find-cb/CBCompareScreen';
import RequestQuoteScreen from '../../screens/find-cb/RequestQuoteScreen';
import CBRequestSuccessScreen from '../../screens/find-cb/CBRequestSuccessScreen';
import CBRequestDetailScreen from '../../screens/find-cb/CBRequestDetailScreen';
import CBRequestsListScreen from '../../screens/find-cb/CBRequestsListScreen';

const Stack = createNativeStackNavigator();
const CertificationsStackNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="NewCertification">
    <Stack.Screen name="CertificationsList" component={CertificationsListScreen} />
    <Stack.Screen name="CertificationOverview" component={CertificationOverviewScreen} />
    <Stack.Screen name="CBComparison" component={CBComparisonScreen} />
    <Stack.Screen name="CertificationDetail" component={CertificationDetailScreen} />
    <Stack.Screen name="NewCertification" component={NewCertificationScreen} />
    <Stack.Screen name="UploadDocuments" component={UploadDocumentsScreen} />
    <Stack.Screen name="ChoosePartner" component={ChoosePartnerScreen} />
    {/* Find Your CB */}
    <Stack.Screen name="FindCBRequirements" component={FindCBRequirementsScreen} />
    <Stack.Screen name="FindCBResults" component={FindCBResultsScreen} />
    <Stack.Screen name="CBProfile" component={CBProfileScreen} />
    <Stack.Screen name="CBCompare" component={CBCompareScreen} />
    <Stack.Screen name="RequestQuote" component={RequestQuoteScreen} />
    <Stack.Screen name="CBRequestSuccess" component={CBRequestSuccessScreen} />
    <Stack.Screen name="CBRequestDetail" component={CBRequestDetailScreen} />
    <Stack.Screen name="CBRequestsList" component={CBRequestsListScreen} />
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
