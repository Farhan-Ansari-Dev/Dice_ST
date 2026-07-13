import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const SAVED_METHODS: any[] = [];

const PaymentMethodsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [methods, setMethods] = useState(SAVED_METHODS);
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const deleteMethod = (id: string) => {
    Alert.alert('Remove', 'Remove this payment method?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setMethods((prev) => prev.filter((m) => m.id !== id)) },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Your saved payment methods</Text>

        {methods.map((method) => (
          <View key={method.id} style={[styles.methodCard, Shadows.sm]}>
            <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.methodCardInner}>
              <View style={[styles.methodIcon, { backgroundColor: `${method.color}20` }]}>
                <Ionicons name={method.icon} size={22} color={method.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.methodTitle}>{method.title}</Text>
                <Text style={styles.methodSubtitle}>{method.subtitle}</Text>
              </View>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteMethod(method.id)}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        ))}

        <TouchableOpacity style={[styles.addBtn, Shadows.md]} onPress={() => navigation.navigate('AddCard')} activeOpacity={0.85}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.addBtnGradient}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Add New Payment Method</Text>
          </LinearGradient>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? colors.bgCardLight : colors.border, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    content: { paddingHorizontal: 20, paddingTop: 8 },
    subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 16 },
    methodCard: { marginBottom: 10, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    methodCardInner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
    methodIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    methodTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    methodSubtitle: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
    deleteBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: `${colors.error}15`, alignItems: 'center', justifyContent: 'center' },
    addBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden', marginTop: 8 },
    addBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
    addBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  });

export default PaymentMethodsScreen;
