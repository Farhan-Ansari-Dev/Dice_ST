import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius } from '../../theme';
import Avatar from '../../components/common/Avatar';
import { api } from '../../services/api';

const MESSAGES: any[] = [];

const LiveChatScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [msg, setMsg] = useState('');
  const [messages, setMessages] = useState(MESSAGES);
  const [raisingTicket, setRaisingTicket] = useState(false);
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const send = () => {
    if (!msg.trim()) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), from: 'me', text: msg.trim(), time: 'Now' }]);
    setMsg('');
  };
  const raiseTicketFromChat = async () => {
    const description = messages.filter((message: any) => message.from === 'me').map((message: any) => message.text).join('\n');
    if (!description) {
      Alert.alert('Send a message first', 'Tell us what you need help with, then create a ticket from this chat.');
      return;
    }
    setRaisingTicket(true);
    try {
      const response = await api.post<any>('/support-tickets', { subject: 'Support request from live chat', description, category: 'General', priority: 'medium', source: 'live_chat' });
      Alert.alert('Ticket created', `Ticket ${response?.data?.ticket_number ?? ''} was created from this conversation.`);
    } catch (error: any) {
      Alert.alert('Unable to create ticket', error?.response?.data?.message ?? 'Please try again.');
    } finally {
      setRaisingTicket(false);
    }
  };
  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Avatar name="Boby Kumar" size="sm" online />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Boby Kumar</Text>
          <Text style={styles.headerSub}>Operations Manager • Online</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn}>
          <Ionicons name="call-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity accessibilityLabel="Create support ticket" style={styles.iconBtn} onPress={raiseTicketFromChat} disabled={raisingTicket}>
          <Ionicons name="ticket-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('VideoConsultation')}>
          <Ionicons name="videocam-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.msgs}>
        {messages.map(m => (
          <View key={m.id} style={[styles.msgRow, m.from === 'me' && styles.msgRowMe]}>
            {m.from === 'other' && <Avatar name="Boby Kumar" size="xs" />}
            <View style={[styles.bubble, m.from === 'me' ? styles.bubbleMe : styles.bubbleOther]}>
              <Text style={[styles.bubbleText, m.from === 'me' && { color: '#FFFFFF' }]}>{m.text}</Text>
              <Text style={[styles.bubbleTime, m.from === 'me' && { color: 'rgba(255,255,255,0.6)' }]}>{m.time}</Text>
            </View>
          </View>
        ))}
        <View style={{ height: 8 }} />
      </ScrollView>
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={styles.attachBtn}>
          <Ionicons name="attach" size={22} color={colors.textTertiary} />
        </TouchableOpacity>
        <TextInput style={styles.input} value={msg} onChangeText={setMsg} placeholder="Type a message..." placeholderTextColor={colors.textTertiary} multiline />
        <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.primary }]} onPress={send}>
          <Ionicons name="send" size={18} color="#FFFFFF" />
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
