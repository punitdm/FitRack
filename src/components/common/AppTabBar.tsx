import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Pressable, StyleSheet, LayoutChangeEvent, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_BOTTOM_GAP, TAB_BAR_HEIGHT } from './tabBarSpace';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { House, ChartColumnBig, Dumbbell, Apple, UserRound } from 'lucide-react-native';
import { useTheme } from '../../theme/theme';
import { haptics } from '../../utils/haptics';
import { prefersReducedMotion } from './Motion';
import { useBlurTarget } from './blurTargets';

/**
 * Floating capsule navbar: Home · Progress · [Workout] · Nutrition · Profile.
 *
 *  - Icons only; the active one turns solid, the rest are dimmed outlines.
 *  - One soft "liquid" pill slides between tabs with a slight overshoot.
 *  - Drag a finger along the bar (or long-press an icon) to scrub between tabs;
 *    the pill follows your finger and lifts, with a tick on every tab passed.
 *  - The centre is a gradient Workout button with a glow.
 */

type IconCmp = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number; fill?: string }>;

const TABS: Record<string, { label: string; Icon: IconCmp; fillable: boolean; center?: boolean }> = {
  hub: { label: 'Home', Icon: House, fillable: true },
  analytics: { label: 'Progress', Icon: ChartColumnBig, fillable: false },
  workout: { label: 'Workout', Icon: Dumbbell, fillable: false, center: true },
  nutrition: { label: 'Nutrition', Icon: Apple, fillable: true },
  profile: { label: 'Profile', Icon: UserRound, fillable: true },
};

const BAR_H = TAB_BAR_HEIGHT;
/** Real blur on Android is experimental in expo-blur; set to 'none' for tint-only if it ever glitches. */
const ANDROID_BLUR: 'dimezisBlurView' | 'none' = 'dimezisBlurView';
const PILL_H = 46;
const FAB = 50;
const SIDE_PAD = 10;
/** Springy ease with a little overshoot, like a drop of liquid settling. */
const SETTLE = Easing.bezier(0.3, 1.25, 0.5, 1);

