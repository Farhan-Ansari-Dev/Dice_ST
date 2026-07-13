import React, { useMemo, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput , KeyboardAvoidingView, Platform} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const QUERIES: any[] = [];

const GovernmentQueriesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [replyText, setReplyText] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>('1');
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#E8ECF4']} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Government Queries</Text>
        <View style={[styles.alertBadge, { backgroundColor: `${colors.error}20` }]}>
          <Text style={[styles.alertCount, { color: colors.error }]}>1</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {QUERIES.map((query) => {
          const isPending = query.status === 'pending';
          const isExpanded = expandedId === query.id;
          return (
            <View key={query.id} style={[styles.queryCard, Shadows.md, isPending && { borderColor: `${colors.warning}40` }]}>
              <LinearGradient colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']} style={styles.queryCardInner}>
                <TouchableOpacity onPress={() => setExpandedId(isExpanded ? null : query.id)} activeOpacity={0.7}>
                  <View style={styles.queryHeader}>
                    <View style={[styles.govtIcon, { backgroundColor: `${colors.primary}20` }]}>
                      <Ionicons name="business" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.queryFrom}>{query.from}</Text>
                      <Text style={styles.queryRef}>Ref: {query.ref} • {query.date}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: isPending ? `${colors.warning}20` : `${colors.success}20` }]}>
                      <Text style={[styles.statusText, { color: isPending ? colors.warning : colors.success }]}>
                        {isPending ? 'Pending' : 'Answered'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.queryText} numberOfLines={isExpanded ? undefined : 2}>{query.query}</Text>
                </TouchableOpacity>

                {isExpanded && (
                  <>
                    {query.reply && (
                      <View style={[styles.replySection, { backgroundColor: `${colors.success}10`, borderColor: `${colors.success}30` }]}>
                        <Text style={styles.replyLabel}>Your Reply</Text>
                        <Text style={styles.replyText}>{query.reply}</Text>
                      </View>
                    )}
                    {isPending && (
                      <View style={styles.replyInput}>
                        <Text style={styles.replyInputLabel}>Write Your Reply</Text>
                        <TextInput
                          style={styles.textArea}
                          value={replyText}
                          onChangeText={setReplyText}
                          placeholder="Type your reply to the government query..."
                          placeholderTextColor={colors.textTertiary}
                          multiline
                          numberOfLines={4}
                        />
                        <TouchableOpacity style={[styles.sendBtn, Shadows.sm]} activeOpacity={0.85}>
                          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.sendBtnGradient}>
                            <Ionicons name="send" size={14} color="#FFFFFF" />
                            <Text style={styles.sendBtnText}>Submit Reply</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}
              </LinearGradient>
            </View>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
    </KeyboardAvoidingView>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? colors.bgCardLight : colors.border, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: colors.textPrimary },
    alertBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
    alertCount: { fontSize: 12, fontWeight: '800' },
    content: { paddingHorizontal: 20, paddingTop: 8 },
    queryCard: { marginBottom: 16, borderRadius: BorderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    queryCardInner: { padding: 16 },
    queryHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    govtIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    queryFrom: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
    queryRef: { fontSize: 11, color: colors.textTertiary, marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
    statusText: { fontSize: 11, fontWeight: '700' },
    queryText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
    replySection: { marginTop: 12, padding: 12, borderRadius: BorderRadius.md, borderWidth: 1 },
    replyLabel: { fontSize: 11, fontWeight: '700', color: colors.success, marginBottom: 6 },
    replyText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
    replyInput: { marginTop: 12 },
    replyInputLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 8 },
    textArea: { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.bgCardLight, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border, padding: 12, color: colors.textPrimary, fontSize: 13, minHeight: 80, textAlignVertical: 'top', marginBottom: 10 },
    sendBtn: { borderRadius: BorderRadius.md, overflow: 'hidden' },
    sendBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 },
    sendBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  });

export default GovernmentQueriesScreen;
