import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, BorderRadius, Shadows } from '../../theme';
import aiAssistantService from '../../services/aiAssistantService';
import { useAiConsent } from '../../components/ai/AiConsentProvider';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text?: string;
  action?: any;
  isTyping?: boolean;
  /** Rendered as a failure notice, visually distinct from an answer. */
  isError?: boolean;
}

const AISearchScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const flatListRef = useRef<FlatList>(null);
  const { run } = useAiConsent();

  const initialQuery = route.params?.query || '';

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'ai',
      text: 'Hello! I am Dice AI, your intelligent compliance and certification assistant powered by Sanyog Conformity Solutions. How can I assist you today?',
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  // Server-assigned thread id, so follow-up questions keep their context.
  const [conversationId, setConversationId] = useState<string | undefined>();

  useEffect(() => {
    if (initialQuery) {
      handleSend(initialQuery);
    }
  }, []);

  const handleSend = async (queryToUse?: string) => {
    const textToSend = queryToUse || input;
    if (!textToSend.trim()) return;

    Keyboard.dismiss();
    const userMsgId = Date.now().toString();
    const newMessages = [...messages, { id: userMsgId, role: 'user', text: textToSend.trim() } as ChatMessage];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    const typingId = 'typing_' + Date.now();
    setMessages([...newMessages, { id: typingId, role: 'ai', isTyping: true }]);

    try {
      // Gate on AI consent BEFORE sending anything to the AI service. If the
      // user declines the disclosure, quietly remove the typing bubble and stop
      // — no request is sent and no error is shown.
      const result = await run(() => aiAssistantService.ask(textToSend.trim(), conversationId));
      if (result.status === 'declined') {
        setMessages((prev) => prev.filter((m) => m.id !== typingId));
        return;
      }
      const answer = result.value;
      setConversationId(answer.conversationId);

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== typingId),
        { id: Date.now().toString(), role: 'ai', text: answer.content },
      ]);
    } catch (err: any) {
      // Surfaced as an explicit failure, never as a fabricated answer — a
      // plausible-looking wrong compliance answer is worse than a visible
      // outage, because the user cannot tell the difference.
      const unavailable = err?.name === 'AIUnavailableError';
      // Read the error message into a plain local *before* setMessages. The
      // updater below is a nested closure, and closing over the catch binding
      // `err` from inside it throws "Property 'err' doesn't exist" on Hermes.
      // Capturing the string here keeps `err` out of the closure.
      const errorMessage = err?.message ?? 'Something went wrong. Please try again.';
      const errorText = unavailable
        ? `${errorMessage}\n\nIn the meantime, you can browse Certifications, Applications and Insights, or contact support@sanyogconformity.com.`
        : errorMessage;
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== typingId),
        {
          id: Date.now().toString(),
          role: 'ai',
          isError: true,
          text: errorText,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    // Auto-scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, isTyping]);

  const renderBubble = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';

    if (item.isTyping) {
      return (
        <View style={[styles.aiRow, { marginBottom: 20 }]}>
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.aiAvatar}>
            <Ionicons name="sparkles" size={12} color="#fff" />
          </LinearGradient>
          <View style={[styles.bubble, styles.aiBubble, { backgroundColor: isDark ? colors.bgCardLight : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border }]}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        </View>
      );
    }

    if (isUser) {
      return (
        <View style={styles.userRow}>
          <View style={[styles.bubble, styles.userBubble, { backgroundColor: colors.primary }]}>
            <Text style={styles.userText}>{item.text}</Text>
          </View>
        </View>
      );
    }

    // AI Response
    return (
      <View style={styles.aiRow}>
        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.aiAvatar}>
          <Ionicons name="sparkles" size={12} color="#fff" />
        </LinearGradient>
        
        <View style={{ flex: 1, gap: 12 }}>
          {item.text && (
            <View style={[
              styles.bubble,
              styles.aiBubble,
              item.isError
                ? { backgroundColor: isDark ? 'rgba(220,38,38,0.12)' : '#FEF2F2', borderColor: isDark ? 'rgba(248,113,113,0.35)' : '#FECACA' }
                : { backgroundColor: isDark ? colors.bgCardLight : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border },
            ]}>
              {item.isError && (
                <View style={styles.errorHeader}>
                  <Ionicons name="alert-circle" size={14} color={isDark ? '#F87171' : '#DC2626'} />
                  <Text style={[styles.errorHeaderText, { color: isDark ? '#F87171' : '#DC2626' }]}>AI unavailable</Text>
                </View>
              )}
              <Text style={[styles.aiText, { color: item.isError ? (isDark ? '#FCA5A5' : '#7F1D1D') : colors.textPrimary }]}>{item.text}</Text>
            </View>
          )}

          {item.action && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: `${colors.primary}15`, alignSelf: 'flex-start', paddingHorizontal: 16 }]}
              onPress={() => {
                if (item.action?.screen) {
                  navigation.navigate(item.action.route, { screen: item.action.screen });
                } else {
                  navigation.navigate(item.action?.route);
                }
              }}
            >
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>Navigate Now</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgDark }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Dice AI</Text>
          <View style={styles.onlineDot} />
        </View>
      </View>

      {/* Chat History */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderBubble}
        contentContainerStyle={styles.chatList}
        showsVerticalScrollIndicator={false}
      />

      {/* Input Area */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.inputContainer, { paddingBottom: insets.bottom || 20, borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border, backgroundColor: colors.bgDark }]}>
          <View style={[styles.inputWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F0F4F8' }]}>
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              placeholder="Ask anything about compliance..."
              placeholderTextColor={colors.textTertiary}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={300}
            />
            <TouchableOpacity 
              style={[styles.sendBtn, { backgroundColor: input.trim() ? colors.primary : colors.textTertiary }]} 
              onPress={() => handleSend()}
              disabled={!input.trim()}
            >
              <Ionicons name="arrow-up" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.1)' },
  backBtn: { marginRight: 16 },
  headerTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00C896' },
  chatList: { padding: 20, paddingBottom: 40 },
  userRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 20 },
  userBubble: { borderBottomRightRadius: 4, maxWidth: '85%', padding: 14 },
  userText: { color: '#fff', fontSize: 15, lineHeight: 22 },
  aiRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 24, maxWidth: '90%' },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  bubble: { borderRadius: 20, padding: 14, borderWidth: 1 },
  aiBubble: { borderBottomLeftRadius: 4 },
  errorHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  errorHeaderText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  aiText: { fontSize: 15, lineHeight: 24 },
  resultTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  sourceWrapper: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(150,150,150,0.1)' },
  sourceText: { fontSize: 11, fontWeight: '600' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, paddingVertical: 10, borderRadius: 12 },
  actionBtnText: { fontSize: 14, fontWeight: '700' },
  inputContainer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, paddingLeft: 20, paddingRight: 6, paddingVertical: 6, minHeight: 52 },
  input: { flex: 1, fontSize: 15, paddingTop: 12, paddingBottom: 12, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
});

export default AISearchScreen;
