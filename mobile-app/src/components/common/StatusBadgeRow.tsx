import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTheme, BorderRadius } from '../../theme';

interface StatusFilter {
  label: string;
  value: string;
  color?: string;
  count?: number;
}

interface StatusBadgeRowProps {
  filters: StatusFilter[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

const StatusBadgeRow: React.FC<StatusBadgeRowProps> = ({
  filters,
  activeFilter,
  onFilterChange,
}) => {
  const { colors, isDark } = useTheme();

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      scrollEventThrottle={16}
    >
      {filters.map((filter) => {
        const isActive = activeFilter === filter.value;
        return (
          <TouchableOpacity
            key={filter.value}
            style={[
              styles.badge,
              isActive && styles.badgeActive,
            ]}
            onPress={() => onFilterChange(filter.value)}
          >
            <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
              {filter.label}
              {filter.count !== undefined && ` (${filter.count})`}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>['colors'], isDark: boolean) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      gap: 8,
    },
    badge: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: BorderRadius.md,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.bgCardLight,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border,
    },
    badgeActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    badgeTextActive: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
  });

export default StatusBadgeRow;
