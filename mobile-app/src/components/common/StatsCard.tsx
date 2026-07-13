import React, { useMemo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Typography, BorderRadius, Shadows } from '../../theme';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
  trend?: { value: number; isPositive: boolean };
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, subtitle, icon, gradient, trend }) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={[{
      flex: 1,
      minWidth: 140,
      borderRadius: BorderRadius.lg,
      backgroundColor: isDark ? colors.bgCard : '#FFFFFF',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
      overflow: 'hidden',
    }, Shadows.md]}>
      <LinearGradient
        colors={isDark
          ? ['rgba(255,255,255,0.04)', 'rgba(255,255,255,0.01)']
          : ['rgba(108,99,255,0.03)', 'rgba(255,255,255,0)']
        }
        style={{ padding: 16 }}
      >
        <View style={styles.header}>
          <LinearGradient
            colors={gradient}
            style={styles.iconContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={icon} size={20} color="#fff" />
          </LinearGradient>
          {trend && (
            <View style={[styles.trendBadge, {
              backgroundColor: trend.isPositive ? 'rgba(0,200,150,0.15)' : 'rgba(255,71,87,0.12)',
            }]}>
              <Ionicons
                name={trend.isPositive ? 'trending-up' : 'trending-down'}
                size={12}
                color={trend.isPositive ? colors.success : colors.error}
              />
              <Text style={{ fontSize: 11, fontWeight: '700', color: trend.isPositive ? colors.success : colors.error }}>
                {Math.abs(trend.value)}%
              </Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 24, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.5, marginBottom: 3 }}>
          {value}
        </Text>
        <Text style={{ ...Typography.caption, color: colors.textSecondary, fontWeight: '500' }}>
          {title}
        </Text>
        {subtitle && (
          <Text style={{ fontSize: 10, color: colors.textTertiary, marginTop: 2 }}>{subtitle}</Text>
        )}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    gap: 3,
  },
});

export default StatsCard;
