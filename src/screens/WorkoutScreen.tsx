import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import {
  Plus,
  Dumbbell,
  FileText,
  Link2,
  X,
  Layers,
  Copy,
} from 'lucide-react-native';
import * as SQLite from 'expo-sqlite';
import { useTheme, typography, borderRadius, spacing } from '../theme/theme';
import {
  Exercise,
  ExerciseWithLogs,
  ExerciseLog,
  WorkoutSession,
  TrackingType,
} from '../types/database';
import {
  getAllExercises,
  getOrCreateSession,
  getExerciseLogsForSession,
  addExerciseSet,
  updateExerciseSet,
  deleteExerciseSet,
  removeExerciseFromSession,
  addCustomExercise,
  updateSessionNotes,
  linkExercisesAsSuperset,
  unlinkExerciseFromSuperset,
  copyPreviousWorkout,
} from '../db/database';
import { ExerciseCard } from '../components/workout/ExerciseCard';
import { AddExerciseModal } from '../components/workout/AddExerciseModal';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';

interface WorkoutScreenProps {
  db: SQLite.SQLiteDatabase;
  selectedDate: string;
  onShowToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export const WorkoutScreen: React.FC<WorkoutScreenProps> = ({
  db,
  selectedDate,
  onShowToast,
}) => {
  const { colors } = useTheme();

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exerciseItems, setExerciseItems] = useState<ExerciseWithLogs[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Superset Pairing State
  const [pairingSourceId, setPairingSourceId] = useState<number | null>(null);

  // Load session & exercises for selectedDate
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const exercisesList = await getAllExercises(db);
      setAllExercises(exercisesList);

      const sess = await getOrCreateSession(db, selectedDate);
      setSession(sess);
      setSessionNotes(sess.notes || '');
      setShowNotesInput(!!sess.notes);

      const items = await getExerciseLogsForSession(db, sess.id, selectedDate);
      setExerciseItems(items);
    } catch (err: any) {
      console.error(err);
      onShowToast('error', `Failed to load workout: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [db, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Add Exercise to current session
  const handleSelectExercise = async (exercise: Exercise) => {
    if (!session) return;
    try {
      const alreadyInList = exerciseItems.some((item) => item.exercise.id === exercise.id);
      if (!alreadyInList) {
        await addExerciseSet(
          db,
          session.id,
          exercise.id,
          1,
          0,
          0,
          0,
          'km',
          '00:00:00',
          null,
          null,
          null
        );
        await loadData();
        onShowToast('success', `Added ${exercise.name}`);
      }
    } catch (err: any) {
      onShowToast('error', `Could not add exercise: ${err.message}`);
    }
  };

  // Add new set for an existing exercise card
  const handleAddSet = async (exerciseId: number, lastLog?: ExerciseLog) => {
    if (!session) return;
    try {
      const currentItem = exerciseItems.find((item) => item.exercise.id === exerciseId);
      const nextSetNum = (currentItem?.logs.length || 0) + 1;

      const defaultWeight = lastLog?.weight_kg || 0;
      const defaultReps = lastLog?.reps || 0;
      const defaultDistance = lastLog?.distance_val || 0;
      const defaultUnit = lastLog?.distance_unit || 'km';
      const defaultTime = lastLog?.time_duration || '00:00:00';
      const supersetId = currentItem?.supersetId || null;

      await addExerciseSet(
        db,
        session.id,
        exerciseId,
        nextSetNum,
        defaultWeight,
        defaultReps,
        defaultDistance,
        defaultUnit,
        defaultTime,
        null,
        null,
        supersetId
      );

      const items = await getExerciseLogsForSession(db, session.id, selectedDate);
      setExerciseItems(items);
    } catch (err: any) {
      onShowToast('error', `Failed to add set: ${err.message}`);
    }
  };

  // Update a set
  const handleUpdateSet = async (logId: number, updates: Partial<ExerciseLog>) => {
    if (!session) return;
    try {
      await updateExerciseSet(db, logId, updates);
      setExerciseItems((prev) =>
        prev.map((item) => ({
          ...item,
          logs: item.logs.map((l) => (l.id === logId ? { ...l, ...updates } : l)),
        }))
      );
    } catch (err: any) {
      onShowToast('error', `Failed to update set: ${err.message}`);
    }
  };

  // Delete a set
  const handleDeleteSet = async (logId: number) => {
    if (!session) return;
    try {
      await deleteExerciseSet(db, logId);
      const items = await getExerciseLogsForSession(db, session.id, selectedDate);
      setExerciseItems(items);
    } catch (err: any) {
      onShowToast('error', `Failed to delete set: ${err.message}`);
    }
  };

  // Remove entire exercise from session
  const handleRemoveExercise = async (exerciseId: number) => {
    if (!session) return;
    try {
      await removeExerciseFromSession(db, session.id, exerciseId);
      const items = await getExerciseLogsForSession(db, session.id, selectedDate);
      setExerciseItems(items);
      onShowToast('info', 'Exercise removed from today');
    } catch (err: any) {
      onShowToast('error', `Failed to remove exercise: ${err.message}`);
    }
  };

  // Superset Pairing
  const handleStartSupersetPairing = (exerciseId: number) => {
    setPairingSourceId(exerciseId);
    onShowToast('info', 'Touch & select a second exercise to link as Superset!');
  };

  const handleSelectForPairing = async (secondExerciseId: number) => {
    if (!session || !pairingSourceId) return;
    try {
      await linkExercisesAsSuperset(db, session.id, pairingSourceId, secondExerciseId);
      setPairingSourceId(null);
      const items = await getExerciseLogsForSession(db, session.id, selectedDate);
      setExerciseItems(items);
      onShowToast('success', 'Exercises linked as Superset! 🔗');
    } catch (err: any) {
      onShowToast('error', `Failed to link superset: ${err.message}`);
    }
  };

  const handleUnlinkSuperset = async (exerciseId: number) => {
    if (!session) return;
    try {
      await unlinkExerciseFromSuperset(db, session.id, exerciseId);
      const items = await getExerciseLogsForSession(db, session.id, selectedDate);
      setExerciseItems(items);
      onShowToast('info', 'Superset unlinked');
    } catch (err: any) {
      onShowToast('error', `Failed to unlink: ${err.message}`);
    }
  };

  // Copy Previous Workout
  const handleCopyPrevious = async () => {
    try {
      const res = await copyPreviousWorkout(db, selectedDate);
      if (res.success) {
        onShowToast('success', res.message);
        await loadData();
      } else {
        onShowToast('info', res.message);
      }
    } catch (err: any) {
      onShowToast('error', `Failed to copy workout: ${err.message}`);
    }
  };

  // Create custom exercise
  const handleCreateCustomExercise = async (
    name: string,
    category: string,
    trackingType: TrackingType
  ): Promise<Exercise> => {
    const newId = await addCustomExercise(db, name, category, trackingType);
    const newEx: Exercise = {
      id: newId,
      name,
      category,
      tracking_type: trackingType,
      is_custom: 1,
    };
    const updatedList = await getAllExercises(db);
    setAllExercises(updatedList);
    return newEx;
  };

  const handleNotesChange = async (text: string) => {
    setSessionNotes(text);
    if (session) {
      await updateSessionNotes(db, session.id, text);
    }
  };

  // Session metrics
  const totalSets = exerciseItems.reduce((acc, item) => acc + item.logs.length, 0);
  const totalVolumeKg = Math.round(
    exerciseItems.reduce(
      (acc, item) =>
        acc +
        item.logs.reduce(
          (sub, l) =>
            sub +
            (item.exercise.tracking_type === 'weight_reps' ? (l.weight_kg || 0) * (l.reps || 0) : 0),
          0
        ),
      0
    )
  );
  const totalReps = exerciseItems.reduce(
    (acc, item) =>
      acc +
      item.logs.reduce(
        (sub, l) =>
          sub + (item.exercise.tracking_type === 'weight_reps' ? l.reps || 0 : 0),
        0
      ),
    0
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Superset Pairing Mode Alert Top Banner */}
      {pairingSourceId !== null && (
        <View style={[styles.pairingBanner, { backgroundColor: colors.surfaceHighlight, borderBottomColor: colors.primary }]}>
          <View style={styles.pairingBannerLeft}>
            <Link2 size={16} color={colors.primary} />
            <Text style={[styles.pairingBannerText, { color: colors.primary }]}>
              Select second exercise to link as Superset
            </Text>
          </View>
          <TouchableOpacity
            style={styles.cancelPairingBtn}
            onPress={() => setPairingSourceId(null)}
          >
            <X size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadData} tintColor={colors.primary} />
        }
      >
        {/* Session Stats Banner */}
        <View style={styles.metricsRow}>
          <Card style={[styles.metricCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>VOLUME</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>
              {totalVolumeKg > 0 ? totalVolumeKg.toLocaleString() : '0'}
              <Text style={[styles.metricUnit, { color: colors.textSecondary }]}> kg</Text>
            </Text>
          </Card>

          <Card style={[styles.metricCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>SETS</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>{totalSets}</Text>
          </Card>

          <Card style={[styles.metricCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
            <Text style={[styles.metricLabel, { color: colors.textMuted }]}>REPS</Text>
            <Text style={[styles.metricValue, { color: colors.text }]}>{totalReps}</Text>
          </Card>
        </View>

        {/* Exercises List */}
        {exerciseItems.length > 0 ? (
          exerciseItems.map((item) => (
            <ExerciseCard
              key={item.exercise.id}
              item={item}
              onAddSet={handleAddSet}
              onUpdateSet={handleUpdateSet}
              onDeleteSet={handleDeleteSet}
              onRemoveExercise={handleRemoveExercise}
              onStartSupersetPairing={handleStartSupersetPairing}
              onUnlinkSuperset={handleUnlinkSuperset}
              isPairingMode={pairingSourceId !== null}
              isPairingSource={pairingSourceId === item.exercise.id}
              onSelectForPairing={handleSelectForPairing}
            />
          ))
        ) : (
          /* FitNotes Empty State */
          <Card style={[styles.emptyCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
            <View style={[styles.emptyIconBg, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}>
              <Dumbbell size={36} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Workout Log Empty</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              Start tracking sets for this day, or duplicate your last session.
            </Text>

            <Button
              title="+ Start New Workout"
              variant="primary"
              size="lg"
              onPress={() => setIsAddModalVisible(true)}
              style={styles.emptyBtn}
            />

            <Button
              title="Copy Previous Workout"
              icon={<Copy size={16} color={colors.secondary} />}
              variant="secondary"
              size="md"
              onPress={handleCopyPrevious}
              style={[styles.emptyBtn, { marginTop: spacing.sm }]}
            />
          </Card>
        )}

        {/* Bottom Actions Row: + Add Exercise & Workout Notes */}
        {exerciseItems.length > 0 && (
          <View style={styles.bottomActions}>
            <Button
              title="+ Add Exercise"
              variant="primary"
              size="md"
              onPress={() => setIsAddModalVisible(true)}
              style={{ flex: 1 }}
            />
            <TouchableOpacity
              style={[
                styles.notesToggleBtn,
                { backgroundColor: colors.surfaceHighlight, borderColor: colors.borderLight },
              ]}
              onPress={() => setShowNotesInput(!showNotesInput)}
              activeOpacity={0.7}
            >
              <FileText size={18} color={showNotesInput ? colors.primary : colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Workout Session Notes Card */}
        {showNotesInput && (
          <Card style={[styles.notesCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
            <Text style={[styles.notesTitle, { color: colors.textSecondary }]}>Workout Session Notes</Text>
            <TextInput
              style={[styles.notesInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
              multiline
              numberOfLines={3}
              value={sessionNotes}
              onChangeText={handleNotesChange}
              placeholder="e.g. Great pump, hit PR on Bench, felt strong..."
              placeholderTextColor={colors.textDisabled}
            />
          </Card>
        )}
      </ScrollView>

      {/* Add Exercise Modal (Body Part -> Exercise -> Custom) */}
      <AddExerciseModal
        visible={isAddModalVisible}
        exercises={allExercises}
        onClose={() => setIsAddModalVisible(false)}
        onSelectExercise={handleSelectExercise}
        onCreateCustomExercise={handleCreateCustomExercise}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pairingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  pairingBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pairingBannerText: {
    ...typography.caption,
    fontWeight: '700',
  },
  cancelPairingBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  metricLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metricValue: {
    ...typography.mono,
    fontSize: 18,
    marginTop: 2,
  },
  metricUnit: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: spacing.xl,
    marginVertical: spacing.xl,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  emptyTitle: {
    ...typography.titleMedium,
    fontSize: 20,
    marginBottom: 6,
  },
  emptySubtitle: {
    ...typography.bodySecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  emptyBtn: {
    width: '100%',
  },
  bottomActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  notesToggleBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  notesCard: {
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  notesTitle: {
    ...typography.titleSmall,
    fontSize: 13,
    marginBottom: 6,
  },
  notesInput: {
    ...typography.bodySecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 70,
    borderWidth: 1,
    textAlignVertical: 'top',
  },
});
