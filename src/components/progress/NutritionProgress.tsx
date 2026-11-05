import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, LayoutChangeEvent, ActivityIndicator } from 'react-native';
import * as SQLite from 'expo-sqlite';
import Svg, { Line, Rect } from 'react-native-svg';
import Animated, { FadeIn } from 'react-native-reanimated';
import { addDays, format, parseISO } from 'date-fns';
import { ChevronDown, ChevronUp, Droplets, Flame, Target, Utensils } from 'lucide-react-native';
import { Text } from '../common/Typography';
import { useTheme } from '../../theme/theme';
import { haptics } from '../../utils/haptics';
import { SoftCard, Kicker } from './ProgressKit';
import { ProgressRing } from '../nutrition/ProgressRing';
import {
  DEFAULT_GOALS,
  FoodEntry,
  MEALS,
  MEAL_LABEL,
  NutritionGoals,
  getFoodEntries,
  getNutritionGoals,
} from '../../db/nutrition';

import { RollingNumber, SkeletonCard } from '../common/Polish';
type Period = 7 | 30 | 90;

interface DayLog {
  date: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number;
  foods: string | null;
}

const fmtInt = (n: number) => Math.round(n).toLocaleString();
const iso = (d: Date) => format(d, 'yyyy-MM-dd');

/**
 * Progress → Nutrition: averages vs your goals, a daily calories chart, macro
 * averages and split, water, and a readable day-by-day log you can expand.
 */
