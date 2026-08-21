import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import {
  X,
  Edit2,
  Check,
  Plus,
  HelpCircle,
  Link2,
} from 'lucide-react-native';
import * as SQLite from 'expo-sqlite';
import { useTheme, typography, borderRadius, spacing } from '../../theme/theme';
import { SupersetGroup, ExerciseWithLogs } from '../../types/database';
import {
  saveSessionSuperset,
  deleteSessionSuperset,
  assignExercisesToSuperset,
  removeExercisesFromSuperset,
} from '../../db/database';

interface SupersetModalProps {
  visible: boolean;
  db: SQLite.SQLiteDatabase;
  sessionId: number;
  supersets: SupersetGroup[];
  allExercises: ExerciseWithLogs[];
  selectedExerciseIds: number[];
  onClose: () => void;
  onRefresh: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

const COLOR_OPTIONS = ['#A855F7', '#EF4444', '#06B6D4', '#F59E0B', '#22C55E'];

export const SupersetModal: React.FC<SupersetModalProps> = ({
  visible,
  db,
  sessionId,
  supersets,
  allExercises,
  selectedExerciseIds,
  onClose,
  onRefresh,
  onShowToast,
}) => {
  const { colors } = useTheme();

  // Mode: 'list' or 'edit'
  const [mode, setMode] = useState<'list' | 'edit'>('list');
  const [editingSuperset, setEditingSuperset] = useState<SupersetGroup | null>(null);

  // Edit fields
  const [ssName, setSsName] = useState('Superset 1');
  const [ssColor, setSsColor] = useState('#A855F7');
  const [jumpBetween, setJumpBetween] = useState(true);
  const [disableTimer, setDisableTimer] = useState(false);
  const [exerciseIdsInSs, setExerciseIdsInSs] = useState<number[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleOpenNew = () => {
    const nextNum = supersets.length + 1;
    const nextColor = COLOR_OPTIONS[(nextNum - 1) % COLOR_OPTIONS.length];
    setEditingSuperset(null);
    setSsName(`Superset ${nextNum}`);
    setSsColor(nextColor);
    setJumpBetween(true);
    setDisableTimer(false);
    setExerciseIdsInSs(selectedExerciseIds.length > 0 ? [...selectedExerciseIds] : []);
    setMode('edit');
  };

  const handleOpenEdit = (ss: SupersetGroup) => {
    setEditingSuperset(ss);
    setSsName(ss.name);
    setSsColor(ss.color);
    setJumpBetween(ss.jump_between_exercises === 1);
    setDisableTimer(ss.disable_timer === 1);

    const existingIds = allExercises
      .filter((e) => e.supersetId === ss.id)
      .map((e) => e.exercise.id);
    setExerciseIdsInSs(existingIds);
    setMode('edit');
  };

  const handleTapExisting = async (ss: SupersetGroup) => {
    if (selectedExerciseIds.length === 0) return;
    try {
      // Toggle selected exercises into this superset
      const alreadyIn = allExercises
        .filter((e) => e.supersetId === ss.id && selectedExerciseIds.includes(e.exercise.id))
        .map((e) => e.exercise.id);

      if (alreadyIn.length > 0) {
        await removeExercisesFromSuperset(db, sessionId, alreadyIn);
        onShowToast('info', `Removed from ${ss.name}`);
      } else {
        await assignExercisesToSuperset(db, sessionId, ss.id, selectedExerciseIds);
        onShowToast('success', `Added ${selectedExerciseIds.length} exercises to ${ss.name}! 🔗`);
      }
      onRefresh();
      onClose();
    } catch (e: any) {
      onShowToast('error', `Failed: ${e.message}`);
    }
  };

  const handleSaveEdit = async () => {
    if (!ssName.trim()) return;
    try {
      const ssId = editingSuperset ? editingSuperset.id : `ss_${sessionId}_${Date.now()}`;
      const group: SupersetGroup = {
        id: ssId,
        session_id: sessionId,
        name: ssName.trim(),
        color: ssColor,
        jump_between_exercises: jumpBetween ? 1 : 0,
        disable_timer: disableTimer ? 1 : 0,
      };

      await saveSessionSuperset(db, group);

      // Remove unselected, assign selected
      const previouslyIn = allExercises
        .filter((e) => e.supersetId === ssId)
        .map((e) => e.exercise.id);
      const toRemove = previouslyIn.filter((id) => !exerciseIdsInSs.includes(id));
      if (toRemove.length > 0) {
        await removeExercisesFromSuperset(db, sessionId, toRemove);
      }
      if (exerciseIdsInSs.length > 0) {
        await assignExercisesToSuperset(db, sessionId, ssId, exerciseIdsInSs);
      }

      onShowToast('success', `Saved ${ssName.trim()}! 🔗`);
      setMode('list');
      onRefresh();
      onClose();
    } catch (e: any) {
      onShowToast('error', `Error saving: ${e.message}`);
    }
  };

  const handleRemoveExFromList = (exId: number) => {
    setExerciseIdsInSs((prev) => prev.filter((id) => id !== exId));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.dialogCard, { backgroundColor: '#262930', borderColor: '#334155' }]}>
          {/* ================= MODE 1: LIST SUPERSETS (Screenshot 4) ================= */}
          {mode === 'list' && (
            <View>
              <Text style={styles.dialogTitle}>Supersets</Text>
              <Text style={styles.dialogSub}>
                Tap a superset below to add/remove the {selectedExerciseIds.length} selected exercises:
              </Text>

              <ScrollView style={styles.supersetsListScroll}>
                {supersets.map((ss) => {
                  const exercisesInSs = allExercises.filter((e) => e.supersetId === ss.id);
                  return (
                    <TouchableOpacity
                      key={ss.id}
                      style={styles.supersetListItem}
                      onPress={() => handleTapExisting(ss)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.verticalColorBar, { backgroundColor: ss.color }]} />
                      <View style={styles.ssItemInfo}>
                        <Text style={styles.ssItemName}>{ss.name}</Text>
                        <Text style={styles.ssItemExercises} numberOfLines={2}>
                          {exercisesInSs.map((e) => e.exercise.name).join('\n') || 'No exercises linked'}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.editPencilBtn}
                        onPress={() => handleOpenEdit(ss)}
                      >
                        <Edit2 size={16} color="#94A3B8" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}

                {supersets.length === 0 && (
                  <View style={styles.emptySsBox}>
                    <Text style={styles.emptySsText}>No supersets created for today yet.</Text>
                  </View>
                )}
              </ScrollView>

              {/* Action Buttons: Cancel | Copy | New */}
              <View style={styles.dialogButtonsRow}>
                <TouchableOpacity style={styles.dialogActionBtn} onPress={onClose}>
                  <Text style={styles.dialogActionText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.dialogActionBtn} onPress={handleOpenNew}>
                  <Text style={[styles.dialogActionText, { color: '#38BDF8', fontWeight: '800' }]}>New</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ================= MODE 2: NEW / EDIT SUPERSET (Screenshot 5) ================= */}
          {mode === 'edit' && (
            <View>
              <Text style={styles.dialogTitle}>{editingSuperset ? 'Edit Superset' : 'New Superset'}</Text>

              {/* Color & Name Row */}
              <View style={styles.nameColorRow}>
                <TouchableOpacity
                  style={[styles.colorPickerCircle, { backgroundColor: ssColor }]}
                  onPress={() => setShowColorPicker(!showColorPicker)}
                />

                <TextInput
                  style={styles.ssNameInput}
                  value={ssName}
                  onChangeText={setSsName}
                  placeholder="Superset Name"
                  placeholderTextColor="#64748B"
                />
              </View>

              {/* Color Picker Swatches */}
              {showColorPicker && (
                <View style={styles.colorSwatchesRow}>
                  {COLOR_OPTIONS.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.colorSwatch, { backgroundColor: c }, ssColor === c && styles.colorSwatchSelected]}
                      onPress={() => {
                        setSsColor(c);
                        setShowColorPicker(false);
                      }}
                    >
                      {ssColor === c && <Check size={14} color="#FFFFFF" />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Checkboxes */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setJumpBetween(!jumpBetween)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkboxBox, jumpBetween && styles.checkboxBoxChecked]}>
                  {jumpBetween && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                </View>
                <Text style={styles.checkboxLabel}>Jump between exercises</Text>
                <HelpCircle size={16} color="#38BDF8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setDisableTimer(!disableTimer)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkboxBox, disableTimer && styles.checkboxBoxChecked]}>
                  {disableTimer && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                </View>
                <Text style={styles.checkboxLabel}>Disable timer auto-start</Text>
                <HelpCircle size={16} color="#38BDF8" />
              </TouchableOpacity>

              {/* Linked Exercises List */}
              <View style={styles.exercisesInSsBox}>
                {exerciseIdsInSs.map((id) => {
                  const ex = allExercises.find((e) => e.exercise.id === id);
                  if (!ex) return null;
                  return (
                    <View key={id} style={styles.exInSsRow}>
                      <Text style={styles.exInSsName} numberOfLines={1}>
                        {ex.exercise.name}
                      </Text>
                      <TouchableOpacity
                        style={styles.removeExBtn}
                        onPress={() => handleRemoveExFromList(id)}
                      >
                        <X size={16} color="#94A3B8" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>

              {/* Dialog Buttons: Cancel | Save */}
              <View style={styles.dialogButtonsRow}>
                <TouchableOpacity style={styles.dialogActionBtn} onPress={() => setMode('list')}>
                  <Text style={styles.dialogActionText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.dialogActionBtn} onPress={handleSaveEdit}>
                  <Text style={[styles.dialogActionText, { color: '#38BDF8', fontWeight: '800' }]}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 8,
    borderWidth: 1,
    padding: spacing.lg,
  },
  dialogTitle: {
    ...typography.titleMedium,
    fontSize: 18,
    color: '#38BDF8',
    fontWeight: '800',
    marginBottom: 4,
  },
  dialogSub: {
    ...typography.caption,
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: spacing.md,
    lineHeight: 16,
  },
  supersetsListScroll: {
    maxHeight: 220,
    marginVertical: spacing.xs,
  },
  supersetListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2025',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  verticalColorBar: {
    width: 6,
    height: '100%',
    minHeight: 50,
  },
  ssItemInfo: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  ssItemName: {
    ...typography.titleSmall,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  ssItemExercises: {
    ...typography.caption,
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 15,
  },
  editPencilBtn: {
    padding: 12,
  },
  emptySsBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptySsText: {
    ...typography.caption,
    color: '#64748B',
  },
  dialogButtonsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
  },
  dialogActionBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogActionText: {
    ...typography.titleSmall,
    fontSize: 14,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  nameColorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: spacing.sm,
  },
  colorPickerCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  ssNameInput: {
    flex: 1,
    height: 38,
    borderBottomWidth: 1,
    borderBottomColor: '#64748B',
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 4,
  },
  colorSwatchesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: spacing.xs,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  checkboxLabel: {
    flex: 1,
    ...typography.body,
    fontSize: 13,
    color: '#FFFFFF',
  },
  exercisesInSsBox: {
    borderTopWidth: 1,
    borderTopColor: '#334155',
    marginVertical: spacing.sm,
    paddingTop: 4,
    maxHeight: 120,
  },
  exInSsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  exInSsName: {
    ...typography.caption,
    fontSize: 13,
    color: '#E2E8F0',
    flex: 1,
  },
  removeExBtn: {
    padding: 4,
  },
});
