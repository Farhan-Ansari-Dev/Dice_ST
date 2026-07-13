import React from 'react';
import { View, Text } from 'react-native';
import { useTheme, Typography } from '../../theme';

interface DonutSlice { label: string; value: number; color: string; }
interface DonutChartProps {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  showLegend?: boolean;
}

const DonutChart: React.FC<DonutChartProps> = ({
  data, size = 120, thickness = 20, centerLabel, centerValue, showLegend = true,
}) => {
  const { colors } = useTheme();
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return null;

  const radius = size / 2;
  const innerRadius = radius - thickness;

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size, position: 'relative', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {/* Background ring */}
        <View style={{ position: 'absolute', width: size, height: size, borderRadius: radius, borderWidth: thickness, borderColor: colors.bgCardLight }} />
        {/* Segments */}
        {data.map((slice, i) => {
          const pct = slice.value / total;
          const segH = pct * size;
          return (
            <View key={i} style={{ position: 'absolute', backgroundColor: slice.color, height: segH, width: thickness, top: i * segH, right: 0, opacity: 0.85, borderRadius: 2 }} />
          );
        })}
        {/* Center */}
        <View style={{ width: innerRadius * 2, height: innerRadius * 2, borderRadius: innerRadius, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center' }}>
          {centerValue && <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textPrimary, letterSpacing: -0.5 }}>{centerValue}</Text>}
          {centerLabel && <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>{centerLabel}</Text>}
        </View>
      </View>

      {showLegend && (
        <View style={{ marginTop: 16, width: '100%', gap: 6 }}>
          {data.map((slice, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: slice.color }} />
              <Text style={{ flex: 1, fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>{slice.label}</Text>
              <Text style={{ fontSize: 12, color: colors.textPrimary, fontWeight: '600' }}>{Math.round((slice.value / total) * 100)}%</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default DonutChart;
