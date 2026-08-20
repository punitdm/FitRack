import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Dumbbell, ShieldCheck } from 'lucide-react-native';
import { useTheme, typography, spacing, borderRadius } from '../../theme/theme';
import { formatDisplayDate, shiftDate, getTodayISO } from '../../utils/dateUtils';

interface HeaderProps {
  selectedDate?: string;
  onDateChange?: (newDate: string) => void;
  onOpenDatePicker?: () => void;
  showDateNav?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  selectedDate = getTodayISO(),
  onDateChange,
  onOpenDatePicker,
  showDateNav = true,
}) => {
  const { colors } = useTheme();
  const isToday = selectedDate === getTodayISO();

  const handlePrevDay = () => {
    if (onDateChange) {
      onDateChange(shiftDate(selectedDate, -1));
    }
  };

  const handleNextDay = () => {
    if (onDateChange) {
      onDateChange(shiftDate(selectedDate, 1));
    }
  };

  const handleTodayClick = () => {
    if (onDateChange) {
      onDateChange(getTodayISO());
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      {/* Top row: Brand & Offline Badge */}
      <View style={styles.topRow}>
        <View style={styles.brandContainer}>
          <View style={[styles.logoIcon, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}>
            <Dumbbell size={18} color={colors.primary} />
          </View>
          <Text style={[styles.brandTitle, { color: colors.text }]}>
            Fit<Text style={{ color: colors.primary }}>Rack</Text>
          </Text>
        </View>

        <View style={[styles.offlineBadge, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}>
          <ShieldCheck size={13} color={colors.primary} />
          <Text style={[styles.offlineText, { color: colors.primary }]}>100% Offline</Text>
        </View>
      </View>

      {/* Date Navigator */}
      {showDateNav && (
        <View
          style={[
            styles.dateNavRow,
            { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: colors.surfaceHighlight }]}
            onPress={handlePrevDay}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.datePickerTrigger}
            onPress={onOpenDatePicker}
            activeOpacity={0.8}
          >
            <CalendarIcon size={16} color={isToday ? colors.primary : colors.textSecondary} />
            <Text style={[styles.dateText, { color: isToday ? colors.text : colors.textSecondary }]}>
              {isToday ? `Today (${formatDisplayDate(selectedDate).split(',')[0]})` : formatDisplayDate(selectedDate)}
            </Text>
            {!isToday && (
              <TouchableOpacity
                style={[styles.todayPill, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}
                onPress={handleTodayClick}
                activeOpacity={0.7}
              >
                <Text style={[styles.todayPillText, { color: colors.primary }]}>Jump Today</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: colors.surfaceHighlight }]}
            onPress={handleNextDay}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronRight size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 6,
    paddingBottom: 10,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  brandTitle: {
    ...typography.titleLarge,
    fontSize: 20,
    letterSpacing: -0.5,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  offlineText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 10,
  },
  dateNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginTop: 4,
    borderWidth: 1,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    justifyContent: 'center',
  },
  dateText: {
    ...typography.titleSmall,
    fontSize: 13,
    fontWeight: '700',
  },
  todayPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  todayPillText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
  },
});
