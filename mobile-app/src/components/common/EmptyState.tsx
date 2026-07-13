import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Typography } from '../../theme';
import Button from './Button';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon = 'folder-open-outline', title, subtitle, actionLabel, onAction }) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingVertical: 60 }}>
      <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.bgCardLight, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Ionicons name={icon} size={56} color={colors.textTertiary} />
      </View>
      <Text style={{ ...Typography.h5, color: colors.textPrimary, textAlign: 'center', marginBottom: 8 }}>{title}</Text>
      {subtitle && <Text style={{ ...Typography.body2, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 }}>{subtitle}</Text>}
      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} variant="primary" size="md" style={{ marginTop: 24 }} />
      )}
    </View>
  );
};

export default EmptyState;
