import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CommunicationScreen from '../../screens/communication/CommunicationScreen';
import ChatListScreen from '../../screens/communication/ChatListScreen';
import LiveChatScreen from '../../screens/communication/LiveChatScreen';
import VideoConsultationScreen from '../../screens/communication/VideoConsultationScreen';
import SupportCenterScreen from '../../screens/communication/SupportCenterScreen';
import RaiseTicketScreen from '../../screens/communication/RaiseTicketScreen';
import TicketDetailsScreen from '../../screens/communication/TicketDetailsScreen';
import NotificationDetailScreen from '../../screens/communication/NotificationDetailScreen';
import ActivityTimelineScreen from '../../screens/communication/ActivityTimelineScreen';
import ContactExpertScreen from '../../screens/communication/ContactExpertScreen';

const Stack = createNativeStackNavigator();
const CommunicationStackNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="CommunicationHome" component={CommunicationScreen} />
    <Stack.Screen name="ChatList" component={ChatListScreen} />
    <Stack.Screen name="LiveChat" component={LiveChatScreen} />
    <Stack.Screen name="VideoConsultation" component={VideoConsultationScreen} />
    <Stack.Screen name="SupportCenter" component={SupportCenterScreen} />
    <Stack.Screen name="RaiseTicket" component={RaiseTicketScreen} />
    <Stack.Screen name="TicketDetails" component={TicketDetailsScreen} />
    <Stack.Screen name="NotificationDetail" component={NotificationDetailScreen} />
    <Stack.Screen name="ActivityTimeline" component={ActivityTimelineScreen} />
    <Stack.Screen name="ContactExpert" component={ContactExpertScreen} />
  </Stack.Navigator>
);
export default CommunicationStackNavigator;
