import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { TouchableOpacity } from '../components/common/Touchable';
import { Text } from '../components/common/Typography';
import {
  Dumbbell,
  Utensils,
  Footprints,
  Scale,
  Settings,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Clock,
  Flame,
  Award,
  BarChart3,
  PieChart,
} from 'lucide-react-native';
import * as SQLite from 'expo-sqlite';
import { FadeInUp, ScalePressable } from '../components/common/Motion';
import { haptics } from '../utils/haptics';
import { StreakHeader } from '../components/home/StreakHeader';
import { getHomeStreaks, HomeStreaks } from '../db/streaks';
import { getProfile } from '../db/profile';
import { useTheme, typography, borderRadius, spacing } from '../theme/theme';
import { HubSummary } from '../types/database';
import { getTodayHubSummary } from '../db/database';
import { formatDisplayDate, shiftDate, getTodayISO } from '../utils/dateUtils';

import { useTabBarSpace } from '../components/common/tabBarSpace';
import { useUnits } from '../utils/units';
interface HubScreenProps {
  db: SQLite.SQLiteDatabase;
  selectedDate: string;
  onDateChange?: (newDate: string) => void;
  onOpenDatePicker: () => void;
  onNavigatePillar: (pillar: 'workout' | 'nutrition' | 'running' | 'body' | 'analytics' | 'settings') => void;
  onShowToast: (type: 'success' | 'error' | 'info', text: string) => void;
  /** Bumped each time the hub is returned to, so totals refresh quietly. */
  refreshToken?: number;
}

