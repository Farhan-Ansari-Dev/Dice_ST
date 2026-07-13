import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const ThemeSettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [selected, setSelected] = useState<'dark' | 'light' | 'system'>('dark');
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const THEMES = [
    {
      id: 'dark' as const,
      title: 'Dark Mode',
      description: 'Easier on eyes in low light',
      icon: 'moon' as const,
      previewColors: ['#0E0F1A', '#1A1B2E', '#6C63FF'],
    },
    {
      id: 'light' as const,
      title: 'Light Mode',
      description: 'Bright and crisp for daylight use',
      icon: 'sunny' as const,
      previewColors: ['#F5F6FA', '#FFFFFF', '#6C63FF'],
    },
    {
      id: 'system' as const,
      title: 'System Default',
      description: 'Follows your device settings',
      icon: 'phone-portrait' as const,
      previewColors: ['#1A1B2E', '#FFFFFF', '#6C63FF'],
    },
  ];

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
        <Text style={styles.headerTitle}>Theme</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Choose how the app looks. Your selection will be remembered.</Text>

        <View style={styles.themesGrid}>
          {THEMES.map((theme) => {
            const isSelected = selected === theme.id;
            return (
              <TouchableOpacity
                key={theme.id}
                style={[styles.themeCard, Shadows.md, isSelected && styles.themeCardSelected]}
                onPress={() => setSelected(theme.id)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
                  style={styles.themeCardInner}
                >
                  {/* Preview */}
                  <View style={styles.preview}>
                    <View style={[styles.previewBg, { backgroundColor: theme.previewColors[0] }]}>
                      <View style={[styles.previewCard, { backgroundColor: theme.previewColors[1] }]}>
                        <View style={[styles.previewAccent, { backgroundColor: theme.previewColors[2] }]} />
                      </View>
                    </View>
                  </View>

                  <View style={styles.themeInfo}>
                    <View style={styles.themeNameRow}>
                      <Ionicons name={theme.icon} size={18} color={isSelected ? colors.primary : colors.textSecondary} />
                      <Text style={[styles.themeName, isSelected && { color: colors.primary }]}>{theme.title}</Text>
                    </View>
                    <Text style={styles.themeDesc}>{theme.description}</Text>
                  </View>

                  {isSelected && (
                    <View style={[styles.selectedCheck, { backgroundColor: `${colors.primary}20` }]}>
                      <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>
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
    subtitle: { fontSize: 14, color: colors.textSecondary, lineHeight: 22, marginBottom: 24 },
    themesGrid: { gap: 16 },
    themeCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 2, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    themeCardSelected: { borderColor: colors.primary },
    themeCardInner: { padding: 16, position: 'relative' },
    preview: { marginBottom: 14, borderRadius: BorderRadius.md, overflow: 'hidden' },
    previewBg: { height: 80, padding: 10, borderRadius: BorderRadius.md },
    previewCard: { height: 50, borderRadius: 8, padding: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    previewAccent: { width: 40, height: 8, borderRadius: 4 },
    themeInfo: { gap: 4 },
    themeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    themeName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    themeDesc: { fontSize: 12, color: colors.textSecondary },
    selectedCheck: { position: 'absolute', top: 12, right: 12, borderRadius: 14, padding: 2 },
  });

export default ThemeSettingsScreen;
