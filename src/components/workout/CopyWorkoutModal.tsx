import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import {
  Calendar,
  CheckSquare,
  Square,
  ChevronRight,
  ArrowLeft,
  Copy,
  Check,
  Dumbbell,
} from 'lucide-react-native';
import * as SQLite from 'expo-sqlite';
import { useTheme, typography, borderRadius, spacing } from '../../theme/theme';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import {
  getPastWorkoutsList,
  PastWorkoutSummary,
  copySelectedSetsToDate,
} from '../../db/database';
import { formatDisplayDate, formatShortDate } from '../../utils/dateUtils';

interface CopyWorkoutModalProps {
  visible: boolean;
  db: SQLite.SQLiteDatabase;
  currentDate: string;
  onClose: () => void;
  onSuccess: (copiedCount: number) => void;
}

export const CopyWorkoutModal: React.FC<CopyWorkoutModalProps> = ({
  visible,
  db,
  currentDate,
  onClose,
  onSuccess,
}) => {
  const { colors } = useTheme();

  const [step, setStep] = useState<'dates' | 'preview'>('dates');
  const [pastWorkouts, setPastWorkouts] = useState<PastWorkoutSummary[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<PastWorkoutSummary | null>(null);
  const [selectedSetIds, setSelectedSetIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadPastWorkouts();
      setStep('dates');
      setSelectedWorkout(null);
    }
  }, [visible, db, currentDate]);

  const loadPastWorkouts = async () => {
    try {
      setIsLoading(true);
      const list = await getPastWorkoutsList(db, 30, currentDate);
      setPastWorkouts(list.filter((w) => w.date !== currentDate)); // exclude today
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectWorkout = (workout: PastWorkoutSummary) => {
    setSelectedWorkout(workout);

    // Default: select all set IDs
    const allSetIds = new Set<number>();
    for (const ex of workout.exercises) {
      for (const s of ex.sets) {
        allSetIds.add(s.id);
      }
    }
    setSelectedSetIds(allSetIds);
    setStep('preview');
  };

  const toggleSet = (setId: number) => {
    setSelectedSetIds((prev) => {
      const next = new Set(prev);
      if (next.has(setId)) next.delete(setId);
      else next.add(setId);
      return next;
    });
  };

  const toggleAll = () => {
    if (!selectedWorkout) return;
    const allSetIds = new Set<number>();
    for (const ex of selectedWorkout.exercises) {
      for (const s of ex.sets) {
        allSetIds.add(s.id);
      }
    }

    if (selectedSetIds.size === allSetIds.size) {
      setSelectedSetIds(new Set()); // deselect all
    } else {
      setSelectedSetIds(allSetIds); // select all
    }
  };

  const handleConfirmCopy = async () => {
    if (!selectedWorkout) return;
    try {
      setIsLoading(true);
      const setsToCopy: any[] = [];

      for (const ex of selectedWorkout.exercises) {
        for (const s of ex.sets) {
          if (selectedSetIds.has(s.id)) {
            setsToCopy.push({
              exerciseId: ex.exerciseId,
              weightKg: s.weightKg,
              reps: s.reps,
              distanceVal: s.distanceVal,
              timeDuration: s.timeDuration,
              difficulty: s.difficulty,
              comment: s.comment,
            });
          }
        }
      }

      if (setsToCopy.length === 0) return;

      const copied = await copySelectedSetsToDate(db, currentDate, setsToCopy);
      onSuccess(copied);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={step === 'dates' ? 'Select Workout Date to Copy' : `Copy from ${selectedWorkout ? formatShortDate(selectedWorkout.date) : ''}`}
    >
      {/* STEP 1: SELECT A PAST WORKOUT DATE */}
      {step === 'dates' && (
        <View style={styles.container}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Choose a previous date to preview and copy exercises:
          </Text>

          {pastWorkouts.length > 0 ? (
            <FlatList
              data={pastWorkouts}
              keyExtractor={(item) => String(item.sessionId)}
              style={styles.datesList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.dateRow,
                    { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
                  ]}
                  onPress={() => handleSelectWorkout(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.dateInfoLeft}>
                    <View style={[styles.calendarIconBox, { backgroundColor: colors.primaryMuted }]}>
                      <Calendar size={18} color={colors.primary} />
                    </View>
                    <View>
                      <Text style={[styles.dateTitle, { color: colors.text }]}>
                        {formatDisplayDate(item.date)}
                      </Text>
                      <Text style={[styles.dateSub, { color: colors.textMuted }]}>
                        {item.exercises.length} exercises • {item.totalSets} sets
                      </Text>
                    </View>
                  </View>
                  <ChevronRight size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            />
          ) : (
            <View style={styles.emptyState}>
              <Dumbbell size={36} color={colors.textDisabled} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No prior workouts recorded yet.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* STEP 2: PREVIEW WORKOUT & SELECT SETS */}
      {step === 'preview' && selectedWorkout && (
        <View style={styles.container}>
          {/* Header Controls */}
          <View style={styles.previewTopBar}>
            <TouchableOpacity
              style={[styles.backPill, { backgroundColor: colors.surfaceHighlight }]}
              onPress={() => setStep('dates')}
              activeOpacity={0.7}
            >
              <ArrowLeft size={15} color={colors.textSecondary} />
              <Text style={[styles.backPillText, { color: colors.textSecondary }]}>Change Date</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleAllBtn, { backgroundColor: colors.primaryMuted }]}
              onPress={toggleAll}
              activeOpacity={0.7}
            >
              <Text style={[styles.toggleAllText, { color: colors.primary }]}>
                {selectedSetIds.size > 0 ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Exercise & Sets with Checkboxes */}
          <ScrollView style={styles.previewScroll} showsVerticalScrollIndicator={false}>
            {selectedWorkout.exercises.map((ex) => (
              <Card
                key={ex.exerciseId}
                style={[styles.exerciseCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
              >
                <View style={styles.exerciseHeader}>
                  <Text style={[styles.exTitle, { color: colors.text }]}>{ex.exerciseName}</Text>
                  <Text style={[styles.exCatPill, { color: colors.primary }]}>{ex.category}</Text>
                </View>

                {/* Sets Table */}
                <View style={styles.setsTable}>
                  {ex.sets.map((s) => {
                    const isChecked = selectedSetIds.has(s.id);
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[
                          styles.setRowItem,
                          { borderBottomColor: colors.border },
                          isChecked && { backgroundColor: `${colors.primary}10` },
                        ]}
                        onPress={() => toggleSet(s.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.setRowLeft}>
                          {isChecked ? (
                            <CheckSquare size={18} color={colors.primary} />
                          ) : (
                            <Square size={18} color={colors.textDisabled} />
                          )}
                          <Text style={[styles.setNumLabel, { color: colors.textSecondary }]}>
                            Set {s.setNumber}:
                          </Text>
                          <Text style={[styles.setDetailText, { color: colors.text }]}>
                            {s.weightKg > 0 ? `${s.weightKg} kg × ${s.reps} reps` : `${s.reps} reps`}
                          </Text>
                        </View>
                        {s.difficulty && (
                          <Text style={[styles.rpeTag, { color: colors.secondary }]}>
                            {s.difficulty}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Card>
            ))}
          </ScrollView>

          {/* Bottom Confirmation Button */}
          <View style={styles.footerActions}>
            <Button
              title={`Copy Selected (${selectedSetIds.size} Sets) to Today`}
              icon={<Copy size={16} color={colors.textInverse} />}
              variant="primary"
              size="lg"
              onPress={handleConfirmCopy}
              disabled={selectedSetIds.size === 0 || isLoading}
              loading={isLoading}
              style={{ width: '100%' }}
            />
          </View>
        </View>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    maxHeight: 520,
  },
  subtitle: {
    ...typography.caption,
    marginBottom: spacing.md,
    fontSize: 12,
  },
  datesList: {
    maxHeight: 380,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: 6,
    borderWidth: 1,
  },
  dateInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  calendarIconBox: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTitle: {
    ...typography.titleSmall,
    fontSize: 14,
  },
  dateSub: {
    ...typography.caption,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: spacing.xs,
  },
  emptyText: {
    ...typography.bodySecondary,
  },
  previewTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  backPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  backPillText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  toggleAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  toggleAllText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
  },
  previewScroll: {
    maxHeight: 340,
  },
  exerciseCard: {
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  exTitle: {
    ...typography.titleSmall,
    fontSize: 14,
  },
  exCatPill: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
  },
  setsTable: {
    marginTop: 4,
  },
  setRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: borderRadius.xs,
    borderBottomWidth: 1,
  },
  setRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  setNumLabel: {
    ...typography.caption,
    fontSize: 12,
  },
  setDetailText: {
    ...typography.mono,
    fontSize: 13,
  },
  rpeTag: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
  },
  footerActions: {
    marginTop: spacing.md,
  },
});
