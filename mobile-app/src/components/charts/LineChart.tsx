import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { useTheme, Typography } from '../../theme';

interface DataPoint { x: string; y: number; }
interface LineChartProps {
  data: DataPoint[];
  color?: string;
  height?: number;
  title?: string;
  showGrid?: boolean;
  showDots?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SimpleLineChart: React.FC<LineChartProps> = ({
  data, color, height = 140, title, showGrid = true, showDots = true,
}) => {
  const { colors, isDark } = useTheme();
  const barColor = color ?? colors.primary;

  if (!data || data.length === 0) return null;

  const values = data.map((d) => d.y);
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);
  const range = maxVal - minVal || 1;
  const paddingH = 16;
  const paddingV = 12;
  const chartWidth = SCREEN_WIDTH - 80;
  const chartHeight = height - paddingV * 2;

  const getX = (i: number) => paddingH + (i / (data.length - 1)) * (chartWidth - paddingH * 2);
  const getY = (v: number) => paddingV + (1 - (v - minVal) / range) * chartHeight;

  return (
    <View style={{ width: '100%' }}>
      {title && <Text style={{ ...Typography.caption, color: colors.textSecondary, marginBottom: 8, fontWeight: '600' }}>{title}</Text>}
      <View style={{ height, width: '100%', position: 'relative' }}>
        {showGrid && [0, 0.25, 0.5, 0.75, 1].map((fraction, i) => (
          <View key={i} style={{ position: 'absolute', left: 0, right: 0, height: 1, top: paddingV + fraction * chartHeight, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border }} />
        ))}
        {data.map((point, i) => {
          const barH = ((point.y - minVal) / range) * chartHeight;
          return (
            <View key={i} style={{ position: 'absolute', left: getX(i) - 2, bottom: paddingV, height: barH, width: 4, alignItems: 'center' }}>
              <View style={{ width: 4, height: barH, backgroundColor: barColor, borderRadius: 2, opacity: 0.6 }} />
              {showDots && <View style={{ width: 8, height: 8, borderRadius: 4, position: 'absolute', top: 0, left: -2, backgroundColor: barColor, borderWidth: 2, borderColor: colors.bgCard }} />}
            </View>
          );
        })}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 16 }}>
          {data.map((point, i) =>
            i % Math.ceil(data.length / 5) === 0 ? (
              <Text key={i} style={{ position: 'absolute', left: getX(i) - 12, fontSize: 9, color: colors.textTertiary }} numberOfLines={1}>{point.x}</Text>
            ) : null
          )}
        </View>
      </View>
    </View>
  );
};

export default SimpleLineChart;
