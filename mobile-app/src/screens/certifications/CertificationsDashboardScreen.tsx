import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

interface DashboardCard {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  gradient: [string, string];
  action: string;
  badge?: string;
}

const CertificationsDashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const DASHBOARD_CARDS: DashboardCard[] = useMemo(() => [
    {
      id: 'certifications',
      title: 'Certifications',
      subtitle: 'View & apply for BIS, EPR, WPC, and more',
      icon: 'shield-checkmark-outline',
      gradient: [colors.primary, colors.primaryDark] as [string, string],
      action: 'Certifications',
    },
    {
      id: 'testing',
      title: 'Testing',
      subtitle: 'Book lab tests and safety checks',
      icon: 'flask-outline',
      gradient: ['#00D4FF', '#007FFF'] as [string, string],
      action: 'Testing',
    },
    {
      id: 'inspection',
      title: 'Inspection',
      subtitle: 'Schedule factory or product inspections',
      icon: 'search-outline',
      gradient: ['#FFA502', '#FF6348'] as [string, string],
      action: 'Inspection',
    },
    {
      id: 'reports',
      title: 'Reports',
      subtitle: 'View test and inspection reports',
      icon: 'document-text-outline',
      gradient: ['#A78BFA', '#7C3AED'] as [string, string],
      action: 'Reports',
    },
    {
      id: 'history',
      title: 'History',
      subtitle: 'Track all certification applications',
      icon: 'time-outline',
      gradient: ['#34D399', '#10B981'] as [string, string],
      action: 'History',
    },
    {
      id: 'identifier',
      title: 'Product Quality',
      subtitle: 'AI-powered product quality analysis',
      icon: 'scan-outline',
      gradient: ['#F59E0B', '#D97706'] as [string, string],
      action: 'Identifier',
    },
  ], [colors]);

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const handleCardPress = (card: DashboardCard) => {
    switch (card.action) {
      case 'Certifications':
        navigation.navigate('CertificationsList');
        break;
      case 'Testing':
        navigation.navigate('TestingDashboard');
        break;
      case 'Inspection':
        navigation.navigate('InspectionDashboard');
        break;
      case 'Reports':
        navigation.navigate('ReportsDashboard');
        break;
      case 'History':
        navigation.navigate('HistoryDashboard');
        break;
      case 'Identifier':
        navigation.navigate('Identifier');
        break;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={isDark ? [colors.bgDark, '#0B0D14'] : ['#F8F9FA', '#E2E8F0']}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu-outline" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Certifications</Text>
          <Text style={styles.headerSubtitle}>Your Compliance Hub</Text>
        </View>
      </View>

      <FlatList
        data={DASHBOARD_CARDS}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={styles.gridContainer}
        columnWrapperStyle={styles.gridRow}
        numColumns={2}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, Shadows.md]}
            onPress={() => handleCardPress(item)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={item.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cardGradient}
            >
              {/* Icon Circle */}
              <View style={styles.iconCircle}>
                <Ionicons name={item.icon as any} size={32} color="#FFFFFF" />
              </View>

              {/* Content */}
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.cardSubtitle} numberOfLines={2}>
                  {item.subtitle}
                </Text>
              </View>

              {/* Arrow */}
              <View style={styles.arrowBox}>
                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgDark,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 24,
    },
    menuBtn: {
      width: 40,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 26,
      fontWeight: '900',
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    headerSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    gridContainer: {
      paddingHorizontal: 16,
      paddingBottom: 20,
    },
    gridRow: {
      gap: 12,
      marginBottom: 12,
    },
    card: {
      flex: 1,
      height: 220,
      borderRadius: BorderRadius.xl,
      overflow: 'hidden',
    },
    cardGradient: {
      flex: 1,
      padding: 16,
      justifyContent: 'space-between',
    },
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(255,255,255,0.25)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    cardContent: {
      flex: 1,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
      marginBottom: 6,
    },
    cardSubtitle: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.85)',
      lineHeight: 16,
    },
    arrowBox: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default CertificationsDashboardScreen;
