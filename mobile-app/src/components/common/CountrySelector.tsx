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

interface Country {
  code: string;
  name: string;
  flag?: string;
}

interface CountrySelectorProps {
  value?: string;
  label?: string;
  placeholder?: string;
  onSelect: (country: Country) => void;
  isRequired?: boolean;
}

// Common countries for compliance
const COUNTRIES: Country[] = [
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'EU', name: 'European Union', flag: '🇪🇺' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
];

const CountrySelector: React.FC<CountrySelectorProps> = ({
  value,
  label = 'Country',
  placeholder = 'Select a country',
  onSelect,
  isRequired = false,
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

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <>
      <View style={styles.container}>
        {label && <Text style={styles.label}>{label} {isRequired && <Text style={styles.required}>*</Text>}</Text>}
        <TouchableOpacity
          style={styles.selector}
          onPress={() => setModalVisible(true)}
        >
          <View style={styles.selectorContent}>
            {selectedCountry?.flag && <Text style={styles.flag}>{selectedCountry.flag}</Text>}
            <Text style={[styles.selectorText, !selectedCountry && styles.placeholder]}>
              {selectedCountry ? `${selectedCountry.flag} ${selectedCountry.name}` : placeholder}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
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
              <Text style={styles.modalTitle}>Select Country</Text>
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
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.countryItem}
                  onPress={() => {
                    onSelect(item);
                    setModalVisible(false);
                    setSearchQuery('');
                  }}
                >
                  <View style={styles.countryContent}>
                    {item.flag && <Text style={styles.itemFlag}>{item.flag}</Text>}
                    <View>
                      <Text style={styles.countryName}>{item.name}</Text>
                      <Text style={styles.countryCode}>{item.code}</Text>
                    </View>
                  </View>
                  {selectedCountry?.code === item.code && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
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
  });

export default CountrySelector;
