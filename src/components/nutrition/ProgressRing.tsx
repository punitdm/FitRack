import React, { useEffect } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { prefersReducedMotion } from '../common/Motion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  /** 0..1 (values above 1 render as a full ring). */
  progress: number;
  size: number;
  stroke: number;
  color: string;
  trackColor: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Animate from the previous value (default true). */
  animate?: boolean;
}

/** Circular progress that eases to its new value on the UI thread. */
export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size,
  stroke,
  color,
  trackColor,
  children,
  style,
  animate = true,
}) => {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const target = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const value = useSharedValue(animate && !prefersReducedMotion() ? 0 : target);

  useEffect(() => {
    value.value =
      animate && !prefersReducedMotion()
        ? withTiming(target, { duration: 700, easing: Easing.out(Easing.cubic) })
        : target;
  }, [target, animate, value]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - value.value),
  }));

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
        />
      </Svg>
      {children}
    </View>
  );
};
