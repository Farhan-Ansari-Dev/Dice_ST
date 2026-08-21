import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, PanResponder, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Svg, { Rect, Line, Circle, G } from 'react-native-svg';
import { useTheme, Typography, Shadows, BorderRadius, Spacing } from '../../theme';
import api from '../../services/api';
import { WORLD_MARKETS, WorldMarket, project } from '../../constants/worldMarkets';

const { width: SCREEN_W } = Dimensions.get('window');
const MAP_W = SCREEN_W - Spacing.xl * 2;
const MAP_H = MAP_W * 0.55;

/**
 * Global Markets map — a real equirectangular projection of country coordinates
 * (react-native-svg), with pan + zoom, selection, and HONEST data states:
 * markets with verified DICE coverage are highlighted; others show
 * "Market data unavailable". No fabricated statistics.
 */
export default function TargetMarketsMapScreen() {
  const { colors, isDark } = useTheme();
  const styles = makeStyles(colors, isDark);
  const navigation = useNavigation<any>();

  const [coverage, setCoverage] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<WorldMarket | null>(null);

  // Pan/zoom state.
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const origin = useRef({ tx: 0, ty: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
      onPanResponderGrant: () => { origin.current = { tx, ty }; },
      onPanResponderMove: (_e, g) => {
        setTx(origin.current.tx + g.dx);
        setTy(origin.current.ty + g.dy);
      },
    }),
  ).current;

  useEffect(() => {
    (async () => {
      try {
        // Verified coverage = markets DICE actually has data for.
        const res = await api.get<{ markets?: { code: string }[] }>('/market-access/coverage');
        setCoverage(new Set((res.markets || []).map((m) => m.code)));
      } catch {
        setCoverage(new Set());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const verifiedColor = colors.success;
  const mutedColor = colors.textSecondary;

  const graticule = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let lon = -180; lon <= 180; lon += 30) {
      const a = project(lon, 90, MAP_W, MAP_H);
      const b = project(lon, -90, MAP_W, MAP_H);
      lines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }
    for (let lat = -60; lat <= 90; lat += 30) {
      const a = project(-180, lat, MAP_W, MAP_H);
      const b = project(180, lat, MAP_W, MAP_H);
      lines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }
    return lines;
  }, []);

  const zoom = (factor: number) => setScale((s) => Math.min(4, Math.max(1, +(s * factor).toFixed(2))));
  const reset = () => { setScale(1); setTx(0); setTy(0); };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.glassBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Global Markets</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={{ height: MAP_H, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <View style={styles.mapWrap} {...panResponder.panHandlers}>
            <Svg width={MAP_W} height={MAP_H}>
              <Rect x={0} y={0} width={MAP_W} height={MAP_H} rx={BorderRadius.xl} fill={isDark ? '#0E1626' : '#EAF2FB'} />
              <G x={tx} y={ty} scale={scale} originX={MAP_W / 2} originY={MAP_H / 2}>
                {graticule.map((l, i) => (
                  <Line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={isDark ? '#22314A' : '#CDDDF0'} strokeWidth={0.5} />
                ))}
                {WORLD_MARKETS.map((m) => {
                  const p = project(m.lon, m.lat, MAP_W, MAP_H);
                  const isVerified = coverage.has(m.code);
                  const isSel = selected?.code === m.code;
                  return (
                    <Circle
                      key={m.code}
                      cx={p.x}
                      cy={p.y}
                      r={isSel ? 7 / scale : 4.5 / scale}
                      fill={isVerified ? verifiedColor : mutedColor}
                      opacity={isVerified ? 1 : 0.5}
                      stroke={isSel ? colors.primary : '#FFFFFF'}
                      strokeWidth={(isSel ? 2.5 : 1) / scale}
                      onPress={() => setSelected(m)}
                    />
                  );
                })}
              </G>
            </Svg>

            {/* Zoom controls */}
            <View style={styles.zoomControls}>
              <TouchableOpacity style={styles.zoomBtn} onPress={() => zoom(1.4)}><Ionicons name="add" size={20} color={colors.textPrimary} /></TouchableOpacity>
              <TouchableOpacity style={styles.zoomBtn} onPress={() => zoom(0.7)}><Ionicons name="remove" size={20} color={colors.textPrimary} /></TouchableOpacity>
              <TouchableOpacity style={styles.zoomBtn} onPress={reset}><Ionicons name="scan-outline" size={18} color={colors.textPrimary} /></TouchableOpacity>
            </View>
          </View>
        )}

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: verifiedColor }]} /><Text style={styles.legendText}>Verified DICE coverage</Text></View>
          <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: mutedColor, opacity: 0.5 }]} /><Text style={styles.legendText}>No verified data</Text></View>
        </View>
        <Text style={styles.hint}>Drag to pan · +/− to zoom · tap a country</Text>

        {/* Selection panel */}
        {selected ? (
          <View style={styles.panel}>
            <View style={styles.panelHead}>
              <Text style={styles.panelTitle}>{selected.flag} {selected.name}</Text>
              <TouchableOpacity onPress={() => setSelected(null)}><Ionicons name="close" size={20} color={colors.textSecondary} /></TouchableOpacity>
            </View>
            {coverage.has(selected.code) ? (
              <>
                <View style={styles.statusRow}>
                  <Ionicons name="shield-checkmark" size={16} color={verifiedColor} />
                  <Text style={[styles.statusText, { color: verifiedColor }]}>Verified market coverage available</Text>
                </View>
                <TouchableOpacity style={styles.action} onPress={() => navigation.navigate('CountryDetails', { countryName: selected.name, flag: selected.flag })}>
                  <Text style={styles.actionText}>View market details</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.action} onPress={() => navigation.navigate('OpportunitiesList')}>
                  <Text style={styles.actionText}>Explore opportunities</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.statusRow}>
                <Ionicons name="information-circle-outline" size={16} color={mutedColor} />
                <Text style={styles.statusText}>Market data unavailable — DICE doesn’t have verified coverage for this market yet.</Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.tapHint}>Tap a country on the map to see its market status.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#0A0A0A' : '#F7F9FC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border },
  glassBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...Typography.h3, color: colors.textPrimary },
  content: { padding: Spacing.xl },
  mapWrap: { borderRadius: BorderRadius.xl, overflow: 'hidden', ...Shadows.sm },
  zoomControls: { position: 'absolute', right: Spacing.sm, top: Spacing.sm, gap: 6 },
  zoomBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center', ...Shadows.sm },
  legend: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { ...Typography.caption, color: colors.textSecondary },
  hint: { ...Typography.caption, color: colors.textSecondary, marginTop: 6, opacity: 0.8 },
  panel: { backgroundColor: colors.bgCard, padding: Spacing.lg, borderRadius: BorderRadius.xl, marginTop: Spacing.lg, ...Shadows.sm },
  panelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  panelTitle: { ...Typography.h4, color: colors.textPrimary },
  statusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: Spacing.sm },
  statusText: { ...Typography.body2, color: colors.textSecondary, flex: 1, lineHeight: 20 },
  action: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  actionText: { ...Typography.body2, color: colors.primary, fontWeight: '600' },
  tapHint: { ...Typography.caption, color: colors.textSecondary, textAlign: 'center', marginTop: Spacing.lg },
});
