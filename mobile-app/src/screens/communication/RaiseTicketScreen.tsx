import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { api } from '../../services/api';

const CATEGORIES = ['Application Issue', 'Payment Problem', 'Document Error', 'Technical Bug', 'Certification Query', 'General'];
const PRIORITIES = [{ id: 'low', label: 'Low', color: '#00C896' }, { id: 'medium', label: 'Medium', color: '#F59E0B' }, { id: 'high', label: 'High', color: '#EF4444' }];

const RaiseTicketScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [priority, setPriority] = useState('medium');
  const [loading, setLoading] = useState(false);
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) { Alert.alert('Required', 'Please enter a subject and description'); return; }
    setLoading(true);
    try {
      const response = await api.post<any>('/support-tickets', { subject, description, category, priority, source: 'support_center' });
      const ticket = response?.data;
      Alert.alert('Ticket Raised', `Ticket ${ticket?.ticket_number ?? ''} has been submitted. Our team will respond within 24 hours.`, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error: any) {
      Alert.alert('Unable to raise ticket', error?.response?.data?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Raise a Ticket</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.section, Shadows.sm]}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF','#F7F8FC']} style={styles.sectionInner}>
            <Text style={styles.sectionTitle}>Category</Text>
            <View style={styles.chips}>
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c} style={[styles.chip, category === c && { backgroundColor: `${colors.primary}18`, borderColor: colors.primary }]} onPress={() => setCategory(c)}>
                  <Text style={[styles.chipText, category === c && { color: colors.primary }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </LinearGradient>
        </View>
        <View style={[styles.section, Shadows.sm]}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF','#F7F8FC']} style={styles.sectionInner}>
            <Text style={styles.sectionTitle}>Priority</Text>
            <View style={styles.priorityRow}>
              {PRIORITIES.map(p => (
                <TouchableOpacity key={p.id} style={[styles.priorityBtn, priority === p.id && { backgroundColor: `${p.color}18`, borderColor: p.color }]} onPress={() => setPriority(p.id)}>
                  <View style={[styles.priorityDot, { backgroundColor: p.color }]} />
                  <Text style={[styles.priorityText, priority === p.id && { color: p.color }]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </LinearGradient>
        </View>
        <View style={[styles.section, Shadows.sm]}>
          <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF','#F7F8FC']} style={styles.sectionInner}>
            <Text style={styles.sectionTitle}>Details</Text>
            <Input label="Subject" value={subject} onChangeText={setSubject} placeholder="Brief summary of the issue" required leftIcon={<Ionicons name="create-outline" size={18} color={colors.textTertiary} />} />
            <Input label="Description" value={description} onChangeText={setDescription} placeholder="Describe the issue in detail..." multiline numberOfLines={5} leftIcon={<Ionicons name="document-text-outline" size={18} color={colors.textTertiary} />} />
          </LinearGradient>
        </View>
        <Button title="Submit Ticket" onPress={handleSubmit} loading={loading} fullWidth size="lg" style={{ marginBottom: 20 }} />
        <View style={{ height: 40 }} />
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
  section: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, marginBottom: 14 },
  sectionInner: { padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border },
  chipText: { fontSize: 13, color: colors.textSecondary },
  priorityRow: { flexDirection: 'row', gap: 10 },
  priorityBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  priorityText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
});
export default RaiseTicketScreen;
