import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import InsightsScreen from '../../screens/insights/InsightsScreen';
import InsightDetailScreen from '../../screens/insights/InsightDetailScreen';
import NewsFeedScreen from '../../screens/insights/NewsFeedScreen';
import GovtUpdatesScreen from '../../screens/insights/GovtUpdatesScreen';
import CertificationNewsScreen from '../../screens/insights/CertificationNewsScreen';
import TradeExportNewsScreen from '../../screens/insights/TradeExportNewsScreen';
import ImportExportAlertsScreen from '../../screens/insights/ImportExportAlertsScreen';
import CountryRegulationUpdatesScreen from '../../screens/insights/CountryRegulationUpdatesScreen';
import AIInsightFeedScreen from '../../screens/insights/AIInsightFeedScreen';
import AISummarizedCircularsScreen from '../../screens/insights/AISummarizedCircularsScreen';
import ComplianceIntelligenceScreen from '../../screens/insights/ComplianceIntelligenceScreen';
import TrendingCertificationsScreen from '../../screens/insights/TrendingCertificationsScreen';
import SavedArticlesScreen from '../../screens/insights/SavedArticlesScreen';
import VideoInsightsScreen from '../../screens/insights/VideoInsightsScreen';
import AIRecommendationsFeedScreen from '../../screens/insights/AIRecommendationsFeedScreen';
import SearchInsightsScreen from '../../screens/insights/SearchInsightsScreen';
import BreakingComplianceAlertsScreen from '../../screens/insights/BreakingComplianceAlertsScreen';

const Stack = createNativeStackNavigator();
const InsightsStackNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="InsightsHome" component={InsightsScreen} />
    <Stack.Screen name="InsightDetail" component={InsightDetailScreen} />
    <Stack.Screen name="NewsFeed" component={NewsFeedScreen} />
    <Stack.Screen name="GovtUpdates" component={GovtUpdatesScreen} />
    <Stack.Screen name="CertificationNews" component={CertificationNewsScreen} />
    <Stack.Screen name="TradeExportNews" component={TradeExportNewsScreen} />
    <Stack.Screen name="ImportExportAlerts" component={ImportExportAlertsScreen} />
    <Stack.Screen name="CountryRegulationUpdates" component={CountryRegulationUpdatesScreen} />
    <Stack.Screen name="AIInsightFeed" component={AIInsightFeedScreen} />
    <Stack.Screen name="AISummarizedCirculars" component={AISummarizedCircularsScreen} />
    <Stack.Screen name="ComplianceIntelligence" component={ComplianceIntelligenceScreen} />
    <Stack.Screen name="TrendingCertifications" component={TrendingCertificationsScreen} />
    <Stack.Screen name="SavedArticles" component={SavedArticlesScreen} />
    <Stack.Screen name="VideoInsights" component={VideoInsightsScreen} />
    <Stack.Screen name="AIRecommendationsFeed" component={AIRecommendationsFeedScreen} />
    <Stack.Screen name="SearchInsights" component={SearchInsightsScreen} />
    <Stack.Screen name="BreakingComplianceAlerts" component={BreakingComplianceAlertsScreen} />
  </Stack.Navigator>
);
export default InsightsStackNavigator;
