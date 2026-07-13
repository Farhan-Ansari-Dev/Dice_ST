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
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';

interface Product {
  id: string;
  name: string;
  category?: string;
}

interface ProductSelectorProps {
  value?: string;
  label?: string;
  placeholder?: string;
  onSelect: (product: Product) => void;
  isRequired?: boolean;
}

const ProductSelector: React.FC<ProductSelectorProps> = ({
  value,
  label = 'Product',
  placeholder = 'Select a product',
  onSelect,
  isRequired = false,
}) => {
  const { colors, isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      try {
        const res = await api.get('/products') as any;
        return res?.data || [];
      } catch (e) {
        return [];
      }
    }
  });

  const products = useMemo(() => {
    if (!productsData) return [];
    return productsData.map((p: any) => ({
      id: p._id,
      name: p.name,
      category: p.category,
    }));
  }, [productsData]);

  const filtered = useMemo(() => {
    return products.filter((p: typeof products[0]) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const selectedProduct = products.find((p: typeof products[0]) => p.id === value);

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <>
      <View style={styles.container}>
        {label && <Text style={styles.label}>{label} {isRequired && <Text style={styles.required}>*</Text>}</Text>}
        <TouchableOpacity
          style={styles.selector}
          onPress={() => setModalVisible(true)}
        >
          <Text style={[styles.selectorText, !selectedProduct && styles.placeholder]}>
            {selectedProduct?.name || placeholder}
          </Text>
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
              <Text style={styles.modalTitle}>Select Product</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.productItem}
                  onPress={() => {
                    onSelect(item);
                    setModalVisible(false);
                    setSearchQuery('');
                  }}
                >
                  <View>
                    <Text style={styles.productName}>{item.name}</Text>
                    {item.category && <Text style={styles.productCategory}>{item.category}</Text>}
                  </View>
                  {selectedProduct?.id === item.id && (
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
    productItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border,
    },
    productName: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    productCategory: {
      fontSize: 12,
      color: colors.textTertiary,
      marginTop: 2,
    },
  });

export default ProductSelector;
