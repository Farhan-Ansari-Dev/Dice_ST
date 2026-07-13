import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PaymentsScreen from '../../screens/payments/PaymentsScreen';
import InvoiceDetailsScreen from '../../screens/payments/InvoiceDetailsScreen';
import QuotationsScreen from '../../screens/payments/QuotationsScreen';
import ApproveQuotationScreen from '../../screens/payments/ApproveQuotationScreen';
import PaymentGatewayScreen from '../../screens/payments/PaymentGatewayScreen';
import AddCardScreen from '../../screens/payments/AddCardScreen';
import PaymentMethodsScreen from '../../screens/payments/PaymentMethodsScreen';
import PaymentSuccessScreen from '../../screens/payments/PaymentSuccessScreen';
import PaymentFailedScreen from '../../screens/payments/PaymentFailedScreen';
import DownloadInvoiceScreen from '../../screens/payments/DownloadInvoiceScreen';

const Stack = createNativeStackNavigator();
const PaymentsStackNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="PaymentsDashboard" component={PaymentsScreen} />
    <Stack.Screen name="InvoiceDetails" component={InvoiceDetailsScreen} />
    <Stack.Screen name="Quotations" component={QuotationsScreen} />
    <Stack.Screen name="ApproveQuotation" component={ApproveQuotationScreen} />
    <Stack.Screen name="PaymentGateway" component={PaymentGatewayScreen} />
    <Stack.Screen name="AddCard" component={AddCardScreen} />
    <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
    <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} />
    <Stack.Screen name="PaymentFailed" component={PaymentFailedScreen} />
    <Stack.Screen name="DownloadInvoice" component={DownloadInvoiceScreen} />
  </Stack.Navigator>
);
export default PaymentsStackNavigator;
