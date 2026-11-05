import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, FlatList, LayoutChangeEvent } from 'react-native';
import { ChevronDown, Dumbbell, Moon, Search, X, Zap } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { Text, TextInput } from '../common/Typography';
import { Modal } from '../common/Modal';
import { useTheme } from '../../theme/theme';
import { haptics } from '../../utils/haptics';
import { SoftCard, Kicker, Sparkline } from './ProgressKit';
import { ProgressData, readiness, strengthFor, trackedExercises } from '../../analytics/progress';
import { checkInWord } from '../../db/checkins';

import { useUnits } from '../../utils/units';
/**
 * Strength · est. 1RM: pick any exercise you've logged at least twice with
 * weight; see its 1RM trend over the last 24 sessions and, for the big
 * barbell lifts, how strong you are for your bodyweight.
 */
export const StrengthCard: React.FC<{ data: ProgressData }> = ({ data }) => {
  const { colors } = useTheme();
  const u = useUnits();
  const tracked = useMemo(() => trackedExercises(data), [data]);
  const [id, setId] = useState<number | null>(null);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');
  useEffect(() => {
    if (picking) setQuery('');
  }, [picking]);
  const q = query.trim().toLowerCase();
  const matches = q ? tracked.filter((t) => t.name.toLowerCase().includes(q)) : tracked;
  const [w, setW] = useState(0);

  useEffect(() => {
    if (id == null || !tracked.some((t) => t.id === id)) setId(tracked[0]?.id ?? null);
  }, [tracked, id]);

  const s = useMemo(() => (id == null ? null : strengthFor(data, id)), [data, id]);

  return (
    <SoftCard>
      <Kicker>Strength · est. 1RM</Kicker>
      {!s ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>Log an exercise twice and its strength curve shows up here.</Text>
      ) : (
        <>
          <Pressable
            style={styles.picker}
            onPress={() => {
              if (tracked.length < 2) return;
              haptics.select();
              setPicking(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${s.name}. Change exercise`}
          >
            <View style={[styles.thumb, { backgroundColor: colors.primaryMuted }]}>
              <Dumbbell size={18} color={colors.primary} />
            </View>
            <Text style={[styles.exName, { color: colors.text }]} numberOfLines={1}>
              {s.name}
            </Text>
            {tracked.length > 1 && (
              <View style={[styles.caret, { backgroundColor: colors.surfaceHighlight }]}>
                <ChevronDown size={14} color={colors.textSecondary} />
              </View>
            )}
          </Pressable>

          <View style={styles.valueRow}>
            <Text style={[styles.value, { color: colors.text }]}>
              {u.fmt(s.last, { unit: false, decimals: 0 })} <Text style={[styles.unit, { color: colors.textMuted }]}>{u.label}</Text>
            </Text>
            {s.series.length > 1 && (
              <Text style={[styles.delta, { color: s.last - s.first >= 0 ? colors.success : colors.danger }]}>
                {s.last - s.first >= 0 ? '▲' : '▼'} {u.fmt(Math.abs(s.last - s.first))}
              </Text>
            )}
          </View>
          <Text style={[styles.range, { color: colors.textMuted }]}>
            {s.firstDate && s.lastDate ? `${format(parseISO(s.firstDate), 'd MMM')} – ${format(parseISO(s.lastDate), 'd MMM')}` : ''} ·{' '}
            {s.sessions} {s.sessions === 1 ? 'session' : 'sessions'}
          </Text>

          <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={styles.chart}>
            <Sparkline id={`str-${id}`} values={s.series} width={w} height={90} color={colors.primary} fill strokeWidth={2.5} />
          </View>

          {s.relative && (
            <View style={[styles.relative, { backgroundColor: colors.surfaceHighlight }]}>
              <View style={styles.relHead}>
                <Text style={[styles.relRatio, { color: colors.text }]}>
                  {s.relative.ratio.toFixed(2)}× your bodyweight
                </Text>
                <Text style={[styles.relLevel, { color: colors.primary }]}>{s.relative.levelName}</Text>
              </View>
              <View style={[styles.relTrack, { backgroundColor: colors.border }]}>
                <View style={[styles.relFill, { width: `${s.relative.toNext * 100}%`, backgroundColor: colors.primary }]} />
              </View>
              <Text style={[styles.relNext, { color: colors.textMuted }]}>
                {s.relative.nextName ? `${Math.round(s.relative.toNext * 100)}% of the way to ${s.relative.nextName}` : 'Top level reached'}
              </Text>
            </View>
          )}
        </>
      )}

      <Modal visible={picking} onClose={() => setPicking(false)} title="Choose exercise">
        <View style={[styles.search, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Search size={17} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${tracked.length} exercises`}
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear search">
              <X size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
        <FlatList
          data={matches}
          keyExtractor={(t) => String(t.id)}
          style={{ maxHeight: 420 }}
          contentContainerStyle={{ paddingBottom: 8 }}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={14}
          windowSize={7}
          ListEmptyComponent={<Text style={[styles.noMatch, { color: colors.textMuted }]}>No exercises match “{query.trim()}”.</Text>}
          renderItem={({ item: t, index: i }) => {
            const on = t.id === id;
            return (
              <Pressable
                onPress={() => {
                  haptics.select();
                  setId(t.id);
                  setPicking(false);
                }}
                style={[styles.pickRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
              >
                <Text style={[styles.pickName, { color: on ? colors.primary : colors.text }]} numberOfLines={1}>
                  {t.name}
                </Text>
                <Text style={[styles.pickCount, { color: colors.textMuted }]}>{t.sessions} sessions</Text>
              </Pressable>
            );
          }}
        />
      </Modal>
    </SoftCard>
  );
};

/** Sleep and energy: how your ratings line up with how strong you are that day. */
export const ReadinessCard: React.FC<{ data: ProgressData }> = ({ data }) => {
  const { colors } = useTheme();
  const r = useMemo(() => readiness(data), [data]);
  if (r.rated === 0) return null;

  const avg = (Icon: typeof Moon, label: string, v: number | null, tint: string) => (
    <View style={[styles.avg, { backgroundColor: colors.surfaceHighlight }]}>
      <Icon size={16} color={tint} />
      <View>
        <Text style={[styles.avgLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.avgValue, { color: colors.text }]}>{v == null ? '–' : checkInWord(v)}</Text>
      </View>
    </View>
  );

  return (
    <SoftCard>
      <Kicker>Sleep and energy</Kicker>
      <Text style={[styles.readyHead, { color: colors.text }]}>{r.headline}</Text>
      <Text style={[styles.readyHint, { color: colors.textMuted }]}>{r.hint}</Text>
      <Text style={[styles.avgTitle, { color: colors.textMuted }]}>Average of the last 30 days</Text>
      <View style={styles.avgRow}>
        {avg(Moon, 'Sleep', r.sleep, colors.success)}
        {avg(Zap, 'Energy', r.energy, colors.warning)}
      </View>
    </SoftCard>
  );
};

const styles = StyleSheet.create({
  empty: { fontSize: 13, lineHeight: 19 },
  picker: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  exName: { flex: 1, fontSize: 15, fontWeight: '700' },
  caret: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 14 },
  value: { fontSize: 30, fontWeight: '800', letterSpacing: -0.6 },
  unit: { fontSize: 14, fontWeight: '600' },
  delta: { fontSize: 13, fontWeight: '800' },
  range: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  chart: { marginTop: 10 },
  relative: { borderRadius: 14, padding: 12, marginTop: 12, gap: 8 },
  relHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  relRatio: { fontSize: 15, fontWeight: '800' },
  relLevel: { fontSize: 13, fontWeight: '800' },
  relTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  relFill: { height: '100%', borderRadius: 3 },
  relNext: { fontSize: 12, fontWeight: '600' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, paddingHorizontal: 14, height: 46, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500', paddingVertical: 0 },
  noMatch: { fontSize: 14, paddingVertical: 16 },
  pickRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 10 },
  pickName: { flex: 1, fontSize: 15, fontWeight: '600' },
  pickCount: { fontSize: 12, fontWeight: '600' },
  readyHead: { fontSize: 16, fontWeight: '800', lineHeight: 21 },
  readyHint: { fontSize: 12, fontWeight: '500', marginTop: 4, lineHeight: 17 },
  avgTitle: { fontSize: 11, fontWeight: '600', marginTop: 14, marginBottom: 8 },
  avgRow: { flexDirection: 'row', gap: 10 },
  avg: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 12 },
  avgLabel: { fontSize: 11, fontWeight: '600' },
  avgValue: { fontSize: 15, fontWeight: '800' },
});
