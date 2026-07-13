import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Typography, BorderRadius, Shadows } from '../../theme';

interface AIWidgetProps {
  title: string;
  insight: string;
  confidence?: number;
  onPress?: () => void;
  compact?: boolean;
}

const AIWidget: React.FC<AIWidgetProps> = ({
  title,
  insight,
  confidence = 92,
  onPress,
  compact = false,
}) => {
  const { colors, isDark } = useTheme();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <LinearGradient
        colors={isDark
          ? ['rgba(108,99,255,0.2)', 'rgba(0,212,255,0.1)']
          : ['rgba(108,99,255,0.08)', 'rgba(0,212,255,0.04)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, Platform.OS === 'ios' ? Shadows.primary : {}, {
          borderColor: isDark ? 'rgba(108,99,255,0.25)' : 'rgba(108,99,255,0.2)',
          backgroundColor: isDark ? 'transparent' : '#FDFAFF',
        }]}
      >
        <View style={styles.header}>
          <View style={styles.aiIconWrapper}>
            <Animated.View style={[styles.aiIconPulse, { transform: [{ scale: pulse }] }]} />
            <LinearGradient
              colors={[colors.primary, colors.secondary]}
              style={styles.aiIcon}
            >
              <Ionicons name="sparkles" size={14} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={[styles.aiLabel, { color: colors.primary }]}>AI Insight</Text>
          <View style={styles.confidenceBadge}>
            <Text style={[styles.confidenceText, { color: colors.success }]}>{confidence}% confident</Text>
          </View>
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        {!compact && (
          <Text style={[styles.insight, { color: colors.textSecondary }]} numberOfLines={3}>{insight}</Text>
        )}

        {onPress && (
          <View style={styles.footer}>
            <Text style={[styles.readMore, { color: colors.secondary }]}>Read more</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.secondary} />
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  aiIconWrapper: {
    position: 'relative',
    marginRight: 8,
  },
  aiIconPulse: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(108,99,255,0.2)',
    top: -2,
    left: -2,
  },
  aiIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiLabel: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  confidenceBadge: {
    backgroundColor: 'rgba(0,200,150,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: '600',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
    lineHeight: 20,
  },
  insight: {
    fontSize: 13,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 4,
  },
  readMore: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default AIWidget;