export const NutritionProgress: React.FC<{ db: SQLite.SQLiteDatabase; reloadKey: number }> = ({ db, reloadKey }) => {
  const { colors } = useTheme();
  const [period, setPeriod] = useState<Period>(30);
  const [goals, setGoals] = useState<NutritionGoals>(DEFAULT_GOALS);
  const [logs, setLogs] = useState<Map<string, DayLog> | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [chartW, setChartW] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [entries, setEntries] = useState<FoodEntry[]>([]);

  const load = useCallback(async () => {
    try {
      const since = iso(addDays(new Date(), -89));
      const [g, macros, water] = await Promise.all([
        getNutritionGoals(db),
        db.getAllAsync<{ date: string; total_calories: number; total_protein: number; total_carbs: number; total_fat: number; actual_food: string | null }>(
          'SELECT date, total_calories, total_protein, total_carbs, total_fat, actual_food FROM macro_logs WHERE date >= ?',
          [since]
        ),
        db.getAllAsync<{ date: string; amount_ml: number }>('SELECT date, amount_ml FROM hydration_logs WHERE date >= ?', [since]),
      ]);
      const map = new Map<string, DayLog>();
      for (const m of macros) {
        map.set(m.date, {
          date: m.date,
          kcal: m.total_calories || 0,
          protein: m.total_protein || 0,
          carbs: m.total_carbs || 0,
          fat: m.total_fat || 0,
          water: 0,
          foods: m.actual_food,
        });
      }
      for (const w of water) {
        const d = map.get(w.date) ?? { date: w.date, kcal: 0, protein: 0, carbs: 0, fat: 0, water: 0, foods: null };
        d.water = w.amount_ml || 0;
        map.set(w.date, d);
      }
      setGoals(g);
      setLogs(map);
    } catch (e) {
      console.error('Nutrition progress load failed:', e);
    }
  }, [db]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  useEffect(() => {
    if (!expanded) return;
    getFoodEntries(db, expanded).then(setEntries).catch(() => setEntries([]));
  }, [db, expanded, reloadKey]);

  // Every day in the period (oldest first), logged or not.
  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: period }, (_, i) => iso(addDays(today, i - (period - 1))));
  }, [period]);

  const stats = useMemo(() => {
    if (!logs) return null;
    const logged = days.map((d) => logs.get(d)).filter((l): l is DayLog => !!l && l.kcal > 0);
    const n = logged.length;
    const avg = (k: 'kcal' | 'protein' | 'carbs' | 'fat') => (n ? logged.reduce((a, l) => a + l[k], 0) / n : 0);
    const waterDays = days.map((d) => logs.get(d)?.water ?? 0).filter((v) => v > 0);
    const onTarget = logged.filter((l) => Math.abs(l.kcal - goals.calories) <= goals.calories * 0.1).length;
    const proteinHit = logged.filter((l) => l.protein >= goals.protein * 0.9).length;
    const kcal = avg('kcal');
    const p = avg('protein');
    const c = avg('carbs');
    const f = avg('fat');
    const macroKcal = p * 4 + c * 4 + f * 9 || 1;
    return {
      n,
      kcal,
      p,
      c,
      f,
      onTarget,
      proteinHit,
      split: { p: (p * 4) / macroKcal, c: (c * 4) / macroKcal, f: (f * 9) / macroKcal },
      water: waterDays.length ? waterDays.reduce((a, b) => a + b, 0) / waterDays.length : 0,
      waterDays: waterDays.length,
      waterHit: waterDays.filter((v) => v >= goals.waterMl).length,
      maxKcal: Math.max(goals.calories * 1.2, ...logged.map((l) => l.kcal)),
    };
  }, [logs, days, goals]);

  if (!logs || !stats) {
    return (
      <View style={styles.wrap}>
        <SkeletonCard rows={2} tall={90} />
        <SkeletonCard rows={1} tall={150} />
        <SkeletonCard rows={3} />
      </View>
    );
  }

  const tone = (kcal: number) =>
    kcal <= 0
      ? colors.surfaceHighlight
      : kcal > goals.calories * 1.1
        ? colors.danger
        : kcal >= goals.calories * 0.9
          ? colors.success
          : colors.pillars.nutrition.accent;

  const pickedLog = picked ? logs.get(picked) : null;
  const history = [...days].reverse().map((d) => logs.get(d)).filter((l): l is DayLog => !!l && (l.kcal > 0 || l.water > 0));

  // ------------------------------------------------------------ chart geometry
  const chartH = 150;
  const gap = period === 7 ? 10 : period === 30 ? 3 : 1.5;
  const barW = chartW > 0 ? Math.max(2, (chartW - gap * (days.length - 1)) / days.length) : 0;
  const yOf = (v: number) => chartH - (v / stats.maxKcal) * (chartH - 8);
  const labelEvery = period === 7 ? 1 : period === 30 ? 7 : 30;

  return (
    <View style={styles.wrap}>
      {/* Period */}
      <View style={[styles.periods, { backgroundColor: colors.surfaceHighlight }]}>
        {([7, 30, 90] as Period[]).map((p) => {
          const on = p === period;
          return (
            <Pressable
              key={p}
              onPress={() => {
                haptics.select();
                setPeriod(p);
                setPicked(null);
              }}
              style={[styles.period, on && { backgroundColor: colors.text }]}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.periodText, { color: on ? colors.background : colors.textSecondary }]}>{p}D</Text>
            </Pressable>
          );
        })}
      </View>

      {stats.n === 0 ? (
        <SoftCard>
          <View style={styles.empty}>
            <Utensils size={22} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No food logged in the last {period} days</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>Log meals in Nutrition and your averages show up here.</Text>
          </View>
        </SoftCard>
      ) : (
        <>
          {/* Average per day */}
          <SoftCard>
            <Kicker>Average per day</Kicker>
            <View style={styles.avgRow}>
              <ProgressRing
                progress={goals.calories > 0 ? stats.kcal / goals.calories : 0}
                size={112}
                stroke={10}
                color={tone(stats.kcal)}
                trackColor={colors.surfaceHighlight}
              >
                <Text style={[styles.ringPct, { color: colors.text }]}>{Math.round((stats.kcal / goals.calories) * 100)}%</Text>
                <Text style={[styles.ringSub, { color: colors.textMuted }]}>of goal</Text>
              </ProgressRing>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.bigKcal, { color: colors.text }]}>
                  <RollingNumber value={stats.kcal} style={[styles.bigKcal, { color: colors.text }]} />{' '}
                  <Text style={[styles.bigUnit, { color: colors.textMuted }]}>kcal</Text>
                </Text>
                <Text style={[styles.avgGoal, { color: colors.textSecondary }]}>Goal {fmtInt(goals.calories)} kcal</Text>
                <View style={styles.factRow}>
                  <Fact icon={<Utensils size={14} color={colors.textSecondary} />} text={`${stats.n} of ${period} days logged`} />
                  <Fact icon={<Target size={14} color={colors.success} />} text={`${stats.onTarget} days on target`} />
                </View>
              </View>
            </View>
          </SoftCard>

          {/* Calories chart */}
          <SoftCard>
            <Kicker>Calories</Kicker>
            <Text style={[styles.chartHead, { color: colors.text }]}>
              {pickedLog
                ? `${format(parseISO(pickedLog.date), 'EEE, d MMM')} · ${fmtInt(pickedLog.kcal)} kcal`
                : picked
                  ? `${format(parseISO(picked), 'EEE, d MMM')} · nothing logged`
                  : 'Tap a bar to see the day'}
            </Text>
            <View onLayout={(e: LayoutChangeEvent) => setChartW(e.nativeEvent.layout.width)} style={{ marginTop: 10 }}>
              {chartW > 0 && (
                <>
                  <Svg width={chartW} height={chartH}>
                    {days.map((d, i) => {
                      const v = logs.get(d)?.kcal ?? 0;
                      const h = v > 0 ? Math.max(3, chartH - yOf(v)) : 3;
                      const sel = d === picked;
                      return (
                        <Rect
                          key={d}
                          x={i * (barW + gap)}
                          y={chartH - h}
                          width={barW}
                          height={h}
                          rx={Math.min(4, barW / 2)}
                          fill={tone(v)}
                          opacity={picked && !sel ? 0.45 : 1}
                        />
                      );
                    })}
                    <Line x1={0} x2={chartW} y1={yOf(goals.calories)} y2={yOf(goals.calories)} stroke={colors.textMuted} strokeDasharray="5 5" strokeWidth={1.2} />
                  </Svg>
                  {/* Tap targets laid over the bars (wider than the bars for easy tapping) */}
                  <View style={[StyleSheet.absoluteFill, styles.hitRow]}>
                    {days.map((d) => (
                      <Pressable
                        key={d}
                        style={{ flex: 1 }}
                        onPress={() => {
                          haptics.select();
                          setPicked((p) => (p === d ? null : d));
                        }}
                        accessibilityLabel={`${format(parseISO(d), 'EEEE d MMMM')}: ${fmtInt(logs.get(d)?.kcal ?? 0)} kilocalories`}
                      />
                    ))}
                  </View>
                  <View style={styles.xLabels}>
                    {days.map((d, i) =>
                      i % labelEvery === 0 || i === days.length - 1 ? (
                        <Text
                          key={d}
                          style={[styles.xLabel, { color: colors.textMuted, left: i * (barW + gap) + barW / 2 - 20 }]}
                        >
                          {period === 7 ? format(parseISO(d), 'EEE') : format(parseISO(d), 'd MMM')}
                        </Text>
                      ) : null
                    )}
                  </View>
                </>
              )}
            </View>
            <View style={styles.legendRow}>
              <Legend color={colors.pillars.nutrition.accent} label="Under" />
              <Legend color={colors.success} label="On target (±10%)" />
              <Legend color={colors.danger} label="Over" />
            </View>
          </SoftCard>

          {/* Macros */}
          <SoftCard>
            <Kicker>Macros · daily average</Kicker>
            <View style={styles.splitBar}>
              <View style={{ flex: stats.split.p, backgroundColor: colors.macros.protein }} />
              <View style={{ flex: stats.split.c, backgroundColor: colors.macros.carbs }} />
              <View style={{ flex: stats.split.f, backgroundColor: colors.macros.fat }} />
            </View>
            <Text style={[styles.splitText, { color: colors.textSecondary }]}>
              Calories from protein {Math.round(stats.split.p * 100)}% · carbs {Math.round(stats.split.c * 100)}% · fat{' '}
              {Math.round(stats.split.f * 100)}%
            </Text>
            <MacroRow label="Protein" value={stats.p} goal={goals.protein} color={colors.macros.protein} />
            <MacroRow label="Carbs" value={stats.c} goal={goals.carbs} color={colors.macros.carbs} />
            <MacroRow label="Fat" value={stats.f} goal={goals.fat} color={colors.macros.fat} />
            <Text style={[styles.note, { color: colors.textMuted }]}>
              Protein goal hit on {stats.proteinHit} of {stats.n} logged days.
            </Text>
          </SoftCard>

          {/* Water */}
          <SoftCard>
            <Kicker>Water</Kicker>
            <View style={styles.waterRow}>
              <View style={[styles.waterIcon, { backgroundColor: colors.pillars.running.soft }]}>
                <Droplets size={20} color={colors.pillars.running.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.waterVal, { color: colors.text }]}>
                  {(stats.water / 1000).toFixed(2)} L
                  <Text style={[styles.bigUnit, { color: colors.textMuted }]}> / {(goals.waterMl / 1000).toFixed(1)} L a day</Text>
                </Text>
                <Text style={[styles.note, { color: colors.textMuted, marginTop: 2 }]}>
                  {stats.waterDays === 0 ? 'No water logged in this period' : `Goal hit on ${stats.waterHit} of ${stats.waterDays} days`}
                </Text>
              </View>
            </View>
          </SoftCard>
        </>
      )}

      {/* Daily log */}
      {history.length > 0 && (
        <SoftCard style={{ paddingHorizontal: 0, paddingBottom: 4 }}>
          <View style={{ paddingHorizontal: 16 }}>
            <Kicker>Daily log</Kicker>
          </View>
          {history.map((l, i) => {
            const open = expanded === l.date;
            const pct = goals.calories > 0 ? Math.min(1, l.kcal / goals.calories) : 0;
            return (
              <View key={l.date} style={[i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                <Pressable
                  onPress={() => {
                    haptics.select();
                    setEntries([]);
                    setExpanded(open ? null : l.date);
                  }}
                  style={({ pressed }) => [styles.dayRow, pressed && { backgroundColor: colors.surfaceHighlight }]}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                >
                  <View style={styles.dayTop}>
                    <Text style={[styles.dayDate, { color: colors.text }]}>{format(parseISO(l.date), 'EEE, d MMM')}</Text>
                    <Text style={[styles.dayKcal, { color: colors.text }]}>
                      {fmtInt(l.kcal)} <Text style={[styles.dayUnit, { color: colors.textMuted }]}>kcal</Text>
                    </Text>
                    {open ? <ChevronUp size={18} color={colors.textMuted} /> : <ChevronDown size={18} color={colors.textMuted} />}
                  </View>
                  <View style={[styles.dayTrack, { backgroundColor: colors.surfaceHighlight }]}>
                    <View style={[styles.dayFill, { width: `${pct * 100}%`, backgroundColor: tone(l.kcal) }]} />
                  </View>
                  <View style={styles.chips}>
                    <Chip label="Protein" value={l.protein} color={colors.macros.protein} />
                    <Chip label="Carbs" value={l.carbs} color={colors.macros.carbs} />
                    <Chip label="Fat" value={l.fat} color={colors.macros.fat} />
                    {l.water > 0 && (
                      <Text style={[styles.waterChip, { color: colors.pillars.running.accent }]}>{(l.water / 1000).toFixed(1)} L</Text>
                    )}
                  </View>
                </Pressable>

                {open && (
                  <Animated.View entering={FadeIn.duration(180)} style={styles.foods}>
                    {entries.length === 0 ? (
                      <Text style={[styles.foodLine, { color: colors.textMuted }]}>{l.foods?.replace(/\n/g, '  ') || 'No foods recorded'}</Text>
                    ) : (
                      [...MEALS.map((m) => m.key), 'other' as const].map((meal) => {
                        const list = entries.filter((e) => e.meal === meal);
                        if (list.length === 0) return null;
                        const kcal = list.reduce((a, e) => a + e.calories, 0);
                        return (
                          <View key={meal} style={styles.mealBlock}>
                            <View style={styles.mealHead}>
                              <Text style={[styles.mealName, { color: colors.textSecondary }]}>{MEAL_LABEL[meal]}</Text>
                              <Text style={[styles.mealKcal, { color: colors.textMuted }]}>{fmtInt(kcal)} kcal</Text>
                            </View>
                            {list.map((e) => (
                              <View key={e.id} style={styles.foodRow}>
                                <Text style={[styles.foodLine, { color: colors.text, flex: 1 }]} numberOfLines={2}>
                                  {e.name}
                                </Text>
                                <Text style={[styles.foodKcal, { color: colors.textSecondary }]}>{fmtInt(e.calories)}</Text>
                              </View>
                            ))}
                          </View>
                        );
                      })
                    )}
                  </Animated.View>
                )}
              </View>
            );
          })}
        </SoftCard>
      )}
    </View>
  );
};

