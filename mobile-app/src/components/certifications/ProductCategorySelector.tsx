import React, { useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, LayoutAnimation, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Shadows } from '../../theme';

interface ProductCategorySelectorProps {
  data: string[];
  selected: string | null;
  onSelect: (item: string) => void;
  onSearch: (query: string) => void;
}

const ProductCategorySelector: React.FC<ProductCategorySelectorProps> = ({ data, selected, onSelect, onSearch }) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <View>
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search product categories..."
          placeholderTextColor={colors.textSecondary}
          onChangeText={onSearch}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {data.map((item) => {
          const isSelected = selected === item;
          return (
            <TouchableOpacity
              key={item}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                onSelect(item);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
                <Ionicons name="cube-outline" size={24} color={isSelected ? colors.primary : colors.textSecondary} />
              </View>
              <Text style={[styles.cardText, isSelected && styles.cardTextSelected]}>{item}</Text>
            </TouchableOpacity>
          );
        })}
        {data.length === 0 && (
          <View style={{ padding: 20, alignItems: 'center', width: '100%' }}>
            <Text style={{ color: colors.textSecondary }}>No products found. Please refine search.</Text>
          </View>
        )}
      </ScrollView>
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
  listContent: {
    paddingHorizontal: 14,
  },
  card: {
    backgroundColor: isDark ? colors.bgCard : '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 120,
    borderWidth: 1,
    borderColor: colors.border,
    ...Shadows.sm,
  },
  cardSelected: {
    borderColor: colors.primary,
    // Opaque tint, NOT `${colors.primary}1A`. A translucent background combined
    // with the card's elevation (Shadows.sm) makes Android fill the card with a
    // grey shadow box. An opaque light-purple gives the same look without it.
    backgroundColor: isDark ? '#20223A' : '#EFEDFF',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: isDark ? colors.bgDark : '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconContainerSelected: {
    backgroundColor: '#FFFFFF',
  },
  cardText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
    textAlign: 'center',
  },
  cardTextSelected: {
    color: colors.primary,
  },
});

export default ProductCategorySelector;
