import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { ArrowLeft, BookOpen, Target, Plus, Droplets, Flame, Utensils, Zap, Minus, Trash2 } from 'lucide-react-native';
import * as SQLite from 'expo-sqlite';
import { endOfWeek, format, parseISO, startOfWeek } from 'date-fns';

import { Text } from '../components/common/Typography';
import { useTheme, borderRadius, spacing } from '../theme/theme';
import { getHydrationLog, saveHydrationLog } from '../db/database';
import {
  DEFAULT_GOALS,
  FoodEntry,
  MEALS,
  MEAL_LABEL,
  MealKey,
  NewFoodEntry,
  NutritionGoals,
  addFoodEntry,
  deleteFoodEntry,
  getBurnedCalories,
  getCaloriesByDay,
  getFoodEntries,
  getFrequentFoods,
  getNutritionGoals,
  mealForNow,
  saveNutritionGoals,
  totalsOf,
} from '../db/nutrition';
import { formatDisplayDate, getTodayISO } from '../utils/dateUtils';
import { haptics } from '../utils/haptics';
import { FoodCatalogModal } from '../components/macros/FoodCatalogModal';
import { ScalePressable, FadeInUp, prefersReducedMotion } from '../components/common/Motion';
import { SwipeToDelete } from '../components/common/SwipeToDelete';
import { ProgressRing } from '../components/nutrition/ProgressRing';
import { WeekStrip } from '../components/nutrition/WeekStrip';
import { MealTabs } from '../components/nutrition/MealTabs';
import { GoalsSheet, QuickAddSheet, QuickAddValues } from '../components/nutrition/NutritionSheets';
import { WaterBottle } from '../components/nutrition/WaterBottle';

import { useTabBarSpace } from '../components/common/tabBarSpace';
import { notifyUndo } from '../utils/feedback';
import { RollingNumber } from '../components/common/Polish';
interface MacroScreenProps {
  db: SQLite.SQLiteDatabase;
  selectedDate: string;
  onBackToHub?: () => void;
  onDateChange?: (newDate: string) => void;
  onOpenDatePicker?: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

type TabKey = MealKey;

const fmt1 = (n: number) => (Math.round(n * 10) / 10).toString();

export const MacroScreen: React.FC<MacroScreenProps> = ({
  db,
  selectedDate,
  onBackToHub,
  onDateChange,
  onOpenDatePicker,
  onShowToast,
}) => {
  const { colors } = useTheme();
  const accent = colors.pillars.nutrition.accent;
  const tabBarSpace = useTabBarSpace();

  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [goals, setGoals] = useState<NutritionGoals>(DEFAULT_GOALS);
  const [weekCalories, setWeekCalories] = useState<Record<string, number>>({});
  const [frequent, setFrequent] = useState<NewFoodEntry[]>([]);
  const [burned, setBurned] = useState(0);
  const [waterMl, setWaterMl] = useState(0);
  const [activeTab, setActiveTab] = useState<TabKey>(mealForNow());

  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isGoalsOpen, setIsGoalsOpen] = useState(false);

