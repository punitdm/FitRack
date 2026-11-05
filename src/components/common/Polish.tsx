import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { Text } from './Typography';
import { useTheme } from '../../theme/theme';
import { prefersReducedMotion } from './Motion';

// ---------------------------------------------------------------------------
// Skeleton: a soft pulsing placeholder shown while content loads.
// ---------------------------------------------------------------------------

export const Skeleton: React.FC<{ width?: number | `${number}%`; height: number; radius?: number; style?: StyleProp<ViewStyle> }> = ({
  width = '100%',
  height,
  radius = 10,
  style,
}) => {
  const { colors } = useTheme();
  const pulse = useSharedValue(0.55);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    pulse.value = withRepeat(withTiming(1, { duration: 750, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [pulse]);
  const anim = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: colors.surfaceHighlight }, anim, style]} />;
};

/** A card-shaped skeleton: a label line, a big value and a few rows. */
export const SkeletonCard: React.FC<{ rows?: number; tall?: number }> = ({ rows = 2, tall = 0 }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceCard }]}>
      <Skeleton width={90} height={11} />
      <Skeleton width={150} height={26} radius={8} style={{ marginTop: 12 }} />
      {tall > 0 && <Skeleton height={tall} radius={14} style={{ marginTop: 14 }} />}
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} width={i % 2 ? '70%' : '90%'} height={12} style={{ marginTop: 12 }} />
      ))}
    </View>
  );
};

// ---------------------------------------------------------------------------
// RollingNumber: animates from the previous value to the new one.
// ---------------------------------------------------------------------------

export const RollingNumber: React.FC<{
  value: number;
  format?: (v: number) => string;
  style?: StyleProp<TextStyle>;
  duration?: number;
}> = ({ value, format = (v) => Math.round(v).toLocaleString(), style, duration = 650 }) => {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const start = from.current;
    if (prefersReducedMotion() || start === value || !Number.isFinite(value)) {
      from.current = value;
      setShown(value);
      return;
    }
    const t0 = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = start + (value - start) * eased;
      setShown(v);
      from.current = v;
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, [value, duration]);

  return <Text style={style}>{format(shown)}</Text>;
};

const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: 16 },
});
