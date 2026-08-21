import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  PanResponder,
} from 'react-native';
import {
  Plus,
  Dumbbell,
  FileText,
  Link2,
  Trash2,
  Check,
  X,
  Layers,
  Copy,
} from 'lucide-react-native';
import { addDays, subDays, format, parseISO } from 'date-fns';
import * as SQLite from 'expo-sqlite';
import { useTheme, typography, borderRadius, spacing } from '../theme/theme';
import {
  Exercise,
  ExerciseWithLogs,
  WorkoutSession,
  TrackingType,
  SupersetGroup,
} from '../types/database';
import {
  getAllExercises,
  getOrCreateSession,
  getExerciseLogsForSession,
  addExerciseSet,
  removeExerciseFromSession,
  addCustomExercise,
  updateSessionNotes,
  getSessionSupersets,
} from '../db/database';
import { ExerciseCard } from '../components/workout/ExerciseCard';
import { AddExerciseModal } from '../components/workout/AddExerciseModal';
import { CopyWorkoutModal } from '../components/workout/CopyWorkoutModal';
import { RoutinesModal } from '../components/routines/RoutinesModal';
import { SupersetModal } from '../components/workout/SupersetModal';
import { ExerciseDetailScreen } from './ExerciseDetailScreen';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';

interface WorkoutScreenProps {
  db: SQLite.SQLiteDatabase;
  selectedDate: string;
  onDateChange?: (newDate: string) => void;
  onFullScreenToggle?: (isFullScreen: boolean) => void;
  onShowToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export const WorkoutScreen: React.FC<WorkoutScreenProps> = ({
  db,
  selectedDate,
  onDateChange,
  onFullScreenToggle,
  onShowToast,
}) => {
  const { colors } = useTheme();

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [exerciseItems, setExerciseItems] = useState<ExerciseWithLogs[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [sessionSupersets, setSessionSupersets] = useState<SupersetGroup[]>([]);

  // Modals
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isCopyModalVisible, setIsCopyModalVisible] = useState(false);
  const [isRoutinesModalVisible, setIsRoutinesModalVisible] = useState(false);
  const [isSupersetModalVisible, setIsSupersetModalVisible] = useState(false);

  // Dedicated Full Screen Exercise Logger state
  const [selectedExerciseForLogging, setSelectedExerciseForLogging] = useState<ExerciseWithLogs | null>(null);

  // Multi-Select & Reorder Mode (Screenshot 3)
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<number[]>([]);

  const [sessionNotes, setSessionNotes] = useState('');
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Inform parent of full-screen status
  useEffect(() => {
    if (onFullScreenToggle) {
      onFullScreenToggle(selectedExerciseForLogging !== null);
    }
  }, [selectedExerciseForLogging, onFullScreenToggle]);

  // Swipe Left/Right to Navigate Days!
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (evt, gestureState) => {
          // Horizontal swipe only if significant horizontal displacement
          return (
            Math.abs(gestureState.dx) > 35 &&
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.8 &&
            !selectedExerciseForLogging &&
            !isReorderMode
          );
        },
        onPanResponderRelease: (evt, gestureState) => {
          if (gestureState.dx < -50) {
            // Swipe Left -> Next Day
            if (onDateChange) {
              const next = addDays(parseISO(selectedDate), 1);
              onDateChange(format(next, 'yyyy-MM-dd'));
              onShowToast('info', `📅 ${format(next, 'EEE, d MMM')}`);
            }
          } else if (gestureState.dx > 50) {
            // Swipe Right -> Previous Day
            if (onDateChange) {
              const prev = subDays(parseISO(selectedDate), 1);
              onDateChange(format(prev, 'yyyy-MM-dd'));
              onShowToast('info', `📅 ${format(prev, 'EEE, d MMM')}`);
            }
          }
        },
      }),
    [selectedDate, onDateChange, selectedExerciseForLogging, isReorderMode, onShowToast]
  );

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

      const [items, supersetsList] = await Promise.all([
        getExerciseLogsForSession(db, sess.id, selectedDate),
        getSessionSupersets(db, sess.id),
      ]);

      setExerciseItems(items);
      setSessionSupersets(supersetsList);

      // Keep active full screen synced
      if (selectedExerciseForLogging) {
        const updatedActive = items.find((i) => i.exercise.id === selectedExerciseForLogging.exercise.id);
        if (updatedActive) {
          setSelectedExerciseForLogging(updatedActive);
        }
      }
    } catch (err: any) {
      console.error(err);
      onShowToast('error', `Failed to load workout: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [db, selectedDate, selectedExerciseForLogging?.exercise.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reorder handling (Move up / down)
  const handleMoveUp = (exerciseId: number) => {
    const idx = exerciseItems.findIndex((e) => e.exercise.id === exerciseId);
    if (idx <= 0) return;
    const newItems = [...exerciseItems];
    const temp = newItems[idx];
    newItems[idx] = newItems[idx - 1];
    newItems[idx - 1] = temp;
    setExerciseItems(newItems);
  };

  const handleMoveDown = (exerciseId: number) => {
    const idx = exerciseItems.findIndex((e) => e.exercise.id === exerciseId);
    if (idx === -1 || idx >= exerciseItems.length - 1) return;
    const newItems = [...exerciseItems];
    const temp = newItems[idx];
    newItems[idx] = newItems[idx + 1];
    newItems[idx + 1] = temp;
    setExerciseItems(newItems);
  };

  // Toggle selection in reorder mode
  const handleToggleSelect = (exerciseId: number) => {
    setSelectedExerciseIds((prev) =>
      prev.includes(exerciseId) ? prev.filter((id) => id !== exerciseId) : [...prev, exerciseId]
    );
  };

  // Delete selected exercises
  const handleDeleteSelected = () => {
    if (selectedExerciseIds.length === 0 || !session) return;
    Alert.alert(
      'Delete Exercises',
      `Are you sure you want to remove ${selectedExerciseIds.length} exercise(s) from today?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            for (const id of selectedExerciseIds) {
              await removeExerciseFromSession(db, session.id, id);
            }
            setSelectedExerciseIds([]);
            setIsReorderMode(false);
            await loadData();
            onShowToast('info', 'Selected exercises removed');
          },
        },
      ]
    );
  };

  // Select all or none
  const handleSelectAll = () => {
    if (selectedExerciseIds.length === exerciseItems.length) {
      setSelectedExerciseIds([]);
    } else {
      setSelectedExerciseIds(exerciseItems.map((e) => e.exercise.id));
    }
  };

  // If full-screen exercise logger is open
  if (selectedExerciseForLogging) {
    return (
      <ExerciseDetailScreen
        db={db}
        exerciseItem={selectedExerciseForLogging}
        allSessionExercises={exerciseItems}
        currentDate={selectedDate}
        onBack={() => setSelectedExerciseForLogging(null)}
        onDataChanged={loadData}
        onSwitchExercise={(nextItem) => setSelectedExerciseForLogging(nextItem)}
        onShowToast={onShowToast}
      />
    );
  }

  // Add Exercise to current session & open its logger
  const handleSelectExercise = async (exercise: Exercise) => {
    if (!session) return;
    try {
      const alreadyInList = exerciseItems.find((item) => item.exercise.id === exercise.id);
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
        const items = await getExerciseLogsForSession(db, session.id, selectedDate);
        setExerciseItems(items);
        const newItem = items.find((i) => i.exercise.id === exercise.id);
        if (newItem) {
          setSelectedExerciseForLogging(newItem);
        }
        onShowToast('success', `Added ${exercise.name}`);
      } else {
        setSelectedExerciseForLogging(alreadyInList);
      }
    } catch (err: any) {
      onShowToast('error', `Could not add exercise: ${err.message}`);
    }
  };

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
    <View {...panResponder.panHandlers} style={[styles.container, { backgroundColor: '#121316' }]}>
      {/* ================= REORDER / MULTI-SELECT ACTION BAR (Screenshot 3) ================= */}
      {isReorderMode ? (
        <View style={styles.reorderActionBar}>
          <TouchableOpacity style={styles.actionBtnLeft} onPress={handleSelectAll}>
            <Check size={20} color="#38BDF8" strokeWidth={3} />
            <Text style={styles.selectedCountText}>
              {selectedExerciseIds.length} exercises
            </Text>
          </TouchableOpacity>

          <View style={styles.actionBtnsRight}>
            <TouchableOpacity
              style={styles.actionIconBtn}
              onPress={() => setIsSupersetModalVisible(true)}
              disabled={selectedExerciseIds.length === 0}
            >
              <Link2
                size={22}
                color={selectedExerciseIds.length > 0 ? '#38BDF8' : '#64748B'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionIconBtn}
              onPress={handleDeleteSelected}
              disabled={selectedExerciseIds.length === 0}
            >
              <Trash2
                size={22}
                color={selectedExerciseIds.length > 0 ? '#EF4444' : '#64748B'}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionIconBtn}
              onPress={() => {
                setIsReorderMode(false);
                setSelectedExerciseIds([]);
              }}
            >
              <X size={22} color="#E2E8F0" />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadData} tintColor="#38BDF8" />
        }
      >
        {/* Session Stats Banner (Rounded Cards) */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, { backgroundColor: '#1A1C22', borderColor: '#262930' }]}>
            <Text style={styles.metricLabel}>VOLUME</Text>
            <Text style={styles.metricValue}>
              {totalVolumeKg > 0 ? totalVolumeKg.toLocaleString() : '0'}
              <Text style={styles.metricUnit}> kg</Text>
            </Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: '#1A1C22', borderColor: '#262930' }]}>
            <Text style={styles.metricLabel}>SETS</Text>
            <Text style={styles.metricValue}>{totalSets}</Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: '#1A1C22', borderColor: '#262930' }]}>
            <Text style={styles.metricLabel}>REPS</Text>
            <Text style={styles.metricValue}>{totalReps}</Text>
          </View>
        </View>

        {/* Quick Toolbar (Routines & Copy Actions) */}
        <View style={styles.quickToolsRow}>
          <TouchableOpacity
            style={[styles.quickToolBtn, { backgroundColor: '#1A1C22', borderColor: '#262930' }]}
            onPress={() => setIsRoutinesModalVisible(true)}
            activeOpacity={0.7}
          >
            <Layers size={15} color="#A3E635" />
            <Text style={styles.quickToolText}>Routines & Splits</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickToolBtn, { backgroundColor: '#1A1C22', borderColor: '#262930' }]}
            onPress={() => setIsCopyModalVisible(true)}
            activeOpacity={0.7}
          >
            <Copy size={15} color="#38BDF8" />
            <Text style={styles.quickToolText}>Copy from Date</Text>
          </TouchableOpacity>
        </View>

        {/* Exercises List (FitNotes Style with Rounded Corners) */}
        {exerciseItems.length > 0 ? (
          exerciseItems.map((item, idx) => (
            <ExerciseCard
              key={item.exercise.id}
              item={item}
              onOpenLogger={(exItem) => setSelectedExerciseForLogging(exItem)}
              onLongPress={(exId) => {
                setIsReorderMode(true);
                setSelectedExerciseIds([exId]);
              }}
              isReorderMode={isReorderMode}
              isSelected={selectedExerciseIds.includes(item.exercise.id)}
              onToggleSelect={handleToggleSelect}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              canMoveUp={idx > 0}
              canMoveDown={idx < exerciseItems.length - 1}
            />
          ))
        ) : (
          /* Empty State */
          <Card style={[styles.emptyCard, { backgroundColor: '#18191D', borderColor: '#26282E' }]}>
            <View style={[styles.emptyIconBg, { backgroundColor: '#38BDF820', borderColor: '#38BDF8' }]}>
              <Dumbbell size={36} color="#38BDF8" />
            </View>
            <Text style={styles.emptyTitle}>Workout Log Empty</Text>
            <Text style={styles.emptySubtitle}>
              Swipe left/right to browse dates, load a routine, or tap below to add exercises.
            </Text>

            <Button
              title="+ Add Exercises"
              variant="primary"
              size="lg"
              onPress={() => setIsAddModalVisible(true)}
              style={styles.emptyBtn}
            />
          </Card>
        )}

        {/* Bottom Actions Row: + Add Exercise & Workout Notes */}
        {exerciseItems.length > 0 && (
          <View style={styles.bottomActions}>
            <TouchableOpacity
              style={[styles.addExerciseMainBtn, { backgroundColor: colors.primary }]}
              onPress={() => setIsAddModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.addExerciseMainText, { color: colors.textInverse }]}>+ Add Exercise</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.notesToggleBtn,
                { backgroundColor: '#1A1C22', borderColor: '#262930' },
              ]}
              onPress={() => setShowNotesInput(!showNotesInput)}
              activeOpacity={0.7}
            >
              <FileText size={18} color={showNotesInput ? colors.primary : '#94A3B8'} />
            </TouchableOpacity>
          </View>
        )}

        {/* Workout Session Notes Card */}
        {showNotesInput && (
          <View style={[styles.notesCard, { backgroundColor: '#18191D', borderColor: '#26282E' }]}>
            <Text style={styles.notesTitle}>Workout Session Notes</Text>
            <TextInput
              style={styles.notesInput}
              multiline
              numberOfLines={3}
              value={sessionNotes}
              onChangeText={handleNotesChange}
              placeholder="e.g. Great pump, hit PR on Bench, felt strong..."
              placeholderTextColor="#64748B"
            />
          </View>
        )}
      </ScrollView>

      {/* 1. Add Exercise Modal */}
      <AddExerciseModal
        visible={isAddModalVisible}
        exercises={allExercises}
        onClose={() => setIsAddModalVisible(false)}
        onSelectExercise={handleSelectExercise}
        onCreateCustomExercise={handleCreateCustomExercise}
      />

      {/* 2. Copy Workout from Date Modal */}
      <CopyWorkoutModal
        visible={isCopyModalVisible}
        db={db}
        currentDate={selectedDate}
        onClose={() => setIsCopyModalVisible(false)}
        onSuccess={(count) => {
          loadData();
          onShowToast('success', `Copied ${count} sets to today!`);
        }}
      />

      {/* 3. Routines & Splits Modal */}
      <RoutinesModal
        visible={isRoutinesModalVisible}
        db={db}
        currentDate={selectedDate}
        onClose={() => setIsRoutinesModalVisible(false)}
        onStartRoutine={(name, count) => {
          loadData();
          onShowToast('success', `Loaded ${name} (${count} sets) into today!`);
        }}
      />

      {/* 4. FitNotes Supersets Manager Modal */}
      {session && (
        <SupersetModal
          visible={isSupersetModalVisible}
          db={db}
          sessionId={session.id}
          supersets={sessionSupersets}
          allExercises={exerciseItems}
          selectedExerciseIds={selectedExerciseIds}
          onClose={() => {
            setIsSupersetModalVisible(false);
            setIsReorderMode(false);
            setSelectedExerciseIds([]);
          }}
          onRefresh={loadData}
          onShowToast={onShowToast}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  reorderActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#38BDF8',
  },
  actionBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedCountText: {
    ...typography.titleSmall,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  actionBtnsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionIconBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 40,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  metricCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
  },
  metricLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  metricValue: {
    ...typography.mono,
    fontSize: 17,
    marginTop: 2,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  metricUnit: {
    fontSize: 11,
    fontWeight: '500',
    color: '#94A3B8',
  },
  quickToolsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  quickToolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  quickToolText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: spacing.xl,
    marginVertical: spacing.lg,
    borderRadius: 20,
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
    color: '#FFFFFF',
    marginBottom: 6,
  },
  emptySubtitle: {
    ...typography.bodySecondary,
    textAlign: 'center',
    lineHeight: 20,
    color: '#94A3B8',
    marginBottom: spacing.xl,
  },
  emptyBtn: {
    width: '100%',
    borderRadius: 14,
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    marginBottom: 12,
  },
  addExerciseMainBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addExerciseMainText: {
    ...typography.titleSmall,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  notesToggleBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  notesCard: {
    marginBottom: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
  },
  notesTitle: {
    ...typography.titleSmall,
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 6,
  },
  notesInput: {
    ...typography.bodySecondary,
    backgroundColor: '#1E2025',
    color: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.md,
    minHeight: 70,
    borderWidth: 1,
    borderColor: '#333742',
    textAlignVertical: 'top',
  },
});
