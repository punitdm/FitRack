import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from 'lucide-react-native';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
} from 'date-fns';
import { useTheme, typography, borderRadius, spacing } from '../../theme/theme';
import { Card } from '../common/Card';
import { CalendarDayWorkoutData } from '../../db/database';

interface WorkoutCalendarProps {
  categoryDots?: Record<string, CalendarDayWorkoutData>;
  workoutDates?: string[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  monthsToShow?: number; // 1 for single month or 3 for continuous
}

export const WorkoutCalendar: React.FC<WorkoutCalendarProps> = ({
  categoryDots = {},
  selectedDate,
  onSelectDate,
  monthsToShow = 1,
}) => {
  const { colors } = useTheme();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(selectedDate || new Date()));

  const daysOfWeek = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  const renderMonthGrid = (monthDate: Date) => {
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    let startDayOffset = getDay(monthStart) - 1;
    if (startDayOffset < 0) startDayOffset = 6;
    const blanks = Array.from({ length: startDayOffset }, (_, i) => i);

    return (
      <View key={format(monthDate, 'yyyy-MM')} style={styles.monthBlock}>
        {/* Month Header */}
        <Text style={[styles.monthTitleText, { color: colors.text }]}>
          {format(monthDate, 'MMMM yyyy').toUpperCase()}
        </Text>

        {/* Days of Week */}
        <View style={[styles.weekDaysRow, { borderBottomColor: colors.border }]}>
          {daysOfWeek.map((day, idx) => (
            <Text key={idx} style={[styles.weekDayText, { color: colors.textMuted }]}>
              {day}
            </Text>
          ))}
        </View>

        {/* Days Grid */}
        <View style={styles.daysGrid}>
          {blanks.map((b) => (
            <View key={`blank-${b}`} style={styles.dayCell} />
          ))}

          {daysInMonth.map((dayObj) => {
            const iso = format(dayObj, 'yyyy-MM-dd');
            const isSelected = iso === selectedDate;
            const dayNum = format(dayObj, 'd');
            const dayData = categoryDots[iso];
            const categories = dayData?.categories || [];

            return (
              <TouchableOpacity
                key={iso}
                style={[
                  styles.dayCell,
                  isSelected && [styles.selectedDayCircle, { backgroundColor: colors.secondary }],
                ]}
                onPress={() => onSelectDate(iso)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dayNumText,
                    { color: colors.text },
                    isSelected && { color: colors.textInverse, fontWeight: '800' },
                  ]}
                >
                  {dayNum}
                </Text>

                {/* Multi-Color Muscle Group Dots */}
                <View style={styles.dotsRow}>
                  {categories.slice(0, 4).map((cat, dotIdx) => {
                    const dotColor = colors.categories[cat] || colors.primary;
                    return (
                      <View
                        key={dotIdx}
                        style={[
                          styles.catDot,
                          { backgroundColor: dotColor },
                          isSelected && { borderColor: '#fff' },
                        ]}
                      />
                    );
                  })}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const monthsToRender =
    monthsToShow > 1
      ? [subMonths(currentMonth, 1), currentMonth, addMonths(currentMonth, 1)]
      : [currentMonth];

  return (
    <Card style={[styles.container, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
      {/* Month Navigator Toolbar */}
      <View style={[styles.headerToolbar, { borderBottomColor: colors.border }]}>
        <View style={styles.titleInfoRow}>
          <CalIcon size={18} color={colors.primary} />
          <Text style={[styles.toolbarTitle, { color: colors.text }]}>Calendar</Text>
        </View>

        <View style={styles.navBtnsRow}>
          <TouchableOpacity
            style={[styles.navArrowBtn, { backgroundColor: colors.surfaceHighlight }]}
            onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}
            activeOpacity={0.7}
          >
            <ChevronLeft size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navArrowBtn, { backgroundColor: colors.surfaceHighlight }]}
            onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}
            activeOpacity={0.7}
          >
            <ChevronRight size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Month Grids */}
      {monthsToRender.map((m) => renderMonthGrid(m))}

      {/* Color Legend Footer */}
      <View style={[styles.legendRow, { borderTopColor: colors.border }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.categories.Chest }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Chest</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.categories.Back }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Back</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.categories.Legs }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Legs</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.categories.Shoulders }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Shoulders</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.categories.Biceps }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>Arms</Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  headerToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  titleInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toolbarTitle: {
    ...typography.titleMedium,
    fontSize: 17,
  },
  navBtnsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  navArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthBlock: {
    marginBottom: spacing.lg,
  },
  monthTitleText: {
    ...typography.titleSmall,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginVertical: spacing.sm,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  weekDayText: {
    ...typography.caption,
    width: '14.28%',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 10,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    position: 'relative',
  },
  selectedDayCircle: {
    borderRadius: 24,
  },
  dayNumText: {
    ...typography.caption,
    fontSize: 14,
    fontWeight: '600',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 3,
    position: 'absolute',
    bottom: 4,
    height: 6,
    alignItems: 'center',
  },
  catDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    ...typography.caption,
    fontSize: 10,
  },
});
