import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  UIManager,
  LayoutAnimation,
  Animated,
  FlatList,
  Image,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Shadows } from '../../theme';
import Button from '../../components/common/Button';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const LAB_MARKETPLACE = [
  { id: 'lab-1', name: 'SGS Electronics Lab', type: 'Lab', rating: 4.9, reviews: '9.8k', time: '3-5 days', price: 'From ₹12k' },
  { id: 'lab-2', name: 'Intertek Testing Center', type: 'Lab', rating: 4.8, reviews: '7.2k', time: '4-6 days', price: 'From ₹15k' },
  { id: 'lab-3', name: 'TUV SUD Lab', type: 'Lab', rating: 4.8, reviews: '6.4k', time: '5-7 days', price: 'From ₹18k' },
  { id: 'lab-4', name: 'UL Verification Lab', type: 'Lab', rating: 4.7, reviews: '5.1k', time: '4-8 days', price: 'From ₹16k' },
  { id: 'lab-5', name: 'Bureau Veritas Lab', type: 'Lab', rating: 4.6, reviews: '4.4k', time: '5-9 days', price: 'From ₹14k' },
];

const ChooseLabScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [partnerType, setPartnerType] = useState<'dice' | 'custom' | null>(null);
  const [selectedLabId, setSelectedLabId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSuccessModalVisible, setSuccessModalVisible] = useState(false);

  // Animation values for Dice Hero Card
  const diceAnim = useMemo(() => new Animated.Value(0), []);
  const flowAnim = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    Animated.timing(diceAnim, {
      toValue: partnerType === 'dice' ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();

    // Start continuous flowing animation
    Animated.loop(
      Animated.timing(flowAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: false, // Must be false for percentage-based translateX
      })
    ).start();
  }, [partnerType]);

  const handleDiceSelect = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPartnerType('dice');
    setSelectedLabId(null);
  };

  const handleLabSelect = (labId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPartnerType('custom');
    setSelectedLabId(labId);
  };

  const handleSubmit = async () => {
    if (!partnerType) {
      Alert.alert('Required', 'Please select a lab option.');
      return;
    }
    if (partnerType === 'custom' && !selectedLabId) {
      Alert.alert('Required', 'Please select your preferred testing lab from the marketplace.');
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    
    // Show custom success modal
    setSuccessModalVisible(true);
  };

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#F8FAFC']}
        style={StyleSheet.absoluteFill}
      />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Select Testing Lab</Text>
          <Text style={styles.headerSub}>Step 3 of 3</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        
        {/* DICE HERO CARD */}
        <Text style={styles.sectionLabel}>The Recommended Path</Text>
        <TouchableOpacity activeOpacity={0.9} onPress={handleDiceSelect}>
          <Animated.View style={[
            styles.premiumCard,
            {
              borderColor: diceAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', colors.primary]
              }),
              shadowColor: colors.primary,
              shadowOpacity: diceAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] }),
              shadowRadius: diceAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 15] }),
              elevation: partnerType === 'dice' ? 10 : 0,
            }
          ]}>
            {/* Continuous Flowing Gradient Animation */}
            <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius: 24 }]}>
              <Animated.View style={{
                width: '300%',
                height: '100%',
                opacity: diceAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 1]
                }),
                transform: [{
                  translateX: flowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['-66%', '0%']
                  })
                }]
              }}>
                <LinearGradient
                  colors={isDark ? 
                    [colors.bgCardLight, `${colors.primary}40`, colors.bgCardLight, `${colors.primary}40`] : 
                    ['#FFFFFF', '#E0E7FF', '#FFFFFF', '#E0E7FF']
                  }
                  style={{ flex: 1 }}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </Animated.View>
            </View>
            
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={[styles.iconWrap, { backgroundColor: partnerType === 'dice' ? colors.primary : (isDark ? 'rgba(255,255,255,0.05)' : '#EEF2FF') }]}>
                  <Image source={require('../../../assets/logo.png')} style={{ width: 44, height: 44, resizeMode: 'contain', tintColor: partnerType === 'dice' ? '#FFF' : colors.primary }} />
                </View>
                <View style={{ marginLeft: 16, flex: 1 }}>
                  <Text style={styles.optionTitle}>Go with Dice</Text>
                  <View style={styles.recommendedBadge}>
                    <Ionicons name="star" size={12} color="#10B981" style={{ marginRight: 4 }} />
                    <Text style={styles.recommendedText}>Recommended</Text>
                  </View>
                </View>
                {/* Radio Circle */}
                <View style={[styles.unselectedCircle, partnerType === 'dice' && { borderColor: colors.primary, backgroundColor: colors.primary, borderWidth: 0 }]}>
                  {partnerType === 'dice' && <Ionicons name="checkmark" size={18} color="#FFF" />}
                </View>
              </View>
            </View>

            <Text style={styles.optionDesc}>
              Let our Dice experts handle the entire testing process. We will dispatch the sample, track the testing, and guarantee the fastest turnaround time.
            </Text>
          </Animated.View>
        </TouchableOpacity>

        {/* OR DIVIDER */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR BROWSE LAB MARKETPLACE</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* LAB MARKETPLACE CAROUSEL */}
        <View style={styles.marketplaceSection}>
          <View style={styles.marketplaceHeader}>
            <Text style={styles.marketplaceTitle}>Choose a specific Test Lab</Text>
            <Text style={styles.marketplaceSub}>Swipe to browse verified global testing labs</Text>
          </View>

          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContainer}
            snapToInterval={280 + 16}
            decelerationRate="fast"
            data={LAB_MARKETPLACE}
            keyExtractor={item => item.id}
            renderItem={({ item }) => {
              const isSelected = selectedLabId === item.id;
              return (
                <TouchableOpacity 
                  activeOpacity={0.9} 
                  onPress={() => handleLabSelect(item.id)}
                  style={[
                    styles.labCard,
                    isSelected && styles.labCardActive
                  ]}
                >
                  {isSelected && (
                    <LinearGradient
                      colors={[colors.primary, colors.secondary]}
                      style={[StyleSheet.absoluteFill, { borderRadius: 20, opacity: 0.05 }]}
                    />
                  )}
                  
                  {/* Lab Card Header */}
                  <View style={styles.labCardHeader}>
                    <View style={styles.labIconBox}>
                      <Ionicons name="flask" size={20} color={isSelected ? colors.primary : colors.textTertiary} />
                    </View>
                    <View style={styles.labTypeBadge}>
                      <Text style={styles.labTypeText}>{item.type}</Text>
                    </View>
                  </View>

                  {/* Lab Details */}
                  <Text style={styles.labName} numberOfLines={1}>{item.name}</Text>
                  
                  <View style={styles.labStatsRow}>
                    <View style={styles.statBox}>
                      <Ionicons name="star" size={14} color="#F59E0B" />
                      <Text style={styles.statTextHighlight}>{item.rating}</Text>
                      <Text style={styles.statTextSub}>({item.reviews})</Text>
                    </View>
                  </View>

                  <View style={styles.labInfoGrid}>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Est. Time</Text>
                      <Text style={styles.infoValue}>{item.time}</Text>
                    </View>
                    <View style={styles.infoCol}>
                      <Text style={styles.infoLabel}>Pricing</Text>
                      <Text style={styles.infoValue}>{item.price}</Text>
                    </View>
                  </View>

                  {/* Selection Indicator */}
                  <View style={[styles.labSelectBtn, isSelected && styles.labSelectBtnActive]}>
                    <Text style={[styles.labSelectBtnText, isSelected && styles.labSelectBtnTextActive]}>
                      {isSelected ? 'Selected' : 'Select Lab'}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#FFF" style={{ marginLeft: 6 }} />}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* STICKY FOOTER */}
      <View style={[styles.stickyFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Button
          title={partnerType === 'dice' ? 'Proceed with Dice' : 'Confirm Selected Lab'}
          onPress={handleSubmit}
          loading={loading}
          disabled={!partnerType || (partnerType === 'custom' && !selectedLabId)}
          fullWidth
          size="lg"
          icon={<Ionicons name="flask" size={18} color="#FFFFFF" />}
        />
      </View>

      {/* CUSTOM SUCCESS MODAL */}
      <Modal visible={isSuccessModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>Success!</Text>
            <Text style={styles.successText}>
              Your testing application has been successfully submitted and is now under review.
            </Text>
            
            <View style={styles.modalActionRow}>
              <TouchableOpacity 
                style={styles.modalPrimaryBtn}
                onPress={() => {
                  setSuccessModalVisible(false);
                  navigation.goBack();
                }}
              >
                <Text style={styles.modalPrimaryBtnText}>Go to Testing</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
      paddingTop: 12,
      paddingBottom: 24,
    },
    backBtn: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: isDark ? colors.bgCardLight : '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: isDark ? 0 : 1,
      borderColor: 'rgba(0,0,0,0.05)',
      ...Shadows.sm,
    },
    headerTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    headerSub: { fontSize: 13, fontWeight: '600', color: colors.primary, marginTop: 4, letterSpacing: 0.5 },
    content: { paddingBottom: 40 },
    
    sectionLabel: {
      fontSize: 13,
      fontWeight: '800',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      marginBottom: 16,
      paddingHorizontal: 20,
    },
    
    // Premium Card Styles
    premiumCard: {
      backgroundColor: isDark ? colors.bgCardLight : '#FFFFFF',
      borderRadius: 24,
      padding: 24,
      marginHorizontal: 20,
      borderWidth: 2,
      borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      overflow: 'hidden',
      position: 'relative',
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 20,
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recommendedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'rgba(16, 185, 129, 0.2)',
      alignSelf: 'flex-start',
    },
    recommendedText: {
      color: '#10B981',
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    optionTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 6,
    },
    optionDesc: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    unselectedCircle: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 2,
      borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Divider
    dividerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginVertical: 32,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    },
    dividerText: {
      paddingHorizontal: 16,
      fontSize: 12,
      fontWeight: '800',
      color: colors.textTertiary,
      letterSpacing: 1.5,
    },

    // Marketplace Styles
    marketplaceSection: {
    },
    marketplaceHeader: {
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    marketplaceTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    marketplaceSub: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    carouselContainer: {
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    labCard: {
      width: 280,
      backgroundColor: isDark ? colors.bgCardLight : '#FFFFFF',
      borderRadius: 20,
      padding: 20,
      marginRight: 16,
      borderWidth: 2,
      borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      ...Shadows.md,
    },
    labCardActive: {
      borderColor: colors.primary,
    },
    labCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    labIconBox: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    labTypeBadge: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    labTypeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.textSecondary,
      textTransform: 'uppercase',
    },
    labName: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    labStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    statBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#FFFBEB',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    statTextHighlight: {
      fontSize: 14,
      fontWeight: '800',
      color: '#F59E0B',
      marginLeft: 6,
      marginRight: 4,
    },
    statTextSub: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    labInfoGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFC',
      padding: 12,
      borderRadius: 12,
      marginBottom: 20,
    },
    infoCol: {},
    infoLabel: {
      fontSize: 11,
      color: colors.textTertiary,
      textTransform: 'uppercase',
      fontWeight: '700',
      marginBottom: 4,
    },
    infoValue: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    labSelectBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
    },
    labSelectBtnActive: {
      backgroundColor: colors.primary,
    },
    labSelectBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    labSelectBtnTextActive: {
      color: '#FFFFFF',
    },

    stickyFooter: {
      paddingHorizontal: 20,
      paddingTop: 16,
      backgroundColor: isDark ? colors.bgDark : '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      ...Shadows.md,
    },
    
    // Success Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    successCard: {
      width: '100%',
      backgroundColor: isDark ? colors.bgCardLight : '#FFFFFF',
      borderRadius: 24, 
      paddingTop: 40,
      paddingBottom: 32,
      paddingHorizontal: 24,
      alignItems: 'center',
      ...Shadows.lg,
      position: 'relative',
    },
    closeModalBtn: {
      position: 'absolute',
      top: 16,
      right: 16,
      padding: 8,
    },
    successTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.textPrimary,
      marginBottom: 12,
      textAlign: 'center',
    },
    successText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 16,
      marginBottom: 32,
    },
    modalActionRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      width: '100%',
    },
    modalPrimaryBtn: {
      backgroundColor: '#10B981', 
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: 100, 
      width: '80%',
      alignItems: 'center',
      justifyContent: 'center',
      ...Shadows.md,
    },
    modalPrimaryBtnText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
  });

export default ChooseLabScreen;
