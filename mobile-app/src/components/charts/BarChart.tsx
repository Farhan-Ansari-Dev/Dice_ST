import React from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, Typography } from '../../theme';

interface BarDataPoint { label: string; value: number; color?: string; }
interface BarChartProps {
  data: BarDataPoint[];
  height?: number;
  title?: string;
  showValues?: boolean;
  gradient?: [string, string];
}

const BarChart: React.FC<BarChartProps> = ({
  data, height = 160, title, showValues = true, gradient,
}) => {
  const { colors, isDark } = useTheme();
  const defaultGradient: [string, string] = gradient ?? [colors.primary, colors.primaryDark];

  if (!data || data.length === 0) return null;

  const maxValue = Math.max(...data.map((d) => d.value));
  const chartHeight = height - 40;

  return (
    <View style={{ width: '100%' }}>
      {title && <Text style={{ ...Typography.caption, color: colors.textSecondary, marginBottom: 8, fontWeight: '600' }}>{title}</Text>}
      <View style={{ height, width: '100%' }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', flex: 1 }}>
          {data.map((item, index) => {
            const barHeight = maxValue > 0 ? (item.value / maxValue) * chartHeight : 0;
            const itemGradient: [string, string] = item.color ? [item.color, item.color] : defaultGradient;
            return (
              <View key={index} style={{ flex: 1, alignItems: 'center', marginHorizontal: 2 }}>
                {showValues && <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: '600', marginBottom: 4 }}>{item.value}</Text>}
                <View style={{ width: '100%', height: chartHeight, justifyContent: 'flex-end', borderRadius: 4, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border, overflow: 'hidden' }}>
                  <LinearGradient colors={itemGradient} style={{ width: '100%', height: barHeight, borderRadius: 4, opacity: 0.85 }} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
                </View>
                <Text style={{ fontSize: 9, color: colors.textTertiary, marginTop: 4, textAlign: 'center' }} numberOfLines={1}>{item.label}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

export default BarChart;
