import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Gesture, GestureDetector, Directions } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { addDays, format, isSameDay, parseISO, startOfWeek } from 'date-fns';
import { Text } from '../common/Typography';
import { ProgressRing } from './ProgressRing';
import { useTheme } from '../../theme/theme';
import { haptics } from '../../utils/haptics';

interface WeekStripProps {
  selectedDate: string;
  /** Calories per YYYY-MM-DD for the visible week. */
  caloriesByDay: Record<string, number>;
  calorieGoal: number;
  onSelectDate: (date: string) => void;
}

/**
 * Mon–Sun strip. Each day shows a ring for how close it got to the calorie
 * goal (accent = under, green = on target, red = well over). Tap a day to open
 * it; fling left/right to move a week.
 */
export const WeekStrip: React.FC<WeekStripProps> = ({ selectedDate, caloriesByDay, calorieGoal, onSelectDate }) => {
  const { colors } = useTheme();
  const selected = parseISO(selectedDate);
  const weekStart = startOfWeek(selected, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  const shiftWeek = (delta: number) => {
    haptics.select();
    onSelectDate(format(addDays(selected, delta * 7), 'yyyy-MM-dd'));
  };

  const fling = Gesture.Race(
    Gesture.Fling()
      .direction(Directions.LEFT)
      .onEnd(() => runOnJS(shiftWeek)(1)),
    Gesture.Fling()
      .direction(Directions.RIGHT)
      .onEnd(() => runOnJS(shiftWeek)(-1))
  );

  return (
    <GestureDetector gesture={fling}>
      <View style={styles.row} accessibilityHint="Swipe left or right to change week">
        {days.map((d) => {
          const iso = format(d, 'yyyy-MM-dd');
          const isSelected = iso === selectedDate;
          const isToday = isSameDay(d, today);
          const future = d > today && !isToday;
          const kcal = caloriesByDay[iso] || 0;
          const pct = calorieGoal > 0 ? kcal / calorieGoal : 0;
          const ringColor =
            pct > 1.1 ? colors.danger : pct >= 0.9 ? colors.success : colors.pillars.nutrition.accent;

          return (
            <Pressable
              key={iso}
              style={styles.day}
              onPress={() => {
                if (iso === selectedDate) return;
                haptics.select();
                onSelectDate(iso);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${format(d, 'EEEE d MMMM')}, ${Math.round(kcal)} kilocalories`}
            >
              <Text
                style={[
                  styles.weekday,
                  { color: isToday ? colors.text : colors.textMuted, fontWeight: isToday ? '800' : '600' },
                ]}
              >
                {isToday ? 'Today' : format(d, 'EEEEE')}
              </Text>
              {isSelected ? (
                <View style={[styles.dot, { backgroundColor: colors.pillars.nutrition.accent }]}>
                  <Text style={[styles.dayNum, { color: colors.textInverse }]}>{format(d, 'd')}</Text>
                </View>
              ) : (
                <ProgressRing
                  progress={future ? 0 : pct}
                  size={DOT}
                  stroke={3}
                  color={ringColor}
                  trackColor={colors.surfaceHighlight}
                >
                  <Text style={[styles.dayNum, { color: future ? colors.textDisabled : colors.text }]}>
                    {format(d, 'd')}
                  </Text>
                </ProgressRing>
              )}
            </Pressable>
          );
        })}
      </View>
    </GestureDetector>
  );
};

const DOT = 38;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  weekday: {
    fontSize: 11,
    height: 15,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: {
    fontSize: 13,
    fontWeight: '800',
  },
});
