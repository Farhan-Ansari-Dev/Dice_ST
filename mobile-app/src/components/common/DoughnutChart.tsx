import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import Svg, { Circle, G, Text as SvgText } from 'react-native-svg';

interface DoughnutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
  centerText?: string;
  centerSubtext?: string;
  textColor?: string;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const DoughnutChart: React.FC<DoughnutChartProps> = ({
  data,
  size = 120,
  strokeWidth = 14,
  centerText,
  centerSubtext,
  textColor = '#FFFFFF',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: 1,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  let cumulativePercentage = 0;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {/* Background Circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {data.map((item, index) => {
            const percentage = item.value / total;
            const strokeDashoffset = circumference - percentage * circumference;
            const rotation = cumulativePercentage * 360;
            cumulativePercentage += percentage;

            return (
              <G key={index} rotation={rotation} origin={`${size / 2}, ${size / 2}`}>
                <AnimatedCircle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={item.color}
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={animValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [circumference, strokeDashoffset],
                  })}
                  strokeLinecap="round"
                />
              </G>
            );
          })}
        </G>
        {centerText && (
          <SvgText
            x={size / 2}
            y={size / 2 + (centerSubtext ? -2 : 6)}
            textAnchor="middle"
            fill={textColor}
            fontSize={size * 0.22}
            fontWeight="bold"
          >
            {centerText}
          </SvgText>
        )}
        {centerSubtext && (
          <SvgText
            x={size / 2}
            y={size / 2 + 14}
            textAnchor="middle"
            fill={textColor}
            fontSize={size * 0.09}
            opacity={0.7}
          >
            {centerSubtext}
          </SvgText>
        )}
      </Svg>
    </View>
  );
};

export default DoughnutChart;
