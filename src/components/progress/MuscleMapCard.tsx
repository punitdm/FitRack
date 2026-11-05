import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, LayoutChangeEvent } from 'react-native';
import Body, { ExtendedBodyPart, Slug } from 'react-native-body-highlighter';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { hitTestBody, prepareBodyHitTest } from './bodyHitTest';
import { Text } from '../common/Typography';
import { useTheme } from '../../theme/theme';
import { haptics } from '../../utils/haptics';
import { SoftCard, Kicker } from './ProgressKit';
import { MUSCLES, MUSCLE_LABEL, MuscleId } from '../../analytics/muscles';
import { ProgressData, daysSinceTrained, muscleRange, muscleRecovery, untrainedLongest } from '../../analytics/progress';

type Mode = '7d' | '30d' | 'recovery' | 'untrained';

/** Which anatomy regions show each FitRack muscle. */
const SLUGS: Record<MuscleId, Slug[]> = {
  chest: ['chest'],
  shoulders: ['deltoids'],
  trapezius: ['trapezius'],
  back: ['upper-back'],
  lowerback: ['lower-back'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  forearm: ['forearm'],
  abdomen: ['abs', 'obliques'],
  quads: ['quadriceps', 'adductors'],
  hamstrings: ['hamstring'],
  glutes: ['gluteal'],
  calves: ['calves', 'tibialis'],
};
const MUSCLE_OF_SLUG = new Map<string, MuscleId>(
  (Object.entries(SLUGS) as [MuscleId, Slug[]][]).flatMap(([m, slugs]) => slugs.map((s) => [s, m] as [string, MuscleId]))
);

/** Blend two #rrggbb colours. */
function blend(a: string, b: string, t: number): string {
  const p = (h: string) => {
    const m = /^#([0-9a-f]{6})/i.exec(h);
    const n = m ? parseInt(m[1], 16) : 0x808080;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [r1, g1, b1] = p(a);
  const [r2, g2, b2] = p(b);
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `#${[mix(r1, r2), mix(g1, g2), mix(b1, b2)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

const fmtHours = (h: number) => (h < 24 ? `${h}h` : `${Math.round(h / 24)}d`);
const list = (ids: MuscleId[]) => ids.map((m) => MUSCLE_LABEL[m]).join(' · ');

/**
 * Muscle map: anatomical front/back body coloured per muscle.
 *  - 7D / 30D: sets in that window against a 12-sets-a-week target.
 *  - Recovery: how recovered each muscle is (recent work weighs more).
 *  - Untrained: how long since each muscle was the main focus.
 * Tap a muscle to read its numbers.
 */
export const MuscleMapCard: React.FC<{ data: ProgressData }> = ({ data }) => {
  const { colors, isDark } = useTheme();
  const [mode, setMode] = useState<Mode>('7d');
  const [picked, setPicked] = useState<MuscleId | null>(null);
  const [w, setW] = useState(0);

  const r7 = useMemo(() => muscleRange(data, 7), [data]);
  const r30 = useMemo(() => muscleRange(data, 30), [data]);
  const rec = useMemo(() => muscleRecovery(data), [data]);
  const since = useMemo(() => daysSinceTrained(data), [data]);
  const longest = useMemo(() => untrainedLongest(data), [data]);
  const range = mode === '30d' ? r30 : r7;
  const empty = data.sessions.length === 0;

  const base = isDark ? '#3A3F4A' : '#CDD4DE';
  const accent = colors.pillars.running.accent;

  // Five steps per view: the first is "untouched / nothing", then four shades.
  const ramp = useMemo((): string[] => {
    if (mode === 'recovery') {
      return [colors.danger, blend(colors.danger, colors.warning, 0.6), colors.warning, blend(base, colors.success, 0.6), colors.success];
    }
    if (mode === 'untrained') {
      return [blend(base, colors.success, 0.45), blend(base, colors.warning, 0.4), blend(base, colors.warning, 0.7), colors.warning, colors.danger];
    }
    return [base, blend(base, accent, 0.35), blend(base, accent, 0.55), blend(base, accent, 0.78), blend(accent, '#FFFFFF', 0.25)];
  }, [mode, base, accent, colors.danger, colors.warning, colors.success]);

  const stepFor = (m: MuscleId): number => {
    if (mode === '7d' || mode === '30d') {
      const v = range.heat[m];
      return v <= 0 ? 0 : v < 0.25 ? 1 : v < 0.5 ? 2 : v < 0.85 ? 3 : 4;
    }
    if (mode === 'recovery') {
      const v = rec.recovery[m];
      return v < 0.35 ? 0 : v < 0.6 ? 1 : v < 0.8 ? 2 : v < 0.95 ? 3 : 4;
    }
    const d = since[m];
    return d == null ? 4 : d < 4 ? 0 : d < 8 ? 1 : d < 14 ? 2 : d < 21 ? 3 : 4;
  };

  const bodyData: ExtendedBodyPart[] = useMemo(() => {
    if (empty) return [];
    return MUSCLES.flatMap((m) =>
      SLUGS[m.id].map((slug) => ({
        slug,
        styles: {
          fill: ramp[stepFor(m.id)],
          stroke: picked === m.id ? colors.text : undefined,
          strokeWidth: picked === m.id ? 3 : undefined,
        },
      }))
    );
  }, [empty, ramp, picked, mode, range, rec, since, colors.text]); // eslint-disable-line react-hooks/exhaustive-deps

  // We hit-test taps ourselves: tapping thin SVG shapes inside scroll views is unreliable.
  const gender = data.sex === 'female' ? 'female' : 'male';
  useEffect(() => {
    prepareBodyHitTest(gender);
  }, [gender]);

  const tapAt = (side: 'front' | 'back', x: number, y: number, bw: number) => {
    const slug = hitTestBody(gender, side, x, y, bw, bw * 2);
    const m = slug ? MUSCLE_OF_SLUG.get(slug) : undefined;
    if (!m) {
      if (picked) setPicked(null);
      return;
    }
    haptics.select();
    setPicked((p) => (p === m ? null : m));
  };

  const readout = (m: MuscleId): string => {
    if (mode === '7d' || mode === '30d') {
      const sets = range.sets[m];
      return `${Math.round(sets * 10) / 10} sets · ${Math.round(Math.min(1, sets / range.target) * 100)}% of target`;
    }
    if (mode === 'recovery') {
      const v = rec.recovery[m];
      const h = rec.readyInHours(m);
      const state = v >= 0.8 ? 'Ready' : v >= 0.5 ? 'Recovering' : 'Fatigued';
      return `${Math.round(v * 100)}% · ${state} · ${h ? `Ready in ${fmtHours(h)}` : 'Ready to train it again'}`;
    }
    const d = since[m];
    return d == null ? 'Not trained yet' : d === 0 ? 'Trained today' : d === 1 ? 'Trained yesterday' : `${d} days ago`;
  };

  const footer = (): string => {
    if (empty) return 'Log a session and your body starts lighting up here.';
    if (mode === '7d' || mode === '30d') return range.behind.length ? `Falling behind: ${list(range.behind)}` : 'Tap a muscle to see what it got.';
    if (mode === 'recovery') {
      return rec.stillRecovering.length
        ? `Still recovering: ${list(rec.stillRecovering.slice(0, 3))}`
        : 'Everything is recovered. Good day to train anything.';
    }
    return longest.length ? `Waiting the longest: ${list(longest)}` : 'Every muscle got work this week. Nice.';
  };

  const legend: [string, string] =
    mode === 'recovery' ? ['Fatigued', 'Fresh'] : mode === 'untrained' ? ['Recent', 'Long ago'] : ['Untouched', 'Full volume'];

  const bodyW = w > 0 ? Math.min(170, (w - 12) / 2) : 0;

  return (
    <SoftCard>
      <Kicker>Muscle map</Kicker>

      <View style={[styles.tabs, { backgroundColor: colors.surfaceHighlight }]}>
        {(
          [
            ['7d', '7D'],
            ['30d', '30D'],
            ['recovery', 'Recovery'],
            ['untrained', 'Untrained'],
          ] as [Mode, string][]
        ).map(([key, label]) => {
          const on = mode === key;
          return (
            <Pressable
              key={key}
              style={[styles.tab, on && { backgroundColor: colors.text }]}
              onPress={() => {
                if (on) return;
                haptics.select();
                setMode(key);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
            >
              <Text style={[styles.tabText, { color: on ? colors.background : colors.textSecondary }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {mode === 'recovery' && !empty && (
        <Text style={[styles.headline, { color: colors.text }]}>Body {rec.overall}% recovered</Text>
      )}

      <View style={styles.figures} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
        {bodyW > 0 &&
          (['front', 'back'] as const).map((side) => (
            <GestureDetector
              key={side}
              gesture={Gesture.Tap()
                .runOnJS(true)
                .maxDistance(14)
                .maxDuration(600)
                .onEnd((e, ok) => {
                  if (ok) tapAt(side, e.x, e.y, bodyW);
                })}
            >
              <View style={{ width: bodyW, height: bodyW * 2 }} collapsable={false}>
                <View pointerEvents="none">
                  <Body
                    data={bodyData}
                    side={side}
                    gender={gender}
                    scale={bodyW / 200}
                    border="none"
                    defaultFill={base}
                    defaultStroke={isDark ? '#2A2E36' : '#B8C1CD'}
                    defaultStrokeWidth={1}
                  />
                </View>
              </View>
            </GestureDetector>
          ))}
      </View>

      {picked && !empty ? (
        <Animated.View key={`${picked}-${mode}`} entering={FadeIn.duration(180)} style={[styles.readout, { backgroundColor: colors.surfaceHighlight }]}>
          <Text style={[styles.readoutName, { color: colors.text }]}>{MUSCLE_LABEL[picked]}</Text>
          <Text style={[styles.readoutText, { color: colors.textSecondary }]}>{readout(picked)}</Text>
        </Animated.View>
      ) : null}

      <View style={styles.legend}>
        <Text style={[styles.legendText, { color: colors.textMuted }]}>{legend[0]}</Text>
        <View style={styles.legendSteps}>
          {ramp.map((c, i) => (
            <View key={i} style={[styles.legendStep, { backgroundColor: c }]} />
          ))}
        </View>
        <Text style={[styles.legendText, { color: colors.textMuted }]}>{legend[1]}</Text>
      </View>

      <Text style={[styles.footer, { color: colors.textSecondary }]}>{footer()}</Text>
    </SoftCard>
  );
};

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', alignSelf: 'flex-start', borderRadius: 20, padding: 4, marginBottom: 14 },
  tab: { paddingHorizontal: 14, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  tabText: { fontSize: 13, fontWeight: '700' },
  headline: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  figures: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  readout: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 10, gap: 2 },
  readoutName: { fontSize: 15, fontWeight: '800' },
  readoutText: { fontSize: 13, fontWeight: '600' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  legendText: { fontSize: 12, fontWeight: '600' },
  legendSteps: { flex: 1, flexDirection: 'row', gap: 4 },
  legendStep: { flex: 1, height: 8, borderRadius: 4 },
  footer: { fontSize: 14, fontWeight: '600', marginTop: 14, lineHeight: 19 },
});
