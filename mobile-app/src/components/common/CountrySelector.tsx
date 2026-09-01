import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, BorderRadius } from '../../theme';
import { WORLD_MARKETS } from '../../constants/worldMarkets';

interface Country {
  code: string;
  name: string;
  flag?: string;
}

interface CountrySelectorProps {
  value?: string;
  label?: string;
  placeholder?: string;
  onSelect?: (country: Country) => void;
  isRequired?: boolean;
  // Multi-select mode (opt-in). When `multiple`, the picker renders removable
  // chips of `selectedCodes` and toggles via `onToggle` without closing.
  multiple?: boolean;
  selectedCodes?: string[];
  onToggle?: (code: string) => void;
  onClear?: () => void;
}

// Canonical DICE market list (ISO alpha-2 + name + flag) — the same authoritative
// dataset that backs the Global Markets map (constants/worldMarkets). Reused here
// so every country picker offers the full set of supported markets, including the
// EU special region, rather than a truncated local copy.
const COUNTRIES: Country[] = WORLD_MARKETS.map((m) => ({ code: m.code, name: m.name, flag: m.flag }));

const CountrySelector: React.FC<CountrySelectorProps> = ({
  value,
  label = 'Country',
  placeholder = 'Select a country',
  onSelect,
  isRequired = false,
  multiple = false,
  selectedCodes = [],
  onToggle,
  onClear,
}) => {
  const { colors, isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    return COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const selectedCountry = COUNTRIES.find(c => c.code === value);
  const selectedSet = useMemo(() => new Set(selectedCodes), [selectedCodes]);
  const selectedList = useMemo(() => COUNTRIES.filter(c => selectedSet.has(c.code)), [selectedSet]);

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <>
      <View style={styles.container}>
        {label && <Text style={styles.label}>{label} {isRequired && <Text style={styles.required}>*</Text>}</Text>}
        {multiple ? (
          <View>
            {selectedList.length > 0 && (
              <View style={styles.chipRow}>
                {selectedList.map(c => (
                  <TouchableOpacity key={c.code} style={styles.chip} onPress={() => onToggle?.(c.code)} accessibilityLabel={`Remove ${c.name}`}>
                    <Text style={styles.chipText}>{c.flag} {c.name}</Text>
                    <Ionicons name="close" size={13} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={styles.addBtnText}>{selectedList.length ? 'Add market' : (placeholder || 'Add markets')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.selector} onPress={() => setModalVisible(true)}>
            <View style={styles.selectorContent}>
              {selectedCountry?.flag && <Text style={styles.flag}>{selectedCountry.flag}</Text>}
              <Text style={[styles.selectorText, !selectedCountry && styles.placeholder]}>
                {selectedCountry ? `${selectedCountry.flag} ${selectedCountry.name}` : placeholder}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{multiple ? 'Select Target Markets' : 'Select Country'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Search countries..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => {
                const isSel = multiple ? selectedSet.has(item.code) : selectedCountry?.code === item.code;
                return (
                  <TouchableOpacity
                    style={styles.countryItem}
                    onPress={() => {
                      if (multiple) {
                        onToggle?.(item.code);        // toggle, keep the sheet open
                      } else {
                        onSelect?.(item);
                        setModalVisible(false);
                        setSearchQuery('');
                      }
                    }}
                  >
                    <View style={styles.countryContent}>
                      {item.flag && <Text style={styles.itemFlag}>{item.flag}</Text>}
                      <View>
                        <Text style={styles.countryName}>{item.name}</Text>
                        <Text style={styles.countryCode}>{item.code}</Text>
                      </View>
                    </View>
                    {isSel && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />

            {multiple && (
              <View style={styles.modalFooter}>
                <TouchableOpacity onPress={() => onClear?.()} disabled={selectedList.length === 0}>
                  <Text style={[styles.clearAll, selectedList.length === 0 && { opacity: 0.4 }]}>Clear All</Text>
                </TouchableOpacity>
                <Text style={styles.footerCount}>{selectedList.length} market{selectedList.length === 1 ? '' : 's'} selected</Text>
                <TouchableOpacity style={styles.doneBtn} onPress={() => { setModalVisible(false); setSearchQuery(''); }}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    label: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    required: {
      color: colors.error,
    },
    selector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: BorderRadius.md,
      backgroundColor: isDark ? colors.bgCard : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
    },
    selectorContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    flag: {
      fontSize: 20,
    },
    selectorText: {
      fontSize: 14,
      color: colors.textPrimary,
    },
    placeholder: {
      color: colors.textTertiary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.bgDark,
      borderTopLeftRadius: BorderRadius.xl,
      borderTopRightRadius: BorderRadius.xl,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    searchInput: {
      marginHorizontal: 16,
      marginBottom: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: BorderRadius.md,
      backgroundColor: isDark ? colors.bgCard : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
      color: colors.textPrimary,
    },
    countryItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border,
    },
    countryContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    itemFlag: {
      fontSize: 24,
    },
    countryName: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    countryCode: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 2,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, backgroundColor: isDark ? colors.bgCard : '#EEF0F7', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border },
    chipText: { fontSize: 13, color: colors.textPrimary, fontWeight: '600' },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 10, borderRadius: BorderRadius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary },
    addBtnText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
    modalFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border },
    clearAll: { color: colors.error, fontSize: 14, fontWeight: '600' },
    footerCount: { color: colors.textSecondary, fontSize: 13 },
    doneBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: BorderRadius.md },
    doneBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  });

export default CountrySelector;
