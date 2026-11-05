import React, { useState } from 'react';
import { View, Pressable, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Text } from '../common/Typography';
import { useTheme } from '../../theme/theme';
import { haptics } from '../../utils/haptics';

export interface MealTab<K extends string> {
  key: K;
  label: string;
  /** Calories in this meal, shown under the label. */
  kcal: number;
}

interface MealTabsProps<K extends string> {
  tabs: MealTab<K>[];
  active: K;
  onChange: (key: K) => void;
}

/** Segmented meal picker with a springy sliding highlight. */
export function MealTabs<K extends string>({ tabs, active, onChange }: MealTabsProps<K>) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, tabs.findIndex((t) => t.key === active));
  const tabWidth = tabs.length > 0 ? width / tabs.length : 0;

  const indicator = useAnimatedStyle(() => ({
    width: tabWidth,
    transform: [{ translateX: withSpring(index * tabWidth, { damping: 22, stiffness: 260, mass: 0.8 }) }],
  }));

  return (
    <View
      style={[styles.track, { backgroundColor: colors.surfaceCard }]}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width - PAD * 2)}
      accessibilityRole="tablist"
    >
      {width > 0 && (
        <Animated.View style={[styles.indicator, { backgroundColor: colors.pillars.nutrition.soft }, indicator]} />
      )}
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <Pressable
            key={t.key}
            style={styles.tab}
            onPress={() => {
              if (isActive) return;
              haptics.select();
              onChange(t.key);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text
              style={[styles.label, { color: isActive ? colors.pillars.nutrition.accent : colors.textSecondary }]}
              numberOfLines={1}
            >
              {t.label}
            </Text>
            <Text style={[styles.kcal, { color: isActive ? colors.text : colors.textMuted }]} numberOfLines={1}>
              {Math.round(t.kcal)} kcal
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const PAD = 4;

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: PAD,
  },
  indicator: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    gap: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  kcal: {
    fontSize: 11,
    fontWeight: '600',
  },
});
