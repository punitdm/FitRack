import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Search, Plus, Utensils, Trash2, Check, Scale } from 'lucide-react-native';
import * as SQLite from 'expo-sqlite';
import { useTheme, typography, borderRadius, spacing } from '../../theme/theme';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { CustomFood } from '../../types/database';
import { getCustomFoods, addCustomFood, deleteCustomFood } from '../../db/database';

interface FoodCatalogModalProps {
  visible: boolean;
  db: SQLite.SQLiteDatabase;
  onClose: () => void;
  onAddFoodToLog: (foodName: string, calories: number, protein: number, carbs: number, fat: number) => void;
}

export const FoodCatalogModal: React.FC<FoodCatalogModalProps> = ({
  visible,
  db,
  onClose,
  onAddFoodToLog,
}) => {
  const { colors } = useTheme();

  const [step, setStep] = useState<'list' | 'portion' | 'create'>('list');
  const [foods, setFoods] = useState<CustomFood[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<CustomFood | null>(null);

  // Portion multiplier
  const [quantityGrams, setQuantityGrams] = useState<string>('100');

  // Create new custom food form
  const [newFoodName, setNewFoodName] = useState('');
  const [newServingSize, setNewServingSize] = useState('100');
  const [newCalories, setNewCalories] = useState('');
  const [newProtein, setNewProtein] = useState('');
  const [newCarbs, setNewCarbs] = useState('');
  const [newFat, setNewFat] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadFoods();
      setStep('list');
      setSelectedFood(null);
      setSearchQuery('');
    }
  }, [visible, db]);

  const loadFoods = async (q: string = '') => {
    try {
      const list = await getCustomFoods(db, q);
      setFoods(list);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    loadFoods(text);
  };

  const handleSelectFood = (food: CustomFood) => {
    setSelectedFood(food);
    setQuantityGrams(String(food.serving_size_g || 100));
    setStep('portion');
  };

  // Calculated macros for selected portion
  const grams = parseFloat(quantityGrams) || 0;
  const ratio = selectedFood ? grams / (selectedFood.serving_size_g || 100) : 1;
  const calcCal = selectedFood ? Math.round(selectedFood.calories * ratio) : 0;
  const calcP = selectedFood ? Math.round(selectedFood.protein * ratio * 10) / 10 : 0;
  const calcC = selectedFood ? Math.round(selectedFood.carbs * ratio * 10) / 10 : 0;
  const calcF = selectedFood ? Math.round(selectedFood.fat * ratio * 10) / 10 : 0;

  const handleConfirmAdd = () => {
    if (!selectedFood) return;
    const foodEntry = `${selectedFood.name} (${grams}g)`;
    onAddFoodToLog(foodEntry, calcCal, calcP, calcC, calcF);
    onClose();
  };

  const handleCreateFood = async () => {
    if (!newFoodName.trim()) return;
    try {
      setIsSubmitting(true);
      const foodId = await addCustomFood(
        db,
        newFoodName.trim(),
        parseFloat(newServingSize) || 100,
        parseInt(newCalories, 10) || 0,
        parseFloat(newProtein) || 0,
        parseFloat(newCarbs) || 0,
        parseFloat(newFat) || 0
      );

      const created: CustomFood = {
        id: foodId,
        name: newFoodName.trim(),
        serving_size_g: parseFloat(newServingSize) || 100,
        calories: parseInt(newCalories, 10) || 0,
        protein: parseFloat(newProtein) || 0,
        carbs: parseFloat(newCarbs) || 0,
        fat: parseFloat(newFat) || 0,
      };

      setNewFoodName('');
      setNewCalories('');
      setNewProtein('');
      setNewCarbs('');
      setNewFat('');
      await loadFoods();
      handleSelectFood(created);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFood = async (id: number) => {
    await deleteCustomFood(db, id);
    await loadFoods(searchQuery);
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={
        step === 'list'
          ? 'Food Database & Presets'
          : step === 'portion'
          ? `Portion: ${selectedFood?.name}`
          : 'Create Custom Food'
      }
    >
      {/* STEP 1: FOOD LIST & SEARCH */}
      {step === 'list' && (
        <View style={styles.container}>
          <View style={[styles.searchBar, { backgroundColor: colors.surfaceHighlight, borderColor: colors.borderLight }]}>
            <Search size={16} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search foods (e.g. Chicken, Oats, Eggs)..."
              placeholderTextColor={colors.textDisabled}
              value={searchQuery}
              onChangeText={handleSearchChange}
            />
          </View>

          <FlatList
            data={foods}
            keyExtractor={(item) => String(item.id)}
            style={styles.foodList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.foodItemRow, { borderBottomColor: colors.border }]}
                onPress={() => handleSelectFood(item)}
                activeOpacity={0.7}
              >
                <View style={styles.foodInfoLeft}>
                  <Text style={[styles.foodName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.foodMacrosSub, { color: colors.textMuted }]}>
                    Per {item.serving_size_g}g • <Text style={{ color: colors.primary }}>{item.protein}g P</Text> •{' '}
                    <Text style={{ color: colors.secondary }}>{item.carbs}g C</Text> •{' '}
                    <Text style={{ color: colors.accent }}>{item.fat}g F</Text> •{' '}
                    <Text style={{ color: colors.textSecondary }}>{item.calories} kcal</Text>
                  </Text>
                </View>

                <View style={[styles.plusBadge, { backgroundColor: colors.primaryMuted }]}>
                  <Plus size={16} color={colors.primary} />
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Utensils size={32} color={colors.textDisabled} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No food matching "{searchQuery}"
                </Text>
              </View>
            }
          />

          <Button
            title="+ Create New Custom Food"
            variant="outline"
            size="md"
            onPress={() => setStep('create')}
            style={styles.newFoodBtn}
          />
        </View>
      )}

      {/* STEP 2: PORTION CALCULATOR */}
      {step === 'portion' && selectedFood && (
        <View style={styles.container}>
          <Card style={[styles.portionCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={[styles.portionFoodTitle, { color: colors.text }]}>{selectedFood.name}</Text>
            <Text style={[styles.portionFoodSub, { color: colors.textMuted }]}>
              Base: {selectedFood.calories} kcal / {selectedFood.serving_size_g}g
            </Text>

            {/* Grams Input */}
            <View style={styles.gramInputRow}>
              <Scale size={20} color={colors.primary} />
              <TextInput
                style={[styles.gramInput, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border, color: colors.text }]}
                keyboardType="decimal-pad"
                value={quantityGrams}
                onChangeText={setQuantityGrams}
                autoFocus
              />
              <Text style={[styles.gramUnit, { color: colors.textSecondary }]}>grams</Text>
            </View>

            {/* Stepper shortcuts */}
            <View style={styles.portionShortcutsRow}>
              {[50, 100, 150, 200, 250].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[
                    styles.portionShortcutChip,
                    { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
                    quantityGrams === String(g) && { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
                  ]}
                  onPress={() => setQuantityGrams(String(g))}
                >
                  <Text
                    style={[
                      styles.portionShortcutText,
                      { color: quantityGrams === String(g) ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    {g}g
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Computed Macro Results Grid */}
            <View style={[styles.computedGrid, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
              <View style={styles.computedCell}>
                <Text style={[styles.computedVal, { color: colors.text }]}>{calcCal}</Text>
                <Text style={[styles.computedKey, { color: colors.textMuted }]}>Calories</Text>
              </View>
              <View style={styles.computedCell}>
                <Text style={[styles.computedVal, { color: colors.primary }]}>{calcP}g</Text>
                <Text style={[styles.computedKey, { color: colors.textMuted }]}>Protein</Text>
              </View>
              <View style={styles.computedCell}>
                <Text style={[styles.computedVal, { color: colors.secondary }]}>{calcC}g</Text>
                <Text style={[styles.computedKey, { color: colors.textMuted }]}>Carbs</Text>
              </View>
              <View style={styles.computedCell}>
                <Text style={[styles.computedVal, { color: colors.accent }]}>{calcF}g</Text>
                <Text style={[styles.computedKey, { color: colors.textMuted }]}>Fat</Text>
              </View>
            </View>
          </Card>

          <View style={styles.portionActions}>
            <Button
              title="Back"
              variant="secondary"
              onPress={() => setStep('list')}
              style={{ flex: 1 }}
            />
            <Button
              title="Add to Daily Log"
              icon={<Check size={16} color={colors.textInverse} />}
              variant="primary"
              onPress={handleConfirmAdd}
              style={{ flex: 1.5 }}
            />
          </View>
        </View>
      )}

      {/* STEP 3: CREATE CUSTOM FOOD */}
      {step === 'create' && (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Food Name</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
            placeholder="e.g. Grass-fed Ground Beef (85/15)"
            placeholderTextColor={colors.textDisabled}
            value={newFoodName}
            onChangeText={setNewFoodName}
            autoFocus
          />

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Serving Size (grams)</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
            placeholder="100"
            placeholderTextColor={colors.textDisabled}
            keyboardType="decimal-pad"
            value={newServingSize}
            onChangeText={setNewServingSize}
          />

          <View style={styles.formMacroRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Calories</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                placeholder="215"
                placeholderTextColor={colors.textDisabled}
                keyboardType="number-pad"
                value={newCalories}
                onChangeText={setNewCalories}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.primary }]}>Protein (g)</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                placeholder="22"
                placeholderTextColor={colors.textDisabled}
                keyboardType="decimal-pad"
                value={newProtein}
                onChangeText={setNewProtein}
              />
            </View>
          </View>

          <View style={styles.formMacroRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.secondary }]}>Carbs (g)</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                placeholder="0"
                placeholderTextColor={colors.textDisabled}
                keyboardType="decimal-pad"
                value={newCarbs}
                onChangeText={setNewCarbs}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.inputLabel, { color: colors.accent }]}>Fat (g)</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                placeholder="14"
                placeholderTextColor={colors.textDisabled}
                keyboardType="decimal-pad"
                value={newFat}
                onChangeText={setNewFat}
              />
            </View>
          </View>

          <View style={styles.formActions}>
            <Button
              title="Back"
              variant="secondary"
              onPress={() => setStep('list')}
              style={{ flex: 1 }}
            />
            <Button
              title="Save Food"
              variant="primary"
              onPress={handleCreateFood}
              loading={isSubmitting}
              disabled={!newFoodName.trim()}
              style={{ flex: 1.5 }}
            />
          </View>
        </ScrollView>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    maxHeight: 500,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    gap: spacing.sm,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  foodList: {
    maxHeight: 340,
  },
  foodItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  foodInfoLeft: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  foodName: {
    ...typography.body,
    fontWeight: '700',
  },
  foodMacrosSub: {
    ...typography.caption,
    marginTop: 2,
  },
  plusBadge: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyList: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: spacing.xs,
  },
  emptyText: {
    ...typography.bodySecondary,
  },
  newFoodBtn: {
    marginTop: spacing.md,
  },
  portionCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  portionFoodTitle: {
    ...typography.titleMedium,
    fontSize: 17,
  },
  portionFoodSub: {
    ...typography.caption,
    marginTop: 2,
  },
  gramInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  gramInput: {
    ...typography.mono,
    fontSize: 24,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    textAlign: 'center',
    width: 100,
  },
  gramUnit: {
    ...typography.titleSmall,
  },
  portionShortcutsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.md,
  },
  portionShortcutChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  portionShortcutText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  computedGrid: {
    flexDirection: 'row',
    width: '100%',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    justifyContent: 'space-around',
  },
  computedCell: {
    alignItems: 'center',
  },
  computedVal: {
    ...typography.mono,
    fontSize: 15,
  },
  computedKey: {
    ...typography.caption,
    fontSize: 10,
    marginTop: 2,
  },
  portionActions: {
    flexDirection: 'row',
    gap: spacing.sm,
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
  formMacroRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
});
