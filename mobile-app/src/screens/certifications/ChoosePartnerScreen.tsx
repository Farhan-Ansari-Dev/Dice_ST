import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Shadows } from '../../theme';
import Button from '../../components/common/Button';
import { useToast } from '../../components/common/ToastProvider';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';

type UiChoice = 'sanyog' | 'manual' | 'find';

interface CertBody {
  id: string;
  name: string;
  accreditations: string[];
  countries: string[];
  scope?: string;
}

interface CBInfo {
  whyRequired: string;
  factors: Array<{ key: string; label: string; detail: string }>;
}

/**
 * Preferred Certification Body — chosen from inside Application Detail (never in
 * the apply flow). Default is Sanyog-managed (no further customer action; staff
 * assign the CB). The customer may also enter a CB they already use, or search
 * the real, eligible catalogue. No mock CBs; ineligible CBs are never shown.
 */
const ChoosePartnerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const applicationId: string | undefined = route.params?.applicationId;
  const certType: string | undefined = route.params?.certType;
  const certName: string = route.params?.certName ?? certType ?? 'this certification';

  const [choice, setChoice] = useState<UiChoice>('sanyog');
  const [externalName, setExternalName] = useState('');
  const [query, setQuery] = useState('');
  const [selectedCbId, setSelectedCbId] = useState<string | null>(null);
  const [info, setInfo] = useState<CBInfo | null>(null);
  const [list, setList] = useState<CertBody[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Search the real eligible catalogue (cert eligibility is enforced server-side).
  const search = useCallback(async (q: string) => {
    if (!certType) return;
    setLoadingList(true);
    try {
      const url = `/certification-bodies?cert_type=${encodeURIComponent(certType)}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
      const body: any = await api.get(url);
      const d = body?.data ?? {};
      setInfo({ whyRequired: d.whyRequired, factors: d.factors ?? [] });
      setList(d.certificationBodies ?? []);
    } catch {
      setList([]);
    } finally {
      setLoadingList(false);
    }
  }, [certType]);

  // Load once when the customer opens "Find", then debounce on typing.
  useEffect(() => {
    if (choice !== 'find') return;
    const t = setTimeout(() => search(query), info ? 350 : 0);
    return () => clearTimeout(t);
  }, [choice, query, search, info]);

  const canContinue =
    choice === 'sanyog' ||
    (choice === 'manual' && externalName.trim().length > 0) ||
    (choice === 'find' && !!selectedCbId);

  const submit = async () => {
    if (submitting || !applicationId) {
      if (!applicationId) showToast('Not available', 'Open this from an application to set its certification body.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload: any =
        choice === 'sanyog'
          ? { mode: 'sanyog_managed' }
          : choice === 'manual'
          ? { mode: 'customer_selected', name: externalName.trim() }
          : { mode: 'customer_selected', org_id: selectedCbId };

      await api.put(`/certification-bodies/application/${applicationId}`, payload);
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['mywork'] });

      showToast(
        'Saved',
        choice === 'sanyog'
          ? 'Sanyog will manage this certification for you.'
          : 'Your certification body preference has been sent for review.',
        'success',
      );
      navigation.goBack();
    } catch (err: any) {
      showToast('Not saved', err?.response?.data?.message ?? 'Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const Option = ({ value, title, subtitle, icon }: { value: UiChoice; title: string; subtitle: string; icon: any }) => {
    const active = choice === value;
    return (
      <TouchableOpacity style={[styles.option, active && styles.optionActive, Shadows.sm]} onPress={() => setChoice(value)} activeOpacity={0.85}>
        <View style={[styles.radio, active && styles.radioActive]}>{active && <View style={styles.radioDot} />}</View>
        <Ionicons name={icon} size={22} color={active ? colors.primary : colors.textSecondary} style={{ marginHorizontal: 12 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.optionTitle}>{title}</Text>
          <Text style={styles.optionSub}>{subtitle}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preferred Certification Body</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.h1}>How would you like to proceed?</Text>
        <Text style={styles.h1sub}>For {certName}</Text>

        <Option value="sanyog" title="Let Sanyog handle everything" subtitle="Recommended — we assign and manage the certification body for you." icon="shield-checkmark" />
        <Option value="manual" title="I already have a Certification Body" subtitle="Tell us the CB you already work with." icon="business" />
        <Option value="find" title="Find a Certification Body" subtitle="Search accredited bodies eligible for this certification." icon="search" />

        {choice === 'manual' && (
          <View style={styles.panel}>
            <Text style={styles.panelLabel}>Your Certification Body</Text>
            <TextInput style={styles.input} placeholder="Certification body name" placeholderTextColor={colors.textTertiary} value={externalName} onChangeText={setExternalName} />
          </View>
        )}

        {choice === 'find' && (
          <View style={styles.panel}>
            {info && (
              <>
                <Text style={styles.why}>{info.whyRequired}</Text>
                <Text style={styles.panelLabel}>What matters</Text>
                {info.factors.map((f) => (
                  <View key={f.key} style={styles.factorRow}>
                    <Ionicons name="ellipse" size={7} color={colors.primary} style={{ marginTop: 7 }} />
                    <Text style={styles.factorText}><Text style={{ fontWeight: '700' }}>{f.label}. </Text>{f.detail}</Text>
                  </View>
                ))}
              </>
            )}

            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={colors.textTertiary} />
              <TextInput style={styles.searchInput} placeholder="Search by name, accreditation…" placeholderTextColor={colors.textTertiary} value={query} onChangeText={setQuery} />
            </View>

            {loadingList ? (
              <ActivityIndicator color={colors.primary} style={{ paddingVertical: 16 }} />
            ) : list.length > 0 ? (
              list.map((cb) => {
                const active = selectedCbId === cb.id;
                return (
                  <TouchableOpacity key={cb.id} style={[styles.cbCard, active && styles.optionActive]} onPress={() => setSelectedCbId(cb.id)} activeOpacity={0.85}>
                    <View style={[styles.radio, active && styles.radioActive]}>{active && <View style={styles.radioDot} />}</View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.cbName}>{cb.name}</Text>
                      {cb.accreditations?.length > 0 && <Text style={styles.cbMeta}>{cb.accreditations.join(' · ')}</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No accredited Certification Body is currently available for this certification.</Text>
                <TouchableOpacity onPress={() => setChoice('sanyog')}>
                  <Text style={styles.emptyCta}>Let Sanyog manage this certification →</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 24 }} />
        <Button title="Continue" onPress={submit} disabled={!canContinue || submitting} loading={submitting} />
      </ScrollView>
    </View>
  );
};

const makeStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? colors.bgCardLight : colors.border, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.textPrimary },
    content: { paddingHorizontal: 20, paddingBottom: 40 },
    h1: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, marginTop: 8 },
    h1sub: { fontSize: 14, color: colors.textSecondary, marginBottom: 20 },
    option: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1.5, borderColor: 'transparent' },
    optionActive: { borderColor: colors.primary },
    radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.textTertiary, alignItems: 'center', justifyContent: 'center' },
    radioActive: { borderColor: colors.primary },
    radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
    optionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
    optionSub: { fontSize: 12.5, color: colors.textSecondary, marginTop: 2, lineHeight: 17 },
    panel: { backgroundColor: colors.bgCard, borderRadius: 16, padding: 16, marginTop: 4, marginBottom: 4 },
    panelLabel: { fontSize: 12, fontWeight: '800', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
    input: { backgroundColor: isDark ? colors.bgCardLight : colors.bgDark, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.textPrimary },
    searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: isDark ? colors.bgCardLight : colors.bgDark, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginTop: 8, marginBottom: 12 },
    searchInput: { flex: 1, fontSize: 15, color: colors.textPrimary, padding: 0 },
    why: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 20, marginBottom: 16 },
    factorRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    factorText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
    cbCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? colors.bgCardLight : colors.bgDark, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: 'transparent' },
    cbName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
    cbMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    emptyBox: { paddingVertical: 12 },
    emptyText: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 20 },
    emptyCta: { fontSize: 14, fontWeight: '700', color: colors.primary, marginTop: 12 },
  });

export default ChoosePartnerScreen;
