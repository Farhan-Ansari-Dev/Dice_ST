import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import Avatar from '../../components/common/Avatar';

const EXPERTS: any[] = [];

const ContactExpertScreen: React.FC = () => {
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
        <Text style={styles.headerTitle}>Our Experts</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {EXPERTS.map((exp, i) => (
          <View key={i} style={[styles.card, Shadows.sm]}>
            <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF','#F7F8FC']} style={styles.cardInner}>
              <View style={styles.topRow}>
                <Avatar name={exp.name} size="lg" online={exp.avail.includes('Now')} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{exp.name}</Text>
                  <Text style={styles.spec}>{exp.spec} • {exp.exp}</Text>
                  <Text style={[styles.avail, { color: exp.avail.includes('Now') ? colors.success : colors.warning }]}>{exp.avail}</Text>
                </View>
              </View>
              <View style={styles.certs}>
                {(exp.certs || []).map((c: string) => (
                  <View key={c} style={[styles.certBadge, { backgroundColor: `${exp.color}18` }]}>
                    <Text style={[styles.certBadgeText, { color: exp.color }]}>{c}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.primary }]} onPress={() => navigation.navigate('LiveChat')}>
                  <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
                  <Text style={[styles.actionText, { color: colors.primary }]}>Chat</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.success }]} onPress={() => Alert.alert('Calling', `Connecting to ${exp.name}...`)}>
                  <Ionicons name="call-outline" size={16} color={colors.success} />
                  <Text style={[styles.actionText, { color: colors.success }]}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.secondary }]} onPress={() => navigation.navigate('VideoConsultation')}>
                  <Ionicons name="videocam-outline" size={16} color={colors.secondary} />
                  <Text style={[styles.actionText, { color: colors.secondary }]}>Video</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        ))}
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
};
const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDark },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? colors.bgCardLight : colors.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  card: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, marginBottom: 14 },
  cardInner: { padding: 16, gap: 12 },
  topRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  spec: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
  avail: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  certs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  certBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  certBadgeText: { fontSize: 11, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  actionText: { fontSize: 13, fontWeight: '600' },
});
export default ContactExpertScreen;
