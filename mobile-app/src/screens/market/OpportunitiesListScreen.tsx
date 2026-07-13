import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, Typography, Shadows, BorderRadius, Spacing } from '../../theme';
import api from '../../services/api';

export default function OpportunitiesListScreen() {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const navigation = useNavigation<any>();
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const fetchOpportunities = async () => {
    try {
      const res = await api.get<any>('/bi/opportunities');
      setOpportunities(res.data || []);
    } catch (error) {
      console.warn('Failed to fetch opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGradient = (index: number) => {
    const gradients: readonly [string, string][] = [
      ['#FF416C', '#FF4B2B'],
      ['#4776E6', '#8E54E9'],
      ['#00B4DB', '#0083B0'],
      ['#F3904F', '#3B4371'],
      ['#1D976C', '#93F9B9']
    ];
    return gradients[index % gradients.length];
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.glassBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Opportunities</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={opportunities}
          keyExtractor={(item) => item._id || Math.random().toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => {
            const gradient = getGradient(index);
            return (
              <TouchableOpacity onPress={() => navigation.navigate('BusinessOpportunity', { title: item.title, industry: item.industry })}>
                <LinearGradient
                  colors={gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.oppCard}
                >
                  <View style={styles.glassOverlay} />
                  <View style={styles.oppTopRow}>
                     <View style={styles.certBadge}><Text style={styles.certText}>{item.industry}</Text></View>
                     <View style={styles.trendIcon}><Ionicons name="trending-up" size={16} color={gradient[0]} /></View>
                  </View>
                  <Text style={styles.oppTitle}>{item.title}</Text>
                  <Text style={styles.oppSub}>{item.country} • {item.demandLevel || 'High'} Demand</Text>
                  <View style={styles.oppFooter}>
                    <View>
                      <Text style={styles.oppInvestLabel}>Est. Investment</Text>
                      <Text style={styles.oppInvest}>₹{item.investmentRequired || 0}</Text>
                    </View>
                    <Ionicons name="arrow-forward-circle" size={32} color="#FFF" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<Text style={styles.emptyText}>No opportunities found.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#0A0A0A' : '#F7F9FC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border },
  glassBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...Typography.h3, color: colors.textPrimary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: Spacing.xl },
  
  oppCard: { padding: Spacing.xl, borderRadius: BorderRadius['2xl'], marginBottom: Spacing.lg, ...Shadows.lg, overflow: 'hidden' },
  glassOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.1)' },
  oppTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  certBadge: { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.full },
  certText: { ...Typography.label, color: '#FFFFFF', fontWeight: 'bold' },
  trendIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  oppTitle: { ...Typography.h2, color: '#FFFFFF', marginBottom: 4 },
  oppSub: { ...Typography.body1, color: 'rgba(255,255,255,0.8)', marginBottom: Spacing.xl },
  oppFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  oppInvestLabel: { ...Typography.caption, color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  oppInvest: { ...Typography.h4, color: '#FFFFFF' },
  emptyText: { textAlign: 'center', color: colors.textSecondary, marginTop: Spacing['4xl'] }
});
