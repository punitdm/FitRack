import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { Pencil, Plus } from 'lucide-react-native';
import { differenceInCalendarDays, format, parseISO, startOfWeek } from 'date-fns';
import { Text, TextInput } from '../common/Typography';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useTheme } from '../../theme/theme';
import { haptics } from '../../utils/haptics';
import { useUnits } from '../../utils/units';

type Period = '30D' | '90D' | '1Y' | 'All';
const PERIOD_DAYS: Record<Period, number | null> = { '30D': 30, '90D': 90, '1Y': 365, All: null };

const trim = (n: number) => (Math.round(n * 10) / 10).toString();
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${trim(Math.abs(n))}`;

/** Smooth path through points (Catmull-Rom → Bézier). */
function smooth(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6} ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6} ${p2.x} ${p2.y}`;
  }
  return d;
}

interface WeightHistorySheetProps {
  visible: boolean;
  weights: { date: string; kg: number }[]; // oldest first
  goalKg: number | null;
  onClose: () => void;
  onLogWeight: (kg: number) => void;
  onSaveGoal: (kg: number | null) => void;
}

/**
 * Bodyweight: latest weigh-in, change over a chosen period, a smooth trend
 * chart, goal weight, weekly averages (chart + list), and logging a new weight.
 */
export const WeightHistorySheet: React.FC<WeightHistorySheetProps> = ({
  visible,
  weights: weightsKg,
  goalKg: goalStoredKg,
  onClose,
  onLogWeight,
  onSaveGoal,
}) => {
  const { colors } = useTheme();
  const u = useUnits();
  // Everything below works in the chosen unit; values go back to kg on save.
  const weights = useMemo(() => weightsKg.map((w) => ({ date: w.date, kg: u.toDisplay(w.kg) })), [weightsKg, u]);
  const goalKg = goalStoredKg != null ? u.toDisplay(goalStoredKg) : null;
  const [minW, maxW] = u.unit === 'lb' ? [44, 880] : [20, 400];
  const [period, setPeriod] = useState<Period>('90D');
  const [w, setW] = useState(0);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalText, setGoalText] = useState('');
  const [logging, setLogging] = useState(false);
  const [logText, setLogText] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const line = colors.pillars.running.accent;

  const latest = weights[weights.length - 1] ?? null;

  useEffect(() => {
    if (!visible) return;
    setEditingGoal(false);
    setLogging(weights.length === 0);
    setLogText(latest ? String(latest.kg) : '');
    setGoalText(goalKg ? String(goalKg) : '');
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const inPeriod = useMemo(() => {
    const days = PERIOD_DAYS[period];
    if (!days || !latest) return weights;
    return weights.filter((x) => differenceInCalendarDays(parseISO(latest.date), parseISO(x.date)) < days);
  }, [weights, period, latest]);
  const change = inPeriod.length >= 2 ? inPeriod[inPeriod.length - 1].kg - inPeriod[0].kg : 0;

  const weekly = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const x of weights) {
      const k = format(startOfWeek(parseISO(x.date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      map.set(k, [...(map.get(k) ?? []), x.kg]);
    }
    const rows = [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([week, l]) => ({ week, avg: Math.round((l.reduce((a, b) => a + b, 0) / l.length) * 10) / 10 }));
    return rows.map((r, i) => ({ ...r, delta: i > 0 ? Math.round((r.avg - rows[i - 1].avg) * 10) / 10 : null }));
  }, [weights]);

  const goalDiff = goalKg && latest ? Math.round((latest.kg - goalKg) * 10) / 10 : null;

  const saveLog = () => {
    const kg = parseFloat(logText.replace(',', '.'));
    if (!Number.isFinite(kg) || kg <= minW || kg >= maxW) return;
    haptics.tap();
    onLogWeight(Math.round(u.fromDisplay(kg) * 100) / 100);
    setLogging(false);
  };
  const saveGoal = () => {
    const kg = parseFloat(goalText.replace(',', '.'));
    onSaveGoal(Number.isFinite(kg) && kg > minW && kg < maxW ? Math.round(u.fromDisplay(kg) * 100) / 100 : null);
    setEditingGoal(false);
  };

  // ---------------------------------------------------------- main chart
  const chartH = 170;
  const axisW = 40;
  const plotW = Math.max(0, w - axisW);
  const vals = inPeriod.map((x) => x.kg);
  const lo = vals.length ? Math.min(...vals) : 0;
  const hi = vals.length ? Math.max(...vals) : 1;
  const pad = Math.max(0.3, (hi - lo) * 0.15);
  const yMin = lo - pad;
  const yMax = hi + pad;
  const y = (v: number) => 10 + (1 - (v - yMin) / (yMax - yMin || 1)) * (chartH - 30);
  const pts = inPeriod.map((x, i) => ({ x: inPeriod.length === 1 ? plotW / 2 : (i / (inPeriod.length - 1)) * (plotW - 12) + 6, y: y(x.kg) }));
  const grid = [yMax - pad * 0.5, (yMax + yMin) / 2, yMin + pad * 0.5];

  // ---------------------------------------------------------- weekly chart
  const lastWeeks = weekly.slice(-8);
  const wkH = 150;
  const wVals = lastWeeks.map((r) => r.avg);
  const wLo = wVals.length ? Math.min(...wVals) : 0;
  const wHi = wVals.length ? Math.max(...wVals) : 1;
  const wy = (v: number) => 34 + (1 - (v - (wLo - 0.5)) / (wHi + 0.5 - (wLo - 0.5) || 1)) * (wkH - 70);
  const step = lastWeeks.length > 1 ? (w - 40) / (lastWeeks.length - 1) : 0;
  const wPts = lastWeeks.map((r, i) => ({ x: 20 + (lastWeeks.length === 1 ? (w - 40) / 2 : i * step), y: wy(r.avg) }));

  return (
    <Modal visible={visible} onClose={onClose} title="Bodyweight">
      <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 16 }}>
        <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
          {/* Headline */}
          <View style={styles.head}>
            <Text style={[styles.date, { color: colors.textMuted }]}>
              {latest ? format(parseISO(latest.date), 'MMM d, yyyy') : 'No weigh-ins yet'}
            </Text>
            {latest && (
              <>
                <Text style={[styles.big, { color: colors.text }]}>
                  {trim(latest.kg)}
                  <Text style={[styles.bigUnit, { color: colors.textSecondary }]}> {u.label}</Text>
                </Text>
                <Text style={[styles.change, { color: colors.textSecondary }]}>
                  {inPeriod.length >= 2 ? `${signed(change)} ${u.label} in this period` : 'Log more weigh-ins to see a trend'}
                </Text>
              </>
            )}
          </View>

          {/* Period */}
          {weights.length > 0 && (
            <View style={[styles.periods, { backgroundColor: colors.surfaceHighlight }]}>
              {(Object.keys(PERIOD_DAYS) as Period[]).map((p) => {
                const on = p === period;
                return (
                  <Pressable
                    key={p}
                    onPress={() => {
                      haptics.select();
                      setPeriod(p);
                    }}
                    style={[styles.period, on && { backgroundColor: colors.text }]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={[styles.periodText, { color: on ? colors.background : colors.textSecondary }]}>{p}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Trend chart */}
          {w > 0 && inPeriod.length >= 1 && (
            <Svg width={w} height={chartH}>
              <Defs>
                <LinearGradient id="bwFill" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={line} stopOpacity="0.22" />
                  <Stop offset="1" stopColor={line} stopOpacity="0" />
                </LinearGradient>
              </Defs>
              {grid.map((g, i) => (
                <React.Fragment key={i}>
                  <Line x1={0} x2={plotW} y1={y(g)} y2={y(g)} stroke={colors.border} strokeDasharray="4 6" strokeWidth={1} />
                  <SvgText x={w - 2} y={y(g) + 4} fontSize={11} fill={colors.textMuted} textAnchor="end">
                    {trim(g)}
                  </SvgText>
                </React.Fragment>
              ))}
              {pts.length > 1 && (
                <>
                  <Path d={`${smooth(pts)} L ${pts[pts.length - 1].x} ${chartH} L ${pts[0].x} ${chartH} Z`} fill="url(#bwFill)" />
                  <Path d={smooth(pts)} stroke={line} strokeWidth={2.5} fill="none" strokeLinecap="round" />
                </>
              )}
              {pts.length > 0 && (
                <>
                  <Circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={9} fill={line} opacity={0.2} />
                  <Circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={5} fill={colors.surfaceCard} stroke={line} strokeWidth={2.5} />
                </>
              )}
            </Svg>
          )}

          {/* Goal weight */}
          <View style={[styles.goalRow, { borderColor: colors.border }]}>
            <Text style={[styles.goalLabel, { color: colors.text }]}>Goal weight</Text>
            {editingGoal ? (
              <View style={styles.inlineEdit}>
                <TextInput
                  style={[styles.inlineInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={goalText}
                  onChangeText={setGoalText}
                  keyboardType="decimal-pad"
                  placeholder={u.label}
                  placeholderTextColor={colors.textDisabled}
                  autoFocus
                  onSubmitEditing={saveGoal}
                />
                <Pressable onPress={saveGoal} hitSlop={8} style={[styles.inlineSave, { backgroundColor: colors.primary }]}>
                  <Text style={{ color: colors.textInverse, fontWeight: '800', fontSize: 13 }}>Save</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  haptics.select();
                  setEditingGoal(true);
                }}
                hitSlop={8}
                style={styles.goalValueBtn}
                accessibilityRole="button"
                accessibilityLabel="Edit goal weight"
              >
                <Text style={[styles.goalValue, { color: colors.pillars.nutrition.accent }]}>{goalKg ? `${trim(goalKg)} ${u.label}` : 'Set goal'}</Text>
                <Pencil size={16} color={colors.pillars.nutrition.accent} />
              </Pressable>
            )}
          </View>
          {goalDiff != null && (
            <Text style={[styles.goalNote, { color: colors.textSecondary }]}>
              {Math.abs(goalDiff) < 0.1 ? 'Goal reached' : goalDiff > 0 ? `${trim(goalDiff)} ${u.label} to lose` : `${trim(-goalDiff)} ${u.label} to gain`}
            </Text>
          )}

          {/* Weekly average */}
          {lastWeeks.length > 0 && (
            <>
              <Text style={[styles.section, { color: colors.textMuted }]}>Weekly average</Text>
              <View style={[styles.box, { borderColor: colors.border }]}>
                {w > 0 && (
                  <Svg width={w - 2} height={wkH}>
                    <Defs>
                      <LinearGradient id="wkFill" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor={line} stopOpacity="0.18" />
                        <Stop offset="1" stopColor={line} stopOpacity="0" />
                      </LinearGradient>
                    </Defs>
                    {goalKg != null && goalKg >= wLo - 0.5 && goalKg <= wHi + 0.5 && (
                      <Line x1={10} x2={w - 12} y1={wy(goalKg)} y2={wy(goalKg)} stroke={colors.textMuted} strokeDasharray="6 6" strokeWidth={1} />
                    )}
                    {wPts.length > 1 && (
                      <>
                        <Path d={`${smooth(wPts)} L ${wPts[wPts.length - 1].x} ${wkH - 26} L ${wPts[0].x} ${wkH - 26} Z`} fill="url(#wkFill)" />
                        <Path d={smooth(wPts)} stroke={line} strokeWidth={2.5} fill="none" />
                      </>
                    )}
                    {wPts.map((p, i) => (
                      <React.Fragment key={i}>
                        <Circle cx={p.x} cy={p.y} r={5} fill={colors.surfaceCard} stroke={line} strokeWidth={2.5} />
                        <SvgText x={p.x} y={p.y - 14} fontSize={11.5} fontWeight="700" fill={colors.textSecondary} textAnchor="middle">
                          {trim(lastWeeks[i].avg)}
                        </SvgText>
                        <SvgText x={p.x} y={wkH - 6} fontSize={11} fill={colors.textMuted} textAnchor="middle">
                          {format(parseISO(lastWeeks[i].week), 'MMM d')}
                        </SvgText>
                      </React.Fragment>
                    ))}
                    <Line x1={10} x2={w - 12} y1={wkH - 24} y2={wkH - 24} stroke={colors.border} strokeWidth={1} />
                  </Svg>
                )}
              </View>

              <View style={[styles.box, styles.list, { borderColor: colors.border }]}>
                {[...weekly].reverse().map((r, i) => (
                  <View key={r.week} style={[styles.listRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                    <Text style={[styles.listWeek, { color: colors.textSecondary }]}>Week of {format(parseISO(r.week), 'MMM d')}</Text>
                    <Text style={[styles.listAvg, { color: colors.text }]}>{trim(r.avg)} {u.label}</Text>
                    <Text style={[styles.listDelta, { color: colors.textMuted }]}>{r.delta == null ? '' : `${signed(r.delta)} ${u.label}`}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Log new weight */}
          {logging ? (
            <View style={[styles.box, styles.logBox, { borderColor: colors.border }]}>
              <Text style={[styles.logTitle, { color: colors.text }]}>New weigh-in for today</Text>
              <View style={[styles.logInputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.logInput, { color: colors.text }]}
                  value={logText}
                  onChangeText={setLogText}
                  keyboardType="decimal-pad"
                  placeholder="82.0"
                  placeholderTextColor={colors.textDisabled}
                  autoFocus
                  selectTextOnFocus
                  onSubmitEditing={saveLog}
                />
                <Text style={{ color: colors.textMuted, fontSize: 15, fontWeight: '700' }}>{u.label}</Text>
              </View>
              <Button title="Save weight" size="lg" onPress={saveLog} style={{ borderRadius: 14 }} />
            </View>
          ) : (
            <Pressable
              onPress={() => {
                haptics.select();
                setLogging(true);
                setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
              }}
              style={[styles.logBtn, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
            >
              <Plus size={18} color={colors.textInverse} strokeWidth={3} />
              <Text style={[styles.logBtnText, { color: colors.textInverse }]}>Log new weight</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: 2, marginBottom: 16 },
  date: { fontSize: 14, fontWeight: '500' },
  big: { fontSize: 56, fontWeight: '800', letterSpacing: -1.5, lineHeight: 64 },
  bigUnit: { fontSize: 20, fontWeight: '600' },
  change: { fontSize: 15, fontWeight: '500' },
  periods: { flexDirection: 'row', alignSelf: 'center', borderRadius: 22, padding: 4, marginBottom: 16 },
  period: { paddingHorizontal: 18, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  periodText: { fontSize: 14, fontWeight: '700' },
  goalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, marginTop: 12 },
  goalLabel: { fontSize: 17, fontWeight: '600' },
  goalValueBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalValue: { fontSize: 17, fontWeight: '800' },
  goalNote: { textAlign: 'center', fontSize: 15, fontWeight: '600', marginBottom: 8 },
  inlineEdit: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineInput: { width: 80, height: 38, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, fontSize: 16, fontWeight: '700' },
  inlineSave: { height: 38, paddingHorizontal: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  section: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, marginTop: 18, marginBottom: 10, marginLeft: 4 },
  box: { borderWidth: 1, borderRadius: 22, paddingVertical: 8, marginBottom: 12, overflow: 'hidden' },
  list: { paddingHorizontal: 16 },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  listWeek: { flex: 1, fontSize: 15, fontWeight: '500' },
  listAvg: { width: 92, fontSize: 15, fontWeight: '800', textAlign: 'right' },
  listDelta: { width: 78, fontSize: 14, fontWeight: '600', textAlign: 'right' },
  logBox: { padding: 16, gap: 12 },
  logTitle: { fontSize: 15, fontWeight: '800' },
  logInputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 14, minHeight: 52 },
  logInput: { flex: 1, fontSize: 22, fontWeight: '800' },
  logBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52, borderRadius: 16, marginTop: 8 },
  logBtnText: { fontSize: 16, fontWeight: '800' },
});
