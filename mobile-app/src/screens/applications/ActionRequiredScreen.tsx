import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';

const ActionRequiredScreen = () => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const navigation = useNavigation<any>();

  const { data: actionData, isLoading, refetch } = useQuery({
    queryKey: ['action-required'],
    queryFn: async () => {
      const response = await api.get<any>('/analytics/action-required');
      return response?.data ?? {};
    },
  });

  const openDrawerRoute = (screen: string, params?: any) => {
    navigation.getParent()?.navigate(screen, params);
  };
  const openCertifications = () => {
    navigation.getParent()?.navigate('MainTabs', {
      screen: 'Certifications',
      params: { screen: 'CertificationsList' },
    });
  };

  const sections = [
    { title: 'Pending Certifications', count: actionData?.pending_certifications ?? 0, icon: 'shield-alert', color: colors.warning, onPress: () => navigation.navigate('PendingApplications') },
    { title: 'Pending Documents', count: actionData?.pending_documents ?? 0, icon: 'document-text', color: colors.error, onPress: () => openDrawerRoute('Documents') },
    { title: 'Renewals', count: actionData?.renewals ?? 0, icon: 'refresh-circle', color: colors.info, onPress: () => navigation.navigate('RenewalApplications') },
    { title: 'Expiring Certificates', count: actionData?.expiring_certificates ?? 0, icon: 'time', color: colors.warning, onPress: openCertifications },
    { title: 'Payment Reminders', count: actionData?.payment_reminders ?? 0, icon: 'card', color: colors.success, onPress: () => openDrawerRoute('Payments') },
    { title: 'Notifications', count: actionData?.unread_notifications ?? 0, icon: 'notifications', color: colors.primary, onPress: () => openDrawerRoute('Notifications') },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Action Required</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} refreshControl={<></>}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>{isLoading ? 'Checking your account...' : 'Open any category to review what needs attention.'}</Text>
          <TouchableOpacity accessibilityLabel="Refresh actions" onPress={() => refetch()} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.grid}>
          {sections.map((item, index) => (
            <TouchableOpacity key={index} style={styles.card} activeOpacity={0.8} onPress={item.onPress} disabled={isLoading}>
              <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={28} color={item.color} />
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              
              {item.count > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.count} {item.title === 'Notifications' ? 'Unread' : 'Pending'}</Text>
                </View>
              ) : (
                <View style={[styles.badge, styles.badgeSuccess]}>
                  <Text style={[styles.badgeText, styles.badgeTextSuccess]}>All Clear</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  content: { padding: 16 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  summaryText: { flex: 1, fontSize: 16, color: colors.textSecondary },
  refreshBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: isDark ? colors.bgCardLight : colors.surface, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { 
    width: '48%', 
    backgroundColor: colors.surface, 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 12, minHeight: 40 },
  badge: { backgroundColor: colors.error + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start' },
  badgeSuccess: { backgroundColor: colors.success + '20' },
  badgeText: { fontSize: 12, fontWeight: '600', color: colors.error },
  badgeTextSuccess: { color: colors.success },
});

export default ActionRequiredScreen;
