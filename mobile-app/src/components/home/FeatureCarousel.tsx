import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, BorderRadius } from '../../theme';
import { HOME_FEATURE_CARDS } from '../../utils/constants';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;
const CARD_SPACING = 14;

interface Props {
  onCardPress: (screen: string, params?: Record<string, any>) => void;
}

const BADGE_COLORS: Record<string, [string, string]> = {
  NEW:     ['#00C896', '#00A07A'],
  POPULAR: ['#FFB347', '#FF9500'],
  OFFER:   ['#FF6B6B', '#FF4757'],
  LIVE:    ['#00D4FF', '#0099CC'],
};

const FeatureCarousel: React.FC<Props> = ({ onCardPress }) => {
  const { colors, isDark } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  return (
    <View style={styles.wrapper}>
      <Animated.ScrollView
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          {
            useNativeDriver: false,
            listener: (e: any) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_SPACING));
              setActiveIndex(Math.max(0, Math.min(idx, HOME_FEATURE_CARDS.length - 1)));
            },
          }
        )}
      >
        {HOME_FEATURE_CARDS.map((card, index) => {
          const inputRange = [
            (index - 1) * (CARD_WIDTH + CARD_SPACING),
            index * (CARD_WIDTH + CARD_SPACING),
            (index + 1) * (CARD_WIDTH + CARD_SPACING),
          ];
          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.93, 1, 0.93],
            extrapolate: 'clamp',
          });
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.7, 1, 0.7],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={card.id}
              style={[
                styles.cardWrap,
                { transform: [{ scale }], opacity },
              ]}
            >
              <TouchableOpacity
                onPress={() => onCardPress(card.screen, 'screenParams' in card ? (card.screenParams as Record<string, any>) : undefined)}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={card.gradient}
                  style={styles.card}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {/* Top row: badge + icon */}
                  <View style={styles.cardTopRow}>
                    {card.badge ? (
                      <LinearGradient
                        colors={BADGE_COLORS[card.badge] ?? ['#6C63FF', '#4D45CC']}
                        style={styles.badge}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Text style={styles.badgeText}>{card.badge}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.badgePlaceholder} />
                    )}

                    <View style={styles.cardIconWrap}>
                      <Ionicons name={card.icon as any} size={26} color="rgba(255,255,255,0.9)" />
                    </View>
                  </View>

                  {/* Decorative circles */}
                  <View style={styles.decorCircle1} />
                  <View style={styles.decorCircle2} />

                  {/* Text */}
                  <View style={styles.cardTextArea}>
                    <Text style={styles.cardTitle}>{card.title}</Text>
                    <Text style={styles.cardSubtitle} numberOfLines={2}>
                      {card.subtitle}
                    </Text>
                  </View>

                  {/* CTA */}
                  <View style={styles.cardCTA}>
                    <Text style={styles.cardCTAText}>Explore</Text>
                    <View style={styles.cardCTAArrow}>
                      <Ionicons name="arrow-forward" size={13} color="rgba(255,255,255,0.9)" />
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </Animated.ScrollView>

      {/* Dot indicators */}
      <View style={styles.dotsRow}>
        {HOME_FEATURE_CARDS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === activeIndex 
                  ? (isDark ? '#FFFFFF' : colors.primary) 
                  : (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)'),
                width: i === activeIndex ? 20 : 6,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginBottom: 4 },
  scrollContent: {
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  cardWrap: {
    width: CARD_WIDTH,
    marginRight: CARD_SPACING,
  },
  card: {
    width: CARD_WIDTH,
    height: 160,
    borderRadius: BorderRadius['2xl'],
    padding: 16,
    overflow: 'hidden',
    position: 'relative',
  },

  // Decorative circles (depth illusion)
  decorCircle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
    right: -60,
    bottom: -40,
  },
  decorCircle2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.04)',
    right: 10,
    top: -30,
  },

  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  badgePlaceholder: { width: 1 },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardTextArea: { flex: 1, justifyContent: 'flex-end', marginBottom: 12 },
  cardTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 24,
    marginBottom: 5,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 17,
  },

  cardCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardCTAText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  cardCTAArrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    transition: 'width 0.2s',
  } as any,
});

export default FeatureCarousel;
