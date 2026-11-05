import React, { useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Droplets, Flame, Utensils } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { Text } from '../common/Typography';
import { FadeInUp, ScalePressable } from '../common/Motion';
import { useTheme, borderRadius, spacing } from '../../theme/theme';
import { HomeStreaks } from '../../db/streaks';
import { haptics } from '../../utils/haptics';

import { RollingNumber } from '../common/Polish';
interface StreakHeaderProps {
  greeting: string;
  selectedDate: string;
  streaks: HomeStreaks | null;
  onOpenDatePicker: () => void;
  onSelectDate: (date: string) => void;
  onPrevDay: () => void;
  onNextDay: () => void;
  onOpenProgress: () => void;
}

/**
 * Home top: greeting + big date, a flame chip for the weekly workout streak,
 * then this week's day circles (ticked when you trained) and streak pills.
 */
export const StreakHeader: React.FC<StreakHeaderProps> = ({
  greeting,
  selectedDate,
  streaks,
  onOpenDatePicker,
  onSelectDate,
  onPrevDay,
  onNextDay,
  onOpenProgress,
}) => {
  const { colors } = useTheme();
  const date = parseISO(selectedDate);
  const weekDone = streaks?.workoutsThisWeek ?? 0;
  const weekGoal = streaks?.weeklyGoal ?? 4;

  return (
    <View style={styles.wrap}>
      {/* Top bar */}
      <View style={styles.topRow}>
        <Pressable style={{ flex: 1 }} onPress={onOpenDatePicker} accessibilityRole="button" accessibilityLabel="Pick a date">
          <Text style={[styles.kicker, { color: colors.textMuted }]} numberOfLines={1}>
            {greeting}
          </Text>
          <View style={styles.dateRow}>
            <Text style={[styles.date, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
              {format(date, 'EEE, d MMM')}
            </Text>
            <ChevronDown size={18} color={colors.textMuted} style={{ marginTop: 6 }} />
          </View>
        </Pressable>
        <View style={styles.actions}>
          <RoundBtn label="Previous day" onPress={onPrevDay}>
            <ChevronLeft size={18} color={colors.textSecondary} />
          </RoundBtn>
          <RoundBtn label="Next day" onPress={onNextDay}>
            <ChevronRight size={18} color={colors.textSecondary} />
          </RoundBtn>
          <ScalePressable
            style={[styles.flameChip, { backgroundColor: colors.surfaceCard }]}
            onPress={onOpenProgress}
            pressedScale={0.92}
            accessibilityLabel={`${streaks?.workoutWeeks ?? 0} week workout streak. Open progress`}
          >
            <Flame size={16} color={colors.warning} fill={(streaks?.workoutWeeks ?? 0) > 0 ? colors.warning : 'none'} />
            <RollingNumber value={streaks?.workoutWeeks ?? 0} style={[styles.flameText, { color: colors.text }]} />
          </ScalePressable>
        </View>
      </View>

      {/* Week + streaks */}
      <FadeInUp distance={8}>
        <View style={[styles.card, { backgroundColor: colors.surfaceCard }]}>
          <View style={styles.cardHead}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>This week</Text>
            <Text style={[styles.cardMeta, { color: weekDone >= weekGoal ? colors.success : colors.textMuted }]}>
              {weekDone} of {weekGoal} workouts{weekDone >= weekGoal ? ' · goal hit' : ''}
            </Text>
          </View>

          <View style={styles.days}>
            {(streaks?.week ?? []).map((d) => (
              <DayCircle
                key={d.date}
                label={format(parseISO(d.date), 'EEEEE')}
                trained={d.trained}
                isToday={d.isToday}
                isFuture={d.isFuture}
                selected={d.date === selectedDate}
                onPress={() => {
                  if (d.date === selectedDate) return;
                  haptics.select();
                  onSelectDate(d.date);
                }}
              />
            ))}
          </View>

          <View style={[styles.pills, { borderTopColor: colors.border }]}>
            <StreakPill
              icon={<Flame size={15} color={colors.warning} />}
              value={streaks?.workoutWeeks ?? 0}
              unit={(streaks?.workoutWeeks ?? 0) === 1 ? 'week' : 'weeks'}
              label="Training"
            />
            <StreakPill
              icon={<Utensils size={15} color={colors.pillars.nutrition.accent} />}
              value={streaks?.foodDays ?? 0}
              unit={(streaks?.foodDays ?? 0) === 1 ? 'day' : 'days'}
              label="Food logged"
            />
            <StreakPill
              icon={<Droplets size={15} color={colors.pillars.running.accent} />}
              value={streaks?.waterDays ?? 0}
              unit={(streaks?.waterDays ?? 0) === 1 ? 'day' : 'days'}
              label="Water goal"
            />
          </View>
        </View>
      </FadeInUp>
    </View>
  );
};

const RoundBtn: React.FC<{ label: string; onPress: () => void; children: React.ReactNode }> = ({ label, onPress, children }) => {
  const { colors } = useTheme();
  return (
    <ScalePressable
      style={[styles.round, { backgroundColor: colors.surfaceCard }]}
      onPress={onPress}
      pressedScale={0.9}
      hitSlop={4}
      accessibilityLabel={label}
    >
      {children}
    </ScalePressable>
  );
};

const DayCircle: React.FC<{
  label: string;
  trained: boolean;
  isToday: boolean;
  isFuture: boolean;
  selected: boolean;
  onPress: () => void;
}> = ({ label, trained, isToday, isFuture, selected, onPress }) => {
  const { colors } = useTheme();
  const fill = useSharedValue(trained ? 1 : 0);
  useEffect(() => {
    fill.value = withSpring(trained ? 1 : 0, { damping: 14, stiffness: 220 });
  }, [trained, fill]);
  const dotStyle = useAnimatedStyle(() => ({ opacity: withTiming(selected ? 1 : 0, { duration: 160 }) }));
  const checkStyle = useAnimatedStyle(() => ({ opacity: fill.value, transform: [{ scale: 0.6 + fill.value * 0.4 }] }));

  return (
    <Pressable
      style={[styles.day, { opacity: isFuture ? 0.45 : 1 }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}${trained ? ', trained' : ''}${isToday ? ', today' : ''}`}
    >
      <Text style={[styles.dayLabel, { color: isToday ? colors.text : colors.textMuted, fontWeight: isToday ? '800' : '700' }]}>
        {label}
      </Text>
      <View
        style={[
          styles.circle,
          {
            backgroundColor: trained ? colors.primary : colors.surfaceHighlight,
            borderColor: isToday && !trained ? colors.primary : 'transparent',
          },
        ]}
      >
        <Animated.View style={checkStyle}>
          <Check size={15} color={colors.textInverse} strokeWidth={3.2} />
        </Animated.View>
      </View>
      <Animated.View style={[styles.selDot, { backgroundColor: colors.text }, dotStyle]} />
    </Pressable>
  );
};

const StreakPill: React.FC<{ icon: React.ReactNode; value: number; unit: string; label: string }> = ({ icon, value, unit, label }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.pill} accessible accessibilityLabel={`${label}: ${value} ${unit} in a row`}>
      <View style={styles.pillTop}>
        {icon}
        <RollingNumber value={value} style={[styles.pillValue, { color: colors.text }]} />
        <Text style={[styles.pillUnit, { color: colors.textMuted }]}>{unit}</Text>
      </View>
      <Text style={[styles.pillLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
};

const CIRCLE = 34;

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kicker: { fontSize: 13, fontWeight: '600' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  date: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  round: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  flameChip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 18 },
  flameText: { fontSize: 15, fontWeight: '800' },

  card: { borderRadius: borderRadius.xl, paddingTop: spacing.lg, paddingHorizontal: spacing.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  cardMeta: { fontSize: 12, fontWeight: '700' },
  days: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  day: { flex: 1, alignItems: 'center', gap: 7 },
  dayLabel: { fontSize: 11 },
  circle: { width: CIRCLE, height: CIRCLE, borderRadius: CIRCLE / 2, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  selDot: { width: 4, height: 4, borderRadius: 2 },
  pills: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 12, paddingVertical: 12 },
  pill: { flex: 1, alignItems: 'center', gap: 2 },
  pillTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pillValue: { fontSize: 17, fontWeight: '800' },
  pillUnit: { fontSize: 12, fontWeight: '600' },
  pillLabel: { fontSize: 11, fontWeight: '600' },
});
