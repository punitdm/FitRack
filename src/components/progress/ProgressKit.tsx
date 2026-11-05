import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop, Circle } from 'react-native-svg';
import { Text } from '../common/Typography';
import { useTheme, borderRadius, spacing } from '../../theme/theme';

/** Card shell used by every Progress section. */
export const SoftCard: React.FC<{ children: React.ReactNode; style?: StyleProp<ViewStyle> }> = ({ children, style }) => {
  const { colors } = useTheme();
  return <View style={[styles.card, { backgroundColor: colors.surfaceCard }, style]}>{children}</View>;
};

/** Small section label above a card's headline. */
export const Kicker: React.FC<{ children: string; right?: React.ReactNode }> = ({ children, right }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.kickerRow}>
      <Text style={[styles.kicker, { color: colors.textMuted }]}>{children}</Text>
      {right}
    </View>
  );
};

/** Smooth line (optionally filled) through the given values. */
export const Sparkline: React.FC<{
  values: number[];
  width: number;
  height: number;
  color: string;
  fill?: boolean;
  strokeWidth?: number;
  dot?: boolean;
  id: string;
}> = ({ values, width, height, color, fill = false, strokeWidth = 2, dot = true, id }) => {
  if (values.length < 2 || width <= 0) return <View style={{ width, height }} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = strokeWidth + 2;
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * width,
    y: pad + (1 - (v - min) / span) * (height - pad * 2),
  }));
  // Catmull-Rom → cubic Bézier for a soft curve
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`;
  }
  const last = pts[pts.length - 1];
  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.35" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </LinearGradient>
      </Defs>
      {fill && <Path d={`${d} L ${width} ${height} L 0 ${height} Z`} fill={`url(#spark-${id})`} />}
      <Path d={d} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {dot && <Circle cx={last.x} cy={last.y} r={strokeWidth + 1.5} fill={color} />}
    </Svg>
  );
};

/** Up/down percentage chip. */
export const DeltaChip: React.FC<{ pct: number }> = ({ pct }) => {
  const { colors } = useTheme();
  const up = pct >= 0;
  const color = up ? colors.success : colors.danger;
  return (
    <View style={[styles.delta, { backgroundColor: up ? colors.successMuted : colors.dangerMuted }]}>
      <Text style={[styles.deltaText, { color }]}>
        {up ? '▲' : '▼'} {Math.abs(pct)}%
      </Text>
    </View>
  );
};

export const fmtKg = (kg: number): { value: string; unit: string } =>
  kg >= 1000 ? { value: (Math.round(kg / 100) / 10).toLocaleString(), unit: 't' } : { value: Math.round(kg).toLocaleString(), unit: 'kg' };

const styles = StyleSheet.create({
  card: { borderRadius: borderRadius.xl, padding: spacing.lg },
  kickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  kicker: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
  delta: { paddingHorizontal: 8, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  deltaText: { fontSize: 11, fontWeight: '800' },
});
