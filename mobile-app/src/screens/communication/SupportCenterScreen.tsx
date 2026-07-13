import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

interface ContactOption {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  action: () => void;
}

const SupportCenterScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const [activeTab, setActiveTab] = useState<'ASK_EXPERT' | 'RESOURCES'>('ASK_EXPERT');

  const contactOptions: ContactOption[] = [
    { id: '1', title: 'Real-Time Chat', subtitle: 'Connect instantly', icon: 'chatbubbles', color: colors.primary, action: () => navigation.navigate('LiveChat') },
    { id: '2', title: 'Book a Meeting', subtitle: 'Choose a Google Meet time', icon: 'calendar', color: colors.secondary, action: () => navigation.navigate('VideoConsultation') },
    { id: '3', title: 'WhatsApp', subtitle: 'Message us', icon: 'logo-whatsapp', color: colors.success, action: async () => {
      const url = 'https://wa.me/917897001049?text=Hi%20Sanyog%20Support%2C%20I%20need%20help.';
      const supported = await Linking.canOpenURL(url);
      supported ? Linking.openURL(url) : Linking.openURL('mailto:info@sanyogconformity.com');
    } },
    { id: '4', title: 'Email Support', subtitle: 'info@sanyogconformity.com', icon: 'mail', color: colors.info, action: () => Linking.openURL('mailto:info@sanyogconformity.com?subject=Support%20request') },
    { id: '5', title: 'Phone Call', subtitle: '+91 78970 01049 • Mon-Fri, 9am-6pm', icon: 'call', color: colors.warning, action: () => Linking.openURL(Platform.OS === 'ios' ? 'telprompt:+917897001049' : 'tel:+917897001049') }
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support Center</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'ASK_EXPERT' && styles.activeTab]} onPress={() => setActiveTab('ASK_EXPERT')}>
          <Text style={[styles.tabText, activeTab === 'ASK_EXPERT' && styles.activeTabText]}>Ask Expert</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'RESOURCES' && styles.activeTab]} onPress={() => setActiveTab('RESOURCES')}>
          <Text style={[styles.tabText, activeTab === 'RESOURCES' && styles.activeTabText]}>Resources</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {activeTab === 'ASK_EXPERT' ? (
          <View>
            <Text style={styles.sectionTitle}>How would you like to connect?</Text>
            {contactOptions.map(option => (
              <TouchableOpacity key={option.id} style={styles.contactCard} onPress={option.action}>
                <View style={[styles.iconContainer, { backgroundColor: option.color + '20' }]}>
                  <Ionicons name={option.icon} size={24} color={option.color} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{option.title}</Text>
                  <Text style={styles.cardSubtitle}>{option.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View>
             <TouchableOpacity style={[styles.actionCard, Shadows.sm]} onPress={() => navigation.navigate('RaiseTicket')}>
               <Ionicons name="ticket" size={24} color={colors.primary} />
               <View style={styles.actionInfo}>
                 <Text style={styles.actionTitle}>Support Tickets</Text>
                 <Text style={styles.actionSubtitle}>View or raise new tickets</Text>
               </View>
             </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDark },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  tabContainer: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: 24, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 20 },
  activeTab: { backgroundColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  activeTabText: { color: '#FFFFFF' },
  content: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 16 },
  contactCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 16, borderRadius: 16, marginBottom: 12 },
  iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: colors.textSecondary },
  actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 16, borderRadius: 12, marginBottom: 12 },
  actionInfo: { marginLeft: 16, flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  actionSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 }
});

export default SupportCenterScreen;
