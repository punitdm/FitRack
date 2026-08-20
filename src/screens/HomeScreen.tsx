import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {
  Bell,
  Users,
  Plus,
  Flame,
  RotateCcw,
  ChevronRight,
  TrendingUp,
  Award,
  Zap,
  Check,
} from 'lucide-react-native';
import * as SQLite from 'expo-sqlite';
import { useTheme, typography, borderRadius, spacing } from '../theme/theme';
import { TabType } from '../types/navigation';
import { HomeDashboardSummary } from '../types/database';
import { getHomeDashboardData, addHydration, resetHydration } from '../db/database';
import { Card } from '../components/common/Card';
import { getTodayISO } from '../utils/dateUtils';

interface HomeScreenProps {
  db: SQLite.SQLiteDatabase;
  selectedDate: string;
  onNavigateTab: (tab: TabType) => void;
  onShowToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  db,
  selectedDate = getTodayISO(),
  onNavigateTab,
  onShowToast,
}) => {
  const { colors } = useTheme();
  const [data, setData] = useState<HomeDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const summary = await getHomeDashboardData(db, selectedDate);
      setData(summary);
    } catch (e: any) {
      console.error(e);
      onShowToast('error', `Failed to load dashboard: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [db, selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddWater = async (amountMl: number) => {
    try {
      const updated = await addHydration(db, selectedDate, amountMl);
      setData((prev) => (prev ? { ...prev, hydrationMl: updated.amount_ml } : null));
      onShowToast('success', `+${amountMl}ml added! 💧`);
    } catch (e: any) {
      onShowToast('error', `Failed to log water: ${e.message}`);
    }
  };

  const handleResetWater = async () => {
    try {
      const updated = await resetHydration(db, selectedDate);
      setData((prev) => (prev ? { ...prev, hydrationMl: updated.amount_ml } : null));
      onShowToast('info', 'Water reset for today');
    } catch (e: any) {
      onShowToast('error', `Failed to reset water: ${e.message}`);
    }
  };

  const hydrationPct = data
    ? Math.min(100, Math.round((data.hydrationMl / (data.hydrationTargetMl || 2500)) * 100))
    : 0;

  const proteinPct = data
    ? Math.min(100, Math.round((data.proteinConsumed / (data.proteinGoal || 150)) * 100))
    : 0;

  const caloriePct = data
    ? Math.min(100, Math.round((data.caloriesConsumed / (data.caloriesGoal || 2000)) * 100))
    : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadData} tintColor={colors.primary} />
        }
      >
        {/* ================= 1. HEJ FITRACKER HEADER ================= */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={[styles.avatarCircle, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>P</Text>
            </View>
            <View>
              <Text style={[styles.greetingSub, { color: colors.textSecondary }]}>Welcome back</Text>
              <Text style={[styles.greetingTitle, { color: colors.text }]}>Hej FitRacker 👋</Text>
            </View>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]} activeOpacity={0.7}>
              <Users size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]} activeOpacity={0.7}>
              <Bell size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ================= 2. GOALS CARD (3 Circular Meters) ================= */}
        <Card style={[styles.goalsCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Goals ({data?.goalsMetCount || 0} of {data?.totalGoals || 3} hit)
              </Text>
              <Text style={[styles.cardSub, { color: colors.textMuted }]}>Today's Target Metrics</Text>
            </View>
            <TouchableOpacity
              style={[styles.plusIconBtn, { backgroundColor: colors.primaryMuted }]}
              onPress={() => onNavigateTab('macros')}
              activeOpacity={0.7}
            >
              <Plus size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* 3 Circular Rings Row */}
          <View style={styles.ringsRow}>
            {/* Ring 1: Daily Protein */}
            <View style={styles.ringCol}>
              <View style={[styles.ringCircle, { borderColor: `${colors.primary}40` }]}>
                <View
                  style={[
                    styles.ringInner,
                    {
                      borderColor: colors.primary,
                      borderTopColor: proteinPct > 25 ? colors.primary : 'transparent',
                      borderRightColor: proteinPct > 50 ? colors.primary : 'transparent',
                      borderBottomColor: proteinPct > 75 ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  <Text style={[styles.ringVal, { color: colors.primary }]}>{data?.proteinConsumed || 0}g</Text>
                </View>
              </View>
              <Text style={[styles.ringLabel, { color: colors.textSecondary }]}>Daily Protein</Text>
            </View>

            {/* Ring 2: Daily Workout */}
            <View style={styles.ringCol}>
              <View
                style={[
                  styles.ringCircle,
                  {
                    borderColor: data?.workoutsDoneToday ? colors.primary : `${colors.textMuted}30`,
                    backgroundColor: data?.workoutsDoneToday ? colors.primaryMuted : 'transparent',
                  },
                ]}
              >
                {data?.workoutsDoneToday ? (
                  <Check size={26} color={colors.primary} strokeWidth={3} />
                ) : (
                  <Award size={24} color={colors.textMuted} />
                )}
              </View>
              <Text style={[styles.ringLabel, { color: colors.textSecondary }]}>
                {data?.workoutsDoneToday ? 'Workout Hit!' : 'Workout (0/1)'}
              </Text>
            </View>

            {/* Ring 3: Daily Calories Eaten */}
            <View style={styles.ringCol}>
              <View style={[styles.ringCircle, { borderColor: `${colors.secondary}40` }]}>
                <View
                  style={[
                    styles.ringInner,
                    {
                      borderColor: colors.secondary,
                      borderTopColor: caloriePct > 25 ? colors.secondary : 'transparent',
                      borderRightColor: caloriePct > 50 ? colors.secondary : 'transparent',
                    },
                  ]}
                >
                  <Text style={[styles.ringVal, { color: colors.secondary }]}>{data?.caloriesConsumed || 0}</Text>
                </View>
              </View>
              <Text style={[styles.ringLabel, { color: colors.textSecondary }]}>Daily Calories</Text>
            </View>
          </View>
        </Card>

        {/* ================= 3. FOOD TODAY CARD ================= */}
        <Card style={[styles.foodCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Food today</Text>
              <Text style={[styles.foodRemainingText, { color: colors.primary }]}>
                {data?.foodRemainingKcal || 2000} kcal left • {data?.foodRemainingProtein || 150} g protein left
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.plusIconBtn, { backgroundColor: colors.primaryMuted }]}
              onPress={() => onNavigateTab('macros')}
              activeOpacity={0.7}
            >
              <Plus size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* ================= 4. HYDRATION CARD ================= */}
        <Card style={[styles.hydrationCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Hydration</Text>
              <Text style={[styles.hydrationSub, { color: colors.textMuted }]}>
                {(data?.hydrationMl || 0) / 1000} L of {(data?.hydrationTargetMl || 2500) / 1000} L •{' '}
                <Text style={{ color: colors.secondary, fontWeight: '700' }}>{hydrationPct}%</Text>
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.undoBtn, { backgroundColor: colors.surfaceHighlight }]}
              onPress={handleResetWater}
              activeOpacity={0.7}
            >
              <RotateCcw size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Progress Bar */}
          <View style={[styles.hydrationTrack, { backgroundColor: colors.surfaceHighlight }]}>
            <View style={[styles.hydrationBar, { width: `${hydrationPct}%`, backgroundColor: colors.secondary }]} />
          </View>

          {/* Increment Pills */}
          <View style={styles.hydrationActionsRow}>
            <TouchableOpacity
              style={[styles.waterPill, { backgroundColor: colors.secondaryMuted, borderColor: colors.secondary }]}
              onPress={() => handleAddWater(250)}
              activeOpacity={0.7}
            >
              <Plus size={14} color={colors.secondary} />
              <Text style={[styles.waterPillText, { color: colors.secondary }]}>250 ml</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.waterPill, { backgroundColor: colors.secondaryMuted, borderColor: colors.secondary }]}
              onPress={() => handleAddWater(500)}
              activeOpacity={0.7}
            >
              <Plus size={14} color={colors.secondary} />
              <Text style={[styles.waterPillText, { color: colors.secondary }]}>500 ml</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* ================= 5. WEIGHT CARD ================= */}
        <Card style={[styles.weightCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Weight</Text>
              <Text style={[styles.weightValue, { color: colors.text }]}>
                {data?.latestWeightKg ? `${data.latestWeightKg} kg` : '80.0 kg'}
              </Text>
              <Text style={[styles.cardSub, { color: colors.textMuted }]}>{data?.weightDateText || 'First weigh-in'}</Text>
            </View>
            <TouchableOpacity
              style={[styles.plusIconBtn, { backgroundColor: colors.primaryMuted }]}
              onPress={() => onNavigateTab('analytics')}
              activeOpacity={0.7}
            >
              <Plus size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* ================= 6. WEEKLY STREAK & CONSISTENCY ================= */}
        <Card style={[styles.streakCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <View style={styles.streakTitleRow}>
              <Flame size={20} color={colors.warning} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {data?.streak.currentStreak || 0} day streak
              </Text>
            </View>
            <Text style={[styles.cardSub, { color: colors.textMuted }]}>
              Best: {data?.streak.bestStreak || 0}d
            </Text>
          </View>

          {/* Weekday indicators (M T W T F S S) */}
          <View style={styles.weekDaysRow}>
            {data?.streak.weekDays.map((day, idx) => (
              <View key={idx} style={styles.dayCol}>
                <Text style={[styles.dayLabel, { color: colors.textMuted }, day.isToday && { color: colors.primary, fontWeight: '800' }]}>
                  {day.label}
                </Text>
                <View
                  style={[
                    styles.dayIndicatorCircle,
                    {
                      borderColor: day.completed
                        ? colors.primary
                        : day.isToday
                        ? colors.primary
                        : colors.border,
                      backgroundColor: day.completed ? colors.primaryMuted : colors.surfaceElevated,
                    },
                  ]}
                >
                  {day.completed && <Check size={14} color={colors.primary} strokeWidth={3} />}
                </View>
              </View>
            ))}
          </View>
        </Card>

        {/* ================= 7. THIS WEEK SUMMARY ================= */}
        <Card style={[styles.thisWeekCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>This week</Text>
            <TouchableOpacity
              style={styles.allAnalyticsLink}
              onPress={() => onNavigateTab('analytics')}
              activeOpacity={0.7}
            >
              <Text style={[styles.allAnalyticsText, { color: colors.primary }]}>All analytics</Text>
              <ChevronRight size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekStatsRow}>
            <View style={styles.weekStatCol}>
              <Text style={[styles.weekStatVal, { color: colors.text }]}>
                {data?.weeklyDistanceKm ? data.weeklyDistanceKm.toFixed(2) : '0.00'}{' '}
                <Text style={[styles.weekStatUnit, { color: colors.textMuted }]}>km</Text>
              </Text>
              <Text style={[styles.weekStatLabel, { color: colors.textSecondary }]}>Distance</Text>
            </View>

            <View style={styles.weekStatCol}>
              <Text style={[styles.weekStatVal, { color: colors.text }]}>
                {data?.weeklyDurationMinutes || 0} <Text style={[styles.weekStatUnit, { color: colors.textMuted }]}>m</Text>
              </Text>
              <Text style={[styles.weekStatLabel, { color: colors.textSecondary }]}>Time</Text>
            </View>

            <View style={styles.weekStatCol}>
              <Text style={[styles.weekStatVal, { color: colors.text }]}>
                {data?.weeklyCaloriesBurned || 0}
              </Text>
              <Text style={[styles.weekStatLabel, { color: colors.textSecondary }]}>Calories</Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  avatarText: {
    ...typography.titleMedium,
    fontSize: 20,
    fontWeight: '800',
  },
  greetingSub: {
    ...typography.caption,
    fontSize: 11,
  },
  greetingTitle: {
    ...typography.titleMedium,
    fontSize: 18,
  },
  headerRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  goalsCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.titleSmall,
    fontSize: 16,
  },
  cardSub: {
    ...typography.caption,
    marginTop: 2,
  },
  plusIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
  },
  ringCol: {
    alignItems: 'center',
  },
  ringCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  ringInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringVal: {
    ...typography.mono,
    fontSize: 13,
  },
  ringLabel: {
    ...typography.caption,
    fontSize: 11,
  },
  foodCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  foodRemainingText: {
    ...typography.titleSmall,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  hydrationCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  hydrationSub: {
    ...typography.caption,
    marginTop: 2,
  },
  undoBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hydrationTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginVertical: spacing.md,
  },
  hydrationBar: {
    height: '100%',
    borderRadius: 5,
  },
  hydrationActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  waterPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  waterPillText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 12,
  },
  weightCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  weightValue: {
    ...typography.mono,
    fontSize: 22,
    marginTop: 2,
  },
  streakCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  streakTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  dayCol: {
    alignItems: 'center',
    gap: 6,
  },
  dayLabel: {
    ...typography.caption,
    fontSize: 11,
  },
  dayIndicatorCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thisWeekCard: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  allAnalyticsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  allAnalyticsText: {
    ...typography.caption,
    fontWeight: '700',
  },
  weekStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  weekStatCol: {
    alignItems: 'center',
  },
  weekStatVal: {
    ...typography.mono,
    fontSize: 18,
  },
  weekStatUnit: {
    fontSize: 12,
  },
  weekStatLabel: {
    ...typography.caption,
    fontSize: 11,
    marginTop: 2,
  },
});
