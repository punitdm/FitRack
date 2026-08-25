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
  ArrowLeft,
  Utensils,
  Save,
  Plus,
  Droplets,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import * as SQLite from 'expo-sqlite';
import { useTheme, typography, borderRadius, spacing } from '../theme/theme';
import { MacroLog, HydrationLog } from '../types/database';
import {
  getMacroLog,
  saveMacroLog,
  getHydrationLog,
  saveHydrationLog,
} from '../db/database';
import { formatDisplayDate, shiftDate, getTodayISO } from '../utils/dateUtils';
import { Card } from '../components/common/Card';
import { FoodCatalogModal } from '../components/macros/FoodCatalogModal';

interface MacroScreenProps {
  db: SQLite.SQLiteDatabase;
  selectedDate: string;
  onBackToHub?: () => void;
  onDateChange?: (newDate: string) => void;
  onOpenDatePicker?: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export const MacroScreen: React.FC<MacroScreenProps> = ({
  db,
  selectedDate,
  onBackToHub,
  onDateChange,
  onOpenDatePicker,
  onShowToast,
}) => {
  const { colors, isDark } = useTheme();

  const [calories, setCalories] = useState<string>('');
  const [protein, setProtein] = useState<string>('');
  const [carbs, setCarbs] = useState<string>('');
  const [fat, setFat] = useState<string>('');
  const [actualFood, setActualFood] = useState<string>('');
  const [isFoodModalVisible, setIsFoodModalVisible] = useState(false);
  const [targetCalories, setTargetCalories] = useState<number>(2400);

  // Water
  const [waterMl, setWaterMl] = useState<number>(0);
  const [waterTargetMl, setWaterTargetMl] = useState<number>(3500);

  const loadData = useCallback(async () => {
    try {
      const [log, hydro] = await Promise.all([
        getMacroLog(db, selectedDate),
        getHydrationLog(db, selectedDate),
      ]);

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

      if (hydro) {
        setWaterMl(hydro.amount_ml || 0);
        setWaterTargetMl(hydro.target_ml || 3500);
      } else {
        setWaterMl(0);
      }
    } catch (e: any) {
      console.error(e);
    }
  }, [db, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const pVal = parseFloat(protein) || 0;
  const cVal = parseFloat(carbs) || 0;
  const fVal = parseFloat(fat) || 0;
  const calcCalories = pVal * 4 + cVal * 4 + fVal * 9;
  const curCal = parseInt(calories, 10) || Math.round(calcCalories) || 0;
  const remainingCal = Math.max(0, targetCalories - curCal);

  const handlePrevDay = () => {
    if (onDateChange) {
      onDateChange(shiftDate(selectedDate, -1));
    }
  };

  const handleNextDay = () => {
    if (onDateChange) {
      onDateChange(shiftDate(selectedDate, 1));
    }
  };

  const handleAddFoodFromCatalog = async (
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

    const updatedFood = actualFood ? `${actualFood}\n• ${foodName}` : `• ${foodName}`;
    setActualFood(updatedFood);

    // Auto save immediately
    await saveMacroLog(db, {
      date: selectedDate,
      total_calories: nextCal,
      total_protein: nextP,
      total_carbs: nextC,
      total_fat: nextF,
      actual_food: updatedFood,
    });

    onShowToast('success', `Added ${foodName} (+${fProtein}g Pro)`);
  };

  const handleAddWater = async (amount: number) => {
    const nextAmount = waterMl + amount;
    setWaterMl(nextAmount);
    await saveHydrationLog(db, selectedDate, nextAmount, waterTargetMl);
    onShowToast('info', `Water: ${(nextAmount / 1000).toFixed(2)} L 💧`);
  };

  const handleManualSave = async () => {
    await saveMacroLog(db, {
      date: selectedDate,
      total_calories: parseInt(calories, 10) || Math.round(calcCalories) || 0,
      total_protein: parseFloat(protein) || 0,
      total_carbs: parseFloat(carbs) || 0,
      total_fat: parseFloat(fat) || 0,
      actual_food: actualFood.trim(),
    });
    onShowToast('success', 'Nutrition log saved! 🥗');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* 1. TOP APP BAR */}
      <View style={[styles.topAppBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {onBackToHub ? (
          <TouchableOpacity style={styles.backBtn} onPress={onBackToHub} activeOpacity={0.7}>
            <ArrowLeft size={20} color="#F59E0B" />
            <Text style={styles.backBtnText}>Hub</Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.titleText, { color: colors.text }]}>Nutrition</Text>
        )}

        {/* Date Navigator with Calendar Trigger */}
        <View style={[styles.dateNavWrapper, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.arrowBtn} onPress={handlePrevDay} activeOpacity={0.6}>
            <ChevronLeft size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.dateCenterBtn}
            onPress={onOpenDatePicker}
            activeOpacity={0.7}
          >
            <Calendar size={14} color="#F59E0B" />
            <Text style={[styles.dateText, { color: colors.text }]}>
              {formatDisplayDate(selectedDate)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.arrowBtn} onPress={handleNextDay} activeOpacity={0.6}>
            <ChevronRight size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.catalogBtn, { backgroundColor: isDark ? '#F59E0B20' : '#FEF3C7', borderColor: '#F59E0B' }]}
          onPress={() => setIsFoodModalVisible(true)}
          activeOpacity={0.7}
        >
          <BookOpen size={18} color="#F59E0B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ================= 2. CALORIE HERO CARD ================= */}
        <View
          style={[
            styles.calorieHeroCard,
            {
              backgroundColor: isDark ? '#181512' : '#FFFDF7',
              borderColor: isDark ? '#F59E0B' : '#FCD34D',
            },
          ]}
        >
          <View style={styles.ringCenterBox}>
            <Text style={[styles.ringSubLabel, { color: colors.textMuted }]}>CALORIES CONSUMED</Text>
            <Text style={[styles.ringCalBig, { color: colors.text }]}>
              {curCal.toLocaleString()}{' '}
              <Text style={{ fontSize: 16, color: colors.textMuted }}>/ {targetCalories} kcal</Text>
            </Text>
            <Text style={[styles.remainingText, { color: remainingCal > 0 ? '#F59E0B' : '#22C55E' }]}>
              {remainingCal > 0 ? `${remainingCal} kcal remaining` : 'Target met! 🎯'}
            </Text>
          </View>

          {/* Macro Progress Bars */}
          <View style={styles.macroBarsRow}>
            <View style={styles.macroCol}>
              <View style={styles.macroColHeader}>
                <Text style={[styles.macroName, { color: colors.textMuted }]}>PROTEIN</Text>
                <Text style={[styles.macroNums, { color: colors.text }]}>{pVal}g / 180g</Text>
              </View>
              <View style={[styles.miniTrack, { backgroundColor: colors.surfaceHighlight }]}>
                <View
                  style={[
                    styles.miniFill,
                    {
                      width: `${Math.min(100, (pVal / 180) * 100)}%`,
                      backgroundColor: '#38BDF8',
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.macroCol}>
              <View style={styles.macroColHeader}>
                <Text style={[styles.macroName, { color: colors.textMuted }]}>CARBS</Text>
                <Text style={[styles.macroNums, { color: colors.text }]}>{cVal}g / 250g</Text>
              </View>
              <View style={[styles.miniTrack, { backgroundColor: colors.surfaceHighlight }]}>
                <View
                  style={[
                    styles.miniFill,
                    {
                      width: `${Math.min(100, (cVal / 250) * 100)}%`,
                      backgroundColor: '#F59E0B',
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.macroCol}>
              <View style={styles.macroColHeader}>
                <Text style={[styles.macroName, { color: colors.textMuted }]}>FAT</Text>
                <Text style={[styles.macroNums, { color: colors.text }]}>{fVal}g / 75g</Text>
              </View>
              <View style={[styles.miniTrack, { backgroundColor: colors.surfaceHighlight }]}>
                <View
                  style={[
                    styles.miniFill,
                    {
                      width: `${Math.min(100, (fVal / 75) * 100)}%`,
                      backgroundColor: '#EC4899',
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* ================= 3. QUICK MEAL TILES (Indian Diet) ================= */}
        <View style={styles.mealsSection}>
          <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>LOGGED MEALS</Text>

          {/* Food Items List */}
          {actualFood ? (
            <View
              style={[
                styles.foodListBox,
                {
                  backgroundColor: isDark ? '#131110' : '#FFFFFF',
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.foodListText, { color: colors.text }]}>{actualFood}</Text>
            </View>
          ) : (
            <View
              style={[
                styles.emptyFoodBox,
                {
                  backgroundColor: isDark ? '#131110' : '#FFFFFF',
                  borderColor: colors.border,
                },
              ]}
            >
              <Utensils size={24} color={colors.textMuted} />
              <Text style={[styles.emptyFoodText, { color: colors.textMuted }]}>
                No meals logged yet. Tap '+ Add Food' below to pick Roti, Dahi, Daal, Whey, Chicken, etc.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.addFoodMainBtn, { backgroundColor: '#F59E0B' }]}
            onPress={() => setIsFoodModalVisible(true)}
            activeOpacity={0.8}
          >
            <Plus size={18} color="#FFFFFF" strokeWidth={3} />
            <Text style={styles.addFoodBtnText}>+ Add Food from Indian Catalog</Text>
          </TouchableOpacity>
        </View>

        {/* ================= 4. HYDRATION TRACKER ================= */}
        <View
          style={[
            styles.waterCard,
            {
              backgroundColor: isDark ? '#0E1722' : '#F0F9FF',
              borderColor: isDark ? '#1E3A5F' : '#BAE6FD',
            },
          ]}
        >
          <View style={styles.waterHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Droplets size={20} color="#0284C7" />
              <Text style={[styles.waterTitle, { color: isDark ? '#38BDF8' : '#0284C7' }]}>
                {(waterMl / 1000).toFixed(2)}L{' '}
                <Text style={{ fontSize: 13, color: colors.textMuted }}>
                  / {(waterTargetMl / 1000).toFixed(1)}L
                </Text>
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.waterAddPill, { backgroundColor: isDark ? '#38BDF820' : '#E0F2FE' }]}
              onPress={() => handleAddWater(250)}
              activeOpacity={0.7}
            >
              <Text style={[styles.waterAddPillText, { color: isDark ? '#38BDF8' : '#0284C7' }]}>
                +250 ml
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.waterTrack, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
            <View
              style={[
                styles.waterFill,
                {
                  width: `${Math.min(100, (waterMl / waterTargetMl) * 100)}%`,
                  backgroundColor: isDark ? '#38BDF8' : '#0284C7',
                },
              ]}
            />
          </View>
        </View>

        {/* ================= 5. MANUAL EDIT INPUTS ================= */}
        <View
          style={[
            styles.manualSection,
            {
              backgroundColor: isDark ? '#131110' : '#FFFFFF',
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>MANUAL MACRO OVERRIDE</Text>

          <View style={styles.manualRow}>
            <View style={styles.manualCol}>
              <Text style={[styles.manualLabel, { color: colors.textMuted }]}>CALORIES</Text>
              <TextInput
                style={[
                  styles.manualInput,
                  {
                    backgroundColor: isDark ? '#1F1A14' : '#F8FAFC',
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                keyboardType="number-pad"
                value={calories}
                onChangeText={setCalories}
                placeholder="2400"
                placeholderTextColor={colors.textDisabled}
              />
            </View>

            <View style={styles.manualCol}>
              <Text style={[styles.manualLabel, { color: colors.textMuted }]}>PROTEIN (G)</Text>
              <TextInput
                style={[
                  styles.manualInput,
                  {
                    backgroundColor: isDark ? '#1F1A14' : '#F8FAFC',
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                keyboardType="decimal-pad"
                value={protein}
                onChangeText={setProtein}
                placeholder="160"
                placeholderTextColor={colors.textDisabled}
              />
            </View>

            <View style={styles.manualCol}>
              <Text style={[styles.manualLabel, { color: colors.textMuted }]}>CARBS (G)</Text>
              <TextInput
                style={[
                  styles.manualInput,
                  {
                    backgroundColor: isDark ? '#1F1A14' : '#F8FAFC',
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                keyboardType="decimal-pad"
                value={carbs}
                onChangeText={setCarbs}
                placeholder="250"
                placeholderTextColor={colors.textDisabled}
              />
            </View>

            <View style={styles.manualCol}>
              <Text style={[styles.manualLabel, { color: colors.textMuted }]}>FAT (G)</Text>
              <TextInput
                style={[
                  styles.manualInput,
                  {
                    backgroundColor: isDark ? '#1F1A14' : '#F8FAFC',
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                keyboardType="decimal-pad"
                value={fat}
                onChangeText={setFat}
                placeholder="70"
                placeholderTextColor={colors.textDisabled}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.saveManualBtn,
              {
                backgroundColor: isDark ? '#26201A' : '#FEF3C7',
                borderColor: '#F59E0B',
              },
            ]}
            onPress={handleManualSave}
            activeOpacity={0.7}
          >
            <Save size={16} color="#F59E0B" />
            <Text style={styles.saveManualText}>Save Nutrition Log</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Food Database Catalog Modal */}
      <FoodCatalogModal
        visible={isFoodModalVisible}
        db={db}
        onClose={() => setIsFoodModalVisible(false)}
        onSelectFood={handleAddFoodFromCatalog}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topAppBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  backBtnText: {
    ...typography.titleSmall,
    color: '#F59E0B',
    fontWeight: '700',
    fontSize: 14,
  },
  titleText: {
    ...typography.titleMedium,
  },
  dateNavWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  arrowBtn: {
    padding: 6,
  },
  dateCenterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  dateText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
  },
  catalogBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
    gap: 16,
  },
  calorieHeroCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1.5,
  },
  ringCenterBox: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  ringSubLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  ringCalBig: {
    ...typography.mono,
    fontSize: 38,
    fontWeight: '900',
    marginVertical: 2,
  },
  remainingText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
  },
  macroBarsRow: {
    marginTop: 14,
    gap: 10,
  },
  macroCol: {
    gap: 4,
  },
  macroColHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroName: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '800',
  },
  macroNums: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  miniTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  miniFill: {
    height: '100%',
    borderRadius: 3,
  },
  mealsSection: {
    gap: 8,
  },
  sectionHeader: {
    ...typography.titleSmall,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  foodListBox: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  foodListText: {
    fontSize: 14,
    lineHeight: 22,
  },
  emptyFoodBox: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  emptyFoodText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  addFoodMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 16,
    marginTop: 4,
  },
  addFoodBtnText: {
    ...typography.titleSmall,
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  waterCard: {
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  waterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  waterTitle: {
    ...typography.mono,
    fontSize: 18,
    fontWeight: '800',
  },
  waterAddPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  waterAddPillText: {
    ...typography.caption,
    fontWeight: '800',
    fontSize: 11,
  },
  waterTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  waterFill: {
    height: '100%',
    borderRadius: 3,
  },
  manualSection: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  manualRow: {
    flexDirection: 'row',
    gap: 8,
  },
  manualCol: {
    flex: 1,
    gap: 4,
  },
  manualLabel: {
    ...typography.caption,
    fontSize: 9,
    fontWeight: '800',
  },
  manualInput: {
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    fontSize: 14,
    textAlign: 'center',
  },
  saveManualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  saveManualText: {
    ...typography.titleSmall,
    color: '#F59E0B',
    fontWeight: '800',
    fontSize: 13,
  },
});
