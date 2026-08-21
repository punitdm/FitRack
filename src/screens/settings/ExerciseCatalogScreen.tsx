import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { ArrowLeft, Search, Plus, Trash2, Dumbbell } from 'lucide-react-native';
import * as SQLite from 'expo-sqlite';
import { useTheme, typography, borderRadius, spacing } from '../../theme/theme';
import { Exercise, TrackingType } from '../../types/database';
import {
  getAllExercises,
  addCustomExercise,
  deleteCustomExercise,
} from '../../db/database';
import { CATEGORIES } from '../../db/seedData';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';

interface ExerciseCatalogScreenProps {
  db: SQLite.SQLiteDatabase;
  onBack: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export const ExerciseCatalogScreen: React.FC<ExerciseCatalogScreenProps> = ({
  db,
  onBack,
  onShowToast,
}) => {
  const { colors } = useTheme();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // New Exercise Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExCategory, setNewExCategory] = useState('Chest');
  const [newExTracking, setNewExTracking] = useState<TrackingType>('weight_reps');

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    try {
      const list = await getAllExercises(db);
      setExercises(list);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredExercises = exercises.filter((ex) => {
    const matchesCat = selectedCategory === 'All' || ex.category === selectedCategory;
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
    return matchesCat && matchesSearch;
  });

  const handleAddExercise = async () => {
    if (!newExName.trim()) return;
    try {
      await addCustomExercise(db, newExName.trim(), newExCategory, newExTracking);
      setNewExName('');
      setShowAddForm(false);
      await loadExercises();
      onShowToast('success', `Created ${newExName.trim()}!`);
    } catch (e: any) {
      onShowToast('error', `Failed to create: ${e.message}`);
    }
  };

  const handleDeleteCustom = (id: number, name: string) => {
    Alert.alert('Delete Exercise', `Are you sure you want to delete custom exercise "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteCustomExercise(db, id);
          await loadExercises();
          onShowToast('info', `Deleted ${name}`);
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <ArrowLeft size={22} color={colors.text} />
          <Text style={[styles.backText, { color: colors.text }]}>Settings</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Exercise Catalog</Text>
        <TouchableOpacity
          style={styles.addTriggerBtn}
          onPress={() => setShowAddForm(!showAddForm)}
        >
          <Plus size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Add Custom Form */}
      {showAddForm && (
        <Card style={[styles.addCard, { backgroundColor: colors.surfaceCard, borderColor: colors.primary }]}>
          <Text style={[styles.addCardTitle, { color: colors.text }]}>Create Custom Exercise</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
            placeholder="Exercise Name (e.g. Incline Smith Machine Press)"
            placeholderTextColor={colors.textDisabled}
            value={newExName}
            onChangeText={setNewExName}
            autoFocus
          />

          {/* Category Selector */}
          <Text style={[styles.formSub, { color: colors.textSecondary }]}>Muscle Group:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catChipsScroll}>
            {CATEGORIES.filter((c) => c !== 'All' && c !== 'Custom').map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.formCatChip,
                  { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
                  newExCategory === cat && { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
                ]}
                onPress={() => setNewExCategory(cat)}
              >
                <Text style={[styles.formCatChipText, { color: newExCategory === cat ? colors.primary : colors.textSecondary }]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.addActionsRow}>
            <Button
              title="Cancel"
              variant="secondary"
              size="sm"
              onPress={() => setShowAddForm(false)}
              style={{ flex: 1 }}
            />
            <Button
              title="Save Exercise"
              variant="primary"
              size="sm"
              onPress={handleAddExercise}
              disabled={!newExName.trim()}
              style={{ flex: 1.5 }}
            />
          </View>
        </Card>
      )}

      {/* Search & Categories */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBar, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
          <Search size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search exercises..."
            placeholderTextColor={colors.textDisabled}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilterRow}>
          {CATEGORIES.map((c) => {
            const isSelected = selectedCategory === c;
            return (
              <TouchableOpacity
                key={c}
                style={[
                  styles.filterChip,
                  { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
                  isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setSelectedCategory(c)}
              >
                <Text style={[styles.filterChipText, { color: isSelected ? colors.textInverse : colors.textSecondary }]}>
                  {c}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Exercise List */}
      <FlatList
        data={filteredExercises}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 60 }}
        renderItem={({ item }) => (
          <View style={[styles.exItemRow, { borderBottomColor: colors.border }]}>
            <View style={styles.exItemLeft}>
              <Text style={[styles.exItemName, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.exItemCat, { color: colors.textMuted }]}>{item.category}</Text>
            </View>

            {item.is_custom === 1 && (
              <TouchableOpacity
                style={styles.trashBtn}
                onPress={() => handleDeleteCustom(item.id, item.name)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Trash2 size={16} color={colors.danger} />
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  backText: {
    ...typography.titleSmall,
    fontSize: 15,
  },
  headerTitle: {
    ...typography.titleMedium,
    fontSize: 17,
  },
  addTriggerBtn: {
    padding: 4,
  },
  addCard: {
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
  },
  addCardTitle: {
    ...typography.titleSmall,
    fontSize: 15,
    marginBottom: spacing.xs,
  },
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    fontSize: 14,
    marginBottom: spacing.xs,
  },
  formSub: {
    ...typography.caption,
    fontSize: 11,
    marginTop: 6,
    marginBottom: 4,
  },
  catChipsScroll: {
    marginBottom: spacing.md,
  },
  formCatChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    marginRight: 6,
  },
  formCatChipText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  addActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  searchSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  categoryFilterRow: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginRight: 6,
  },
  filterChipText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  exItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  exItemLeft: {
    flex: 1,
  },
  exItemName: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 15,
  },
  exItemCat: {
    ...typography.caption,
    marginTop: 2,
  },
  trashBtn: {
    padding: 6,
  },
});