  // ---------------------------------------------------------------- loading
  const loadDay = useCallback(async () => {
    try {
      const start = startOfWeek(parseISO(selectedDate), { weekStartsOn: 1 });
      const end = endOfWeek(parseISO(selectedDate), { weekStartsOn: 1 });
      const [list, g, week, freq, kcalOut, hydro] = await Promise.all([
        getFoodEntries(db, selectedDate),
        getNutritionGoals(db),
        getCaloriesByDay(db, format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd')),
        getFrequentFoods(db, 12),
        getBurnedCalories(db, selectedDate),
        getHydrationLog(db, selectedDate),
      ]);
      setEntries(list);
      setGoals(g);
      setWeekCalories(week);
      setFrequent(freq);
      setBurned(kcalOut);
      setWaterMl(hydro?.amount_ml || 0);
    } catch (e) {
      console.error('Nutrition load failed:', e);
    }
  }, [db, selectedDate]);

  useEffect(() => {
    loadDay();
  }, [loadDay]);

  // Keep the tab valid: "Earlier log" only exists on days imported/logged before meals.
  const hasLegacy = entries.some((e) => e.meal === 'other');
  useEffect(() => {
    if (activeTab === 'other' && !hasLegacy) setActiveTab(mealForNow());
  }, [activeTab, hasLegacy]);

  // When a day only has an earlier total, open that tab instead of an empty meal.
  const onlyLegacy = entries.length > 0 && entries.every((e) => e.meal === 'other');
  useEffect(() => {
    if (onlyLegacy) setActiveTab('other');
  }, [onlyLegacy, selectedDate]);

  // ---------------------------------------------------------------- derived
  const totals = useMemo(() => totalsOf(entries), [entries]);
  const remaining = goals.calories - totals.calories;
  const tabs = useMemo(() => {
    const base = MEALS.map((m) => ({
      key: m.key as TabKey,
      label: m.label,
      kcal: totalsOf(entries.filter((e) => e.meal === m.key)).calories,
    }));
    return hasLegacy
      ? [...base, { key: 'other' as TabKey, label: 'Earlier', kcal: totalsOf(entries.filter((e) => e.meal === 'other')).calories }]
      : base;
  }, [entries, hasLegacy]);
  const mealEntries = entries.filter((e) => e.meal === activeTab);
  const targetMeal: Exclude<MealKey, 'other'> = activeTab === 'other' ? mealForNow() : activeTab;

  const isToday = selectedDate === getTodayISO();
  const dayLabel = isToday ? 'Today' : formatDisplayDate(selectedDate);

  // ---------------------------------------------------------------- actions
  const addEntry = async (e: Omit<NewFoodEntry, 'date' | 'meal'>) => {
    try {
      await addFoodEntry(db, { ...e, date: selectedDate, meal: targetMeal });
      if (activeTab === 'other') setActiveTab(targetMeal);
      await loadDay();
      onShowToast('success', `Added ${e.name} to ${MEAL_LABEL[targetMeal].toLowerCase()}`);
    } catch (err: any) {
      onShowToast('error', `Couldn't add food: ${err?.message || err}`);
    }
  };

  // Remove straight away; Undo puts it back in the same meal.
  const removeEntry = async (entry: FoodEntry) => {
    try {
      haptics.tap();
      await deleteFoodEntry(db, entry);
      await loadDay();
      if (entry.id < 0) {
        onShowToast('info', `Removed ${entry.name}`);
        return;
      }
      notifyUndo(`Removed ${entry.name}`, async () => {
        await addFoodEntry(db, {
          date: entry.date,
          meal: entry.meal,
          name: entry.name,
          calories: entry.calories,
          protein: entry.protein,
          carbs: entry.carbs,
          fat: entry.fat,
        });
        await loadDay();
      });
    } catch (err: any) {
      onShowToast('error', `Couldn't remove: ${err?.message || err}`);
    }
  };

  const changeWater = async (delta: number) => {
    const next = Math.max(0, waterMl + delta);
    if (next === waterMl) return;
    haptics.tap();
    setWaterMl(next);
    try {
      await saveHydrationLog(db, selectedDate, next, goals.waterMl);
    } catch (err: any) {
      setWaterMl(waterMl);
      onShowToast('error', `Couldn't save water: ${err?.message || err}`);
    }
  };

  const saveGoals = async (g: NutritionGoals) => {
    try {
      await saveNutritionGoals(db, g);
      setGoals(g);
      setIsGoalsOpen(false);
      onShowToast('success', 'Goals updated');
    } catch (err: any) {
      onShowToast('error', `Couldn't save goals: ${err?.message || err}`);
    }
  };

  const goToDate = (d: string) => onDateChange?.(d);

  // ---------------------------------------------------------------- render
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          {onBackToHub ? (
            <Pressable style={styles.backBtn} onPress={onBackToHub} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back to hub">
              <ArrowLeft size={20} color={accent} />
              <Text style={[styles.backText, { color: accent }]}>Hub</Text>
            </Pressable>
          ) : (
            <View />
          )}
          <View style={styles.headerActions}>
            <RoundAction label="Food catalog" onPress={() => setIsCatalogOpen(true)}>
              <BookOpen size={18} color={colors.textSecondary} />
            </RoundAction>
            <RoundAction label="Daily goals" onPress={() => setIsGoalsOpen(true)}>
              <Target size={18} color={colors.textSecondary} />
            </RoundAction>
          </View>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Nutrition</Text>
        <Pressable onPress={onOpenDatePicker} hitSlop={6} accessibilityRole="button" accessibilityLabel="Pick a date">
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {dayLabel} <Text style={{ color: accent }}>· change</Text>
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: tabBarSpace }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Week strip */}
        <FadeInUp delay={0} distance={8}>
          <WeekStrip
            selectedDate={selectedDate}
            caloriesByDay={weekCalories}
            calorieGoal={goals.calories}
            onSelectDate={goToDate}
          />
        </FadeInUp>

        {/* Hero: eaten · ring · burned, then macros */}
        <FadeInUp delay={60}>
          <View style={[styles.card, styles.hero, { backgroundColor: colors.surfaceCard }]}>
            <View style={styles.heroRow}>
              <SideStat icon={<Utensils size={16} color={accent} />} value={Math.round(totals.calories)} label="Eaten" />
              <ProgressRing
                progress={goals.calories > 0 ? totals.calories / goals.calories : 0}
                size={150}
                stroke={12}
                color={remaining < -goals.calories * 0.1 ? colors.danger : accent}
                trackColor={colors.surfaceHighlight}
              >
                <Text style={[styles.ringCaption, { color: remaining >= 0 ? colors.textSecondary : colors.danger }]}>
                  {remaining >= 0 ? 'Remaining' : 'Over'}
                </Text>
                <RollingNumber value={Math.abs(remaining)} style={[styles.ringValue, { color: colors.text }]} />
                <Text style={[styles.ringGoal, { color: colors.textMuted }]}>of {goals.calories} kcal</Text>
              </ProgressRing>
              <SideStat icon={<Flame size={16} color={colors.warning} />} value={burned} label="Burned" />
            </View>

            <View style={styles.macroRow}>
              <MacroBar label="Protein" value={totals.protein} goal={goals.protein} color={colors.macros.protein} />
              <MacroBar label="Carbs" value={totals.carbs} goal={goals.carbs} color={colors.macros.carbs} />
              <MacroBar label="Fat" value={totals.fat} goal={goals.fat} color={colors.macros.fat} />
            </View>
          </View>
        </FadeInUp>

        {/* Add again shelf */}
        {frequent.length > 0 && (
          <FadeInUp delay={110}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Add again</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.shelf}
              style={styles.shelfScroll}
            >
              {frequent.map((f) => (
                <ScalePressable
                  key={f.name}
                  style={[styles.shelfChip, { backgroundColor: colors.surfaceCard }]}
                  onPress={() => addEntry({ name: f.name, calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat })}
                  accessibilityLabel={`Add ${f.name}, ${Math.round(f.calories)} kilocalories, to ${MEAL_LABEL[targetMeal]}`}
                >
                  <Text style={[styles.shelfName, { color: colors.text }]} numberOfLines={2}>
                    {f.name}
                  </Text>
                  <View style={styles.shelfFoot}>
                    <Text style={[styles.shelfKcal, { color: colors.textMuted }]}>{Math.round(f.calories)} kcal</Text>
                    <View style={[styles.shelfPlus, { backgroundColor: colors.pillars.nutrition.soft }]}>
                      <Plus size={14} color={accent} strokeWidth={3} />
                    </View>
                  </View>
                </ScalePressable>
              ))}
            </ScrollView>
          </FadeInUp>
        )}

        {/* Meals */}
        <FadeInUp delay={160}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Meals</Text>
          <MealTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

          <View style={[styles.card, styles.mealCard, { backgroundColor: colors.surfaceCard }]}>
            {mealEntries.length === 0 ? (
              <Animated.View entering={FadeIn.duration(200)} style={styles.empty}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.pillars.nutrition.soft }]}>
                  <Utensils size={20} color={accent} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing in {MEAL_LABEL[activeTab].toLowerCase()} yet</Text>
                <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                  Pick from your food catalog or quick add calories and macros.
                </Text>
              </Animated.View>
            ) : (
              mealEntries.map((e, i) => (
                <Animated.View
                  key={`${e.id}-${e.name}`}
                  entering={FadeIn.duration(220)}
                  exiting={FadeOut.duration(160)}
                  layout={LinearTransition.springify().damping(20)}
                >
                  <SwipeToDelete onDelete={() => removeEntry(e)} radius={12}>
                    <View
                      style={[
                        styles.entryRow,
                        { backgroundColor: colors.surfaceCard },
                        i > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.entryName, { color: colors.text }]} numberOfLines={2}>
                          {e.name}
                        </Text>
                        <Text style={[styles.entryMacros, { color: colors.textMuted }]}>
                          <Text style={{ color: colors.macros.protein }}>P {fmt1(e.protein)}</Text>
                          {'  '}
                          <Text style={{ color: colors.macros.carbs }}>C {fmt1(e.carbs)}</Text>
                          {'  '}
                          <Text style={{ color: colors.macros.fat }}>F {fmt1(e.fat)}</Text>
                        </Text>
                      </View>
                      <Text style={[styles.entryKcal, { color: colors.text }]}>
                        {Math.round(e.calories)}
                        <Text style={[styles.entryKcalUnit, { color: colors.textMuted }]}> kcal</Text>
                      </Text>
                      <Pressable
                        onPress={() => removeEntry(e)}
                        hitSlop={10}
                        style={({ pressed }) => [
                          styles.entryRemove,
                          { backgroundColor: pressed ? colors.dangerMuted : colors.surfaceHighlight },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${e.name}`}
                      >
                        <Trash2 size={15} color={colors.danger} />
                      </Pressable>
                    </View>
                  </SwipeToDelete>
                </Animated.View>
              ))
            )}

            {activeTab === 'other' && (
              <Text style={[styles.legacyNote, { color: colors.textMuted }]}>
                Logged before meals existed. Tap the bin to remove it, or add foods to split the day into meals.
              </Text>
            )}

            <View style={styles.mealActions}>
              <ScalePressable
                style={[styles.mealBtn, { backgroundColor: accent }]}
                onPress={() => setIsCatalogOpen(true)}
                accessibilityLabel={`Add food to ${MEAL_LABEL[targetMeal]}`}
              >
                <Plus size={18} color={colors.textInverse} strokeWidth={3} />
                <Text style={[styles.mealBtnText, { color: colors.textInverse }]}>Add food</Text>
              </ScalePressable>
              <ScalePressable
                style={[styles.mealBtn, { backgroundColor: colors.pillars.nutrition.soft }]}
                onPress={() => setIsQuickAddOpen(true)}
                accessibilityLabel={`Quick add to ${MEAL_LABEL[targetMeal]}`}
              >
                <Zap size={16} color={accent} />
                <Text style={[styles.mealBtnText, { color: accent }]}>Quick add</Text>
              </ScalePressable>
            </View>
          </View>
        </FadeInUp>

        {/* Water */}
        <FadeInUp delay={210}>
          <WaterCard
            ml={waterMl}
            goalMl={goals.waterMl}
            onAdd={(d) => changeWater(d)}
          />
        </FadeInUp>
      </ScrollView>

      <FoodCatalogModal
        visible={isCatalogOpen}
        db={db}
        onClose={() => setIsCatalogOpen(false)}
        onSelectFood={(name, calories, protein, carbs, fat) => addEntry({ name, calories, protein, carbs, fat })}
      />
      <QuickAddSheet
        visible={isQuickAddOpen}
        mealLabel={MEAL_LABEL[targetMeal]}
        onClose={() => setIsQuickAddOpen(false)}
        onAdd={(v: QuickAddValues) => {
          setIsQuickAddOpen(false);
          addEntry(v);
        }}
      />
      <GoalsSheet visible={isGoalsOpen} goals={goals} onClose={() => setIsGoalsOpen(false)} onSave={saveGoals} />
    </View>
  );
};

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

const RoundAction: React.FC<{ label: string; onPress: () => void; children: React.ReactNode }> = ({
  label,
  onPress,
  children,
}) => {
  const { colors } = useTheme();
  return (
    <ScalePressable
      style={[styles.roundAction, { backgroundColor: colors.surfaceCard }]}
      onPress={onPress}
      hitSlop={6}
      pressedScale={0.92}
      accessibilityLabel={label}
    >
      {children}
    </ScalePressable>
  );
};

const SideStat: React.FC<{ icon: React.ReactNode; value: number; label: string }> = ({ icon, value, label }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.side}>
      {icon}
      <RollingNumber value={value} style={[styles.sideValue, { color: colors.text }]} />
      <Text style={[styles.sideLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
};

const AnimatedFill: React.FC<{ pct: number; color: string }> = ({ pct, color }) => {
  const target = Math.max(0, Math.min(100, (Number.isFinite(pct) ? pct : 0) * 100));
  const width = useSharedValue(0);
  useEffect(() => {
    width.value = prefersReducedMotion() ? target : withTiming(target, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [target, width]);
  const style = useAnimatedStyle(() => ({ width: `${width.value}%` }));
  return <Animated.View style={[styles.barFill, { backgroundColor: color }, style]} />;
};

const MacroBar: React.FC<{ label: string; value: number; goal: number; color: string }> = ({
  label,
  value,
  goal,
  color,
}) => {
  const { colors } = useTheme();
  const pct = goal > 0 ? value / goal : 0;
  return (
    <View style={styles.macro}>
      <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.macroValue, { color: colors.text }]}>
        {Math.round(value)}
        <Text style={[styles.macroGoal, { color: colors.textMuted }]}> / {goal} g</Text>
      </Text>
      <View style={[styles.barTrack, { backgroundColor: colors.surfaceHighlight }]}>
        <AnimatedFill pct={pct} color={pct > 1.1 ? colors.danger : color} />
      </View>
    </View>
  );
};

const WaterCard: React.FC<{ ml: number; goalMl: number; onAdd: (deltaMl: number) => void }> = ({ ml, goalMl, onAdd }) => {
  const { colors } = useTheme();
  const water = colors.pillars.running;
  const pct = goalMl > 0 ? ml / goalMl : 0;
  const glassesLeft = Math.max(0, Math.ceil((goalMl - ml) / 250));
  return (
    <View style={[styles.card, styles.water, { backgroundColor: colors.surfaceCard }]}>
      <WaterBottle ml={ml} goalMl={goalMl} onTap={() => onAdd(250)} width={84} />

      <View style={styles.waterSide}>
        <View style={styles.waterHead}>
          <Droplets size={16} color={water.accent} />
          <Text style={[styles.waterLabel, { color: colors.textSecondary }]}>Water</Text>
        </View>
        <Text style={[styles.waterValue, { color: colors.text }]}>
          {(ml / 1000).toFixed(2)} L
          <Text style={[styles.waterGoal, { color: colors.textMuted }]}> / {(goalMl / 1000).toFixed(1)} L</Text>
        </Text>
        <Text style={[styles.waterSub, { color: pct >= 1 ? colors.success : colors.textMuted }]}>
          {pct >= 1 ? 'Goal reached, nice work' : `${glassesLeft} ${glassesLeft === 1 ? 'glass' : 'glasses'} to go · tap the bottle`}
        </Text>

        <View style={styles.waterBtns}>
          {[250, 500].map((amt) => (
            <ScalePressable
              key={amt}
              style={[styles.waterBtn, { backgroundColor: water.soft }]}
              onPress={() => onAdd(amt)}
              accessibilityLabel={`Add ${amt} millilitres`}
            >
              <Plus size={14} color={water.accent} strokeWidth={3} />
              <Text style={[styles.waterBtnText, { color: water.accent }]}>{amt}</Text>
            </ScalePressable>
          ))}
          <Pressable
            onPress={() => onAdd(-250)}
            disabled={ml <= 0}
            hitSlop={6}
            style={[styles.waterMinus, { backgroundColor: colors.surfaceHighlight, opacity: ml <= 0 ? 0.4 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Remove 250 millilitres"
          >
            <Minus size={16} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  backText: { fontSize: 15, fontWeight: '700' },
  headerActions: { flexDirection: 'row', gap: 8 },
  roundAction: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.8, marginTop: 6 },
  subtitle: { fontSize: 14, fontWeight: '600', marginTop: 2 },

  scroll: { paddingHorizontal: spacing.lg, paddingBottom: 48, gap: 16 },
  card: { borderRadius: borderRadius.xl },
  sectionTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2, marginBottom: 10, marginTop: 4 },

  hero: { padding: spacing.lg, gap: spacing.lg },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  side: { flex: 1, alignItems: 'center', gap: 4 },
  sideValue: { fontSize: 20, fontWeight: '800' },
  sideLabel: { fontSize: 12, fontWeight: '600' },
  ringCaption: { fontSize: 12, fontWeight: '600' },
  ringValue: { fontSize: 34, fontWeight: '800', letterSpacing: -1, lineHeight: 40 },
  ringGoal: { fontSize: 11, fontWeight: '600' },

  macroRow: { flexDirection: 'row', gap: 14 },
  macro: { flex: 1, gap: 4 },
  macroLabel: { fontSize: 12, fontWeight: '600' },
  macroValue: { fontSize: 16, fontWeight: '800' },
  macroGoal: { fontSize: 12, fontWeight: '600' },
  barTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 2 },
  barFill: { height: '100%', borderRadius: 3 },

  shelfScroll: { marginHorizontal: -spacing.lg },
  shelf: { paddingHorizontal: spacing.lg, gap: 10 },
  shelfChip: { width: 132, minHeight: 92, borderRadius: 18, padding: 12, justifyContent: 'space-between' },
  shelfName: { fontSize: 14, fontWeight: '700', lineHeight: 18 },
  shelfFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  shelfKcal: { fontSize: 12, fontWeight: '600' },
  shelfPlus: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },

  mealCard: { marginTop: 10, paddingVertical: 4, overflow: 'hidden' },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.lg, paddingVertical: 12 },
  entryName: { fontSize: 15, fontWeight: '600' },
  entryMacros: { fontSize: 12, fontWeight: '600', marginTop: 3 },
  entryKcal: { fontSize: 16, fontWeight: '800' },
  entryKcalUnit: { fontSize: 12, fontWeight: '600' },
  entryRemove: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  legacyNote: { fontSize: 12, lineHeight: 17, paddingHorizontal: spacing.lg, paddingTop: 4 },
  empty: { alignItems: 'center', paddingVertical: 22, paddingHorizontal: spacing.lg, gap: 6 },
  emptyIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  mealActions: { flexDirection: 'row', gap: 10, padding: spacing.md },
  mealBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 46, borderRadius: 14 },
  mealBtnText: { fontSize: 15, fontWeight: '800' },

  water: { padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 18 },
  waterSide: { flex: 1, gap: 4 },
  waterHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  waterLabel: { fontSize: 13, fontWeight: '700' },
  waterTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  waterIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  waterValue: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  waterGoal: { fontSize: 13, fontWeight: '600' },
  waterSub: { fontSize: 12, fontWeight: '500', marginTop: 1 },
  waterMinus: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  waterTrack: { height: 8, borderRadius: 4 },
  waterBtns: { flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' },
  waterBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 42, borderRadius: 12 },
  waterBtnText: { fontSize: 14, fontWeight: '800' },
});
