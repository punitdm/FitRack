import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Search,
  Plus,
  Dumbbell,
  ChevronLeft,
  Flame,
  Shield,
  Activity,
  Zap,
  Layers,
} from 'lucide-react-native';
import { useTheme, typography, borderRadius, spacing } from '../../theme/theme';
import { Exercise, TrackingType } from '../../types/database';
import { CATEGORIES } from '../../db/seedData';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

interface AddExerciseModalProps {
  visible: boolean;
  exercises: Exercise[];
  onClose: () => void;
  onSelectExercise: (exercise: Exercise) => void;
  onCreateCustomExercise: (
    name: string,
    category: string,
    trackingType: TrackingType
  ) => Promise<Exercise>;
}

export const AddExerciseModal: React.FC<AddExerciseModalProps> = ({
  visible,
  exercises,
  onClose,
  onSelectExercise,
  onCreateCustomExercise,
}) => {
  const { colors } = useTheme();

  // Step 1: 'categories' | Step 2: 'exercises' | Step 3: 'custom'
  const [step, setStep] = useState<'categories' | 'exercises' | 'custom'>('categories');
  const [selectedCategory, setSelectedCategory] = useState<string>('Chest');
  const [searchQuery, setSearchQuery] = useState('');

  // Custom form
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState('Chest');
  const [customTrackingType, setCustomTrackingType] = useState<TrackingType>('weight_reps');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cat of CATEGORIES) {
      if (cat === 'All') {
        counts[cat] = exercises.length;
      } else if (cat === 'Custom') {
        counts[cat] = exercises.filter((e) => e.is_custom === 1).length;
      } else {
        counts[cat] = exercises.filter(
          (e) => e.category.toLowerCase() === cat.toLowerCase()
        ).length;
      }
    }
    return counts;
  }, [exercises]);

  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      const matchesCategory =
        selectedCategory === 'All'
          ? true
          : selectedCategory === 'Custom'
          ? ex.is_custom === 1
          : ex.category.toLowerCase() === selectedCategory.toLowerCase();

      const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchesCategory && matchesSearch;
    });
  }, [exercises, selectedCategory, searchQuery]);

  const handleCategoryClick = (cat: string) => {
    setSelectedCategory(cat);
    setSearchQuery('');
    setStep('exercises');
  };

  const handleCreateCustom = async () => {
    if (!customName.trim()) return;
    try {
      setIsSubmitting(true);
      const newEx = await onCreateCustomExercise(
        customName.trim(),
        customCategory,
        customTrackingType
      );
      setCustomName('');
      resetAndClose();
      onSelectExercise(newEx);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setStep('categories');
    setSearchQuery('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      onClose={resetAndClose}
      title={
        step === 'categories'
          ? 'Select Body Part'
          : step === 'exercises'
          ? `Select ${selectedCategory} Exercise`
          : 'Create Custom Exercise'
      }
    >
      {/* STEP 1: CHOOSE BODY PART */}
      {step === 'categories' && (
        <View style={styles.bodyPartContainer}>
          <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
            Choose target muscle group to see exercises:
          </Text>

          <View style={styles.categoryGrid}>
            {CATEGORIES.filter((c) => c !== 'All').map((cat) => {
              const catColor = colors.categories[cat] || colors.categories.Custom;
              const count = categoryCounts[cat] || 0;

              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryTile,
                    { backgroundColor: colors.surfaceCard, borderColor: colors.border },
                  ]}
                  onPress={() => handleCategoryClick(cat)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.tileIconBox, { backgroundColor: `${catColor}20` }]}>
                    <Dumbbell size={20} color={catColor} />
                  </View>
                  <Text style={[styles.tileTitle, { color: colors.text }]}>{cat}</Text>
                  <Text style={[styles.tileCount, { color: colors.textMuted }]}>{count} exercises</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Quick All Exercises or Create Custom */}
          <View style={styles.categoryFooterRow}>
            <TouchableOpacity
              style={[
                styles.allExercisesBtn,
                { backgroundColor: colors.surfaceHighlight, borderColor: colors.borderLight },
              ]}
              onPress={() => handleCategoryClick('All')}
              activeOpacity={0.8}
            >
              <Search size={16} color={colors.textSecondary} />
              <Text style={[styles.allExercisesText, { color: colors.text }]}>Browse All ({exercises.length})</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.customAddBtn,
                { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
              ]}
              onPress={() => {
                setCustomCategory('Chest');
                setStep('custom');
              }}
              activeOpacity={0.8}
            >
              <Plus size={16} color={colors.primary} />
              <Text style={[styles.customAddText, { color: colors.primary }]}>+ Custom</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* STEP 2: CHOOSE EXERCISE */}
      {step === 'exercises' && (
        <View style={styles.exerciseListContainer}>
          {/* Back button and Search Bar */}
          <View style={styles.searchRow}>
            <TouchableOpacity
              style={[styles.backBtn, { backgroundColor: colors.surfaceHighlight, borderColor: colors.borderLight }]}
              onPress={() => setStep('categories')}
              activeOpacity={0.7}
            >
              <ChevronLeft size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.searchBar, { backgroundColor: colors.surfaceHighlight, borderColor: colors.borderLight }]}>
              <Search size={16} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={`Search ${selectedCategory} exercises...`}
                placeholderTextColor={colors.textDisabled}
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
              />
            </View>
          </View>

          {/* List of exercises */}
          <FlatList
            data={filteredExercises}
            keyExtractor={(item) => String(item.id)}
            style={styles.flatList}
            contentContainerStyle={styles.flatListContent}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const catColor = colors.categories[item.category] || colors.categories.Custom;
              return (
                <TouchableOpacity
                  style={[styles.exerciseItemRow, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    onSelectExercise(item);
                    resetAndClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.exerciseItemLeft}>
                    <View style={[styles.catColorIndicator, { backgroundColor: catColor }]} />
                    <View>
                      <Text style={[styles.itemTitle, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.itemSub, { color: colors.textMuted }]}>
                        {item.category} • {item.tracking_type.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.plusPill, { backgroundColor: colors.primaryMuted }]}>
                    <Plus size={16} color={colors.primary} />
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Dumbbell size={32} color={colors.textDisabled} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No exercises matching "{searchQuery}"</Text>
                <Button
                  title="+ Create Custom Exercise"
                  variant="outline"
                  size="sm"
                  onPress={() => {
                    setCustomName(searchQuery);
                    setCustomCategory(selectedCategory === 'All' ? 'Chest' : selectedCategory);
                    setStep('custom');
                  }}
                  style={{ marginTop: spacing.md }}
                />
              </View>
            }
          />
        </View>
      )}

      {/* STEP 3: CREATE CUSTOM EXERCISE */}
      {step === 'custom' && (
        <View style={styles.customFormContainer}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Exercise Name</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surfaceHighlight, borderColor: colors.borderLight, color: colors.text }]}
            value={customName}
            placeholder="e.g. Incline DB Hex Press"
            placeholderTextColor={colors.textDisabled}
            onChangeText={setCustomName}
            autoFocus
          />

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPickerRow}>
            {CATEGORIES.filter((c) => c !== 'All' && c !== 'Custom').map((cat) => {
              const isSelected = customCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catChip,
                    { backgroundColor: colors.surfaceHighlight, borderColor: colors.borderLight },
                    isSelected && { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
                  ]}
                  onPress={() => setCustomCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.catChipText, { color: isSelected ? colors.primary : colors.textSecondary }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Tracking Type</Text>
          <View style={styles.trackingTypeRow}>
            {[
              { type: 'weight_reps' as TrackingType, label: 'Weight & Reps' },
              { type: 'distance_time' as TrackingType, label: 'Distance & Time' },
              { type: 'time_only' as TrackingType, label: 'Time Only' },
            ].map((t) => {
              const isSelected = customTrackingType === t.type;
              return (
                <TouchableOpacity
                  key={t.type}
                  style={[
                    styles.trackingTypeBtn,
                    { backgroundColor: colors.surfaceHighlight, borderColor: colors.borderLight },
                    isSelected && { backgroundColor: colors.secondaryMuted, borderColor: colors.secondary },
                  ]}
                  onPress={() => setCustomTrackingType(t.type)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.trackingTypeText,
                      { color: isSelected ? colors.secondary : colors.textSecondary },
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.formActionsRow}>
            <Button
              title="Back"
              variant="secondary"
              onPress={() => setStep('categories')}
              style={{ flex: 1 }}
            />
            <Button
              title="Create & Add"
              variant="primary"
              onPress={handleCreateCustom}
              loading={isSubmitting}
              disabled={!customName.trim()}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  bodyPartContainer: {
    paddingVertical: spacing.xs,
  },
  stepSubtitle: {
    ...typography.caption,
    marginBottom: spacing.md,
    fontSize: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  categoryTile: {
    width: '48%',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    marginBottom: 4,
  },
  tileIconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  tileTitle: {
    ...typography.titleSmall,
    fontSize: 15,
  },
  tileCount: {
    ...typography.caption,
    marginTop: 2,
  },
  categoryFooterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  allExercisesBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    borderWidth: 1,
  },
  allExercisesText: {
    ...typography.bodySecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  customAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderWidth: 1,
  },
  customAddText: {
    ...typography.caption,
    fontWeight: '800',
    fontSize: 12,
  },
  exerciseListContainer: {
    height: 480,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    gap: spacing.sm,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  flatList: {
    flex: 1,
  },
  flatListContent: {
    paddingBottom: spacing.lg,
  },
  exerciseItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  exerciseItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  catColorIndicator: {
    width: 5,
    height: 30,
    borderRadius: 3,
  },
  itemTitle: {
    ...typography.body,
    fontWeight: '700',
  },
  itemSub: {
    ...typography.caption,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  plusPill: {
    width: 30,
    height: 30,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: spacing.xs,
  },
  emptyText: {
    ...typography.bodySecondary,
  },
  customFormContainer: {
    paddingVertical: spacing.sm,
  },
  inputLabel: {
    ...typography.caption,
    marginBottom: 6,
    marginTop: 10,
    fontWeight: '600',
  },
  textInput: {
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    fontSize: 14,
  },
  categoryPickerRow: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    marginRight: 6,
    borderWidth: 1,
  },
  catChipText: {
    ...typography.caption,
  },
  trackingTypeRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 4,
  },
  trackingTypeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  trackingTypeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
  },
  formActionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
});