function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h < 5) return 'Late night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export const HubScreen: React.FC<HubScreenProps> = ({
  db,
  selectedDate,
  onDateChange,
  onOpenDatePicker,
  onNavigatePillar,
  onShowToast,
  refreshToken,
}) => {
  const { colors, isDark } = useTheme();
  const u = useUnits();
  const tabBarSpace = useTabBarSpace();

  const [summary, setSummary] = useState<HubSummary>({
    workout: { totalSets: 0, totalVolumeKg: 0, exerciseCount: 0, durationMinutes: 0 },
    nutrition: {
      caloriesConsumed: 0,
      calorieTarget: 2400,
      proteinConsumed: 0,
      proteinTarget: 180,
      carbsConsumed: 0,
      carbsTarget: 250,
      fatConsumed: 0,
      fatTarget: 75,
      waterMl: 0,
      waterTargetMl: 3000,
    },
    running: {
      todayDistanceKm: 0,
      todayDurationSeconds: 0,
      todayPaceFormatted: "0'00\" /km",
      elevationMeters: 0,
      recentRunsCount: 0,
    },
    body: {
      latestWeightKg: null,
      weightChangeWeekKg: null,
      bodyFatPct: null,
    },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [streaks, setStreaks] = useState<HomeStreaks | null>(null);
  const [profileName, setProfileName] = useState('');

  const loadStreaks = useCallback(async () => {
    try {
      const [st, prof] = await Promise.all([getHomeStreaks(db, selectedDate), getProfile(db)]);
      setStreaks(st);
      setProfileName(prof.name.trim().split(/\s+/)[0] || '');
    } catch (e) {
      console.error('Streaks load failed:', e);
    }
  }, [db, selectedDate]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getTodayHubSummary(db, selectedDate);
      setSummary(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [db, selectedDate]);

  useEffect(() => {
    loadData();
    loadStreaks();
  }, [loadData, loadStreaks]);

  // Quiet refresh (no spinner) when returning to the hub from a pillar.
  useEffect(() => {
    if (!refreshToken) return;
    getTodayHubSummary(db, selectedDate).then(setSummary).catch(console.error);
    loadStreaks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  const handlePrevDay = () => {
    haptics.select();
    if (onDateChange) {
      onDateChange(shiftDate(selectedDate, -1));
    }
  };

  const handleNextDay = () => {
    haptics.select();
    if (onDateChange) {
      onDateChange(shiftDate(selectedDate, 1));
    }
  };

  const { workout, nutrition, running, body } = summary;
  const calPercent = Math.min(100, Math.round((nutrition.caloriesConsumed / (nutrition.calorieTarget || 2400)) * 100));

  // Format running duration
  const runMinutes = Math.floor(running.todayDurationSeconds / 60);
  const runSeconds = running.todayDurationSeconds % 60;
  const runDurationText =
    running.todayDurationSeconds > 0
      ? `${runMinutes}m ${runSeconds < 10 ? '0' : ''}${runSeconds}s`
      : '0m 00s';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarSpace }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              loadData();
              loadStreaks();
            }}
            tintColor={colors.primary}
          />
        }
      >
        <StreakHeader
          greeting={greetingFor(new Date()) + (profileName ? `, ${profileName}` : '')}
          selectedDate={selectedDate}
          streaks={streaks}
          onOpenDatePicker={onOpenDatePicker}
          onSelectDate={(d) => onDateChange?.(d)}
          onPrevDay={handlePrevDay}
          onNextDay={handleNextDay}
          onOpenProgress={() => onNavigatePillar('analytics')}
        />

        {/* ================= CARD 1: WORKOUT (Volt / Green Accent) ================= */}
        <FadeInUp delay={60}>
        <ScalePressable
          pressedScale={0.98}
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.pillars.workout.tint,
              borderColor: colors.border,
            },
          ]}
          onPress={() => onNavigatePillar('workout')}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTag, { color: colors.pillars.workout.accent }]}>Workout</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                {workout.totalSets > 0 ? 'Today’s active session' : 'Log gym workout'}
              </Text>
            </View>
            <View style={[styles.iconGlowingCircle, { backgroundColor: colors.pillars.workout.soft }]}>
              <Dumbbell size={22} color={colors.pillars.workout.accent} />
            </View>
          </View>

          <View style={styles.metricsTripleRow}>
            <View style={styles.metricSingleBox}>
              <Text style={[styles.metricBigNum, { color: colors.pillars.workout.accent }]}>
                {workout.totalSets}
              </Text>
              <Text style={[styles.metricUnitLabel, { color: colors.textMuted }]}>Sets</Text>
            </View>

            <View style={[styles.metricSingleBox, { flex: 1.4 }]}>
              <Text style={[styles.metricBigNum, { color: colors.text }]}>
                {u.fmtVolume(workout.totalVolumeKg).value}
                <Text style={[styles.metricUnitSmall, { color: colors.textMuted }]}> {u.fmtVolume(workout.totalVolumeKg).unit}</Text>
              </Text>
              <Text style={[styles.metricUnitLabel, { color: colors.textMuted }]}>Volume</Text>
            </View>

            <View style={styles.metricSingleBox}>
              <View style={styles.durationInline}>
                <Clock size={12} color={colors.textMuted} />
                <Text style={[styles.durationText, { color: colors.textSecondary }]}>
                  {workout.durationMinutes > 0 ? `${workout.durationMinutes}m` : '0m'}
                </Text>
              </View>
              <Text style={[styles.metricUnitLabel, { color: colors.textMuted }]}>Time</Text>
            </View>
          </View>
        </ScalePressable>
        </FadeInUp>

        {/* ================= CARD 2: NUTRITION & MEALS (Amber Accent) ================= */}
        <FadeInUp delay={115}>
        <ScalePressable
          pressedScale={0.98}
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.pillars.nutrition.tint,
              borderColor: colors.border,
            },
          ]}
          onPress={() => onNavigatePillar('nutrition')}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTag, { color: colors.pillars.nutrition.accent }]}>Nutrition</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Logged meals & calories</Text>
            </View>
            <View style={[styles.iconGlowingCircle, { backgroundColor: colors.pillars.nutrition.soft }]}>
              <Utensils size={22} color={colors.pillars.nutrition.accent} />
            </View>
          </View>

          <View style={styles.nutritionCaloriesRow}>
            <Text style={[styles.nutritionCalBig, { color: colors.text }]}>
              {nutrition.caloriesConsumed.toLocaleString()}{' '}
              <Text style={{ fontSize: 16, color: colors.textMuted }}>
                / {nutrition.calorieTarget} kcal
              </Text>
            </Text>
            <Text style={[styles.pctBadgeText, { color: colors.pillars.nutrition.accent }]}>
              {calPercent}%
            </Text>
          </View>

          {/* Calorie Bar */}
          <View style={[styles.progressBarTrack, { backgroundColor: colors.surfaceHighlight }]}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${calPercent}%`, backgroundColor: colors.pillars.nutrition.accent },
              ]}
            />
          </View>

          {/* Macro Mini Pills */}
          <View style={styles.macroPillsRow}>
            <View style={[styles.macroPill, { backgroundColor: colors.surfaceHighlight }]}>
              <Text style={[styles.macroPillLabel, { color: colors.textSecondary }]}>
                P: <Text style={{ color: '#38BDF8', fontWeight: '800' }}>{nutrition.proteinConsumed}g</Text>
              </Text>
            </View>
            <View style={[styles.macroPill, { backgroundColor: colors.surfaceHighlight }]}>
              <Text style={[styles.macroPillLabel, { color: colors.textSecondary }]}>
                C: <Text style={{ color: colors.pillars.nutrition.accent, fontWeight: '800' }}>{nutrition.carbsConsumed}g</Text>
              </Text>
            </View>
            <View style={[styles.macroPill, { backgroundColor: colors.surfaceHighlight }]}>
              <Text style={[styles.macroPillLabel, { color: colors.textSecondary }]}>
                F: <Text style={{ color: '#EC4899', fontWeight: '800' }}>{nutrition.fatConsumed}g</Text>
              </Text>
            </View>
          </View>
        </ScalePressable>
        </FadeInUp>

        {/* ================= CARD 3: RUNNING & CARDIO (Cyan Accent) ================= */}
        <FadeInUp delay={170}>
        <ScalePressable
          pressedScale={0.98}
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.pillars.running.tint,
              borderColor: colors.border,
            },
          ]}
          onPress={() => onNavigatePillar('running')}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTag, { color: colors.pillars.running.accent }]}>Running & cardio</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Distance, pace & sessions</Text>
            </View>
            <View style={[styles.iconGlowingCircle, { backgroundColor: colors.pillars.running.soft }]}>
              <Footprints size={22} color={colors.pillars.running.accent} />
            </View>
          </View>

          <View style={styles.metricsTripleRow}>
            <View style={styles.metricSingleBox}>
              <Text style={[styles.metricBigNum, { color: colors.pillars.running.accent }]}>
                {running.todayDistanceKm > 0 ? running.todayDistanceKm.toFixed(2) : '0.00'}
                <Text style={[styles.metricUnitSmall, { color: colors.textMuted }]}> km</Text>
              </Text>
              <Text style={[styles.metricUnitLabel, { color: colors.textMuted }]}>Distance</Text>
            </View>

            <View style={styles.metricSingleBox}>
              <Text style={[styles.metricBigNum, { color: colors.text }]}>{runDurationText}</Text>
              <Text style={[styles.metricUnitLabel, { color: colors.textMuted }]}>Duration</Text>
            </View>

            <View style={styles.metricSingleBox}>
              <Text style={[styles.metricBigNum, { color: colors.text }]}>
                {running.todayPaceFormatted}
              </Text>
              <Text style={[styles.metricUnitLabel, { color: colors.textMuted }]}>Pace /km</Text>
            </View>
          </View>
        </ScalePressable>
        </FadeInUp>

        {/* ================= CARD 4: BODY TRACKER (Purple Accent) ================= */}
        <FadeInUp delay={225}>
        <ScalePressable
          pressedScale={0.98}
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.pillars.body.tint,
              borderColor: colors.border,
            },
          ]}
          onPress={() => onNavigatePillar('body')}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTag, { color: colors.pillars.body.accent }]}>Body tracker</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Weight curve & measurements</Text>
            </View>
            <View style={[styles.iconGlowingCircle, { backgroundColor: colors.pillars.body.soft }]}>
              <Scale size={22} color={colors.pillars.body.accent} />
            </View>
          </View>

          <View style={styles.metricsTripleRow}>
            <View style={styles.metricSingleBox}>
              <Text style={[styles.metricBigNum, { color: colors.pillars.body.accent }]}>
                {body.latestWeightKg ? u.fmt(body.latestWeightKg, { unit: false }) : '--'}
                <Text style={[styles.metricUnitSmall, { color: colors.textMuted }]}> {u.label}</Text>
              </Text>
              <Text style={[styles.metricUnitLabel, { color: colors.textMuted }]}>Weight</Text>
            </View>

            <View style={styles.metricSingleBox}>
              <Text
                style={[
                  styles.metricBigNum,
                  {
                    color:
                      body.weightChangeWeekKg === null
                        ? colors.textMuted
                        : body.weightChangeWeekKg <= 0
                        ? '#22C55E'
                        : '#F59E0B',
                  },
                ]}
              >
                {body.weightChangeWeekKg === null
                  ? '--'
                  : body.weightChangeWeekKg > 0
                  ? `+${u.fmt(body.weightChangeWeekKg)}`
                  : `${body.weightChangeWeekKg < 0 ? '-' : ''}${u.fmt(Math.abs(body.weightChangeWeekKg))}`}
              </Text>
              <Text style={[styles.metricUnitLabel, { color: colors.textMuted }]}>7-day trend</Text>
            </View>

            <View style={styles.metricSingleBox}>
              <Text style={[styles.metricBigNum, { color: colors.text }]}>
                {body.bodyFatPct ? `${body.bodyFatPct}%` : '--'}
              </Text>
              <Text style={[styles.metricUnitLabel, { color: colors.textMuted }]}>Body fat</Text>
            </View>
          </View>
        </ScalePressable>
        </FadeInUp>

        {/* ================= CARD 5: FULL ANALYTICS & DASHBOARD (Indigo / Rose Accent) ================= */}
        <FadeInUp delay={280}>
        <ScalePressable
          pressedScale={0.98}
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.pillars.analytics.tint,
              borderColor: colors.border,
            },
          ]}
          onPress={() => onNavigatePillar('analytics')}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTag, { color: colors.pillars.analytics.accent }]}>Full analytics dashboard</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Pie charts, heatmaps & 1RM matrix</Text>
            </View>
            <View style={[styles.iconGlowingCircle, { backgroundColor: colors.pillars.analytics.soft }]}>
              <BarChart3 size={22} color={colors.pillars.analytics.accent} />
            </View>
          </View>

          <View style={styles.metricsTripleRow}>
            <View style={styles.metricSingleBox}>
              <Text style={[styles.metricBigNum, { color: colors.pillars.analytics.accent }]}>
                Charts
              </Text>
              <Text style={[styles.metricUnitLabel, { color: colors.textMuted }]}>Pie & curves</Text>
            </View>

            <View style={styles.metricSingleBox}>
              <Text style={[styles.metricBigNum, { color: colors.text }]}>Heatmap</Text>
              <Text style={[styles.metricUnitLabel, { color: colors.textMuted }]}>Calendar</Text>
            </View>

            <View style={styles.metricSingleBox}>
              <Text style={[styles.metricBigNum, { color: colors.text }]}>1RM</Text>
              <Text style={[styles.metricUnitLabel, { color: colors.textMuted }]}>Records</Text>
            </View>
          </View>
        </ScalePressable>
        </FadeInUp>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  brandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    ...typography.titleLarge,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  dateNavWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
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
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  dateText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingBlock: {
    paddingTop: 4,
    paddingBottom: 2,
    gap: 2,
  },
  greetingTitle: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  greetingSub: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  heroCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 0,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTag: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.1,
  },
  cardSubtitle: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  iconGlowingCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsTripleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricSingleBox: {
    flex: 1,
  },
  metricBigNum: {
    ...typography.mono,
    fontSize: 20,
    fontWeight: '900',
  },
  metricUnitSmall: {
    fontSize: 13,
    fontWeight: '600',
  },
  metricUnitLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.1,
  },
  durationInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    ...typography.mono,
    fontSize: 17,
    fontWeight: '800',
  },
  nutritionCaloriesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  nutritionCalBig: {
    ...typography.mono,
    fontSize: 24,
    fontWeight: '900',
  },
  pctBadgeText: {
    ...typography.caption,
    fontSize: 14,
    fontWeight: '900',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  macroPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macroPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  macroPillLabel: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
});
