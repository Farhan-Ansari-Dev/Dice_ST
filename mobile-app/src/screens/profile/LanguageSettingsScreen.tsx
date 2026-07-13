import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import { useLanguageStore } from '../../store/languageStore';

type Language = 'en' | 'hi' | 'ta';

const LANGUAGES: { id: Language | string; name: string; nativeName: string; flag: string; supported: boolean }[] = [
  { id: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', supported: true },
  { id: 'hi', name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳', supported: true },
  { id: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳', supported: true },
  { id: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳', supported: false },
  { id: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳', supported: false },
  { id: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳', supported: false },
];

const LanguageSettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { language, setLanguage } = useLanguageStore();
  const [selected, setSelected] = useState<string>(language);
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Language</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Select your preferred language for the app interface.</Text>

        <View style={[styles.listCard, Shadows.md]}>
          <LinearGradient
            colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
            style={styles.listCardInner}
          >
            {LANGUAGES.map((lang, index) => (
              <View key={lang.id}>
                {index > 0 && <View style={styles.divider} />}
                <TouchableOpacity
                  style={styles.langRow}
                  onPress={() => {
                    if (!lang.supported) {
                      Alert.alert('Coming Soon', `${lang.name} support is coming in a future update.`);
                      return;
                    }
                    setSelected(lang.id);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.flag}>{lang.flag}</Text>
                  <View style={styles.langInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.langName, !lang.supported && { color: colors.textTertiary }]}>{lang.name}</Text>
                      {!lang.supported && (
                        <View style={{ backgroundColor: `${colors.warning}20`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: BorderRadius.full }}>
                          <Text style={{ fontSize: 9, fontWeight: '700', color: colors.warning }}>SOON</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.langNative}>{lang.nativeName}</Text>
                  </View>
                  {selected === lang.id ? (
                    <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.checkCircle}>
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    </LinearGradient>
                  ) : (
                    <View style={styles.emptyCircle} />
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </LinearGradient>
        </View>

        <TouchableOpacity
          style={[styles.applyBtn, Shadows.md]}
          activeOpacity={0.85}
          onPress={async () => {
            if (selected === 'en' || selected === 'hi' || selected === 'ta') {
              await setLanguage(selected as Language);
              Alert.alert('Language Updated', `App language set to ${LANGUAGES.find((l) => l.id === selected)?.name ?? selected}.`);
            }
          }}
        >
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.applyBtnGradient}>
            <Text style={styles.applyBtnText}>Apply Language</Text>
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
    subtitle: { fontSize: 14, color: colors.textSecondary, lineHeight: 22, marginBottom: 20 },
    listCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, marginBottom: 20 },
    listCardInner: { padding: 4 },
    langRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 16 },
    flag: { fontSize: 26 },
    langInfo: { flex: 1 },
    langName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
    langNative: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    checkCircle: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    emptyCircle: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: isDark ? 'rgba(255,255,255,0.15)' : colors.border },
    divider: { height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border, marginHorizontal: 16 },
    applyBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
    applyBtnGradient: { alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
    applyBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  });

export default LanguageSettingsScreen;
