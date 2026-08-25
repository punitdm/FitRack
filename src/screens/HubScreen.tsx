import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
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
import { useTheme, typography, borderRadius, spacing } from '../theme/theme';
import { HubSummary } from '../types/database';
import { getTodayHubSummary } from '../db/database';
import { formatDisplayDate, shiftDate } from '../utils/dateUtils';

interface HubScreenProps {
  db: SQLite.SQLiteDatabase;
  selectedDate: string;
  onDateChange?: (newDate: string) => void;
  onOpenDatePicker: () => void;
  onNavigatePillar: (pillar: 'workout' | 'nutrition' | 'running' | 'body' | 'analytics' | 'settings') => void;
  onShowToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

export const HubScreen: React.FC<HubScreenProps> = ({
  db,
  selectedDate,
  onDateChange,
  onOpenDatePicker,
  onNavigatePillar,
  onShowToast,
}) => {
  const { colors, isDark } = useTheme();

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
  }, [loadData]);

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
      {/* 1. TOP HEADER */}
      <View style={[styles.topHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.brandingRow}>
          <View style={[styles.brandIconBox, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}>
            <Dumbbell size={18} color={colors.primary} />
          </View>
          <Text style={[styles.brandTitle, { color: colors.text }]}>
            Fit<Text style={{ color: colors.primary }}>Rack</Text>
          </Text>
        </View>

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
            <Calendar size={14} color={colors.primary} />
            <Text style={[styles.dateText, { color: colors.text }]}>
              {formatDisplayDate(selectedDate)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.arrowBtn} onPress={handleNextDay} activeOpacity={0.6}>
            <ChevronRight size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.settingsBtn, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}
          onPress={() => onNavigatePillar('settings')}
          activeOpacity={0.7}
        >
          <Settings size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadData} tintColor={colors.primary} />
        }
      >
        {/* ================= CARD 1: WORKOUT (Volt / Green Accent) ================= */}
        <TouchableOpacity
          style={[
            styles.heroCard,
            {
              backgroundColor: isDark ? '#131A17' : '#F0FDF4',
              borderColor: isDark ? '#22C55E' : '#86EFAC',
            },
          ]}
          onPress={() => onNavigatePillar('workout')}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTag, { color: isDark ? '#22C55E' : '#16A34A' }]}>WORKOUT</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                {workout.totalSets > 0 ? 'TODAY’S ACTIVE SESSION' : 'LOG GYM WORKOUT'}
              </Text>
            </View>
            <View style={[styles.iconGlowingCircle, { backgroundColor: isDark ? '#22C55E20' : '#DCFCE7' }]}>
              <Dumbbell size={22} color={isDark ? '#22C55E' : '#16A34A'} />
            </View>
          </View>

          <View style={styles.metricsTripleRow}>
            <View style={styles.metricSingleBox}>
              <Text style={[styles.metricBigNum, { color: isDark ? '#22C55E' : '#16A34A' }]}>
                {workout.totalSets}
              </Text>
              <Text style={[styles.metricUnitLabel, { color: colors.textMuted }]}>SETS</Text>
            </View>

            <View style={[styles.metricSingleBox, { flex: 1.4 }]}>
              <Text style={[styles.metricBigNum, { color: colors.text }]}>
                {workout.totalVolumeKg.toLocaleString()}
                <Text style={[styles.metricUnitSmall, { color: colors.textMuted }]}> kg</Text>
              </Text>
              <Text style={[styles.metricUnitLabel, { color: colors.textMuted }]}>VOLUME</Text>
            </View>

            <View style={styles.metricSingleBox}>
              <View style={styles.durationInline}>
                <Clock size={12} color={colors.textMuted} />
                <Text style={[styles.durationText, { color: colors.textSecondary }]}>
                  {workout.durationMinutes > 0 ? `${workout.durationMinutes}m` : '0m'}
                </Text>
              </View>
              <Text style={[styles.metricUnitLabel, { color: colors.textMuted }]}>TIME</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* ================= CARD 2: NUTRITION & MEALS (Amber Accent) ================= */}
        <TouchableOpacity
          style={[
            styles.heroCard,
            {
              backgroundColor: isDark ? '#1C1811' : '#FFFDF7',
              borderColor: isDark ? '#F59E0B' : '#FCD34D',
            },
          ]}
          onPress={() => onNavigatePillar('nutrition')}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTag, { color: isDark ? '#F59E0B' : '#D97706' }]}>NUTRITION</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>LOGGED MEALS & CALORIES</Text>
            </View>
            <View style={[styles.iconGlowingCircle, { backgroundColor: isDark ? '#F59E0B20' : '#FEF3C7' }]}>
              <Utensils size={22} color={isDark ? '#F59E0B' : '#D97706'} />
            </View>
          </View>

          <View style={styles.nutritionCaloriesRow}>
            <Text style={[styles.nutritionCalBig, { color: colors.text }]}>
              {nutrition.caloriesConsumed.toLocaleString()}{' '}
              <Text style={{ fontSize: 16, color: colors.textMuted }}>
                / {nutrition.calorieTarget} kcal
              </Text>
            </Text>
            <Text style={[styles.pctBadgeText, { color: isDark ? '#F59E0B' : '#D97706' }]}>
              {calPercent}%
            </Text>
          </View>

          {/* Calorie Bar */}
          <View style={[styles.progressBarTrack, { backgroundColor: colors.surfaceHighlight }]}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${calPercent}%`, backgroundColor: isDark ? '#F59E0B' : '#D97706' },
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
                C: <Text style={{ color: isDark ? '#F59E0B' : '#D97706', fontWeight: '800' }}>{nutrition.carbsConsumed}g</Text>
              </Text>
            </View>
            <View style={[styles.macroPill, { backgroundColor: colors.surfaceHighlight }]}>
              <Text style={[styles.macroPillLabel, { color: colors.textSecondary }]}>
                F: <Text style={{ color: '#EC4899', fontWeight: '800' }}>{nutrition.fatConsumed}g</Text>
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* ================= CARD 3: RUNNING & CARDIO (Cyan Accent) ================= */}
        <TouchableOpacity
          style={[
            styles.heroCard,
            {
              backgroundColor: isDark ? '#0E1722' : '#F0F9FF',
              borderColor: isDark ? '#38BDF8' : '#7DD3FC',
            },
          ]}
          onPress={() => onNavigatePillar('running')}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTag, { color: isDark ? '#38BDF8' : '#0284C7' }]}>RUNNING & CARDIO</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>DISTANCE, PACE & SESSIONS</Text>
            </View>
            <View style={[styles.iconGlowingCircle, { backgroundColor: isDark ? '#38BDF820' : '#E0F2FE' }]}>
              <Footprints size={22} color={isDark ? '#38BDF8' : '#0284C7'} />
            </View>
          </View>

          <View style={styles.metricsTripleRow}>
            <View style={styles.metricSingleBox}>
              <Text style={[styles.metricBigNum, { color: isDark ? '#38BDF8' : '#0284C7' }]}>
                {running.todayDistanceKm > 0 ? running.todayDistanceKm.toFixed(2) : '0.00'}
                <Text style={[styles.metricUnitSmall, { color: colors.textMuted }]}> km</Text>
              </Text>
              <Text style={[styles.metricUnitLabel, { color: colors.textMuted }]}>DISTANCE</Text>
            </View>

            <View style={styles.metricSingleBox}>
              <Text style={[styles.metricBigNum, { color: colors.text }]}>{runDurationText}</Text>
              <Text style={[styles.metricUnitLabel, { color: colors.textMuted }]}>DURATION</Text>
            </View>

            <View style={styles.metricSingleBox}>
              <Text style={[styles.metricBigNum, { color: colors.text }]}>
                {running.todayPaceFormatted}
              </Text>
              <Text style={[styles.metricUnitLabel, { color: colors.textMuted }]}>PACE /KM</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* ================= CARD 4: BODY TRACKER (Purple Accent) ================= */}
        <TouchableOpacity
          style={[
            styles.heroCard,
            {
              backgroundColor: isDark ? '#161124' : '#FAF5FF',
              borderColor: isDark ? '#A855F7' : '#D8B4FE',
            },
          ]}
          onPress={() => onNavigatePillar('body')}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTag, { color: isDark ? '#A855F7' : '#7C3AED' }]}>BODY TRACKER</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>WEIGHT CURVE & MEASUREMENTS</Text>
            </View>
            <View style={[styles.iconGlowingCircle, { backgroundColor: isDark ? '#A855F720' : '#F3E8FF' }]}>
              <Scale size={22} color={isDark ? '#A855F7' : '#7C3AED'} />
            </View>
          </View>

          <View style={styles.metricsTripleRow}>
            <View style={styles.metricSingleBox}>
              <Text style={[styles.metricBigNum, { color: isDark ? '#A855F7' : '#7C3AED' }]}>
                {body.latestWeightKg ? body.latestWeightKg : '--'}
                <Text style={[styles.metricUnitSmall, { color: colors.textMuted }]}> kg</Text>
              </Text>
              <Text style={[styles.metricUnitLabel, { color: colors.textMuted }]}>WEIGHT</Text>
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
                  ? `+${body.weightChangeWeekKg} kg`
                  : `${body.weightChangeWeekKg} kg`}
              </Text>
              <Text style={[styles.metricUnitLabel, { color: colors.textMuted }]}>7-DAY TREND</Text>
            </View>

            <View style={styles.metricSingleBox}>
              <Text style={[styles.metricBigNum, { color: colors.text }]}>
                {body.bodyFatPct ? `${body.bodyFatPct}%` : '--'}
              </Text>
              <Text style={[styles.metricUnitLabel, { color: colors.textMuted }]}>BODY FAT</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* ================= CARD 5: FULL ANALYTICS & DASHBOARD (Indigo / Rose Accent) ================= */}
        <TouchableOpacity
          style={[
            styles.heroCard,
            {
              backgroundColor: isDark ? '#141424' : '#F5F3FF',
              borderColor: isDark ? '#6366F1' : '#A5B4FC',
            },
          ]}
          onPress={() => onNavigatePillar('analytics')}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <View>
              <Text style={[styles.cardTag, { color: isDark ? '#818CF8' : '#4F46E5' }]}>FULL ANALYTICS DASHBOARD</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>PIE CHARTS, HEATMAPS & 1RM MATRIX</Text>
            </View>
            <View style={[styles.iconGlowingCircle, { backgroundColor: isDark ? '#6366F120' : '#EDE9FE' }]}>
              <BarChart3 size={22} color={isDark ? '#818CF8' : '#4F46E5'} />
            </View>
          </View>

          <View style={styles.metricsTripleRow}>
            <View style={styles.metricSingleBox}>
              <Text style={[styles.metricBigNum, { color: isDark ? '#818CF8' : '#4F46E5' }]}>
                Charts
              </Text>
              <Text style={[styles.metricUnitLabel, { color: colors.textMuted }]}>PIE & CURVES</Text>
            </View>

            <View style={styles.metricSingleBox}>
              <Text style={[styles.metricBigNum, { color: colors.text }]}>Heatmap</Text>
              <Text style={[styles.metricUnitLabel, { color: colors.textMuted }]}>CALENDAR</Text>
            </View>

            <View style={styles.metricSingleBox}>
              <Text style={[styles.metricBigNum, { color: colors.text }]}>1RM</Text>
              <Text style={[styles.metricUnitLabel, { color: colors.textMuted }]}>RECORDS</Text>
            </View>
          </View>
        </TouchableOpacity>
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
    borderBottomWidth: 1,
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
    borderWidth: 1,
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
    borderWidth: 1,
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
    borderWidth: 1.5,
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
    letterSpacing: 0.8,
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
    letterSpacing: 0.5,
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
