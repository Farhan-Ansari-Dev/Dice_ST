import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const AddCardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [saveCard, setSaveCard] = useState(true);
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.substring(0, 19);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Card</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* Card Preview */}
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={[styles.cardPreview, Shadows.md]}>
            <Text style={styles.cardBank}>VISA</Text>
            <Text style={styles.cardNumberPreview}>{cardNumber || '•••• •••• •••• ••••'}</Text>
            <View style={styles.cardBottom}>
              <View>
                <Text style={styles.cardFieldLabel}>CARDHOLDER</Text>
                <Text style={styles.cardFieldValue}>{cardHolder || 'YOUR NAME'}</Text>
              </View>
              <View>
                <Text style={styles.cardFieldLabel}>EXPIRES</Text>
                <Text style={styles.cardFieldValue}>{expiry || 'MM/YY'}</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={[styles.formCard, Shadows.md]}>
            <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.formCardInner}>
              {[
                { label: 'Card Number', value: cardNumber, setter: (v: string) => setCardNumber(formatCardNumber(v)), placeholder: '1234 5678 9012 3456', keyboard: 'number-pad' as const, icon: 'card-outline' as const },
                { label: 'Cardholder Name', value: cardHolder, setter: setCardHolder, placeholder: 'As on card', keyboard: 'default' as const, icon: 'person-outline' as const },
                { label: 'Expiry Date', value: expiry, setter: setExpiry, placeholder: 'MM/YY', keyboard: 'number-pad' as const, icon: 'calendar-outline' as const },
                { label: 'CVV', value: cvv, setter: setCvv, placeholder: '•••', keyboard: 'number-pad' as const, icon: 'lock-closed-outline' as const },
              ].map((field) => (
                <View key={field.label} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name={field.icon} size={18} color={colors.textTertiary} />
                    <TextInput
                      style={styles.input}
                      value={field.value}
                      onChangeText={field.setter}
                      placeholder={field.placeholder}
                      placeholderTextColor={colors.textTertiary}
                      keyboardType={field.keyboard}
                      secureTextEntry={field.label === 'CVV'}
                      maxLength={field.label === 'Card Number' ? 19 : field.label === 'CVV' ? 4 : undefined}
                    />
                  </View>
                </View>
              ))}

              <View style={styles.saveCardRow}>
                <View>
                  <Text style={styles.saveCardTitle}>Save Card</Text>
                  <Text style={styles.saveCardSubtitle}>Save securely for future payments</Text>
                </View>
                <Switch
                  value={saveCard}
                  onValueChange={setSaveCard}
                  trackColor={{ false: colors.bgCardLight, true: `${colors.primary}60` }}
                  thumbColor={saveCard ? colors.primary : colors.textTertiary}
                />
              </View>
            </LinearGradient>
          </View>

          <TouchableOpacity style={[styles.addBtn, Shadows.md]} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.addBtnGradient}>
              <Text style={styles.addBtnText}>Add Card</Text>
            </LinearGradient>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? colors.bgCardLight : colors.border, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    content: { paddingHorizontal: 20, paddingTop: 8 },
    cardPreview: { borderRadius: BorderRadius.lg, padding: 20, marginBottom: 20, minHeight: 160 },
    cardBank: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', textAlign: 'right', marginBottom: 24 },
    cardNumberPreview: { fontSize: 18, color: '#FFFFFF', letterSpacing: 2, marginBottom: 24 },
    cardBottom: { flexDirection: 'row', justifyContent: 'space-between' },
    cardFieldLabel: { fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: '700', letterSpacing: 1, marginBottom: 2 },
    cardFieldValue: { fontSize: 13, color: '#FFFFFF', fontWeight: '600' },
    formCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, marginBottom: 16 },
    formCardInner: { padding: 20 },
    fieldGroup: { marginBottom: 16 },
    fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.bgCardLight, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border, paddingHorizontal: 14, paddingVertical: 12 },
    input: { flex: 1, fontSize: 14, color: colors.textPrimary, padding: 0 },
    saveCardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 },
    saveCardTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    saveCardSubtitle: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
    addBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
    addBtnGradient: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
    addBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  });

export default AddCardScreen;
