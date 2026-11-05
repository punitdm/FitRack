import React, { useMemo, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { Text } from '../common/Typography';
import { useTheme } from '../../theme/theme';
import { haptics } from '../../utils/haptics';
import { SoftCard, Kicker } from './ProgressKit';
import { MUSCLE_LABEL, MuscleId } from '../../analytics/muscles';
import { ProgressData, RADAR_AXES, radar } from '../../analytics/progress';

/** Spider chart of sets per muscle over the last 30 days; tap a label to read it. */
export const RadarCard: React.FC<{ data: ProgressData }> = ({ data }) => {
  const { colors } = useTheme();
  const [w, setW] = useState(0);
  const [picked, setPicked] = useState<MuscleId | null>(null);
  const r = useMemo(() => radar(data), [data]);

  const size = Math.min(w, 320);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 34;
  const n = RADAR_AXES.length;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i: number, f: number) => [cx + Math.cos(angle(i)) * radius * f, cy + Math.sin(angle(i)) * radius * f];

  const values = RADAR_AXES.map((id) => (r.top > 0 ? r.sets[id] / r.top : 0));
  const poly = values.map((v, i) => pt(i, Math.max(0.04, v)).join(',')).join(' ');

  const summary =
    r.top <= 0
      ? 'Train a few days to see your balance'
      : picked
        ? `${MUSCLE_LABEL[picked]} · ${Math.round(r.sets[picked] * 10) / 10} sets`
        : r.behind.length
          ? `Needs more: ${r.behind.map((m) => MUSCLE_LABEL[m]).join(', ')}`
          : 'Good balance so far';

  return (
    <SoftCard>
      <Kicker>Last 30 days</Kicker>
      <Text style={[styles.headline, { color: colors.text }]}>{summary}</Text>
      <Text style={[styles.hint, { color: colors.textMuted }]}>See which areas need more work</Text>

      <View style={styles.chartWrap} onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
        {size > 0 && (
          <Svg width={size} height={size}>
            {[0.25, 0.5, 0.75, 1].map((f) => (
              <Polygon
                key={f}
                points={RADAR_AXES.map((_, i) => pt(i, f).join(',')).join(' ')}
                fill="none"
                stroke={colors.border}
                strokeWidth={1}
              />
            ))}
            {RADAR_AXES.map((_, i) => {
              const [x, y] = pt(i, 1);
              return <Line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={colors.border} strokeWidth={1} />;
            })}
            {r.top > 0 && (
              <Polygon points={poly} fill={colors.primary} fillOpacity={0.25} stroke={colors.primary} strokeWidth={2} strokeLinejoin="round" />
            )}
            {r.top > 0 &&
              values.map((v, i) => {
                const [x, y] = pt(i, Math.max(0.04, v));
                const id = RADAR_AXES[i];
                return <Circle key={id} cx={x} cy={y} r={picked === id ? 5 : 3} fill={colors.primary} />;
              })}
            {RADAR_AXES.map((id, i) => {
              const [x, y] = pt(i, 1.2);
              const isPicked = picked === id;
              return (
                <G
                  key={id}
                  onPress={() => {
                    haptics.select();
                    setPicked((p) => (p === id ? null : id));
                  }}
                >
                  <Circle cx={x} cy={y} r={18} fill="transparent" />
                  <SvgText
                    x={x}
                    y={y + 4}
                    fontSize={10.5}
                    fontWeight={isPicked ? '800' : '600'}
                    fill={isPicked ? colors.text : r.behind.includes(id) ? colors.warning : colors.textMuted}
                    textAnchor="middle"
                  >
                    {MUSCLE_LABEL[id]}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        )}
      </View>
    </SoftCard>
  );
};

const styles = StyleSheet.create({
  headline: { fontSize: 17, fontWeight: '800' },
  hint: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  chartWrap: { alignItems: 'center', marginTop: 6 },
});
