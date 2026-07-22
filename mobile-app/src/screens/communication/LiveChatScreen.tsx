import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius } from '../../theme';
import Avatar from '../../components/common/Avatar';
import supportService, { TicketMessage } from '../../services/supportService';
import { useAuthStore } from '../../store/authStore';

const LiveChatScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const route = useRoute<any>();

  const [msg, setMsg] = useState('');
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [ticketId, setTicketId] = useState<string | undefined>(route.params?.ticketId);
  const [ticketNumber, setTicketNumber] = useState<string | undefined>(route.params?.ticketNumber);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  /**
   * Live chat is backed by a support ticket, so the conversation persists and
   * appears in the Admin Panel. Reuses the most recent open live_chat ticket
   * rather than opening a new one on every visit.
   */
  const ensureTicket = useCallback(async (): Promise<string> => {
    if (ticketId) return ticketId;
    const mine = await supportService.myTickets();
    const existing = mine.find((t) => t.source === 'live_chat' && t.status !== 'closed');
    if (existing) {
      setTicketId(existing._id);
      setTicketNumber(existing.ticket_number);
      return existing._id;
    }
    const created = await supportService.createTicket({
      subject: 'Live chat with support',
      description: 'Conversation started from the in-app live chat.',
      category: 'General',
      source: 'live_chat',
    });
    setTicketId(created._id);
    setTicketNumber(created.ticket_number);
    return created._id;
  }, [ticketId]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const id = await ensureTicket();
        if (!active) return;
        const history = await supportService.getMessages(id);
        if (!active) return;
        setMessages(history);
        supportService.joinTicket(id);
        await supportService.markRead(id);
      } catch (err: any) {
        Alert.alert('Chat unavailable', err?.response?.data?.message ?? 'Could not open the conversation. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [ensureTicket]);

  // Realtime: new messages and the peer's typing indicator.
  useEffect(() => {
    if (!ticketId) return;

    const onMessage = (incoming: TicketMessage) => {
      if (String(incoming.ticket_id) !== String(ticketId)) return;
      setMessages((prev) => (prev.some((m) => m._id === incoming._id) ? prev : [...prev, incoming]));
      supportService.markRead(ticketId).catch(() => {});
    };
    const onTyping = (p: { ticketId: string; userId: string }) => {
      if (p.ticketId !== ticketId || p.userId === user?.id) return;
      setPeerTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setPeerTyping(false), 2500);
    };

    supportService.onMessage(onMessage);
    supportService.onTyping(onTyping);
    return () => {
      supportService.off('ticket:message', onMessage);
      supportService.off('ticket:typing', onTyping);
      supportService.leaveTicket(ticketId);
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, [ticketId, user?.id]);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [messages, peerTyping]);

  const handleTyping = (value: string) => {
    setMsg(value);
    if (ticketId && user?.id) supportService.sendTyping(ticketId, user.id, user.name);
  };

  const send = async () => {
    const text = msg.trim();
    if (!text || sending) return;
    setSending(true);
    setMsg('');
    try {
      const id = await ensureTicket();
      const saved = await supportService.sendMessage(id, text);
      setMessages((prev) => (prev.some((m) => m._id === saved._id) ? prev : [...prev, saved]));
    } catch (err: any) {
      setMsg(text);   // restore so the user does not lose what they typed
      Alert.alert('Not sent', err?.response?.data?.message ?? 'Your message could not be sent. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const raiseTicketFromChat = () => {
    if (!ticketNumber) {
      Alert.alert('Send a message first', 'Start the conversation and a ticket will be created automatically.');
      return;
    }
    Alert.alert('Ticket', `This conversation is tracked as ticket ${ticketNumber}. Our team can see every message here.`);
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Avatar name="DICE Support" size="sm" online />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>DICE Support</Text>
          <Text style={styles.headerSub}>
            {peerTyping ? 'Typing…' : ticketNumber ? `Ticket ${ticketNumber}` : 'Connecting…'}
          </Text>
        </View>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="call-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity accessibilityLabel="Create support ticket" style={styles.iconBtn} onPress={raiseTicketFromChat}>
          <Ionicons name="ticket-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('VideoConsultation')}>
          <Ionicons name="videocam-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={styles.msgs}>
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center', gap: 10 }}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.bubbleTime}>Loading conversation…</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={{ paddingVertical: 40, alignItems: 'center', paddingHorizontal: 24 }}>
            <Ionicons name="chatbubbles-outline" size={30} color={colors.textTertiary} />
            <Text style={[styles.bubbleTime, { textAlign: 'center', marginTop: 8 }]}>
              Send a message and our support team will reply here.
            </Text>
          </View>
        ) : messages.map((m) => {
          const mine = m.sender_role === 'user';
          return (
            <View key={m._id} style={[styles.msgRow, mine && styles.msgRowMe]}>
              {!mine && <Avatar name={typeof m.sender_id === 'object' ? m.sender_id.name : 'Support'} size="xs" />}
              <View style={[styles.bubble, mine ? styles.bubbleMe : styles.bubbleOther]}>
                <Text style={[styles.bubbleText, mine && { color: '#FFFFFF' }]}>{m.body}</Text>
                <Text style={[styles.bubbleTime, mine && { color: 'rgba(255,255,255,0.6)' }]}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {mine && m.read_by.length > 1 ? '  ✓✓' : ''}
                </Text>
              </View>
            </View>
          );
        })}
        {peerTyping && (
          <View style={styles.msgRow}>
            <Avatar name="DICE Support" size="xs" />
            <View style={[styles.bubble, styles.bubbleOther]}>
              <Text style={styles.bubbleTime}>Typing…</Text>
            </View>
          </View>
        )}
        <View style={{ height: 8 }} />
      </ScrollView>
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={styles.attachBtn}>
          <Ionicons name="attach" size={22} color={colors.textTertiary} />
        </TouchableOpacity>
        <TextInput style={styles.input} value={msg} onChangeText={handleTyping} placeholder="Type a message..." placeholderTextColor={colors.textTertiary} multiline />
        <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.primary, opacity: sending ? 0.6 : 1 }]} onPress={send} disabled={sending}>
          <Ionicons name={sending ? "hourglass-outline" : "send"} size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};
const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDark },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: isDark ? colors.bgCardLight : colors.border, alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: isDark ? colors.bgCardLight : colors.border, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  headerSub: { fontSize: 11, color: colors.success },
  msgs: { paddingHorizontal: 16, paddingTop: 16 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12 },
  msgRowMe: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '75%', borderRadius: 16, padding: 12 },
  bubbleMe: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: isDark ? colors.bgCard : '#FFFFFF', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
  bubbleText: { fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  bubbleTime: { fontSize: 10, color: colors.textTertiary, marginTop: 4, textAlign: 'right' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border, backgroundColor: isDark ? colors.bgDark : '#FFFFFF' },
  attachBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, minHeight: 36, maxHeight: 100, backgroundColor: isDark ? colors.bgCard : colors.border, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, color: colors.textPrimary },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
export default LiveChatScreen;
