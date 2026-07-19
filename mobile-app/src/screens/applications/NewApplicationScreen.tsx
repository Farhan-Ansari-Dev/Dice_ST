import React, { useMemo, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, Shadows, BorderRadius } from '../../theme';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { SANYOG_SERVICES } from '../../utils/constants';

type Step = 'product' | 'certification' | 'details' | 'review';
const STEPS: { key: Step; label: string; icon: string }[] = [
  { key: 'product', label: 'Product', icon: 'cube-outline' },
  { key: 'certification', label: 'Certification', icon: 'ribbon-outline' },
  { key: 'details', label: 'Details', icon: 'create-outline' },
  { key: 'review', label: 'Review', icon: 'checkmark-circle-outline' },
];

const PRIORITIES = [
  { id: 'low', label: 'Low', color: '#10B981', icon: 'arrow-down' },
  { id: 'medium', label: 'Medium', color: '#F59E0B', icon: 'remove' },
  { id: 'high', label: 'High', color: '#EF4444', icon: 'arrow-up' },
] as const;

const ALL_CERT_TYPES = SANYOG_SERVICES.flatMap(cat =>
  cat.items.map(item => ({ ...item, category: cat.category }))
);

const NewApplicationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('product');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [selectedCertType, setSelectedCertType] = useState<any>(null);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [notes, setNotes] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [certSearch, setCertSearch] = useState('');

  const stepIndex = STEPS.findIndex(s => s.key === step);

  const { data: productsRaw, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await api.get('/products') as any;
      return res?.data || [];
    },
  });

  const products = useMemo(() => {
    if (!productsRaw) return [];
    const list = productsRaw.map((p: any) => ({
      _id: p._id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      model_number: p.model_number,
    }));
    if (!productSearch.trim()) return list;
    const q = productSearch.toLowerCase();
    return list.filter((p: any) =>
      p.name?.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  }, [productsRaw, productSearch]);

  const filteredCerts = useMemo(() => {
    if (!certSearch.trim()) return ALL_CERT_TYPES;
    const q = certSearch.toLowerCase();
    return ALL_CERT_TYPES.filter(c =>
      c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
    );
  }, [certSearch]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/applications', {
        product_id: selectedProduct._id,
        cert_type: selectedCertType.id.toUpperCase(),
        priority,
        notes: notes.trim() || undefined,
      }) as any;
      return res?.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      navigation.replace('ApplicationSuccess', {
        applicationId: data._id,
        applicationNumber: data.application_number,
      });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Failed to create application';
      Alert.alert('Error', msg);
    },
  });

  const canProceed = useCallback(() => {
    switch (step) {
      case 'product': return !!selectedProduct;
      case 'certification': return !!selectedCertType;
      case 'details': return true;
      case 'review': return true;
    }
  }, [step, selectedProduct, selectedCertType]);

  const handleNext = () => {
    if (step === 'review') {
      createMutation.mutate();
      return;
    }
    const nextIdx = stepIndex + 1;
    if (nextIdx < STEPS.length) setStep(STEPS[nextIdx].key);
  };

  const handleBack = () => {
    if (stepIndex === 0) {
      navigation.goBack();
      return;
    }
    setStep(STEPS[stepIndex - 1].key);
  };

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  const renderStepIndicator = () => (
    <View style={styles.stepRow}>
      {STEPS.map((s, i) => {
        const isActive = i === stepIndex;
        const isDone = i < stepIndex;
        return (
          <React.Fragment key={s.key}>
            {i > 0 && (
              <View style={[styles.stepLine, isDone && { backgroundColor: colors.primary }]} />
            )}
            <View style={[
              styles.stepDot,
              isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
              isDone && { backgroundColor: colors.success, borderColor: colors.success },
            ]}>
              {isDone ? (
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              ) : (
                <Ionicons name={s.icon as any} size={12} color={isActive ? '#FFFFFF' : colors.textTertiary} />
              )}
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );

  const renderProductStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Select a Product</Text>
      <Text style={styles.stepSubtitle}>Choose from the Sanyog product catalog</Text>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor={colors.textTertiary}
          value={productSearch}
          onChangeText={setProductSearch}
        />
        {productSearch.length > 0 && (
          <TouchableOpacity onPress={() => setProductSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {productsLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : products.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cube-outline" size={48} color={colors.textTertiary} />
          <Text style={styles.emptyText}>
            {productSearch ? 'No products match your search' : 'No products available'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item: any) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => {
            const isSelected = selectedProduct?._id === item._id;
            return (
              <TouchableOpacity
                style={[styles.selectCard, isSelected && styles.selectCardActive]}
                onPress={() => setSelectedProduct(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.selectIcon, isSelected && { backgroundColor: `${colors.primary}30` }]}>
                  <Ionicons name="cube" size={20} color={isSelected ? colors.primary : colors.textTertiary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.selectTitle, isSelected && { color: colors.primary }]}>{item.name}</Text>
                  <Text style={styles.selectSub}>
                    {[item.brand, item.category, item.model_number].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                {isSelected && (
                  <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );

  const renderCertStep = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Certification Type</Text>
      <Text style={styles.stepSubtitle}>What certification do you need?</Text>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search certifications..."
          placeholderTextColor={colors.textTertiary}
          value={certSearch}
          onChangeText={setCertSearch}
        />
        {certSearch.length > 0 && (
          <TouchableOpacity onPress={() => setCertSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredCerts}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => {
          const isSelected = selectedCertType?.id === item.id;
          return (
            <TouchableOpacity
              style={[styles.selectCard, isSelected && styles.selectCardActive]}
              onPress={() => setSelectedCertType(item)}
              activeOpacity={0.7}
            >
              <View style={[styles.selectIcon, { backgroundColor: `${item.color}20` }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.selectTitle, isSelected && { color: colors.primary }]}>{item.name}</Text>
                <Text style={styles.selectSub}>{item.category}</Text>
              </View>
              {isSelected && (
                <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );

  const renderDetailsStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Additional Details</Text>
      <Text style={styles.stepSubtitle}>Set priority and add any notes</Text>

      <Text style={styles.fieldLabel}>Priority</Text>
      <View style={styles.priorityRow}>
        {PRIORITIES.map(p => {
          const isActive = priority === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.priorityChip, isActive && { backgroundColor: `${p.color}20`, borderColor: p.color }]}
              onPress={() => setPriority(p.id)}
            >
              <Ionicons name={p.icon as any} size={14} color={isActive ? p.color : colors.textTertiary} />
              <Text style={[styles.priorityText, isActive && { color: p.color, fontWeight: '700' }]}>{p.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.fieldLabel}>Notes (Optional)</Text>
      <TextInput
        style={styles.notesInput}
        placeholder="Any special requirements or notes..."
        placeholderTextColor={colors.textTertiary}
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
    </ScrollView>
  );

  const renderReviewStep = () => (
    <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.stepTitle}>Review & Submit</Text>
      <Text style={styles.stepSubtitle}>Confirm your application details</Text>

      <View style={[styles.reviewCard, Shadows.sm]}>
        <LinearGradient
          colors={isDark ? [colors.bgCard, colors.bgCardLight] : ['#FFFFFF', '#F7F8FC']}
          style={styles.reviewCardInner}
        >
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Product</Text>
            <Text style={styles.reviewValue}>{selectedProduct?.name}</Text>
          </View>
          {selectedProduct?.brand && (
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Brand</Text>
              <Text style={styles.reviewValue}>{selectedProduct.brand}</Text>
            </View>
          )}
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Certification</Text>
            <Text style={styles.reviewValue}>{selectedCertType?.name}</Text>
          </View>
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Priority</Text>
            <View style={[styles.priorityBadge, { backgroundColor: `${PRIORITIES.find(p => p.id === priority)?.color}20` }]}>
              <Text style={[styles.priorityBadgeText, { color: PRIORITIES.find(p => p.id === priority)?.color }]}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </Text>
            </View>
          </View>
          {notes.trim() ? (
            <View style={[styles.reviewRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
              <Text style={styles.reviewLabel}>Notes</Text>
              <Text style={[styles.reviewValue, { textAlign: 'left', marginTop: 4 }]}>{notes}</Text>
            </View>
          ) : null}
        </LinearGradient>
      </View>

      <View style={[styles.infoBox, Shadows.sm]}>
        <Ionicons name="information-circle" size={20} color={colors.primary} />
        <Text style={styles.infoText}>
          After submitting, your application will be assigned to a manager and enter the review process.
          You can track progress in real-time from the Applications screen.
        </Text>
      </View>
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={isDark ? [colors.bgDark, '#0C0D14'] : [colors.bgDark, '#EEF3FF']}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>New Application</Text>
            <Text style={styles.headerSub}>Step {stepIndex + 1} of {STEPS.length}</Text>
          </View>
        </View>

        {renderStepIndicator()}

        <View style={{ flex: 1 }}>
          {step === 'product' && renderProductStep()}
          {step === 'certification' && renderCertStep()}
          {step === 'details' && renderDetailsStep()}
          {step === 'review' && renderReviewStep()}
        </View>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={[styles.nextBtn, !canProceed() && styles.nextBtnDisabled]}
            onPress={handleNext}
            disabled={!canProceed() || createMutation.isPending}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={canProceed() ? [colors.primary, colors.primaryDark] : [colors.border, colors.border]}
              style={styles.nextBtnGradient}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.nextBtnText}>
                    {step === 'review' ? 'Submit Application' : 'Continue'}
                  </Text>
                  <Ionicons
                    name={step === 'review' ? 'checkmark-circle' : 'arrow-forward'}
                    size={18}
                    color="#FFFFFF"
                  />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const makeStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bgDark },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 12,
      gap: 16,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border,
    },
    headerTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
    headerSub: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },

    stepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 40,
      marginBottom: 16,
    },
    stepDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: isDark ? colors.bgCard : '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepLine: {
      flex: 1,
      height: 2,
      backgroundColor: colors.border,
      marginHorizontal: 4,
    },

    stepContent: { flex: 1, paddingHorizontal: 20 },
    stepTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
    stepSubtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 16 },

    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: BorderRadius.md,
      backgroundColor: isDark ? colors.bgCard : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
      marginBottom: 12,
    },
    searchInput: {
      flex: 1,
      fontSize: 14,
      color: colors.textPrimary,
      padding: 0,
    },

    selectCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: BorderRadius.lg,
      backgroundColor: isDark ? colors.bgCard : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
      marginBottom: 8,
    },
    selectCardActive: {
      borderColor: colors.primary,
      backgroundColor: isDark ? `${colors.primary}10` : `${colors.primary}08`,
    },
    selectIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F0F0F5',
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectTitle: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
    selectSub: { fontSize: 12, color: colors.textTertiary, marginTop: 2 },
    checkCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },

    emptyState: { alignItems: 'center', marginTop: 60, gap: 12 },
    emptyText: { fontSize: 14, color: colors.textTertiary, textAlign: 'center' },

    fieldLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 8,
      marginTop: 16,
    },
    priorityRow: { flexDirection: 'row', gap: 10 },
    priorityChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: BorderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: isDark ? colors.bgCard : '#FFFFFF',
    },
    priorityText: { fontSize: 13, color: colors.textSecondary },

    notesInput: {
      minHeight: 100,
      padding: 12,
      borderRadius: BorderRadius.md,
      backgroundColor: isDark ? colors.bgCard : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
      color: colors.textPrimary,
      fontSize: 14,
      lineHeight: 20,
    },

    reviewCard: {
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
      marginBottom: 16,
    },
    reviewCardInner: { padding: 16 },
    reviewRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : colors.border,
    },
    reviewLabel: { fontSize: 13, color: colors.textTertiary },
    reviewValue: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, flex: 1, textAlign: 'right' },
    priorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
    priorityBadgeText: { fontSize: 12, fontWeight: '700' },

    infoBox: {
      flexDirection: 'row',
      gap: 10,
      padding: 14,
      borderRadius: BorderRadius.lg,
      backgroundColor: isDark ? `${colors.primary}10` : `${colors.primary}08`,
      borderWidth: 1,
      borderColor: isDark ? `${colors.primary}20` : `${colors.primary}15`,
      marginBottom: 20,
    },
    infoText: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 18 },

    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
    },
    nextBtn: { borderRadius: BorderRadius.lg, overflow: 'hidden' },
    nextBtnDisabled: { opacity: 0.5 },
    nextBtnGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      gap: 8,
    },
    nextBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  });

export default NewApplicationScreen;
