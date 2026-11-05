import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  PanResponder,
  BackHandler,
} from 'react-native';
import { TouchableOpacity } from '../components/common/Touchable';
import { Text, TextInput } from '../components/common/Typography';
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
import { useTheme, typography, borderRadius, spacing, ThemeColors } from '../theme/theme';
import { formatDisplayDate } from '../utils/dateUtils';
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
import { ScreenTransition } from '../components/common/Motion';
import { CheckInCard } from '../components/workout/CheckInCard';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';

import { useTabBarSpace } from '../components/common/tabBarSpace';
import { useUnits } from '../utils/units';
import { confirmAction } from '../utils/feedback';
interface WorkoutScreenProps {
  db: SQLite.SQLiteDatabase;
  selectedDate: string;
  onBackToHub?: () => void;
  onDateChange?: (newDate: string) => void;
  onFullScreenToggle?: (isFullScreen: boolean) => void;
  onShowToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export const WorkoutScreen: React.FC<WorkoutScreenProps> = ({
  db,
  selectedDate,
  onBackToHub,
  onDateChange,
  onFullScreenToggle,
  onShowToast,
}) => {
  const { colors } = useTheme();
  const u = useUnits();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const tabBarSpace = useTabBarSpace();

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
  // The list slides back in only after closing the logger, not on first open of the Workout pillar.
  const openedLogger = useRef(false);
  useEffect(() => {
    if (selectedExerciseForLogging) openedLogger.current = true;
  }, [selectedExerciseForLogging]);

  // Android back: close the full-screen logger / leave reorder mode before leaving the screen.
  const isReorderModeRef = useRef(false);
  const hasLoggerOpen = selectedExerciseForLogging !== null;
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (hasLoggerOpen) {
        setSelectedExerciseForLogging(null);
        return true;
      }
      if (isReorderModeRef.current) {
        setIsReorderMode(false);
        setSelectedExerciseIds([]);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [hasLoggerOpen]);

  // Multi-Select & Reorder Mode (Screenshot 3)
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<number[]>([]);
  isReorderModeRef.current = isReorderMode;

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
    const n = selectedExerciseIds.length;
    confirmAction({
      title: `Remove ${n} ${n === 1 ? 'exercise' : 'exercises'}?`,
      message: 'All their sets for this day are deleted.',
      confirmLabel: 'Remove',
      destructive: true,
    }).then(async (ok) => {
      if (!ok) return;
      for (const id of selectedExerciseIds) {
        await removeExerciseFromSession(db, session.id, id);
      }
      setSelectedExerciseIds([]);
      setIsReorderMode(false);
      await loadData();
      onShowToast('info', `${n} ${n === 1 ? 'exercise' : 'exercises'} removed`);
    });
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
      <ScreenTransition key="logger" direction="forward">
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
      </ScreenTransition>
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
    <ScreenTransition key="list" direction={openedLogger.current ? 'back' : 'none'}>
    <View {...panResponder.panHandlers} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Back to Hub Header */}
      {onBackToHub && !isReorderMode && (
        <View style={[styles.topHubBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity style={styles.backHubBtn} onPress={onBackToHub} activeOpacity={0.7}>
            <Text style={[styles.backHubText, { color: colors.primary }]}>‹ Back to Hub</Text>
          </TouchableOpacity>
          <View style={[styles.datePillHeader, { backgroundColor: colors.surfaceHighlight }]}>
            <Text style={[styles.datePillText, { color: colors.text }]}>{formatDisplayDate(selectedDate)}</Text>
          </View>
        </View>
      )}

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
                color={selectedExerciseIds.length > 0 ? colors.secondary : colors.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionIconBtn}
              onPress={handleDeleteSelected}
              disabled={selectedExerciseIds.length === 0}
            >
              <Trash2
                size={22}
                color={selectedExerciseIds.length > 0 ? colors.danger : colors.textMuted}
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarSpace }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadData} tintColor="#38BDF8" />
        }
      >
        {/* Session Stats Banner (Rounded Cards) */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.metricLabel}>Volume</Text>
            <Text style={styles.metricValue}>
              {u.fmtVolume(totalVolumeKg).value}
              <Text style={styles.metricUnit}> {u.fmtVolume(totalVolumeKg).unit}</Text>
            </Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.metricLabel}>Sets</Text>
            <Text style={styles.metricValue}>{totalSets}</Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.metricLabel}>Reps</Text>
            <Text style={styles.metricValue}>{totalReps}</Text>
          </View>
        </View>

        {/* Quick Toolbar (Routines & Copy Actions) */}
        <View style={styles.quickToolsRow}>
          <TouchableOpacity
            style={[styles.quickToolBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setIsRoutinesModalVisible(true)}
            activeOpacity={0.7}
          >
            <Layers size={15} color="#A3E635" />
            <Text style={styles.quickToolText}>Routines & Splits</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickToolBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
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
          <Card style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.emptyIconBg, { backgroundColor: colors.secondaryMuted, borderColor: colors.secondary }]}>
              <Dumbbell size={36} color="#38BDF8" />
            </View>
            <Text style={styles.emptyTitle}>No exercises yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your first exercise, load a routine, or swipe left/right to see other days.
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
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setShowNotesInput(!showNotesInput)}
              activeOpacity={0.7}
            >
              <FileText size={18} color={showNotesInput ? colors.primary: colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Sleep & energy check-in (feeds Progress → Sleep and energy) */}
        {exerciseItems.some((item) => item.logs.length > 0) && (
          <View style={styles.checkInWrap}>
            <CheckInCard db={db} date={selectedDate} />
          </View>
        )}

        {/* Workout Session Notes Card */}
        {showNotesInput && (
          <View style={[styles.notesCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
    </ScreenTransition>
  );
};

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  checkInWrap: {
    marginTop: 12,
  },
  container: {
    flex: 1,
  },
  topHubBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backHubBtn: {
    paddingVertical: 4,
  },
  backHubText: {
    ...typography.titleSmall,
    fontSize: 15,
    fontWeight: '800',
  },
  datePillHeader: {
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  datePillText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  reorderActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceCard,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary,
  },
  actionBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedCountText: {
    ...typography.titleSmall,
    fontSize: 15,
    color: colors.text,
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
    color: colors.textSecondary,
    letterSpacing: 0.1,
  },
  metricValue: {
    ...typography.mono,
    fontSize: 17,
    marginTop: 2,
    color: colors.text,
    fontWeight: '800',
  },
  metricUnit: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
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
    color: colors.text,
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
    color: colors.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    ...typography.bodySecondary,
    textAlign: 'center',
    lineHeight: 20,
    color: colors.textSecondary,
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
    letterSpacing: 0.1,
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
    color: colors.textSecondary,
    marginBottom: 6,
  },
  notesInput: {
    ...typography.bodySecondary,
    backgroundColor: colors.surfaceCard,
    color: colors.text,
    borderRadius: 12,
    padding: spacing.md,
    minHeight: 70,
    borderWidth: 1,
    borderColor: colors.borderLight,
    textAlignVertical: 'top',
  },
});
