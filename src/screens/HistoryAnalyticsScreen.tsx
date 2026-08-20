import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Trophy, Calendar as CalIcon, ChevronRight, Layers, Flame, TrendingUp } from 'lucide-react-native';
import * as SQLite from 'expo-sqlite';
import { colors, typography, borderRadius, spacing } from '../theme/theme';
import { WorkoutHistoryItem, PersonalRecord } from '../types/database';
import {
  getWorkoutHistory,
  getPersonalRecords,
  getWorkoutDatesWithLogs,
} from '../db/database';
import { WorkoutCalendar } from '../components/analytics/WorkoutCalendar';
import { Card } from '../components/common/Card';
import { formatDisplayDate } from '../utils/dateUtils';

interface HistoryAnalyticsScreenProps {
  db: SQLite.SQLiteDatabase;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onNavigateToWorkout: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export const HistoryAnalyticsScreen: React.FC<HistoryAnalyticsScreenProps> = ({
  db,
  selectedDate,
  onSelectDate,
  onNavigateToWorkout,
  onShowToast,
}) => {
  const [history, setHistory] = useState<WorkoutHistoryItem[]>([]);
  const [personalRecords, setPersonalRecords] = useState<PersonalRecord[]>([]);
  const [workoutDates, setWorkoutDates] = useState<string[]>([]);
  const [activeSegment, setActiveSegment] = useState<'history' | 'prs'>('history');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [hist, prs, dates] = await Promise.all([
        getWorkoutHistory(db, 50, 0),
        getPersonalRecords(db),
        getWorkoutDatesWithLogs(db),
      ]);
      setHistory(hist);
      setPersonalRecords(prs);
      setWorkoutDates(dates);
    } catch (err: any) {
      console.error(err);
      onShowToast('error', `Failed to load history: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDaySelect = (date: string) => {
    onSelectDate(date);
    onNavigateToWorkout();
  };

  const totalVolumeAllTime = history.reduce((acc, h) => acc + h.totalVolumeKg, 0);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} tintColor={colors.primary} />}
      >
        {/* Workout Consistency Calendar */}
        <WorkoutCalendar
          workoutDates={workoutDates}
          selectedDate={selectedDate}
          onSelectDate={handleDaySelect}
        />

        {/* Lifetime Stats Card */}
        <Card style={styles.lifetimeStatsCard}>
          <View style={styles.lifetimeStatCol}>
            <Text style={styles.lifetimeVal}>{history.length}</Text>
            <Text style={styles.lifetimeLabel}>Total Workouts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.lifetimeStatCol}>
            <Text style={styles.lifetimeVal}>{totalVolumeAllTime > 0 ? (totalVolumeAllTime / 1000).toFixed(1) + 'k' : '0'}</Text>
            <Text style={styles.lifetimeLabel}>Total Vol (kg)</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.lifetimeStatCol}>
            <Text style={styles.lifetimeVal}>{personalRecords.length}</Text>
            <Text style={styles.lifetimeLabel}>Recorded PRs</Text>
          </View>
        </Card>

        {/* Tab Switcher: Workouts vs Personal Records */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeSegment === 'history' && styles.segmentBtnActive]}
            onPress={() => setActiveSegment('history')}
            activeOpacity={0.7}
          >
            <Text style={[styles.segmentText, activeSegment === 'history' && styles.segmentTextActive]}>
              Workout Logs ({history.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, activeSegment === 'prs' && styles.segmentBtnActive]}
            onPress={() => setActiveSegment('prs')}
            activeOpacity={0.7}
          >
            <Text style={[styles.segmentText, activeSegment === 'prs' && styles.segmentTextActive]}>
              Personal Records ({personalRecords.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content: History Logs or PRs */}
        {activeSegment === 'history' ? (
          <View style={styles.listSection}>
            {history.length > 0 ? (
              history.map((sess) => (
                <TouchableOpacity
                  key={sess.sessionId}
                  onPress={() => handleDaySelect(sess.date)}
                  activeOpacity={0.8}
                >
                  <Card style={styles.sessionCard}>
                    <View style={styles.sessionHeader}>
                      <View>
                        <Text style={styles.sessionDate}>{formatDisplayDate(sess.date)}</Text>
                        <Text style={styles.sessionStatsText}>
                          {sess.exercises.length} exercises • {sess.totalSets} sets • {sess.totalVolumeKg.toLocaleString()} kg
                        </Text>
                      </View>
                      <ChevronRight size={18} color={colors.textSecondary} />
                    </View>

                    {/* Exercise chips preview */}
                    <View style={styles.exerciseChipsRow}>
                      {sess.exercises.map((ex, idx) => (
                        <View key={idx} style={styles.exChip}>
                          <Text style={styles.exChipName}>{ex.name}</Text>
                          <Text style={styles.exChipBest}>{ex.bestSet}</Text>
                        </View>
                      ))}
                    </View>

                    {sess.notes ? (
                      <Text style={styles.sessionNotesPreview} numberOfLines={2}>
                        "{sess.notes}"
                      </Text>
                    ) : null}
                  </Card>
                </TouchableOpacity>
              ))
            ) : (
              <Card style={styles.emptyCard}>
                <CalIcon size={32} color={colors.textDisabled} />
                <Text style={styles.emptyTitle}>No workouts recorded yet</Text>
                <Text style={styles.emptySub}>Log sets in the Workout tab to see your workout history here!</Text>
              </Card>
            )}
          </View>
        ) : (
          /* Personal Records Tab */
          <View style={styles.listSection}>
            {personalRecords.length > 0 ? (
              personalRecords.map((pr) => (
                <Card key={pr.exerciseId} style={styles.prCard}>
                  <View style={styles.prHeader}>
                    <View style={styles.prIcon}>
                      <Trophy size={16} color={colors.warning} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.prExerciseName}>{pr.exerciseName}</Text>
                      <Text style={styles.prCategory}>{pr.category} • Achieved {pr.dateAchieved}</Text>
                    </View>
                  </View>

                  <View style={styles.prStatsRow}>
                    <View style={styles.prStatBox}>
                      <Text style={styles.prStatLabel}>MAX WEIGHT</Text>
                      <Text style={styles.prStatValue}>{pr.maxWeightKg} kg</Text>
                      <Text style={styles.prStatSub}>for {pr.maxRepsAtMaxWeight} reps</Text>
                    </View>

                    <View style={styles.prStatBox}>
                      <Text style={styles.prStatLabel}>ESTIMATED 1RM</Text>
                      <Text style={[styles.prStatValue, { color: colors.primaryLight }]}>
                        {pr.estimated1RM} kg
                      </Text>
                      <Text style={styles.prStatSub}>Epley Formula</Text>
                    </View>
                  </View>
                </Card>
              ))
            ) : (
              <Card style={styles.emptyCard}>
                <Trophy size={32} color={colors.textDisabled} />
                <Text style={styles.emptyTitle}>No PRs yet</Text>
                <Text style={styles.emptySub}>Log weight & reps to unlock your strength records and estimated 1RMs!</Text>
              </Card>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  lifetimeStatsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surfaceCard,
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
  },
  lifetimeStatCol: {
    alignItems: 'center',
  },
  lifetimeVal: {
    ...typography.titleMedium,
    fontSize: 20,
    color: colors.primaryLight,
  },
  lifetimeLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceCard,
    borderRadius: borderRadius.md,
    padding: 4,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  segmentBtnActive: {
    backgroundColor: colors.surfaceHighlight,
  },
  segmentText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: colors.text,
    fontWeight: '700',
  },
  listSection: {
    gap: spacing.md,
  },
  sessionCard: {
    backgroundColor: colors.surfaceCard,
    padding: spacing.md,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sessionDate: {
    ...typography.titleSmall,
    color: colors.text,
  },
  sessionStatsText: {
    ...typography.caption,
    color: colors.primaryLight,
    marginTop: 2,
    fontWeight: '600',
  },
  exerciseChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  exChip: {
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  exChipName: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  exChipBest: {
    fontSize: 10,
    color: colors.textMuted,
  },
  sessionNotesPreview: {
    ...typography.caption,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  prCard: {
    backgroundColor: colors.surfaceCard,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  prHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  prIcon: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    backgroundColor: colors.warningMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prExerciseName: {
    ...typography.titleSmall,
    color: colors.text,
  },
  prCategory: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  prStatsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  prStatBox: {
    flex: 1,
    backgroundColor: colors.surfaceHighlight,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  prStatLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  prStatValue: {
    ...typography.mono,
    fontSize: 16,
    color: colors.text,
    marginVertical: 2,
  },
  prStatSub: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceCard,
    gap: spacing.xs,
  },
  emptyTitle: {
    ...typography.titleSmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptySub: {
    ...typography.bodySecondary,
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 12,
  },
});
