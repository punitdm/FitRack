import React, { forwardRef, useRef } from 'react';
import { Animated, GestureResponderEvent, Pressable, StyleSheet, TouchableOpacityProps, View } from 'react-native';
import { prefersReducedMotion } from './Motion';

/**
 * Drop-in replacement for react-native's TouchableOpacity with a springy
 * press: a slight shrink plus the usual dim. Keeps the caller's own opacity
 * (e.g. a disabled 0.5) and transforms (e.g. a rotated chevron).
 */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const TouchableOpacity = forwardRef<View, TouchableOpacityProps & { pressedScale?: number }>(function SpringTouchable(
  { style, activeOpacity = 0.85, pressedScale = 0.97, onPressIn, onPressOut, children, disabled, ...rest },
  ref
) {
  const pressed = useRef(new Animated.Value(0)).current;
  const flat = (StyleSheet.flatten(style) || {}) as Record<string, any>;
  const baseOpacity = typeof flat.opacity === 'number' ? flat.opacity : 1;
  const baseTransform = Array.isArray(flat.transform) ? flat.transform : [];

  const animate = (to: number) => {
    if (prefersReducedMotion()) {
      pressed.setValue(to);
      return;
    }
    Animated.spring(pressed, {
      toValue: to,
      damping: 18,
      stiffness: to ? 500 : 320,
      mass: 0.5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <AnimatedPressable
      ref={ref as any}
      disabled={disabled}
      onPressIn={(e: GestureResponderEvent) => {
        animate(1);
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        animate(0);
        onPressOut?.(e);
      }}
      style={[
        style,
        {
          opacity: pressed.interpolate({ inputRange: [0, 1], outputRange: [baseOpacity, baseOpacity * activeOpacity] }),
          transform: [...baseTransform, { scale: pressed.interpolate({ inputRange: [0, 1], outputRange: [1, pressedScale] }) }],
        },
      ]}
      {...(rest as any)}
    >
      {children}
    </AnimatedPressable>
  );
});
