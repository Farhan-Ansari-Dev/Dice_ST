import React, { useMemo } from 'react';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
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

/**
 * A rotating particle sphere rendered with SVG dots.
 *
 * Points are distributed evenly on a unit sphere (Fibonacci lattice), then
 * rotated about the Y axis on the UI thread via Reanimated. Depth (z) drives
 * each dot's radius and opacity, giving a 3D volume illusion at small sizes.
 *
 * Uses only libraries already in the app (react-native-svg + reanimated) —
 * no native additions.
 */

interface ParticleSphereProps {
  /** Overall square size of the sphere in px. */
  size?: number;
  /** Number of dots on the sphere. Keep modest for perf on a persistent view. */
  count?: number;
  /** Seconds for one full revolution. */
  period?: number;
}

interface BasePoint {
  x: number;
  y: number;
  z: number;
  color: string;
  baseR: number;
}

// Warm palette echoing the reference glow (amber → rose → fuchsia).
const PALETTE = ['#FDE68A', '#FCA5A5', '#FDA4AF', '#F9A8D4', '#F0ABFC', '#FFFFFF'];

function buildPoints(count: number): BasePoint[] {
  const points: BasePoint[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5)); // golden angle
  for (let i = 0; i < count; i++) {
    // Even distribution on the unit sphere.
    const y = 1 - (i / (count - 1)) * 2; // 1 → -1
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;
    // Colour by latitude: top rows fuchsia/rose, bottom rows amber — like the reference.
    const t = (y + 1) / 2; // 0 (bottom) → 1 (top)
    const idx = Math.min(PALETTE.length - 1, Math.floor((1 - t) * PALETTE.length));
    points.push({ x, y, z, color: PALETTE[idx], baseR: 0.9 });
  }
  return points;
}

const Dot: React.FC<{ p: BasePoint; angle: SharedValue<number>; size: number }> = ({
  p,
  angle,
  size,
}) => {
  const center = size / 2;
  const R = size * 0.42; // sphere radius within the viewbox

  const animatedProps = useAnimatedProps(() => {
    'worklet';
    const a = angle.value;
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);
    // Rotate about the Y axis.
    const xr = p.x * cosA + p.z * sinA;
    const zr = -p.x * sinA + p.z * cosA;
    const depth = (zr + 1) / 2; // 0 (far) → 1 (near)

    return {
      cx: center + xr * R,
      cy: center + p.y * R,
      r: p.baseR * (0.55 + depth * 0.9),
      opacity: 0.22 + depth * 0.78,
    };
  });

  return <AnimatedCircle animatedProps={animatedProps} fill={p.color} />;
};

const ParticleSphere: React.FC<ParticleSphereProps> = ({
  size = 44,
  count = 54,
  period = 9,
}) => {
  const points = useMemo(() => buildPoints(count), [count]);
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withRepeat(
      // Force the rotation even when the OS "reduce motion" setting is on —
      // this gentle, continuous spin is the intended behaviour of the icon.
      withTiming(1, {
        duration: period * 1000,
        easing: Easing.linear,
        reduceMotion: ReduceMotion.Never,
      }),
      -1,
      false,
    );
  }, [period]);

  const angle = useDerivedValue(() => progress.value * Math.PI * 2);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <RadialGradient id="sphereGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#F472B6" stopOpacity={0.35} />
          <Stop offset="60%" stopColor="#F472B6" stopOpacity={0.12} />
          <Stop offset="100%" stopColor="#F472B6" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {/* Soft atmospheric glow behind the dots. */}
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill="url(#sphereGlow)" />
      {points.map((p, i) => (
        <Dot key={i} p={p} angle={angle} size={size} />
      ))}
    </Svg>
  );
};

export default ParticleSphere;
