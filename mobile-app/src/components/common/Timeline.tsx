import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Typography } from '../../theme';

interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  date?: string;
  status: 'completed' | 'current' | 'upcoming';
}

const Timeline: React.FC<{ items: TimelineItem[] }> = ({ items }) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={{ paddingLeft: 4 }}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isCompleted = item.status === 'completed';
        const isCurrent = item.status === 'current';

        const dotBg = isCompleted ? colors.success : isCurrent ? colors.primary : (isDark ? colors.bgCardLight : colors.border);

        return (
          <View key={item.id} style={{ flexDirection: 'row' }}>
            {/* Left column */}
            <View style={{ alignItems: 'center', width: 32, marginRight: 12 }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', zIndex: 1, backgroundColor: dotBg, borderWidth: isCurrent ? 2 : 0, borderColor: 'rgba(108,99,255,0.4)' }}>
                {isCompleted && <Ionicons name="checkmark" size={12} color="#fff" />}
                {isCurrent && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />}
              </View>
              {!isLast && (
                <View style={{ width: 2, flex: 1, minHeight: 20, marginTop: 2, marginBottom: 2, backgroundColor: isCompleted ? colors.success : colors.border }} />
              )}
            </View>
            {/* Content */}
            <View style={{ flex: 1, paddingTop: 2, paddingBottom: isLast ? 0 : 20 }}>
              <Text style={{ fontSize: 13, color: isCurrent ? colors.textPrimary : colors.textSecondary, fontWeight: isCurrent ? '600' : '500' }}>{item.title}</Text>
              {item.description && <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 3 }}>{item.description}</Text>}
              {item.date && <Text style={{ fontSize: 11, color: colors.textTertiary, marginTop: 3 }}>{item.date}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
};

export default Timeline;
