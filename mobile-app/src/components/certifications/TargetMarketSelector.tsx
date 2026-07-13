import React, { useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Shadows } from '../../theme';

interface TargetMarketSelectorProps {
  data: string[];
  selected: string[];
  onToggle: (item: string) => void;
  onSearch: (query: string) => void;
}

const TargetMarketSelector = ({ data, selected, onToggle, onSearch }: TargetMarketSelectorProps) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View>
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search target markets..."
          placeholderTextColor={colors.textSecondary}
          onChangeText={onSearch}
        />
      </View>
      <View style={styles.gridContainer}>
        {data.map((item) => {
          const isSelected = selected.includes(item);
          return (
            <TouchableOpacity
              key={item}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                onToggle(item);
              }}
              activeOpacity={0.7}
            >
              <Image
                source={{ uri: `https://flagcdn.com/w80/${item.toLowerCase()}.png` }}
                style={styles.flag}
              />
              <Text style={[styles.cardText, isSelected && styles.cardTextSelected]}>{item}</Text>
              {isSelected && (
                <View style={styles.checkmark}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) => StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? colors.bgCard : '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: colors.textPrimary,
    marginLeft: 8,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 14,
  },
  card: {
    width: '30%',
    backgroundColor: isDark ? colors.bgCard : '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    margin: '1.5%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...Shadows.sm,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}1A`,
  },
  flag: {
    width: 40,
    height: 28,
    borderRadius: 4,
    marginBottom: 8,
  },
  cardText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center',
  },
  cardTextSelected: {
    color: colors.primary,
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: isDark ? colors.bgCard : '#FFFFFF',
    borderRadius: 12,
  },
});

export default TargetMarketSelector;
