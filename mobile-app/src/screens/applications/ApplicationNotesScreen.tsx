import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const NOTES: any[] = [];

const ApplicationNotesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Team Notes</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {NOTES.map((note) => (
          <View key={note.id} style={[styles.noteCard, Shadows.sm]}>
            <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.noteCardInner}>
              <View style={styles.noteHeader}>
                <View style={[styles.authorAvatar, { backgroundColor: `${note.color}20` }]}>
                  <Text style={[styles.authorInitials, { color: note.color }]}>{note.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.authorName}>{note.author}</Text>
                  <Text style={styles.authorRole}>{note.role} • {note.time}</Text>
                </View>
              </View>
              <Text style={styles.noteText}>{note.note}</Text>
            </LinearGradient>
          </View>
        ))}
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
    noteCard: { marginBottom: 12, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    noteCardInner: { padding: 16 },
    noteHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    authorAvatar: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    authorInitials: { fontSize: 13, fontWeight: '800' },
    authorName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    authorRole: { fontSize: 11, color: colors.textTertiary, marginTop: 1 },
    noteText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  });

export default ApplicationNotesScreen;
