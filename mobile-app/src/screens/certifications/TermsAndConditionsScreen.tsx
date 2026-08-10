import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Shadows } from '../../theme';


const TermsAndConditionsScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.card, Shadows.sm]}>
          <LinearGradient
            colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#FFFFFF']}
            style={styles.cardInner}
          >
            <Text style={styles.lastUpdated}>Last Updated: June 12, 2026</Text>
            
            <Text style={styles.heading}>1. Introduction</Text>
            <Text style={styles.paragraph}>
              Welcome to the Sanyog Conformity mobile application. By uploading your documents, requesting services, or accessing our platform, you agree to comply with and be bound by the following terms and conditions.
            </Text>

            <Text style={styles.heading}>2. Document Authenticity</Text>
            <Text style={styles.paragraph}>
              You hereby declare that all documents, certificates, test reports, and information provided through the Sanyog Conformity portal are true, accurate, and authentic. Providing forged or falsified documents may result in immediate suspension of your account and legal action by the relevant regulatory authorities (e.g., BIS, WPC, CDSCO).
            </Text>

            <Text style={styles.heading}>3. Data Privacy & Security</Text>
            <Text style={styles.paragraph}>
              Sanyog Conformity employs enterprise-grade encryption to protect your sensitive corporate data. We do not share your documents with third-party entities, except for the necessary Government or Regulatory Bodies required to process your certifications, testing, or inspection requests.
            </Text>

            <Text style={styles.heading}>4. Service Delivery & Timelines</Text>
            <Text style={styles.paragraph}>
              Estimated processing times provided for testing, inspections, and certification issuance are indicative. Sanyog Conformity is not liable for delays caused by government portals, third-party labs, public holidays, or incomplete documentation submitted by the user.
            </Text>

            <Text style={styles.heading}>5. Payments & Quotations</Text>
            <Text style={styles.paragraph}>
              Any cost estimates provided within the app are preliminary. Final invoicing will be generated upon full review of your requirements. Sanyog Conformity reserves the right to revise quotations if the scope of testing or inspection changes.
            </Text>
            
            <Text style={styles.heading}>6. User Responsibilities</Text>
            <Text style={styles.paragraph}>
              You are responsible for maintaining the confidentiality of your account credentials and ensuring that all activity conducted under your account aligns with applicable international trade and conformity laws.
            </Text>
          </LinearGradient>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? colors.bgCardLight : '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: isDark ? 0 : 1,
      borderColor: 'rgba(0,0,0,0.05)',
      ...Shadows.sm,
    },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
    content: { paddingHorizontal: 20, paddingTop: 16 },
    card: {
      borderRadius: 24,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
    },
    cardInner: {
      padding: 24,
    },
    lastUpdated: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textTertiary,
      marginBottom: 20,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    heading: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      marginTop: 20,
      marginBottom: 8,
    },
    paragraph: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 22,
    },
  });

export default TermsAndConditionsScreen;
