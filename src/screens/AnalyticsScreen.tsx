import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import Svg, { G, Circle } from 'react-native-svg';
import {
  Flame,
  Scale,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from 'lucide-react-native';
import * as SQLite from 'expo-sqlite';
import { useTheme, typography, borderRadius, spacing } from '../theme/theme';
import {
  getCategoryBreakdown,
  CategoryBreakdownResult,
  getRepMaxMatrix,
  ExerciseRepMaxRow,
  getCalendarCategoryDots,
  CalendarDayWorkoutData,
  getRecentMacroLogs,
  getAllBodyStats,
} from '../db/database';
import { WorkoutCalendar } from '../components/analytics/WorkoutCalendar';
import { Card } from '../components/common/Card';
import { formatShortDate, shiftDate, getTodayISO } from '../utils/dateUtils';
import { MacroLog, BodyStats } from '../types/database';

interface AnalyticsScreenProps {
  db: SQLite.SQLiteDatabase;
  onSelectDateAndNavigate: (date: string) => void;
  onShowToast: (type: 'success' | 'error' | 'info', text: string) => void;
}

type AnalysisTab = 'breakdown' | 'calendar' | 'records' | 'macros' | 'weight';

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({
  db,
  onSelectDateAndNavigate,
  onShowToast,
}) => {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<AnalysisTab>('breakdown');

  // Breakdown state
  const [period, setPeriod] = useState<'Week' | 'Month' | 'Year' | 'All Time'>('Week');
  const [metric, setMetric] = useState<'sets' | 'volume'>('sets');
  const [referenceDate, setReferenceDate] = useState<string>(getTodayISO());
  const [breakdownData, setBreakdownData] = useState<CategoryBreakdownResult | null>(null);
  const [selectedCatIndex, setSelectedCatIndex] = useState<number>(0);

  // Records state
  const [repMaxMatrix, setRepMaxMatrix] = useState<ExerciseRepMaxRow[]>([]);

  // Calendar dots state
  const [calendarDots, setCalendarDots] = useState<Record<string, CalendarDayWorkoutData>>({});

  // Macros & Stats state
  const [macros, setMacros] = useState<MacroLog[]>([]);
  const [stats, setStats] = useState<BodyStats[]>([]);

  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [breakdown, rmMatrix, dots, macroList, statsList] = await Promise.all([
        getCategoryBreakdown(db, period, metric, referenceDate),
        getRepMaxMatrix(db),
        getCalendarCategoryDots(db),
        getRecentMacroLogs(db, 60),
        getAllBodyStats(db),
      ]);
      setBreakdownData(breakdown);
      setRepMaxMatrix(rmMatrix);
      setCalendarDots(dots);
      setMacros(macroList);
      setStats(statsList);
    } catch (err: any) {
      console.error(err);
      onShowToast('error', `Failed to load analysis: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [db, period, metric, referenceDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Date Navigator for Breakdown
  const shiftPeriod = (delta: number) => {
    if (period === 'Week') {
      setReferenceDate((prev) => shiftDate(prev, delta * 7));
    } else if (period === 'Month') {
      setReferenceDate((prev) => shiftDate(prev, delta * 30));
    } else if (period === 'Year') {
      setReferenceDate((prev) => shiftDate(prev, delta * 365));
    }
  };

  // Render SVG Donut Slices
  const renderDonutChart = () => {
    if (!breakdownData || breakdownData.categories.length === 0) {
      return (
        <View style={styles.donutEmptyContainer}>
          <Text style={[styles.donutEmptyText, { color: colors.textMuted }]}>No workout sets in this period</Text>
        </View>
      );
    }

    const size = 200;
    const strokeWidth = 26;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    let accumulatedAngle = -90; // Start at top

    const activeCat = breakdownData.categories[selectedCatIndex] || breakdownData.categories[0];

    return (
      <View style={styles.donutWrapper}>
        <Svg width={size} height={size}>
          <G rotation={0} origin={`${center}, ${center}`}>
            {breakdownData.categories.map((cat) => {
              const strokeDasharray = `${(cat.percentage / 100) * circumference} ${circumference}`;
              const rotation = accumulatedAngle;
              accumulatedAngle += (cat.percentage / 100) * 360;

              return (
                <Circle
                  key={cat.category}
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={cat.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={0}
                  fill="transparent"
                  rotation={rotation}
                  origin={`${center}, ${center}`}
                  strokeLinecap="butt"
                />
              );
            })}
          </G>
        </Svg>

        {/* Center Text inside Donut */}
        <View style={styles.donutCenterContent}>
          <Text style={[styles.donutCenterTitle, { color: colors.text }]} numberOfLines={1}>
            {activeCat ? activeCat.category.toUpperCase() : 'FITRACK'}
          </Text>
          <Text style={[styles.donutCenterPct, { color: colors.secondary }]}>
            {activeCat ? `${activeCat.percentage}%` : ''}
          </Text>
        </View>

        {/* Next/Previous Category Arrows */}
        <View style={styles.donutArrowsCol}>
          <TouchableOpacity
            style={[styles.donutArrowBtn, { backgroundColor: colors.surfaceHighlight }]}
            onPress={() =>
              setSelectedCatIndex((prev) =>
                prev <= 0 ? breakdownData.categories.length - 1 : prev - 1
              )
            }
            activeOpacity={0.7}
          >
            <ChevronUp size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.donutArrowBtn, { backgroundColor: colors.surfaceHighlight }]}
            onPress={() =>
              setSelectedCatIndex((prev) =>
                prev >= breakdownData.categories.length - 1 ? 0 : prev + 1
              )
            }
            activeOpacity={0.7}
          >
            <ChevronDown size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Analysis Subtabs (FitNotes Style) */}
      <View style={[styles.topTabsBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {[
            { key: 'breakdown' as AnalysisTab, label: 'BREAKDOWN' },
            { key: 'calendar' as AnalysisTab, label: 'CALENDAR' },
            { key: 'records' as AnalysisTab, label: 'RECORDS' },
            { key: 'macros' as AnalysisTab, label: 'NUTRITION' },
            { key: 'weight' as AnalysisTab, label: 'BODY STATS' },
          ].map((t) => {
            const isActive = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.topTabItem, isActive && { borderBottomColor: colors.secondary }]}
                onPress={() => setActiveTab(t.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.topTabText, { color: isActive ? colors.secondary : colors.textMuted }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadData} tintColor={colors.primary} />
        }
      >
        {/* ================= 1. BREAKDOWN TAB ================= */}
        {activeTab === 'breakdown' && (
          <View style={styles.tabSection}>
            {/* Filter Control Header */}
            <Card style={[styles.filterCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
              <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>BREAKDOWN:</Text>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => setMetric(metric === 'sets' ? 'volume' : 'sets')}
                >
                  <Text style={[styles.dropdownValue, { color: colors.text }]}>
                    {metric === 'sets' ? 'Number Of Sets (By Category)' : 'Total Volume (By Category)'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>PERIOD:</Text>
                <View style={styles.periodPillsRow}>
                  {(['Week', 'Month', 'Year', 'All Time'] as const).map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.periodPill,
                        { backgroundColor: colors.surfaceHighlight },
                        period === p && { backgroundColor: colors.secondary },
                      ]}
                      onPress={() => setPeriod(p)}
                    >
                      <Text
                        style={[
                          styles.periodPillText,
                          { color: period === p ? colors.textInverse : colors.textSecondary },
                        ]}
                      >
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Date Range with Arrows */}
              <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>DATE:</Text>
                <View style={styles.dateNavRow}>
                  <TouchableOpacity
                    style={styles.dateArrow}
                    onPress={() => shiftPeriod(-1)}
                    activeOpacity={0.7}
                  >
                    <ChevronLeft size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <Text style={[styles.dateRangeText, { color: colors.text }]}>
                    {breakdownData?.dateRangeText || 'Select Period'}
                  </Text>
                  <TouchableOpacity
                    style={styles.dateArrow}
                    onPress={() => shiftPeriod(1)}
                    activeOpacity={0.7}
                  >
                    <ChevronRight size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>

            {/* Donut Chart */}
            <Card style={[styles.chartCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
              {renderDonutChart()}
            </Card>

            {/* Category Breakdown Rows Table */}
            {breakdownData && breakdownData.categories.length > 0 && (
              <Card style={[styles.breakdownTableCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
                {breakdownData.categories.map((cat, idx) => {
                  const isSelected = selectedCatIndex === idx;
                  return (
                    <TouchableOpacity
                      key={cat.category}
                      style={[
                        styles.catBreakdownRow,
                        { borderBottomColor: colors.border },
                        isSelected && { backgroundColor: colors.surfaceHighlight },
                      ]}
                      onPress={() => setSelectedCatIndex(idx)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.catNameCol}>
                        <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
                        <Text style={[styles.catRowTitle, { color: colors.text }]}>{cat.category.toUpperCase()}</Text>
                      </View>

                      <Text style={[styles.catSetsCount, { color: colors.textSecondary }]}>
                        {metric === 'sets' ? `${cat.sets} sets` : `${cat.volumeKg.toLocaleString()} kg`}
                      </Text>
                      <Text style={[styles.catPct, { color: colors.text }]}>{cat.percentage}%</Text>
                    </TouchableOpacity>
                  );
                })}
              </Card>
            )}

            {/* 4-Box 2x2 Metric Summary Grid */}
            <View style={styles.summary2x2Grid}>
              <View style={styles.summaryGridRow}>
                <Card style={[styles.summaryBox, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
                  <Text style={[styles.summaryBoxLabel, { color: colors.textMuted }]}>TOTAL WORKOUTS</Text>
                  <Text style={[styles.summaryBoxVal, { color: colors.text }]}>{breakdownData?.totalWorkouts || 0}</Text>
                </Card>
                <Card style={[styles.summaryBox, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
                  <Text style={[styles.summaryBoxLabel, { color: colors.textMuted }]}>TOTAL SETS</Text>
                  <Text style={[styles.summaryBoxVal, { color: colors.text }]}>{breakdownData?.totalSets || 0}</Text>
                </Card>
              </View>

              <View style={styles.summaryGridRow}>
                <Card style={[styles.summaryBox, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
                  <Text style={[styles.summaryBoxLabel, { color: colors.textMuted }]}>TOTAL REPS</Text>
                  <Text style={[styles.summaryBoxVal, { color: colors.text }]}>{breakdownData?.totalReps || 0}</Text>
                </Card>
                <Card style={[styles.summaryBox, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
                  <Text style={[styles.summaryBoxLabel, { color: colors.textMuted }]}>TOTAL VOLUME</Text>
                  <Text style={[styles.summaryBoxVal, { color: colors.secondary }]}>
                    {(breakdownData?.totalVolumeKg || 0).toLocaleString()}
                    <Text style={[styles.summaryBoxUnit, { color: colors.textSecondary }]}> kgs</Text>
                  </Text>
                </Card>
              </View>
            </View>
          </View>
        )}

        {/* ================= 2. CALENDAR TAB ================= */}
        {activeTab === 'calendar' && (
          <View style={styles.tabSection}>
            <WorkoutCalendar
              categoryDots={calendarDots}
              selectedDate={referenceDate}
              onSelectDate={(date) => {
                setReferenceDate(date);
                onSelectDateAndNavigate(date);
              }}
              monthsToShow={3}
            />
          </View>
        )}

        {/* ================= 3. RECORDS TAB (1RM - 15RM MATRIX) ================= */}
        {activeTab === 'records' && (
          <View style={styles.tabSection}>
            <Card style={[styles.recordsTableCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
              <Text style={[styles.recordsTableTitle, { color: colors.text }]}>Rep Max Matrix (1 RM – 15 RM)</Text>
              <Text style={[styles.recordsTableSub, { color: colors.textMuted }]}>
                Peak weights recorded across every rep count:
              </Text>

              {repMaxMatrix.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                  <View>
                    {/* Header Row (Exercise Names) */}
                    <View style={[styles.rmHeaderRow, { borderBottomColor: colors.borderLight }]}>
                      <View style={[styles.rmCell, styles.rmRowHeaderCell, { borderRightColor: colors.border }]}>
                        <Text style={[styles.rmHeaderCellText, { color: colors.secondary }]}>REP</Text>
                      </View>
                      {repMaxMatrix.map((ex) => (
                        <View key={ex.exerciseId} style={[styles.rmCell, styles.rmExHeaderCell]}>
                          <Text style={[styles.rmExNameText, { color: colors.text }]} numberOfLines={2}>
                            {ex.exerciseName}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* 1 RM through 15 RM Rows */}
                    {Array.from({ length: 15 }, (_, i) => i + 1).map((repCount) => (
                      <View
                        key={repCount}
                        style={[
                          styles.rmDataRow,
                          { borderBottomColor: colors.border },
                          repCount % 2 === 0 && { backgroundColor: colors.surfaceElevated },
                        ]}
                      >
                        <View style={[styles.rmCell, styles.rmRowHeaderCell, { borderRightColor: colors.border }]}>
                          <Text style={[styles.rmRepLabel, { color: colors.textSecondary }]}>{repCount} RM</Text>
                        </View>

                        {repMaxMatrix.map((ex) => {
                          const data = ex.repMaxes[repCount];
                          return (
                            <View key={ex.exerciseId} style={styles.rmCell}>
                              <Text
                                style={[
                                  styles.rmWeightText,
                                  { color: colors.textDisabled },
                                  data && { color: colors.text, fontWeight: '700' },
                                ]}
                              >
                                {data ? `${data.weightKg.toFixed(1)} kgs` : '— —'}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No rep records logged yet.</Text>
              )}
            </Card>
          </View>
        )}

        {/* ================= 4. NUTRITION TAB ================= */}
        {activeTab === 'macros' && (
          <View style={styles.tabSection}>
            <Card style={[styles.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <Flame size={16} color={colors.warning} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>Nutrition Log History</Text>
              </View>

              {macros.map((m) => (
                <View key={m.date} style={[styles.macroLogRow, { borderBottomColor: colors.border }]}>
                  <View style={{ width: 85 }}>
                    <Text style={[styles.macroDate, { color: colors.textSecondary }]}>{formatShortDate(m.date)}</Text>
                    <Text style={[styles.macroCalVal, { color: colors.warning }]}>{m.total_calories} kcal</Text>
                  </View>
                  <View style={styles.macroPillsCol}>
                    <View style={styles.macroPillRow}>
                      <Text style={[styles.macroPill, { color: colors.primary }]}>
                        P: {m.total_protein}g
                      </Text>
                      <Text style={[styles.macroPill, { color: colors.secondary }]}>
                        C: {m.total_carbs}g
                      </Text>
                      <Text style={[styles.macroPill, { color: colors.accent }]}>
                        F: {m.total_fat}g
                      </Text>
                    </View>
                    {m.actual_food ? (
                      <Text style={[styles.foodSnippet, { color: colors.textMuted }]} numberOfLines={1}>
                        {m.actual_food}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* ================= 5. BODY STATS TAB ================= */}
        {activeTab === 'weight' && (
          <View style={styles.tabSection}>
            <Card style={[styles.card, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <Scale size={16} color={colors.primary} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>Weight Progression Logs</Text>
              </View>

              <View style={[styles.statsTableHead, { borderBottomColor: colors.border }]}>
                <Text style={[styles.statsTh, { width: 75, color: colors.textMuted }]}>DATE</Text>
                <Text style={[styles.statsTh, { flex: 1, textAlign: 'center', color: colors.textMuted }]}>WEIGHT</Text>
                <Text style={[styles.statsTh, { flex: 1, textAlign: 'center', color: colors.textMuted }]}>BF%</Text>
                <Text style={[styles.statsTh, { flex: 1, textAlign: 'center', color: colors.textMuted }]}>WAIST</Text>
                <Text style={[styles.statsTh, { flex: 1, textAlign: 'center', color: colors.textMuted }]}>CHEST</Text>
              </View>

              {stats.map((s) => (
                <View key={s.date} style={[styles.statsTableRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.statsTd, { width: 75, color: colors.textSecondary }]}>
                    {formatShortDate(s.date)}
                  </Text>
                  <Text style={[styles.statsTd, { flex: 1, textAlign: 'center', color: colors.primary }]}>
                    {s.weight_kg != null ? `${s.weight_kg}kg` : '—'}
                  </Text>
                  <Text style={[styles.statsTd, { flex: 1, textAlign: 'center', color: colors.secondary }]}>
                    {s.body_fat != null ? `${s.body_fat}%` : '—'}
                  </Text>
                  <Text style={[styles.statsTd, { flex: 1, textAlign: 'center', color: colors.text }]}>
                    {s.waist != null ? s.waist : '—'}
                  </Text>
                  <Text style={[styles.statsTd, { flex: 1, textAlign: 'center', color: colors.text }]}>
                    {s.chest != null ? s.chest : '—'}
                  </Text>
                </View>
              ))}
            </Card>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topTabsBar: {
    borderBottomWidth: 1,
  },
  tabsScroll: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
  },
  topTabItem: {
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  topTabText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  tabSection: {
    gap: spacing.md,
  },
  filterCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  filterLabel: {
    ...typography.caption,
    fontWeight: '800',
    width: 100,
  },
  dropdownTrigger: {
    flex: 1,
  },
  dropdownValue: {
    ...typography.bodySecondary,
    textAlign: 'right',
    fontWeight: '600',
  },
  periodPillsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  periodPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  periodPillText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
  },
  dateNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateArrow: {
    padding: 4,
  },
  dateRangeText: {
    ...typography.caption,
    fontWeight: '700',
  },
  chartCard: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  donutWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
  },
  donutCenterTitle: {
    ...typography.titleSmall,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  donutCenterPct: {
    ...typography.mono,
    fontSize: 18,
    marginTop: 2,
  },
  donutArrowsCol: {
    position: 'absolute',
    right: -40,
    gap: 12,
  },
  donutArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutEmptyContainer: {
    paddingVertical: 40,
  },
  donutEmptyText: {
    ...typography.bodySecondary,
  },
  breakdownTableCard: {
    borderRadius: borderRadius.lg,
    padding: 0,
    overflow: 'hidden',
    borderWidth: 1,
  },
  catBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  catNameCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: 120,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  catRowTitle: {
    ...typography.caption,
    fontWeight: '700',
  },
  catSetsCount: {
    ...typography.bodySecondary,
    fontSize: 13,
  },
  catPct: {
    ...typography.mono,
    fontSize: 13,
  },
  summary2x2Grid: {
    gap: spacing.sm,
  },
  summaryGridRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryBox: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  summaryBoxLabel: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  summaryBoxVal: {
    ...typography.mono,
    fontSize: 22,
    marginTop: 4,
  },
  summaryBoxUnit: {
    fontSize: 12,
  },
  recordsTableCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
  },
  recordsTableTitle: {
    ...typography.titleSmall,
    fontSize: 16,
  },
  recordsTableSub: {
    ...typography.caption,
    marginBottom: spacing.md,
    marginTop: 2,
  },
  rmHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    paddingBottom: 6,
  },
  rmDataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  rmCell: {
    width: 110,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  rmRowHeaderCell: {
    width: 60,
    borderRightWidth: 1,
    alignItems: 'flex-start',
    paddingLeft: 4,
  },
  rmExHeaderCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rmHeaderCellText: {
    ...typography.caption,
    fontWeight: '800',
  },
  rmExNameText: {
    ...typography.caption,
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 11,
  },
  rmRepLabel: {
    ...typography.caption,
    fontWeight: '700',
  },
  rmWeightText: {
    ...typography.mono,
    fontSize: 12,
  },
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.titleSmall,
    fontSize: 15,
  },
  macroLogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  macroDate: {
    ...typography.caption,
    fontWeight: '600',
  },
  macroCalVal: {
    ...typography.mono,
    fontSize: 13,
    marginTop: 2,
  },
  macroPillsCol: {
    flex: 1,
    paddingLeft: spacing.md,
  },
  macroPillRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  macroPill: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  foodSnippet: {
    ...typography.caption,
    marginTop: 4,
    fontStyle: 'italic',
  },
  statsTableHead: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  statsTh: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
  },
  statsTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  statsTd: {
    ...typography.mono,
    fontSize: 11,
  },
  emptyText: {
    ...typography.bodySecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
