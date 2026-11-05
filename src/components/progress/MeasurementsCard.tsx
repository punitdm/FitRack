import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, LayoutChangeEvent } from 'react-native';
import * as SQLite from 'expo-sqlite';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ChevronLeft, ChevronRight, Minus, Plus, Ruler, Trash2 } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { Text, TextInput } from '../common/Typography';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { ScalePressable } from '../common/Motion';
import { useTheme } from '../../theme/theme';
import { haptics } from '../../utils/haptics';
import { SoftCard, Sparkline } from './ProgressKit';
import {
  MEASURES,
  MEASURE_BY_KEY,
  MeasureKey,
  MeasureReading,
  deleteMeasurement,
  formatMeasure,
  getAllMeasurements,
  saveMeasurement,
} from '../../db/measurements';

import { notifyUndo } from '../../utils/feedback';
const STEP = 0.5;
const todayIso = () => format(new Date(), 'yyyy-MM-dd');
const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Measurements on Progress → Overview: chips for what you track; tap to open
 * the full list, then a measurement to log a new reading or edit past ones.
 */
export const MeasurementsCard: React.FC<{
  db: SQLite.SQLiteDatabase;
  reloadKey: number;
  onShowToast: (type: 'success' | 'error' | 'info', text: string) => void;
}> = ({ db, reloadKey, onShowToast }) => {
  const { colors } = useTheme();
  const [data, setData] = useState<Record<MeasureKey, MeasureReading[]> | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await getAllMeasurements(db));
    } catch (e) {
      console.error('Measurements load failed:', e);
    }
  }, [db]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const tracked = data ? MEASURES.filter((m) => data[m.key].length > 0) : [];

  return (
    <>
      <ScalePressable onPress={() => setOpen(true)} pressedScale={0.985} accessibilityLabel="Open measurements">
        <SoftCard>
          <View style={styles.cardHead}>
            <Text style={[styles.kicker, { color: colors.textMuted }]}>Measurements</Text>
            <ChevronRight size={16} color={colors.textMuted} />
          </View>
          {tracked.length === 0 ? (
            <View style={styles.emptyRow}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.pillars.body.soft }]}>
                <Ruler size={18} color={colors.pillars.body.accent} />
              </View>
              <Text style={[styles.hint, { color: colors.textSecondary }]}>Neck to calf: watch your body change, not just the bar.</Text>
            </View>
          ) : (
            <View style={styles.chips}>
              {tracked.slice(0, 6).map((m) => (
                <View key={m.key} style={[styles.chip, { backgroundColor: colors.surfaceHighlight }]}>
                  <Text style={[styles.chipLabel, { color: colors.textMuted }]} numberOfLines={1}>
                    {m.label}
                  </Text>
                  <Text style={[styles.chipValue, { color: colors.text }]}>{formatMeasure(m, data![m.key][0].value)}</Text>
                </View>
              ))}
            </View>
          )}
        </SoftCard>
      </ScalePressable>

      <MeasurementsSheet
        visible={open}
        data={data}
        onClose={() => setOpen(false)}
        onSave={async (key, value, date) => {
          try {
            await saveMeasurement(db, key, value, date);
            haptics.success();
            await load();
          } catch (e: any) {
            onShowToast('error', `Couldn't save: ${e?.message || e}`);
          }
        }}
        onDelete={async (key, date) => {
          try {
            const old = data?.[key].find((r) => r.date === date);
            await deleteMeasurement(db, key, date);
            await load();
            if (old) {
              notifyUndo(`${MEASURE_BY_KEY[key].label} reading deleted`, async () => {
                await saveMeasurement(db, key, old.value, date);
                await load();
              });
            }
          } catch (e: any) {
            onShowToast('error', `Couldn't delete: ${e?.message || e}`);
          }
        }}
      />
    </>
  );
};

// ---------------------------------------------------------------------------

