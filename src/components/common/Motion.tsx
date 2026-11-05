import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  GestureResponderEvent,
  Insets,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';

/**
 * Shared motion primitives. Everything runs on the native driver
 * (opacity + transform only) so animations stay smooth even while
 * screens are doing SQLite work on the JS thread.
 */

export const motion = {
  /** Screen-level transitions. */
  screen: 260,
  /** Small elements, fades. */
  fast: 180,
  /** Ease-out curve that settles softly; reads as "fluid" rather than mechanical. */
  easeOut: Easing.bezier(0.22, 1, 0.36, 1),
  easeIn: Easing.bezier(0.4, 0, 1, 1),
};

// ---------------------------------------------------------------------------
// Reduce motion: honour the OS accessibility setting.
// ---------------------------------------------------------------------------

let reduceMotionCached = false;
AccessibilityInfo.isReduceMotionEnabled()
  .then((v) => {
    reduceMotionCached = v;
  })
  .catch(() => {});
AccessibilityInfo.addEventListener?.('reduceMotionChanged', (v: boolean) => {
  reduceMotionCached = v;
});

export function prefersReducedMotion(): boolean {
  return reduceMotionCached;
}

// ---------------------------------------------------------------------------
// ScreenTransition: animates its content in whenever it mounts.
// Give it a `key` that changes per screen so React remounts it on navigation.
// ---------------------------------------------------------------------------

/** `none` renders statically, e.g. for a parent screen that is already animating in. */
export type TransitionDirection = 'forward' | 'back' | 'up' | 'fade' | 'none';

interface ScreenTransitionProps {
  children: React.ReactNode;
  direction?: TransitionDirection;
  style?: StyleProp<ViewStyle>;
}

export const ScreenTransition: React.FC<ScreenTransitionProps> = ({ children, direction = 'forward', style }) => {
  const isStatic = direction === 'none' || prefersReducedMotion();
  const progress = useRef(new Animated.Value(isStatic ? 1 : 0)).current;

  useEffect(() => {
    if (isStatic) return;
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: motion.screen,
      easing: motion.easeOut,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [progress, isStatic]);

  const offset = direction === 'forward' ? 28 : direction === 'back' ? -28 : 0;
  const transform =
    direction === 'up'
      ? [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }]
      : direction === 'fade'
        ? [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) }]
        : [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) }];

  return (
    <Animated.View
      style={[
        { flex: 1, opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }), transform },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

// ---------------------------------------------------------------------------
// FadeInUp: lightweight entrance for cards/sections, with optional stagger.
// ---------------------------------------------------------------------------

interface FadeInUpProps {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

export const FadeInUp: React.FC<FadeInUpProps> = ({ children, delay = 0, distance = 14, duration = 320, style }) => {
  const progress = useRef(new Animated.Value(prefersReducedMotion() ? 1 : 0)).current;

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: motion.easeOut,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [progress, delay, duration]);

  return (
    <Animated.View
      style={[
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

// ---------------------------------------------------------------------------
// PopIn: dialog-card entrance (scale + rise), used inside modals.
// ---------------------------------------------------------------------------

export const PopIn: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({ children, style }) => {
  const progress = useRef(new Animated.Value(prefersReducedMotion() ? 1 : 0)).current;

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const anim = Animated.spring(progress, {
      toValue: 1,
      damping: 20,
      stiffness: 260,
      mass: 0.9,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [progress]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] }),
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

// ---------------------------------------------------------------------------
// ScalePressable: tactile press feedback (gentle springy shrink) for large
// tappable surfaces. Same props you'd pass a TouchableOpacity.
// ---------------------------------------------------------------------------

interface ScalePressableProps {
  children: React.ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  onLongPress?: (e: GestureResponderEvent) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  hitSlop?: Insets | number;
  /** How far to shrink on press. Large cards want less (0.98), buttons more (0.96). */
  pressedScale?: number;
  accessibilityLabel?: string;
  testID?: string;
  /** Accepted for drop-in compatibility with TouchableOpacity; ignored. */
  activeOpacity?: number;
}

export const ScalePressable: React.FC<ScalePressableProps> = ({
  children,
  onPress,
  onLongPress,
  disabled,
  style,
  hitSlop,
  pressedScale = 0.97,
  accessibilityLabel,
  testID,
}) => {
  const pressed = useRef(new Animated.Value(0)).current;

  const animateTo = (toValue: number) => {
    Animated.spring(pressed, {
      toValue,
      damping: 18,
      stiffness: toValue ? 420 : 300,
      mass: 0.6,
      useNativeDriver: true,
    }).start();
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      hitSlop={hitSlop}
      onPressIn={() => animateTo(1)}
      onPressOut={() => animateTo(0)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      testID={testID}
      style={[
        style,
        // Scale only: leaves the caller's opacity (e.g. a disabled 0.5) untouched.
        { transform: [{ scale: pressed.interpolate({ inputRange: [0, 1], outputRange: [1, pressedScale] }) }] },
      ]}
    >
      {children}
    </AnimatedPressable>
  );
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ---------------------------------------------------------------------------
// usePresence: keeps something rendered long enough to animate out.
// ---------------------------------------------------------------------------

export function usePresence(visible: boolean, exitMs: number): boolean {
  const [mounted, setMounted] = useState(visible);
  useEffect(() => {
    if (visible) {
      setMounted(true);
      return;
    }
    const t = setTimeout(() => setMounted(false), exitMs);
    return () => clearTimeout(t);
  }, [visible, exitMs]);
  return mounted;
}
