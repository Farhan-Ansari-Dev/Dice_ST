import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MarketAccessScreen from '../../screens/market/MarketAccessScreen';
import CountryDetailsScreen from '../../screens/market/CountryDetailsScreen';
import BusinessOpportunityScreen from '../../screens/market/BusinessOpportunityScreen';
import OpportunitiesListScreen from '../../screens/market/OpportunitiesListScreen';
import ProductAnalyzerScreen from '../../screens/market/ProductAnalyzerScreen';
import InvestmentROIScreen from '../../screens/market/InvestmentROIScreen';
import RiskAnalyzerScreen from '../../screens/market/RiskAnalyzerScreen';
import TradeTariffsScreen from '../../screens/market/TradeTariffsScreen';
import TargetMarketsMapScreen from '../../screens/market/TargetMarketsMapScreen';

const Stack = createNativeStackNavigator();

export default function MarketAccessStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MarketAccessRoot" component={MarketAccessScreen} />
      <Stack.Screen name="CountryDetails" component={CountryDetailsScreen} />
      <Stack.Screen name="BusinessOpportunity" component={BusinessOpportunityScreen} />
      <Stack.Screen name="OpportunitiesList" component={OpportunitiesListScreen} />
      <Stack.Screen name="ProductAnalyzer" component={ProductAnalyzerScreen} />
      <Stack.Screen name="InvestmentROI" component={InvestmentROIScreen} />
      <Stack.Screen name="RiskAnalyzer" component={RiskAnalyzerScreen} />
      <Stack.Screen name="TradeTariffs" component={TradeTariffsScreen} />
      <Stack.Screen name="TargetMarketsMap" component={TargetMarketsMapScreen} />
    </Stack.Navigator>
  );
}