const MeasurementsSheet: React.FC<{
  visible: boolean;
  data: Record<MeasureKey, MeasureReading[]> | null;
  onClose: () => void;
  onSave: (key: MeasureKey, value: number, date: string) => Promise<void>;
  onDelete: (key: MeasureKey, date: string) => Promise<void>;
}> = ({ visible, data, onClose, onSave, onDelete }) => {
  const { colors } = useTheme();
  const [key, setKey] = useState<MeasureKey | null>(null);
  const [w, setW] = useState(0);

  useEffect(() => {
    if (visible) setKey(null);
  }, [visible]);

  return (
    <Modal visible={visible} onClose={onClose} title={key ? MEASURE_BY_KEY[key].label : 'Measurements'}>
      <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>
        {key && data ? (
          <MeasureDetail key={key} mkey={key} history={data[key]} onBack={() => setKey(null)} onSave={onSave} onDelete={onDelete} />
        ) : (
          <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ paddingBottom: 8 }}>
            {MEASURES.map((m, i) => {
              const h = data?.[m.key] ?? [];
              const latest = h[0];
              const change = h.length >= 2 ? round1(h[0].value - h[1].value) : null;
              return (
                <Pressable
                  key={m.key}
                  onPress={() => {
                    haptics.select();
                    setKey(m.key);
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${m.label}${latest ? `, ${formatMeasure(m, latest.value)}` : ', not logged yet'}`}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowName, { color: colors.text }]}>{m.label}</Text>
                    {latest ? (
                      <View style={styles.rowValueLine}>
                        <Text style={[styles.rowValue, { color: colors.text }]}>{round1(latest.value)}</Text>
                        <Text style={[styles.rowUnit, { color: colors.textMuted }]}>{m.unit}</Text>
                        {change != null && change !== 0 && (
                          <Text style={[styles.rowChange, { color: change > 0 ? colors.success : colors.pillars.nutrition.accent }]}>
                            {change > 0 ? '+' : ''}
                            {change}
                          </Text>
                        )}
                      </View>
                    ) : (
                      <Text style={[styles.rowNone, { color: colors.textMuted }]}>Not logged yet</Text>
                    )}
                  </View>
                  {h.length >= 2 && (
                    <Sparkline
                      id={`m-${m.key}`}
                      values={[...h].reverse().slice(-12).map((r) => r.value)}
                      width={Math.min(90, w * 0.25)}
                      height={34}
                      color={colors.pillars.body.accent}
                      dot={false}
                    />
                  )}
                  <ChevronRight size={16} color={colors.textMuted} />
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const MeasureDetail: React.FC<{
  mkey: MeasureKey;
  history: MeasureReading[];
  onBack: () => void;
  onSave: (key: MeasureKey, value: number, date: string) => Promise<void>;
  onDelete: (key: MeasureKey, date: string) => Promise<void>;
}> = ({ mkey, history, onBack, onSave, onDelete }) => {
  const { colors } = useTheme();
  const def = MEASURE_BY_KEY[mkey];
  const [value, setValue] = useState<number>(history[0]?.value ?? def.start);
  const [date, setDate] = useState<string>(todayIso());
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const editingPast = date !== todayIso();
  const existingOnDate = useMemo(() => history.find((h) => h.date === date), [history, date]);

  const bump = (d: number) => {
    haptics.select();
    setValue((v) => Math.max(def.min, Math.min(def.max, round1(v + d))));
  };

  const commitTyped = () => {
    const n = parseFloat(text.replace(',', '.'));
    if (Number.isFinite(n)) setValue(Math.max(def.min, Math.min(def.max, round1(n))));
    setTyping(false);
  };

  const save = async () => {
    if (typing) commitTyped();
    setSaving(true);
    await onSave(mkey, value, date);
    setSaving(false);
    setDate(todayIso());
  };

  return (
    <ScrollView style={{ maxHeight: 560 }} contentContainerStyle={{ paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
      <Pressable onPress={onBack} hitSlop={8} style={styles.back} accessibilityRole="button" accessibilityLabel="All measurements">
        <ChevronLeft size={18} color={colors.primary} />
        <Text style={[styles.backText, { color: colors.primary }]}>All measurements</Text>
      </Pressable>

      <Text style={[styles.forDate, { color: colors.textMuted }]}>
        {editingPast ? `Editing ${format(parseISO(date), 'd MMM yyyy')}` : 'New reading for today'}
      </Text>

      <View style={styles.editor}>
        <ScalePressable style={[styles.stepBtn, { backgroundColor: colors.surfaceHighlight }]} onPress={() => bump(-STEP)} pressedScale={0.9} accessibilityLabel={`Minus ${STEP}`}>
          <Minus size={22} color={colors.text} />
        </ScalePressable>
        <Pressable
          style={styles.valueBox}
          onPress={() => {
            setText(String(value));
            setTyping(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={`${formatMeasure(def, value)}. Tap to type`}
        >
          {typing ? (
            <TextInput
              style={[styles.valueInput, { color: colors.text, borderColor: colors.border }]}
              value={text}
              onChangeText={setText}
              keyboardType="decimal-pad"
              autoFocus
              selectTextOnFocus
              onBlur={commitTyped}
              onSubmitEditing={commitTyped}
            />
          ) : (
            <Text style={[styles.value, { color: colors.text }]}>{round1(value)}</Text>
          )}
          <Text style={[styles.unit, { color: colors.textMuted }]}>{def.unit}</Text>
        </Pressable>
        <ScalePressable style={[styles.stepBtn, { backgroundColor: colors.surfaceHighlight }]} onPress={() => bump(STEP)} pressedScale={0.9} accessibilityLabel={`Plus ${STEP}`}>
          <Plus size={22} color={colors.text} />
        </ScalePressable>
      </View>
      <Text style={[styles.tapHint, { color: colors.textMuted }]}>Tap the number to type it</Text>

      <Button
        title={editingPast ? `Update ${format(parseISO(date), 'd MMM')}` : existingOnDate ? "Update today's reading" : 'Save'}
        size="lg"
        loading={saving}
        onPress={save}
        style={{ borderRadius: 14, marginTop: 14 }}
      />
      {editingPast && (
        <Pressable onPress={() => setDate(todayIso())} style={styles.cancelEdit} hitSlop={6}>
          <Text style={[styles.cancelText, { color: colors.textMuted }]}>Cancel editing, log for today instead</Text>
        </Pressable>
      )}

      {history.length > 0 && (
        <>
          <Text style={[styles.histTitle, { color: colors.textMuted }]}>History · tap to edit</Text>
          {history.map((h, i) => {
            const prev = history[i + 1];
            const diff = prev ? round1(h.value - prev.value) : null;
            const active = editingPast && h.date === date;
            return (
              <Animated.View key={h.date} entering={FadeIn.duration(160)}>
                <Pressable
                  onPress={() => {
                    haptics.select();
                    setDate(h.date);
                    setValue(h.value);
                    setTyping(false);
                  }}
                  style={({ pressed }) => [
                    styles.histRow,
                    { borderTopColor: colors.border, backgroundColor: active ? colors.surfaceHighlight : 'transparent' },
                    pressed && { opacity: 0.7 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${format(parseISO(h.date), 'd MMMM yyyy')}`}
                >
                  <Text style={[styles.histDate, { color: colors.textSecondary }]}>{format(parseISO(h.date), 'd MMM yyyy')}</Text>
                  <Text style={[styles.histValue, { color: colors.text }]}>{formatMeasure(def, h.value)}</Text>
                  <Text style={[styles.histDiff, { color: colors.textMuted }]}>
                    {diff == null || diff === 0 ? '' : `${diff > 0 ? '+' : ''}${diff}`}
                  </Text>
                  <Pressable
                    onPress={() => {
                      haptics.tap();
                      onDelete(mkey, h.date);
                      if (h.date === date) setDate(todayIso());
                    }}
                    hitSlop={10}
                    style={[styles.trash, { backgroundColor: colors.dangerMuted }]}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete reading from ${format(parseISO(h.date), 'd MMMM')}`}
                  >
                    <Trash2 size={14} color={colors.danger} />
                  </Pressable>
                </Pressable>
              </Animated.View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  kicker: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emptyIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  hint: { flex: 1, fontSize: 14, lineHeight: 20 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, minWidth: 92 },
  chipLabel: { fontSize: 11, fontWeight: '600' },
  chipValue: { fontSize: 16, fontWeight: '800', marginTop: 3 },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  rowName: { fontSize: 15, fontWeight: '700' },
  rowValueLine: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 },
  rowValue: { fontSize: 18, fontWeight: '800' },
  rowUnit: { fontSize: 12, fontWeight: '600' },
  rowChange: { fontSize: 12, fontWeight: '800', marginLeft: 6 },
  rowNone: { fontSize: 14, marginTop: 2 },

  back: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 4 },
  backText: { fontSize: 14, fontWeight: '700' },
  forDate: { textAlign: 'center', fontSize: 13, fontWeight: '600', marginTop: 8 },
  editor: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  stepBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  valueBox: { flex: 1, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6 },
  value: { fontSize: 56, fontWeight: '800', letterSpacing: -1.5 },
  valueInput: { fontSize: 44, fontWeight: '800', minWidth: 120, textAlign: 'center', borderBottomWidth: 2, paddingVertical: 0 },
  unit: { fontSize: 20, fontWeight: '700' },
  tapHint: { textAlign: 'center', fontSize: 12, marginTop: 2 },
  cancelEdit: { alignSelf: 'center', paddingVertical: 10 },
  cancelText: { fontSize: 13, fontWeight: '600' },
  histTitle: { fontSize: 12, fontWeight: '700', marginTop: 20, marginBottom: 4 },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 6, borderTopWidth: StyleSheet.hairlineWidth, borderRadius: 8 },
  histDate: { flex: 1, fontSize: 14, fontWeight: '500' },
  histValue: { fontSize: 15, fontWeight: '800' },
  histDiff: { width: 42, textAlign: 'right', fontSize: 12, fontWeight: '700' },
  trash: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