const Fact: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.fact}>
      {icon}
      <Text style={[styles.factText, { color: colors.textSecondary }]}>{text}</Text>
    </View>
  );
};

const Legend: React.FC<{ color: string; label: string }> = ({ color, label }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.legend}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
};

const MacroRow: React.FC<{ label: string; value: number; goal: number; color: string }> = ({ label, value, goal, color }) => {
  const { colors } = useTheme();
  const pct = goal > 0 ? value / goal : 0;
  return (
    <View style={styles.macroRow}>
      <View style={styles.macroHead}>
        <View style={[styles.legendDot, { backgroundColor: color }]} />
        <Text style={[styles.macroLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.macroVal, { color: colors.text }]}>
          {Math.round(value)} g <Text style={{ color: colors.textMuted, fontWeight: '600' }}>/ {goal} g</Text>
        </Text>
      </View>
      <View style={[styles.dayTrack, { backgroundColor: colors.surfaceHighlight }]}>
        <View style={[styles.dayFill, { width: `${Math.min(100, pct * 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
};

const Chip: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.chip, { backgroundColor: colors.surfaceHighlight }]}>
      <View style={[styles.chipDot, { backgroundColor: color }]} />
      <Text style={[styles.chipText, { color: colors.text }]}>
        {Math.round(value)}g <Text style={{ color: colors.textMuted, fontWeight: '600' }}>{label}</Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  loading: { paddingVertical: 60, alignItems: 'center' },
  periods: { flexDirection: 'row', alignSelf: 'flex-start', borderRadius: 20, padding: 4 },
  period: { paddingHorizontal: 18, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  periodText: { fontSize: 14, fontWeight: '700' },
  empty: { alignItems: 'center', gap: 6, paddingVertical: 18 },
  emptyTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptySub: { fontSize: 13, textAlign: 'center' },

  avgRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  ringPct: { fontSize: 22, fontWeight: '800' },
  ringSub: { fontSize: 11, fontWeight: '600' },
  bigKcal: { fontSize: 30, fontWeight: '800', letterSpacing: -0.6 },
  bigUnit: { fontSize: 14, fontWeight: '600' },
  avgGoal: { fontSize: 14, fontWeight: '600' },
  factRow: { gap: 4, marginTop: 8 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  factText: { fontSize: 13, fontWeight: '600' },

  chartHead: { fontSize: 15, fontWeight: '700' },
  hitRow: { flexDirection: 'row', bottom: 22 },
  xLabels: { height: 20, marginTop: 4 },
  xLabel: { position: 'absolute', width: 40, textAlign: 'center', fontSize: 11, fontWeight: '600' },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 10 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, fontWeight: '600' },

  splitBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2 },
  splitText: { fontSize: 13, fontWeight: '600', marginTop: 8, marginBottom: 6 },
  macroRow: { marginTop: 12, gap: 6 },
  macroHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  macroLabel: { flex: 1, fontSize: 15, fontWeight: '700' },
  macroVal: { fontSize: 15, fontWeight: '800' },
  note: { fontSize: 13, fontWeight: '500', marginTop: 12 },

  waterRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  waterIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  waterVal: { fontSize: 22, fontWeight: '800' },

  dayRow: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  dayTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayDate: { flex: 1, fontSize: 16, fontWeight: '700' },
  dayKcal: { fontSize: 17, fontWeight: '800' },
  dayUnit: { fontSize: 12, fontWeight: '600' },
  dayTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  dayFill: { height: '100%', borderRadius: 3 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 28, borderRadius: 14 },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: 13, fontWeight: '800' },
  waterChip: { fontSize: 13, fontWeight: '800', marginLeft: 4 },

  foods: { paddingHorizontal: 16, paddingBottom: 14, gap: 10 },
  mealBlock: { gap: 4 },
  mealHead: { flexDirection: 'row', justifyContent: 'space-between' },
  mealName: { fontSize: 13, fontWeight: '800' },
  mealKcal: { fontSize: 12, fontWeight: '600' },
  foodRow: { flexDirection: 'row', gap: 10 },
  foodLine: { fontSize: 14, lineHeight: 20 },
  foodKcal: { fontSize: 13, fontWeight: '700' },
});
