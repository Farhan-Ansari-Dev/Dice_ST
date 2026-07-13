import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, BorderRadius, Shadows } from '../../theme';

const SUGGESTIONS = [
  { icon: 'shield-checkmark', text: 'BIS certification for electronics', category: 'Certification' },
  { icon: 'leaf', text: 'EPR registration requirements', category: 'Compliance' },
  { icon: 'wifi', text: 'WPC approval for Bluetooth devices', category: 'Certification' },
  { icon: 'nutrition', text: 'FSSAI license for food products', category: 'License' },
  { icon: 'flask', text: 'NABL accredited labs near me', category: 'Testing' },
  { icon: 'document-text', text: 'Documents needed for BIS ISI mark', category: 'Documents' },
  { icon: 'globe', text: 'CE marking requirements for India', category: 'Regulation' },
  { icon: 'time', text: 'How long does BIS certification take?', category: 'Info' },
];

const QUICK_TAGS = ['BIS', 'EPR', 'WPC', 'FSSAI', 'ISO', 'CE Mark', 'RoHS', 'Testing'];

interface Props {
  onSearch: (query: string) => void;
  onFocus?: () => void;
}

const AISearchBar: React.FC<Props> = ({ onSearch, onFocus }) => {
  const { colors, isDark } = useTheme();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  const handleFocus = () => {
    setFocused(true);
    onFocus?.();
    Animated.spring(focusAnim, { toValue: 1, tension: 100, friction: 8, useNativeDriver: false }).start();
  };

  const handleBlur = () => {
    if (!query) {
      setFocused(false);
      Animated.spring(focusAnim, { toValue: 0, tension: 100, friction: 8, useNativeDriver: false }).start();
    }
  };

  const handleSuggestion = (text: string) => {
    setQuery(text);
    onSearch(text);
    inputRef.current?.blur();
    setFocused(false);
  };

  const handleSubmit = () => {
    if (query.trim()) {
      onSearch(query.trim());
      inputRef.current?.blur();
      setFocused(false);
    }
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [isDark ? 'rgba(255,255,255,0.08)' : colors.border, colors.primary],
  });

  return (
    <View style={styles.container}>
      {/* Search input */}
      <Animated.View
        style={[
          styles.inputWrap,
          Shadows.sm,
          {
            borderColor,
            backgroundColor: isDark ? colors.bgCard : '#FFFFFF',
          },
        ]}
      >
        <LinearGradient
          colors={focused ? [`${colors.primary}18`, `${colors.info}10`] : ['transparent', 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />


        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Ionicons name="sparkles" size={13} color={colors.primary} />
          <Text style={[styles.aiLabel, { color: colors.primary, fontSize: 13 }]}>Dice AI</Text>
          <View style={styles.aiDot} />
        </View>

        <TextInput
          ref={inputRef}
          style={[styles.input, { color: colors.textPrimary }]}
          placeholder="Certifications, Compliance..."
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSubmit}
          returnKeyType="search"
        />

        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => { setQuery(''); setFocused(false); inputRef.current?.blur(); }}
            style={styles.clearBtn}
          >
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handleSubmit}
          style={[styles.searchBtn, { backgroundColor: focused ? colors.primary : (isDark ? colors.bgCardLight : '#EEF0FF') }]}
        >
          <Ionicons name="search" size={16} color={focused ? '#fff' : colors.textTertiary} />
        </TouchableOpacity>
      </Animated.View>



      {/* Quick tags */}
      {/* Quick tags removed */}

      {/* Suggestions dropdown removed as per user request */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 4 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    overflow: 'hidden',
  },
  aiIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
  },
  clearBtn: { padding: 2 },
  searchBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  aiLabel: { fontSize: 11, fontWeight: '600' },
  aiDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#8B92A5',
    marginHorizontal: 1,
  },
  customPlaceholder: {
    position: 'absolute',
    left: 14,
    right: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  tagsWrap: { marginTop: 10 },
  tagsScroll: { gap: 7, paddingRight: 4 },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  tagText: { fontSize: 12, fontWeight: '600' },

  suggestions: {
    marginTop: 6,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  suggestionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  suggestionsTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderTopWidth: 1,
  },
  suggestionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionText: { fontSize: 13, fontWeight: '500' },
  categoryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  categoryText: { fontSize: 10, fontWeight: '600' },
});

export default AISearchBar;
