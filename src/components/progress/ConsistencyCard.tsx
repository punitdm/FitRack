import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, LayoutChangeEvent } from 'react-native';
import { Flame } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { Text } from '../common/Typography';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useTheme } from '../../theme/theme';
import { haptics } from '../../utils/haptics';
import { SoftCard, Kicker, fmtKg } from './ProgressKit';
import { HEATMAP_WEEKS, PSession, ProgressData, dayStreak, daysDoneThisWeek, heatmap, yearWeeks } from '../../analytics/progress';

import { useUnits } from '../../utils/units';
const DAY_LABELS = ['M', '', 'W', '', 'F', '', 'S'];
const GAP = 3;

/**
 * Training heatmap: one column per week (Mon at the top), darker = heavier day
 * relative to your others. Tap a day to see what you did. Toggle 12 weeks /
 * all time.
 */
export const ConsistencyCard: React.FC<{ data: ProgressData; onOpenDay: (date: string) => void }> = ({ data, onOpenDay }) => {
  const { colors } = useTheme();
  const [all, setAll] = useState(false);
  const [width, setWidth] = useState(0);
  const [day, setDay] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const weeks = all ? yearWeeks(data) : HEATMAP_WEEKS;
  const grid = useMemo(() => heatmap(data, weeks), [data, weeks]);
  const streak = dayStreak(data);
  const done = daysDoneThisWeek(data);

  const labelW = 14;
  const fitCell = width > 0 ? Math.floor((width - labelW - GAP * HEATMAP_WEEKS) / HEATMAP_WEEKS) : 0;
  const cell = Math.max(10, Math.min(24, fitCell));
  const shades = ['', 0.28, 0.5, 0.75, 1];

  const color = (level: number) =>
    level < 0 ? 'transparent' : level === 0 ? colors.surfaceHighlight : colors.primary;
  const opacity = (level: number) => (level <= 0 ? 1 : (shades[level] as number));

  return (
    <SoftCard>
      <Kicker
        right={
          <Pressable
            onPress={() => {
              haptics.select();
              setAll((v) => !v);
            }}
            hitSlop={8}
            style={[styles.toggle, { backgroundColor: colors.surfaceHighlight }]}
            accessibilityRole="button"
            accessibilityLabel={all ? 'Show last 12 weeks' : 'Show all time'}
          >
            <Text style={[styles.toggleText, { color: colors.textSecondary }]}>{all ? 'All time' : '12 weeks'}</Text>
          </Pressable>
        }
      >
        Consistency
      </Kicker>

      <View style={styles.headline}>
        <Flame size={20} color={colors.warning} fill={streak > 0 ? colors.warning : 'none'} />
        <Text style={[styles.streak, { color: colors.text }]}>{streak}-day streak</Text>
      </View>
      <Text style={[styles.sub, { color: colors.textMuted }]}>
        {done} of {data.weeklyGoal} this week
      </Text>

      <View style={styles.gridWrap} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
        <View style={[styles.labels, { width: labelW }]}>
          {DAY_LABELS.map((l, i) => (
            <Text key={i} style={[styles.dayLabel, { height: cell, lineHeight: cell, color: colors.textMuted, marginBottom: GAP }]}>
              {l}
            </Text>
          ))}
        </View>
        {width > 0 && (
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEnabled={all}
            nestedScrollEnabled
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            <View style={styles.cols}>
              {Array.from({ length: grid.weeks }, (_, wk) => (
                <View key={wk} style={{ marginRight: GAP }}>
                  {Array.from({ length: 7 }, (_, d) => {
                    const i = wk * 7 + d;
                    const level = grid.levels[i];
                    const date = grid.dates[i];
                    return (
                      <Pressable
                        key={d}
                        disabled={level < 0}
                        onPress={() => {
                          haptics.select();
                          setDay(date);
                        }}
                        hitSlop={1}
                        accessibilityLabel={`${format(parseISO(date), 'EEE d MMM')}${level > 0 ? ', trained' : ''}`}
                      >
                        <View
                          style={{
                            width: cell,
                            height: cell,
                            borderRadius: Math.max(3, cell / 4),
                            marginBottom: GAP,
                            backgroundColor: color(level),
                            opacity: opacity(level),
                            borderWidth: date === format(data.now, 'yyyy-MM-dd') ? 1.5 : 0,
                            borderColor: colors.text,
                          }}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      <View style={styles.legend}>
        <Text style={[styles.legendText, { color: colors.textMuted }]}>Less</Text>
        {[0, 1, 2, 3, 4].map((l) => (
          <View key={l} style={[styles.legendCell, { backgroundColor: color(l), opacity: opacity(l) }]} />
        ))}
        <Text style={[styles.legendText, { color: colors.textMuted }]}>More</Text>
      </View>

      <DaySheet
        date={day}
        session={day ? data.byDate.get(day) ?? null : null}
        onClose={() => setDay(null)}
        onOpen={(d) => {
          setDay(null);
          onOpenDay(d);
        }}
      />
    </SoftCard>
  );
};

const DaySheet: React.FC<{
  date: string | null;
  session: PSession | null;
  onClose: () => void;
  onOpen: (date: string) => void;
}> = ({ date, session, onClose, onOpen }) => {
  const { colors } = useTheme();
  const u = useUnits();
  const title = date ? format(parseISO(date), 'EEEE, d MMMM') : '';
  const vol = u.fmtVolume(session?.volume ?? 0);
  return (
    <Modal visible={!!date} onClose={onClose} title={title}>
      <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 12, paddingBottom: 8 }}>
        {!session ? (
          <Text style={{ color: colors.textMuted, fontSize: 14 }}>Rest day. Nothing logged.</Text>
        ) : (
          <>
            <View style={styles.dayStats}>
              <Text style={[styles.dayStat, { color: colors.text }]}>
                {session.exercises.length} <Text style={{ color: colors.textMuted, fontSize: 13 }}>exercises</Text>
              </Text>
              <Text style={[styles.dayStat, { color: colors.text }]}>
                {session.setCount} <Text style={{ color: colors.textMuted, fontSize: 13 }}>sets</Text>
              </Text>
              {session.volume > 0 && (
                <Text style={[styles.dayStat, { color: colors.text }]}>
                  {vol.value} <Text style={{ color: colors.textMuted, fontSize: 13 }}>{vol.unit}</Text>
                </Text>
              )}
            </View>
            {session.exercises.map((e) => (
              <View key={e.id} style={[styles.exRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.exName, { color: colors.text }]}>{e.name}</Text>
                <Text style={[styles.exSets, { color: colors.textSecondary }]}>
                  {e.sets.map((s) => (s.w > 0 ? `${u.fmt(s.w, { unit: false })}×${s.r}` : s.r > 0 ? `${s.r} reps` : '✓')).join('   ')}
                </Text>
              </View>
            ))}
          </>
        )}
        {date && (
          <Button title="Open this day in Workout" variant="secondary" onPress={() => onOpen(date)} style={{ borderRadius: 14, marginTop: 4 }} />
        )}
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  toggle: { paddingHorizontal: 10, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  toggleText: { fontSize: 12, fontWeight: '700' },
  headline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streak: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  sub: { fontSize: 13, fontWeight: '600', marginTop: 2, marginBottom: 14 },
  gridWrap: { flexDirection: 'row' },
  labels: {},
  dayLabel: { fontSize: 9, fontWeight: '700' },
  cols: { flexDirection: 'row' },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 6 },
  legendText: { fontSize: 11, fontWeight: '600', marginHorizontal: 2 },
  legendCell: { width: 10, height: 10, borderRadius: 3 },
  dayStats: { flexDirection: 'row', gap: 18 },
  dayStat: { fontSize: 20, fontWeight: '800' },
  exRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, gap: 3 },
  exName: { fontSize: 15, fontWeight: '700' },
  exSets: { fontSize: 13, fontWeight: '500', lineHeight: 19 },
});
