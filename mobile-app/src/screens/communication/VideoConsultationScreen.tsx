import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import Avatar from '../../components/common/Avatar';
import { api } from '../../services/api';

const EXPERTS = [
  { id: 'scs-boby-kumar', name: 'Boby Kumar', spec: 'Operations Manager', exp: 'Application and service support', available: true },
  { id: 'scs-sunil-kumar', name: 'Sunil Kumar', spec: 'Technical Manager', exp: 'Technical compliance guidance', available: true },
];
const getDateKey = (offset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};
const formatSlot = (value: string) => new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const VideoConsultationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [selectedExpert, setSelectedExpert] = useState<string | null>(EXPERTS[0].id);
  const [selectedDate, setSelectedDate] = useState(getDateKey(0));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [booking, setBooking] = useState(false);

  const dates = useMemo(() => Array.from({ length: 5 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return { key: getDateKey(index), weekday: date.toLocaleDateString([], { weekday: 'short' }), day: date.getDate() };
  }), []);

  useEffect(() => {
    let isActive = true;
    setLoadingSlots(true);
    setSelectedSlot(null);
    api.get<any>(`/meetings/availability?date=${selectedDate}&consultant_id=${selectedExpert}`)
      .then((response) => {
        if (isActive) setSlots(response?.data?.slots ?? []);
      })
      .catch(() => {
        if (isActive) setSlots([]);
      })
      .finally(() => {
        if (isActive) setLoadingSlots(false);
      });
    return () => { isActive = false; };
  }, [selectedDate, selectedExpert]);

  const bookMeeting = async () => {
    if (!selectedSlot || booking) return;
    setBooking(true);
    try {
      const response = await api.post<any>('/meetings', {
        starts_at: selectedSlot,
        consultant_id: selectedExpert,
        topic: 'Compliance consultation',
      });
      const bookingData = response?.data;
      Alert.alert('Meeting confirmed', bookingData?.meeting_message ?? 'Your meeting has been booked.');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Unable to book', error?.response?.data?.message ?? 'The selected time is no longer available. Please choose another slot.');
    } finally {
      setBooking(false);
    }
  };

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book a Meeting</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={[styles.heroCard, Shadows.sm]}>
          <Ionicons name="logo-google" size={20} color="#FFFFFF" />
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Google Meet consultation</Text>
            <Text style={styles.heroSubtitle}>30 minutes with the specialist you choose</Text>
          </View>
        </LinearGradient>
        <Text style={styles.sectionTitle}>Choose a specialist</Text>
        {EXPERTS.map(e => (
          <TouchableOpacity key={e.id} style={[styles.expertCard, Shadows.sm, selectedExpert === e.id && { borderColor: colors.primary }]} onPress={() => e.available && setSelectedExpert(e.id)} activeOpacity={0.85}>
            <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF','#F7F8FC']} style={styles.expertCardInner}>
              <Avatar name={e.name} size="md" online={e.available} />
              <View style={{ flex: 1 }}>
                <Text style={styles.expertName}>{e.name}</Text>
                <Text style={styles.expertSpec}>{e.spec}</Text>
                <Text style={styles.expertRate}>{e.exp}</Text>
              </View>
              {!e.available && <View style={[styles.unavailBadge, { backgroundColor: `${colors.textTertiary}20` }]}><Text style={[styles.unavailText, { color: colors.textTertiary }]}>Unavailable</Text></View>}
              {selectedExpert === e.id && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
            </LinearGradient>
          </TouchableOpacity>
        ))}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Choose a day</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.datesRow}>
          {dates.map((date) => (
            <TouchableOpacity key={date.key} onPress={() => setSelectedDate(date.key)} style={[styles.dateChip, selectedDate === date.key && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
              <Text style={[styles.dateWeekday, selectedDate === date.key && styles.dateTextSelected]}>{date.weekday}</Text>
              <Text style={[styles.dateNumber, selectedDate === date.key && styles.dateTextSelected]}>{date.day}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={styles.sectionTitle}>Available times</Text>
        <View style={styles.slotsGrid}>
          {loadingSlots ? <Text style={styles.slotMessage}>Checking availability...</Text> : slots.filter((slot) => slot.available).map(slot => (
            <TouchableOpacity key={slot.id} style={[styles.slot, selectedSlot === slot.starts_at && { borderColor: colors.primary, backgroundColor: `${colors.primary}18` }]} onPress={() => setSelectedSlot(slot.starts_at)}>
              <Text style={[styles.slotText, selectedSlot === slot.starts_at && { color: colors.primary, fontWeight: '700' }]}>{formatSlot(slot.starts_at)}</Text>
            </TouchableOpacity>
          ))}
          {!loadingSlots && slots.filter((slot) => slot.available).length === 0 && <Text style={styles.slotMessage}>No slots are available for this day.</Text>}
        </View>
        <TouchableOpacity style={[styles.bookBtn, Shadows.md, (!selectedExpert || !selectedSlot || booking) && { opacity: 0.5 }]} disabled={!selectedExpert || !selectedSlot || booking} onPress={bookMeeting}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.bookBtnGrad}>
            <Ionicons name="calendar" size={18} color="#FFFFFF" />
            <Text style={styles.bookBtnText}>{booking ? 'Booking meeting...' : 'Confirm Google Meet'}</Text>
          </LinearGradient>
        </TouchableOpacity>
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
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: BorderRadius.lg, marginBottom: 22 },
  heroTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  heroSubtitle: { color: 'rgba(255,255,255,0.74)', fontSize: 12, marginTop: 3 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  expertCard: { borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, marginBottom: 10 },
  expertCardInner: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  expertName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  expertSpec: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
  expertRate: { fontSize: 13, color: colors.primary, fontWeight: '600', marginTop: 2 },
  unavailBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  unavailText: { fontSize: 11, fontWeight: '500' },
  datesRow: { gap: 10, paddingBottom: 18 },
  dateChip: { width: 58, height: 64, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border, backgroundColor: isDark ? colors.bgCard : '#FFFFFF' },
  dateWeekday: { fontSize: 11, color: colors.textTertiary, fontWeight: '600' },
  dateNumber: { fontSize: 18, color: colors.textPrimary, fontWeight: '800', marginTop: 2 },
  dateTextSelected: { color: '#FFFFFF' },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  slot: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border },
  slotText: { fontSize: 13, color: colors.textSecondary },
  slotMessage: { width: '100%', color: colors.textTertiary, fontSize: 13, paddingVertical: 12 },
  bookBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
  bookBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  bookBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
export default VideoConsultationScreen;
