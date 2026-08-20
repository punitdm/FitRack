import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import {
  Layers,
  Plus,
  Play,
  Trash2,
  Dumbbell,
  Check,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react-native';
import * as SQLite from 'expo-sqlite';
import { useTheme, typography, borderRadius, spacing } from '../../theme/theme';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { WorkoutTemplate, Exercise } from '../../types/database';
import {
  getWorkoutTemplates,
  createWorkoutTemplate,
  deleteWorkoutTemplate,
  loadTemplateIntoSession,
  getAllExercises,
} from '../../db/database';

interface RoutinesModalProps {
  visible: boolean;
  db: SQLite.SQLiteDatabase;
  currentDate: string;
  onClose: () => void;
  onStartRoutine: (templateName: string, setsAdded: number) => void;
}

export const RoutinesModal: React.FC<RoutinesModalProps> = ({
  visible,
  db,
  currentDate,
  onClose,
  onStartRoutine,
}) => {
  const { colors } = useTheme();

  const [step, setStep] = useState<'list' | 'create'>('list');
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkoutTemplate | null>(null);

  // New Routine Form
  const [routineName, setRoutineName] = useState('');
  const [routineCategory, setRoutineCategory] = useState('Push');
  const [routineNotes, setRoutineNotes] = useState('');
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [selectedExercises, setSelectedExercises] = useState<
    { exercise: Exercise; targetSets: number; targetReps: number; targetWeight: number }[]
  >([]);
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadData();
      setStep('list');
      setSelectedTemplate(null);
    }
  }, [visible, db]);

  const loadData = async () => {
    try {
      const [tpls, exList] = await Promise.all([
        getWorkoutTemplates(db),
        getAllExercises(db),
      ]);
      setTemplates(tpls);
      setAllExercises(exList);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartRoutine = async (tpl: WorkoutTemplate) => {
    try {
      const setsAdded = await loadTemplateIntoSession(db, tpl.id, currentDate);
      onStartRoutine(tpl.name, setsAdded);
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    await deleteWorkoutTemplate(db, id);
    await loadData();
    if (selectedTemplate?.id === id) setSelectedTemplate(null);
  };

  const handleAddExerciseToRoutine = (ex: Exercise) => {
    setSelectedExercises((prev) => [
      ...prev,
      { exercise: ex, targetSets: 3, targetReps: 10, targetWeight: 20 },
    ]);
    setIsExercisePickerOpen(false);
  };

  const handleCreateRoutine = async () => {
    if (!routineName.trim() || selectedExercises.length === 0) return;
    try {
      setIsSubmitting(true);
      await createWorkoutTemplate(
        db,
        routineName.trim(),
        routineCategory,
        routineNotes,
        selectedExercises.map((e) => ({
          exerciseId: e.exercise.id,
          targetSets: e.targetSets,
          targetReps: e.targetReps,
          targetWeight: e.targetWeight,
        }))
      );
      setRoutineName('');
      setRoutineNotes('');
      setSelectedExercises([]);
      await loadData();
      setStep('list');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={step === 'list' ? 'Workout Routines & Splits' : 'Create Custom Routine'}
    >
      {/* STEP 1: ROUTINES LIST */}
      {step === 'list' && (
        <View style={styles.container}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Launch a saved workout split directly into today's session:
          </Text>

          <FlatList
            data={templates}
            keyExtractor={(item) => String(item.id)}
            style={styles.routinesList}
            renderItem={({ item }) => {
              const isSelected = selectedTemplate?.id === item.id;
              return (
                <Card
                  style={[
                    styles.routineCard,
                    { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
                    isSelected && { borderColor: colors.primary },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.routineHeader}
                    onPress={() => setSelectedTemplate(isSelected ? null : item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.routineTitleCol}>
                      <View style={styles.routineBadgeRow}>
                        <View style={[styles.catBadge, { backgroundColor: colors.primaryMuted }]}>
                          <Text style={[styles.catBadgeText, { color: colors.primary }]}>{item.category}</Text>
                        </View>
                        <Text style={[styles.exCountText, { color: colors.textMuted }]}>
                          {item.exercisesCount || 0} exercises
                        </Text>
                      </View>
                      <Text style={[styles.routineName, { color: colors.text }]}>{item.name}</Text>
                      {item.notes ? (
                        <Text style={[styles.routineNotes, { color: colors.textSecondary }]} numberOfLines={1}>
                          {item.notes}
                        </Text>
                      ) : null}
                    </View>

                    <Button
                      title="Start"
                      icon={<Play size={14} color={colors.textInverse} />}
                      variant="primary"
                      size="sm"
                      onPress={() => handleStartRoutine(item)}
                    />
                  </TouchableOpacity>

                  {/* Expanded Exercise Preview */}
                  {isSelected && item.exercises && (
                    <View style={[styles.expandedExercises, { borderTopColor: colors.border }]}>
                      <Text style={[styles.previewHeader, { color: colors.textMuted }]}>
                        EXERCISES IN THIS ROUTINE:
                      </Text>
                      {item.exercises.map((e, idx) => (
                        <View key={idx} style={styles.exPreviewRow}>
                          <Text style={[styles.exPreviewName, { color: colors.text }]}>
                            {idx + 1}. {e.exercise_name}
                          </Text>
                          <Text style={[styles.exPreviewTarget, { color: colors.primary }]}>
                            {e.target_sets} sets × {e.target_reps} reps
                            {e.target_weight > 0 ? ` @ ${e.target_weight}kg` : ''}
                          </Text>
                        </View>
                      ))}

                      <TouchableOpacity
                        style={styles.deleteRoutineBtn}
                        onPress={() => handleDeleteTemplate(item.id)}
                      >
                        <Trash2 size={14} color={colors.danger} />
                        <Text style={[styles.deleteRoutineText, { color: colors.danger }]}>Delete Routine</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </Card>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Layers size={36} color={colors.textDisabled} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No routines saved yet.</Text>
              </View>
            }
          />

          <Button
            title="+ Create New Workout Routine"
            variant="outline"
            size="md"
            onPress={() => setStep('create')}
            style={{ marginTop: spacing.md }}
          />
        </View>
      )}

      {/* STEP 2: CREATE CUSTOM ROUTINE */}
      {step === 'create' && (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Routine Name</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
            placeholder="e.g. Chest & Triceps Blast"
            placeholderTextColor={colors.textDisabled}
            value={routineName}
            onChangeText={setRoutineName}
            autoFocus
          />

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Category</Text>
          <View style={styles.catChipsRow}>
            {['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body', 'Custom'].map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.catChip,
                  { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
                  routineCategory === c && { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
                ]}
                onPress={() => setRoutineCategory(c)}
              >
                <Text style={[styles.catChipText, { color: routineCategory === c ? colors.primary : colors.textSecondary }]}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Routine Notes */}
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Notes (Optional)</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
            placeholder="e.g. Heavy bench focus, superset triceps"
            placeholderTextColor={colors.textDisabled}
            value={routineNotes}
            onChangeText={setRoutineNotes}
          />

          {/* Added Exercises List */}
          <View style={styles.addedHeaderRow}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Exercises ({selectedExercises.length})
            </Text>
            <TouchableOpacity
              style={[styles.addExPill, { backgroundColor: colors.primaryMuted }]}
              onPress={() => setIsExercisePickerOpen(true)}
            >
              <Plus size={14} color={colors.primary} />
              <Text style={[styles.addExPillText, { color: colors.primary }]}>Add Exercise</Text>
            </TouchableOpacity>
          </View>

          {selectedExercises.map((item, idx) => (
            <View key={idx} style={[styles.selectedExRow, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.selectedExName, { color: colors.text }]}>{item.exercise.name}</Text>
                <Text style={[styles.selectedExTarget, { color: colors.primary }]}>
                  {item.targetSets} sets × {item.targetReps} reps @ {item.targetWeight}kg
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedExercises((prev) => prev.filter((_, i) => i !== idx))}
              >
                <Trash2 size={16} color={colors.textDisabled} />
              </TouchableOpacity>
            </View>
          ))}

          {/* Form Actions */}
          <View style={styles.formActionsRow}>
            <Button
              title="Back"
              variant="secondary"
              onPress={() => setStep('list')}
              style={{ flex: 1 }}
            />
            <Button
              title="Save Routine"
              variant="primary"
              onPress={handleCreateRoutine}
              loading={isSubmitting}
              disabled={!routineName.trim() || selectedExercises.length === 0}
              style={{ flex: 1.5 }}
            />
          </View>

          {/* Inline Exercise Picker Dialog */}
          {isExercisePickerOpen && (
            <Card style={[styles.inlinePicker, { backgroundColor: colors.surfaceCard, borderColor: colors.primary }]}>
              <Text style={[styles.inlinePickerTitle, { color: colors.text }]}>Choose Exercise</Text>
              <ScrollView style={{ maxHeight: 220 }}>
                {allExercises.map((ex) => (
                  <TouchableOpacity
                    key={ex.id}
                    style={[styles.pickerItemRow, { borderBottomColor: colors.border }]}
                    onPress={() => handleAddExerciseToRoutine(ex)}
                  >
                    <Text style={[styles.pickerItemName, { color: colors.text }]}>{ex.name}</Text>
                    <Text style={[styles.pickerItemCat, { color: colors.textMuted }]}>{ex.category}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Button
                title="Cancel"
                variant="secondary"
                size="sm"
                onPress={() => setIsExercisePickerOpen(false)}
                style={{ marginTop: spacing.sm }}
              />
            </Card>
          )}
        </ScrollView>
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
  routinesList: {
    maxHeight: 380,
  },
  routineCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  routineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routineTitleCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  routineBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  catBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  catBadgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '800',
  },
  exCountText: {
    ...typography.caption,
    fontSize: 10,
  },
  routineName: {
    ...typography.titleSmall,
    fontSize: 15,
  },
  routineNotes: {
    ...typography.caption,
    marginTop: 2,
  },
  expandedExercises: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  previewHeader: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  exPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  exPreviewName: {
    ...typography.bodySecondary,
    fontSize: 13,
  },
  exPreviewTarget: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  deleteRoutineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    paddingVertical: 4,
  },
  deleteRoutineText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: spacing.xs,
  },
  emptyText: {
    ...typography.bodySecondary,
  },
  inputLabel: {
    ...typography.caption,
    marginBottom: 4,
    marginTop: 8,
    fontWeight: '700',
  },
  textInput: {
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderWidth: 1,
    fontSize: 14,
  },
  catChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 4,
  },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  catChipText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  addedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    marginBottom: 4,
  },
  addExPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  addExPillText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
  },
  selectedExRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: 6,
    borderWidth: 1,
  },
  selectedExName: {
    ...typography.body,
    fontWeight: '700',
  },
  selectedExTarget: {
    ...typography.caption,
    marginTop: 2,
  },
  formActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
  inlinePicker: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    marginTop: spacing.md,
  },
  inlinePickerTitle: {
    ...typography.titleSmall,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  pickerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  pickerItemName: {
    ...typography.bodySecondary,
    fontWeight: '600',
  },
  pickerItemCat: {
    ...typography.caption,
  },
});
