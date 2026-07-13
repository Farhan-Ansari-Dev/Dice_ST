import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AIProductQualityScreen from '../../screens/ai-assistant/AIProductQualityScreen';
const Stack = createNativeStackNavigator();
const AIStackNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="AIProductQuality">
    <Stack.Screen name="AIProductQuality" component={AIProductQualityScreen} />
  </Stack.Navigator>
);
export default AIStackNavigator;
