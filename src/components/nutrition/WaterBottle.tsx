import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { ClipPath, Defs, G, Path, Rect, Circle, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/theme';
import { prefersReducedMotion } from '../common/Motion';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * A water bottle that fills as you drink. Tap it to add a glass: the level
 * springs up, the surface sloshes, and a few bubbles rise. The waves keep
 * gently moving while the screen is open.
 */

// Bottle drawn in a 100 × 200 box.
const VB_W = 100;
const VB_H = 200;
const BODY =
  'M32 20 H68 V32 C68 40 88 44 88 64 V180 A16 16 0 0 1 72 196 H28 A16 16 0 0 1 12 180 V64 C12 44 32 40 32 32 Z';
const FILL_TOP = 50; // where "100%" sits (just under the shoulder)
const FILL_BOTTOM = 196;

interface WaterBottleProps {
  ml: number;
  goalMl: number;
  onTap: () => void;
  width?: number;
}

function wavePath(level: number, amp: number, phase: number, wavelength: number): string {
  'worklet';
  let d = `M 0 ${level}`;
  for (let x = 0; x <= VB_W; x += 4) {
    const y = level + amp * Math.sin((x / wavelength) * 2 * Math.PI + phase);
    d += ` L ${x} ${y}`;
  }
  return `${d} L ${VB_W} ${VB_H} L 0 ${VB_H} Z`;
}

export const WaterBottle: React.FC<WaterBottleProps> = ({ ml, goalMl, onTap, width = 92 }) => {
  const { colors, isDark } = useTheme();
  const water = colors.pillars.running.accent;
  const pct = goalMl > 0 ? Math.max(0, Math.min(1, ml / goalMl)) : 0;
  const reduce = prefersReducedMotion();

  const level = useSharedValue(FILL_BOTTOM - pct * (FILL_BOTTOM - FILL_TOP));
  const phase = useSharedValue(0);
  const amp = useSharedValue(pct > 0 ? 3 : 0);
  const bubble = useSharedValue(1); // 0 → 1 rises; 1 = hidden

  // Endless gentle wave.
  useEffect(() => {
    if (reduce) return;
    phase.value = withRepeat(withTiming(2 * Math.PI, { duration: 2600, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(phase);
  }, [phase, reduce]);

  // Level follows the amount with a little overshoot, then sloshes.
  useEffect(() => {
    const target = FILL_BOTTOM - pct * (FILL_BOTTOM - FILL_TOP);
    if (reduce) {
      level.value = target;
      amp.value = pct > 0 ? 3 : 0;
      return;
    }
    level.value = withSpring(target, { damping: 9, stiffness: 70, mass: 0.9 });
    amp.value = withSequence(withTiming(pct > 0 ? 8 : 0, { duration: 160 }), withTiming(pct > 0 ? 3 : 0, { duration: 1100 }));
  }, [pct, reduce, level, amp]);

  const front = useAnimatedProps(() => ({ d: wavePath(level.value, amp.value, phase.value, 56) }));
  const back = useAnimatedProps(() => ({ d: wavePath(level.value - 2, amp.value * 0.8, phase.value + Math.PI * 0.8, 44) }));
  const b1 = useAnimatedProps(() => ({
    cy: FILL_BOTTOM - 8 - bubble.value * (FILL_BOTTOM - level.value - 4),
    opacity: bubble.value >= 1 ? 0 : 0.7 * (1 - bubble.value),
  }));
  const b2 = useAnimatedProps(() => ({
    cy: FILL_BOTTOM - 16 - bubble.value * 0.8 * (FILL_BOTTOM - level.value - 4),
    opacity: bubble.value >= 1 ? 0 : 0.6 * (1 - bubble.value),
  }));

  const handlePress = () => {
    if (!reduce) {
      bubble.value = 0;
      bubble.value = withDelay(60, withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }));
    }
    onTap();
  };

  const height = width * (VB_H / VB_W);
  const glass = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)';
  const outline = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(15,23,42,0.18)';

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.96 : 1 }] }]}
      accessibilityRole="button"
      accessibilityLabel={`Water bottle, ${Math.round(pct * 100)} percent of goal. Tap to add a glass`}
      hitSlop={8}
    >
      <View style={{ width, height }}>
        <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
          <Defs>
            <ClipPath id="bottleClip">
              <Path d={BODY} />
            </ClipPath>
            <LinearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={water} stopOpacity="0.95" />
              <Stop offset="1" stopColor={water} stopOpacity="0.7" />
            </LinearGradient>
          </Defs>

          {/* Cap */}
          <Rect x="36" y="4" width="28" height="16" rx="5" fill={outline} />

          {/* Glass + water, clipped to the bottle */}
          <Path d={BODY} fill={glass} />
          <G clipPath="url(#bottleClip)">
            <AnimatedPath animatedProps={back} fill={water} opacity={0.35} />
            <AnimatedPath animatedProps={front} fill="url(#waterGrad)" />
            <AnimatedCircle animatedProps={b1} cx="40" r="3" fill="#FFFFFF" />
            <AnimatedCircle animatedProps={b2} cx="60" r="2.2" fill="#FFFFFF" />
            {/* Shine */}
            <Rect x="20" y="60" width="7" height="110" rx="3.5" fill="#FFFFFF" opacity={0.12} />
          </G>

          {/* Quarter marks */}
          {[0.25, 0.5, 0.75].map((m) => {
            const y = FILL_BOTTOM - m * (FILL_BOTTOM - FILL_TOP);
            return <Rect key={m} x="74" y={y} width="10" height="1.6" rx="0.8" fill={outline} />;
          })}

          {/* Outline on top */}
          <Path d={BODY} fill="none" stroke={outline} strokeWidth={2.2} />
        </Svg>
      </View>
    </Pressable>
  );
};

export const styles = StyleSheet.create({});
