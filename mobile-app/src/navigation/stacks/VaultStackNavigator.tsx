import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import VaultListScreen from '../../screens/vault/VaultListScreen';
import VaultDetailsScreen from '../../screens/vault/VaultDetailsScreen';
import VaultDownloadScreen from '../../screens/vault/VaultDownloadScreen';
import VaultShareScreen from '../../screens/vault/VaultShareScreen';
import VaultQRScreen from '../../screens/vault/VaultQRScreen';

export type VaultStackParamList = {
  VaultList: undefined;
  VaultDetails: { docId: string; docName: string };
  VaultDownload: undefined;
  VaultShare: undefined;
  VaultQR: undefined;
};

const Stack = createNativeStackNavigator<VaultStackParamList>();

const VaultStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right'
      }}
    >
      <Stack.Screen name="VaultList" component={VaultListScreen} />
      <Stack.Screen name="VaultDetails" component={VaultDetailsScreen} />
      <Stack.Screen name="VaultDownload" component={VaultDownloadScreen} />
      <Stack.Screen name="VaultShare" component={VaultShareScreen} />
      <Stack.Screen name="VaultQR" component={VaultQRScreen} />
    </Stack.Navigator>
  );
};

export default VaultStackNavigator;