export const AppTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  // Android blurs the open tab's screen (see blurTargets.tsx).
  const blurTarget = useBlurTarget(state.routes[state.index].key);
  const [rowW, setRowW] = useState(0);
  const slotW = rowW > 0 ? rowW / state.routes.length : 0;
  const pillW = Math.max(0, slotW - 6);
  const centerIndex = state.routes.findIndex((r) => TABS[r.name]?.center);

  const focusedOptions = descriptors[state.routes[state.index].key].options;
  const hidden = (StyleSheet.flatten(focusedOptions.tabBarStyle) as { display?: string } | undefined)?.display === 'none';

  // ------------------------------------------------------------ pill position
  const slotX = useCallback((i: number) => i * slotW + (slotW - pillW) / 2, [slotW, pillW]);
  const pillX = useSharedValue(0);
  const pillOpacity = useSharedValue(1);
  const lift = useSharedValue(0);
  const dragging = useSharedValue(false);
  const laidOut = useRef(false);

  useEffect(() => {
    if (slotW <= 0) return;
    const onCenter = state.index === centerIndex;
    pillOpacity.value = withTiming(onCenter ? 0 : 1, { duration: 180 });
    if (onCenter) return;
    const target = slotX(state.index);
    // First layout jumps straight to the active tab; later changes glide.
    if (!laidOut.current || prefersReducedMotion()) pillX.value = target;
    else pillX.value = withTiming(target, { duration: 460, easing: SETTLE });
    laidOut.current = true;
  }, [state.index, slotW, slotX, centerIndex, pillX, pillOpacity]);

  const go = useCallback(
    (index: number) => {
      const route = state.routes[index];
      if (!route) return;
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (state.index !== index && !event.defaultPrevented) {
        haptics.select();
        navigation.navigate(route.name, route.params);
      }
    },
    [navigation, state.index, state.routes]
  );

  // ------------------------------------------------------------ drag to scrub
  // Plain numbers for the UI-thread worklets (don't capture navigation state).
  const count = state.routes.length;
  const current = state.index;
  const hovered = useSharedValue(state.index);
  const tick = useCallback(() => haptics.select(), []);

  const indexAt = (x: number, count: number, sw: number, center: number, fallback: number) => {
    'worklet';
    const i = Math.max(0, Math.min(count - 1, Math.floor(x / sw)));
    return i === center ? fallback : i;
  };

  const scrub = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-14, 14])
    .onStart((e) => {
      if (slotW <= 0) return;
      dragging.value = true;
      lift.value = withTiming(1, { duration: 200 });
      pillOpacity.value = withTiming(1, { duration: 120 });
      hovered.value = indexAt(e.x, count, slotW, centerIndex, current === centerIndex ? 0 : current);
      runOnJS(tick)();
    })
    .onUpdate((e) => {
      if (slotW <= 0) return;
      pillX.value = Math.max(0, Math.min(rowW - pillW, e.x - pillW / 2));
      const i = indexAt(e.x, count, slotW, centerIndex, hovered.value);
      if (i !== hovered.value) {
        hovered.value = i;
        runOnJS(tick)();
      }
    })
    .onFinalize(() => {
      if (!dragging.value) return;
      dragging.value = false;
      lift.value = withTiming(0, { duration: 320 });
      pillX.value = withTiming(hovered.value * slotW + (slotW - pillW) / 2, { duration: 380, easing: SETTLE });
      runOnJS(go)(hovered.value);
    });

  const pillStyle = useAnimatedStyle(() => ({
    width: pillW,
    opacity: pillOpacity.value,
    transform: [{ translateX: pillX.value }, { scale: 1 + lift.value * 0.08 }],
  }));

  if (hidden) return null;

  const pillColor = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.08)';
  // A thin tint under the blur keeps icons readable over busy content.
  const tint = isDark ? 'rgba(18,20,26,0.55)' : 'rgba(255,255,255,0.6)';
  const edge = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.08)';

  return (
    // Floats over the screen: content scrolls behind it.
    <View
      style={[styles.wrap, { paddingBottom: insets.bottom + TAB_BAR_BOTTOM_GAP }]}
      pointerEvents="box-none"
    >
      <View style={[styles.shadow, Platform.OS === 'ios' && { shadowColor: '#000' }]}>
        <View style={[styles.capsule, { borderColor: edge }]}>
          <BlurView
            intensity={isDark ? 50 : 60}
            tint={isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
            blurTarget={blurTarget}
            blurMethod={blurTarget ? ANDROID_BLUR : 'none'}
            blurReductionFactor={4}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} pointerEvents="none" />
          <GestureDetector gesture={scrub}>
            <View style={styles.row} onLayout={(e: LayoutChangeEvent) => setRowW(e.nativeEvent.layout.width)}>
              {rowW > 0 && (
                <Animated.View pointerEvents="none" style={[styles.pill, { backgroundColor: pillColor }, pillStyle]} />
              )}
              {state.routes.map((route, index) => {
                const meta = TABS[route.name] ?? { label: route.name, Icon: House, fillable: false };
                const focused = state.index === index;
                return meta.center ? (
                  <CenterButton key={route.key} focused={focused} label={meta.label} onPress={() => go(index)} />
                ) : (
                  <TabIcon
                    key={route.key}
                    meta={meta}
                    focused={focused}
                    onPress={() => go(index)}
                    onLongPress={() => haptics.threshold()}
                  />
                );
              })}
            </View>
          </GestureDetector>
        </View>
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------

const TabIcon: React.FC<{
  meta: { label: string; Icon: IconCmp; fillable: boolean };
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
}> = ({ meta, focused, onPress, onLongPress }) => {
  const { colors } = useTheme();
  const on = useSharedValue(focused ? 1 : 0);
  const press = useSharedValue(1);

  useEffect(() => {
    on.value = withTiming(focused ? 1 : 0, { duration: 200 });
  }, [focused, on]);

  const outline = useAnimatedStyle(() => ({ opacity: 0.7 * (1 - on.value) }));
  const solid = useAnimatedStyle(() => ({ opacity: on.value }));
  const scale = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  const { Icon } = meta;

  return (
    <Pressable
      style={styles.slot}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      onPressIn={() => {
        press.value = withTiming(0.85, { duration: 110 });
      }}
      onPressOut={() => {
        press.value = withSpring(1, { damping: 10, stiffness: 260 });
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={meta.label}
      hitSlop={4}
    >
      <Animated.View style={[styles.iconBox, scale]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, outline]}>
          <Icon size={24} color={colors.text} strokeWidth={2} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, solid]}>
          <Icon
            size={24}
            color={colors.text}
            strokeWidth={meta.fillable ? 2 : 2.7}
            fill={meta.fillable ? colors.text : 'none'}
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

const CenterButton: React.FC<{ focused: boolean; label: string; onPress: () => void }> = ({ focused, label, onPress }) => {
  const { colors } = useTheme();
  const press = useSharedValue(1);
  const grow = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    grow.value = withSpring(focused ? 1 : 0, { damping: 14, stiffness: 220 });
  }, [focused, grow]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: press.value * (1 + grow.value * 0.06) }],
  }));

  return (
    <Pressable
      style={styles.slot}
      onPress={onPress}
      onPressIn={() => {
        press.value = withTiming(0.88, { duration: 110 });
      }}
      onPressOut={() => {
        press.value = withSpring(1, { damping: 10, stiffness: 260 });
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.fab, { shadowColor: colors.primary }, style]}>
        <Svg width={FAB} height={FAB} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="fabGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={colors.primaryLight} />
              <Stop offset="1" stopColor={colors.primaryDark} />
            </LinearGradient>
          </Defs>
          <Circle cx={FAB / 2} cy={FAB / 2} r={FAB / 2} fill="url(#fabGrad)" />
        </Svg>
        <Dumbbell size={22} color={colors.textInverse} strokeWidth={2.6} />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  shadow: {
    borderRadius: BAR_H / 2,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 22,
  },
  capsule: {
    height: BAR_H,
    borderRadius: BAR_H / 2,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SIDE_PAD,
    justifyContent: 'center',
    // Clip blur + tint to the fully rounded capsule.
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: BAR_H,
  },
  pill: {
    position: 'absolute',
    left: 0,
    top: (BAR_H - PILL_H) / 2,
    height: PILL_H,
    borderRadius: PILL_H / 2,
  },
  slot: {
    flex: 1,
    height: BAR_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    width: 28,
    height: 28,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: FAB,
    height: FAB,
    borderRadius: FAB / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
});
