import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Utensils,
  Save,
  CheckCircle2,
  PieChart as PieIcon,
  Flame,
  Info,
  BookOpen,
  Plus,
} from 'lucide-react-native';
import * as SQLite from 'expo-sqlite';
import { useTheme, typography, borderRadius, spacing } from '../theme/theme';
import { MacroLog } from '../types/database';
import { getMacroLog, saveMacroLog } from '../db/database';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { FoodCatalogModal } from '../components/macros/FoodCatalogModal';

interface MacroScreenProps {
  db: SQLite.SQLiteDatabase;
  selectedDate: string;
  onShowToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export const MacroScreen: React.FC<MacroScreenProps> = ({
  db,
  selectedDate,
  onShowToast,
}) => {
  const { colors } = useTheme();

  const [calories, setCalories] = useState<string>('');
  const [protein, setProtein] = useState<string>('');
  const [carbs, setCarbs] = useState<string>('');
  const [fat, setFat] = useState<string>('');
  const [actualFood, setActualFood] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isFoodModalVisible, setIsFoodModalVisible] = useState(false);

  // Load existing macro entry for selectedDate
  const loadData = useCallback(async () => {
    try {
      const log = await getMacroLog(db, selectedDate);
      if (log) {
        setCalories(log.total_calories ? String(log.total_calories) : '');
        setProtein(log.total_protein ? String(log.total_protein) : '');
        setCarbs(log.total_carbs ? String(log.total_carbs) : '');
        setFat(log.total_fat ? String(log.total_fat) : '');
        setActualFood(log.actual_food || '');
      } else {
        setCalories('');
        setProtein('');
        setCarbs('');
        setFat('');
        setActualFood('');
      }
    } catch (e: any) {
      console.error(e);
      onShowToast('error', `Failed to load macros: ${e.message}`);
    }
  }, [db, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Macro calculation metrics
  const pVal = parseFloat(protein) || 0;
  const cVal = parseFloat(carbs) || 0;
  const fVal = parseFloat(fat) || 0;
  const calcCalories = pVal * 4 + cVal * 4 + fVal * 9;

  const totalMacroGrams = pVal + cVal + fVal;
  const pPct = totalMacroGrams > 0 ? Math.round((pVal / totalMacroGrams) * 100) : 0;
  const cPct = totalMacroGrams > 0 ? Math.round((cVal / totalMacroGrams) * 100) : 0;
  const fPct = totalMacroGrams > 0 ? Math.round((fVal / totalMacroGrams) * 100) : 0;

  const handleAutoFillCalories = () => {
    setCalories(String(Math.round(calcCalories)));
  };

  const handleAddFoodFromCatalog = (
    foodName: string,
    fCalories: number,
    fProtein: number,
    fCarbs: number,
    fFat: number
  ) => {
    const nextP = (parseFloat(protein) || 0) + fProtein;
    const nextC = (parseFloat(carbs) || 0) + fCarbs;
    const nextF = (parseFloat(fat) || 0) + fFat;
    const nextCal = (parseInt(calories, 10) || 0) + fCalories;

    setProtein(String(Math.round(nextP * 10) / 10));
    setCarbs(String(Math.round(nextC * 10) / 10));
    setFat(String(Math.round(nextF * 10) / 10));
    setCalories(String(nextCal));

    setActualFood((prev) => (prev ? `${prev}\n• ${foodName}` : `• ${foodName}`));
    onShowToast('success', `Added ${foodName}! (+${fProtein}g protein)`);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const log: MacroLog = {
        date: selectedDate,
        total_calories: parseInt(calories, 10) || Math.round(calcCalories) || 0,
        total_protein: parseFloat(protein) || 0,
        total_carbs: parseFloat(carbs) || 0,
        total_fat: parseFloat(fat) || 0,
        actual_food: actualFood.trim(),
      };

      await saveMacroLog(db, log);
      onShowToast('success', 'Nutrition saved successfully! 🥗');
    } catch (e: any) {
      console.error(e);
      onShowToast('error', `Failed to save macros: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Summary Card */}
        <Card style={[styles.summaryCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <View style={styles.summaryTopRow}>
            <View>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>TOTAL CALORIES</Text>
              <Text style={[styles.summaryCalories, { color: colors.text }]}>
                {calories || (calcCalories > 0 ? Math.round(calcCalories) : '0')}
                <Text style={[styles.unit, { color: colors.textSecondary }]}> kcal</Text>
              </Text>
            </View>

            {calcCalories > 0 && calories !== String(Math.round(calcCalories)) && (
              <TouchableOpacity
                style={[styles.autoFillBtn, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}
                onPress={handleAutoFillCalories}
                activeOpacity={0.7}
              >
                <Text style={[styles.autoFillText, { color: colors.primary }]}>Use Calc ({Math.round(calcCalories)})</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Macro Progress Ratio Bar */}
          <View style={[styles.ratioBarTrack, { backgroundColor: colors.surfaceHighlight }]}>
            <View style={[styles.ratioSegment, { width: `${pPct}%`, backgroundColor: colors.primary }]} />
            <View style={[styles.ratioSegment, { width: `${cPct}%`, backgroundColor: colors.secondary }]} />
            <View style={[styles.ratioSegment, { width: `${fPct}%`, backgroundColor: colors.accent }]} />
          </View>

          {/* Ratio Legend */}
          <View style={styles.ratioLegendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Protein: {pVal}g ({pPct}%)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.secondary }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Carbs: {cVal}g ({cPct}%)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Fat: {fVal}g ({fPct}%)</Text>
            </View>
          </View>
        </Card>

        {/* Macro Inputs Card with Food Catalog Shortcut */}
        <Card style={[styles.inputsCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Macro Targets / Actuals</Text>
            <TouchableOpacity
              style={[styles.foodCatalogBtn, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}
              onPress={() => setIsFoodModalVisible(true)}
              activeOpacity={0.7}
            >
              <BookOpen size={14} color={colors.primary} />
              <Text style={[styles.foodCatalogBtnText, { color: colors.primary }]}>Food Database</Text>
            </TouchableOpacity>
          </View>

          {/* Calories Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Total Calories (kcal)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
              keyboardType="number-pad"
              value={calories}
              onChangeText={setCalories}
              placeholder="e.g. 2200"
              placeholderTextColor={colors.textDisabled}
            />
          </View>

          {/* 3 Macro Cols: Protein, Carbs, Fat */}
          <View style={styles.macroInputsRow}>
            <View style={styles.macroInputCol}>
              <Text style={[styles.inputLabel, { color: colors.primary }]}>Protein (g)</Text>
              <TextInput
                style={[
                  styles.textInput,
                  styles.macroInput,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text },
                  pVal > 0 && { borderColor: colors.primary },
                ]}
                keyboardType="decimal-pad"
                value={protein}
                onChangeText={setProtein}
                placeholder="160"
                placeholderTextColor={colors.textDisabled}
              />
            </View>

            <View style={styles.macroInputCol}>
              <Text style={[styles.inputLabel, { color: colors.secondary }]}>Carbs (g)</Text>
              <TextInput
                style={[
                  styles.textInput,
                  styles.macroInput,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text },
                  cVal > 0 && { borderColor: colors.secondary },
                ]}
                keyboardType="decimal-pad"
                value={carbs}
                onChangeText={setCarbs}
                placeholder="220"
                placeholderTextColor={colors.textDisabled}
              />
            </View>

            <View style={styles.macroInputCol}>
              <Text style={[styles.inputLabel, { color: colors.accent }]}>Fat (g)</Text>
              <TextInput
                style={[
                  styles.textInput,
                  styles.macroInput,
                  { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text },
                  fVal > 0 && { borderColor: colors.accent },
                ]}
                keyboardType="decimal-pad"
                value={fat}
                onChangeText={setFat}
                placeholder="65"
                placeholderTextColor={colors.textDisabled}
              />
            </View>
          </View>
        </Card>

        {/* Actual Food Log Card */}
        <Card style={[styles.foodCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <View style={styles.foodCardHeader}>
            <Utensils size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>Meal Notes / Actual Foods</Text>
          </View>
          <TextInput
            style={[styles.foodInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
            multiline
            numberOfLines={4}
            value={actualFood}
            onChangeText={setActualFood}
            placeholder="e.g. Breakfast: 4 eggs, oats with scoop whey&#10;Lunch: Chicken breast, 200g white rice&#10;Dinner: Salmon, sweet potato, salad"
            placeholderTextColor={colors.textDisabled}
          />
        </Card>

        {/* Save Button */}
        <Button
          title="Save Daily Nutrition"
          icon={<Save size={18} color={colors.textInverse} />}
          variant="primary"
          size="lg"
          onPress={handleSave}
          loading={isSaving}
          style={styles.saveBtn}
        />
      </ScrollView>

      {/* Offline Custom Food Database Modal */}
      <FoodCatalogModal
        visible={isFoodModalVisible}
        db={db}
        onClose={() => setIsFoodModalVisible(false)}
        onAddFoodToLog={handleAddFoodFromCatalog}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 40,
    gap: spacing.md,
  },
  summaryCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  summaryLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  summaryCalories: {
    ...typography.mono,
    fontSize: 30,
    marginTop: 2,
  },
  unit: {
    fontSize: 14,
    fontWeight: '500',
  },
  autoFillBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  autoFillText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  ratioBarTrack: {
    height: 10,
    borderRadius: 5,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  ratioSegment: {
    height: '100%',
  },
  ratioLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...typography.caption,
    fontSize: 10,
  },
  inputsCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.titleSmall,
    fontSize: 15,
  },
  foodCatalogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  foodCatalogBtnText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 11,
    marginBottom: 6,
  },
  textInput: {
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    fontSize: 15,
  },
  macroInputsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  macroInputCol: {
    flex: 1,
  },
  macroInput: {
    ...typography.mono,
    textAlign: 'center',
  },
  foodCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
  },
  foodCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  foodInput: {
    ...typography.bodySecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 100,
    borderWidth: 1,
    textAlignVertical: 'top',
  },
  saveBtn: {
    width: '100%',
    marginTop: spacing.xs,
  },
});
