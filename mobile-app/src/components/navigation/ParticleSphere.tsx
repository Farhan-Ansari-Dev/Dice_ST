import React, { useMemo } from 'react';
import Svg, { Circle, Path, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
  useDerivedValue,
  ReduceMotion,
  type SharedValue,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * A rotating particle sphere rendered with SVG dots, with firing "sparks": a
 * few short one-to-one connections light up between adjacent dots and sweep
 * around the cloud, pulsing on and off — a neural-firing feel over the moving
 * nodes. Uses only react-native-svg + reanimated (no native additions).
 */

interface ParticleSphereProps {
  size?: number;
  count?: number;
  period?: number;
}

interface BasePoint {
  x: number;
  y: number;
  z: number;
  color: string;
  baseR: number;
}

// Brand palette — cyan → indigo → white, matching the DICE gradient.
const PALETTE = ['#67E8F9', '#22D3EE', '#818CF8', '#A5B4FC', '#C7D2FE', '#FFFFFF'];

function buildPoints(count: number): BasePoint[] {
  const points: BasePoint[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;
    const t = (y + 1) / 2;
    const idx = Math.min(PALETTE.length - 1, Math.floor((1 - t) * PALETTE.length));
    points.push({ x, y, z, color: PALETTE[idx], baseR: 0.72 });
  }
  return points;
}

/** Each dot paired with its single nearest neighbour, deduped (short edges). */
function buildNearestEdges(points: BasePoint[]): [number, number][] {
  const n = points.length;
  const seen = new Set<string>();
  const edges: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    let best = -1;
    let bestD = Infinity;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      const dz = points[i].z - points[j].z;
      const d = dx * dx + dy * dy + dz * dz;
      if (d < bestD) { bestD = d; best = j; }
    }
    if (best < 0) continue;
    const a = Math.min(i, best);
    const b = Math.max(i, best);
    const key = `${a}-${b}`;
    if (!seen.has(key)) { seen.add(key); edges.push([a, b]); }
  }
  return edges;
}

const Dot: React.FC<{ p: BasePoint; angle: SharedValue<number>; size: number }> = ({ p, angle, size }) => {
  const center = size / 2;
  const R = size * 0.42;
  const animatedProps = useAnimatedProps(() => {
    'worklet';
    const a = angle.value;
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);
    const xr = p.x * cosA + p.z * sinA;
    const zr = -p.x * sinA + p.z * cosA;
    const depth = (zr + 1) / 2;
    return {
      cx: center + xr * R,
      cy: center + p.y * R,
      r: p.baseR * (0.55 + depth * 0.9),
      opacity: 0.22 + depth * 0.78,
    };
  });
  return <AnimatedCircle animatedProps={animatedProps} fill={p.color} />;
};

/** One firing spark: a short connection line that sweeps the edge list (offset
 *  by `phase`) and pulses in and out. */
const Spark: React.FC<{
  points: BasePoint[];
  edges: [number, number][];
  angle: SharedValue<number>;
  fire: SharedValue<number>;
  size: number;
  phase: number;
}> = ({ points, edges, angle, fire, size, phase }) => {
  const center = size / 2;
  const R = size * 0.42;
  const m = edges.length;
  const animatedProps = useAnimatedProps(() => {
    'worklet';
    const a = angle.value;
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);
    const t = fire.value * m + phase;
    const idx = ((Math.floor(t) % m) + m) % m;
    const frac = t - Math.floor(t);
    const pulse = Math.sin(frac * Math.PI);
    const e = edges[idx];
    const p = points[e[0]];
    const q = points[e[1]];
    const px = center + (p.x * cosA + p.z * sinA) * R;
    const qx = center + (q.x * cosA + q.z * sinA) * R;
    return {
      d: `M${px} ${center + p.y * R}L${qx} ${center + q.y * R}`,
      strokeOpacity: pulse * 0.85,
    };
  });
  return (
    <AnimatedPath animatedProps={animatedProps} stroke="#8CE9FF" strokeWidth={0.7} strokeLinecap="round" fill="none" />
  );
};

const SPARKS = 5;

const ParticleSphere: React.FC<ParticleSphereProps> = ({ size = 44, count = 80, period = 9 }) => {
  const points = useMemo(() => buildPoints(count), [count]);
  const edges = useMemo(() => buildNearestEdges(points), [points]);
  const progress = useSharedValue(0);
  const fire = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: period * 1000, easing: Easing.linear, reduceMotion: ReduceMotion.Never }),
      -1,
      false,
    );
    fire.value = withRepeat(
      withTiming(1, { duration: Math.max(1, edges.length) * 320, easing: Easing.linear, reduceMotion: ReduceMotion.Never }),
      -1,
      false,
    );
  }, [period, edges.length]);

  const angle = useDerivedValue(() => progress.value * Math.PI * 2);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <RadialGradient id="sphereGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#67E8F9" stopOpacity={0.35} />
          <Stop offset="60%" stopColor="#67E8F9" stopOpacity={0.12} />
          <Stop offset="100%" stopColor="#67E8F9" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#sphereGlow)" />
      {Array.from({ length: SPARKS }).map((_, k) => (
        <Spark key={k} points={points} edges={edges} angle={angle} fire={fire} size={size} phase={(edges.length * k) / SPARKS} />
      ))}
      {points.map((p, i) => (
        <Dot key={i} p={p} angle={angle} size={size} />
      ))}
    </Svg>
  );
};

export default ParticleSphere;
