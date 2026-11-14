import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput } from '../common/Typography';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useTheme, borderRadius } from '../../theme/theme';
import { NutritionGoals } from '../../db/nutrition';

// ---------------------------------------------------------------------------
// Shared field
// ---------------------------------------------------------------------------

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  suffix?: string;
  keyboardType?: 'decimal-pad' | 'number-pad' | 'default';
  autoFocus?: boolean;
  flex?: boolean;
  /** Field the keyboard's Enter key moves to. Without one, Enter closes the keyboard. */
  next?: React.RefObject<FieldRef | null>;
};
type FieldRef = React.ComponentRef<typeof TextInput>;

const Field = forwardRef<FieldRef, FieldProps>(function Field(
  { label, value, onChangeText, placeholder, suffix, keyboardType = 'decimal-pad', autoFocus, flex = true, next },
  ref,
) {
  const { colors } = useTheme();
  return (
    <View style={[styles.field, flex && { flex: 1 }]}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[styles.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
        {/* No selectTextOnFocus: on Android it can re-select the text after the
            first keystroke, so the next digit replaced it ("25" became "5"). */}
        <TextInput
          ref={ref}
          style={[styles.input, { color: colors.text }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textDisabled}
          keyboardType={keyboardType}
          autoFocus={autoFocus}
          returnKeyType={next ? 'next' : 'done'}
          submitBehavior={next ? 'submit' : 'blurAndSubmit'}
          onSubmitEditing={next ? () => next.current?.focus() : undefined}
        />
        {!!suffix && <Text style={[styles.suffix, { color: colors.textMuted }]}>{suffix}</Text>}
      </View>
    </View>
  );
});

const n = (v: string) => {
  const x = parseFloat(v.replace(',', '.'));
  return Number.isFinite(x) && x > 0 ? x : 0;
};

// ---------------------------------------------------------------------------
// Quick add: a food with its own calories / macros
// ---------------------------------------------------------------------------

export interface QuickAddValues {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const QuickAddSheet: React.FC<{
  visible: boolean;
  mealLabel: string;
  onClose: () => void;
  onAdd: (v: QuickAddValues) => void;
}> = ({ visible, mealLabel, onClose, onAdd }) => {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const kcalRef = useRef<FieldRef>(null);
  const proteinRef = useRef<FieldRef>(null);
  const carbsRef = useRef<FieldRef>(null);
  const fatRef = useRef<FieldRef>(null);

  useEffect(() => {
    if (visible) {
      setName('');
      setKcal('');
      setProtein('');
      setCarbs('');
      setFat('');
    }
  }, [visible]);

  const fromMacros = Math.round(n(protein) * 4 + n(carbs) * 4 + n(fat) * 9);
  const calories = n(kcal) > 0 ? Math.round(n(kcal)) : fromMacros;
  const canAdd = calories > 0 || n(protein) + n(carbs) + n(fat) > 0;

  return (
    <Modal visible={visible} onClose={onClose} title={`Quick add to ${mealLabel.toLowerCase()}`}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetBody}>
        <Field
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Homemade dal"
          keyboardType="default"
          flex={false}
          next={kcalRef}
        />
        <Field
          ref={kcalRef}
          label="Calories"
          value={kcal}
          onChangeText={setKcal}
          placeholder={fromMacros > 0 ? String(fromMacros) : '0'}
          suffix="kcal"
          keyboardType="number-pad"
          flex={false}
          next={proteinRef}
        />
        <View style={styles.row}>
          <Field ref={proteinRef} label="Protein" value={protein} onChangeText={setProtein} placeholder="0" suffix="g" next={carbsRef} />
          <Field ref={carbsRef} label="Carbs" value={carbs} onChangeText={setCarbs} placeholder="0" suffix="g" next={fatRef} />
          <Field ref={fatRef} label="Fat" value={fat} onChangeText={setFat} placeholder="0" suffix="g" />
        </View>
        {n(kcal) === 0 && fromMacros > 0 && (
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Calories will be worked out from the macros: {fromMacros} kcal.
          </Text>
        )}
        <Button
          title={canAdd ? `Add ${calories} kcal` : 'Add'}
          onPress={() =>
            onAdd({
              name: name.trim() || 'Quick add',
              calories,
              protein: n(protein),
              carbs: n(carbs),
              fat: n(fat),
            })
          }
          disabled={!canAdd}
          size="lg"
          style={styles.cta}
        />
      </ScrollView>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// Daily goals
// ---------------------------------------------------------------------------

export const GoalsSheet: React.FC<{
  visible: boolean;
  goals: NutritionGoals;
  onClose: () => void;
  onSave: (g: NutritionGoals) => void;
}> = ({ visible, goals, onClose, onSave }) => {
  const { colors } = useTheme();
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [water, setWater] = useState('');
  const gProtein = useRef<FieldRef>(null);
  const gCarbs = useRef<FieldRef>(null);
  const gFat = useRef<FieldRef>(null);
  const gWater = useRef<FieldRef>(null);

  useEffect(() => {
    if (visible) {
      setKcal(String(goals.calories));
      setProtein(String(goals.protein));
      setCarbs(String(goals.carbs));
      setFat(String(goals.fat));
      setWater(String(Math.round((goals.waterMl / 1000) * 10) / 10));
    }
  }, [visible, goals]);

  const macroKcal = Math.round(n(protein) * 4 + n(carbs) * 4 + n(fat) * 9);
  const diff = macroKcal - n(kcal);

  return (
    <Modal visible={visible} onClose={onClose} title="Daily goals">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetBody}>
        <Field label="Calories" value={kcal} onChangeText={setKcal} suffix="kcal" keyboardType="number-pad" flex={false} next={gProtein} />
        <View style={styles.row}>
          <Field ref={gProtein} label="Protein" value={protein} onChangeText={setProtein} suffix="g" next={gCarbs} />
          <Field ref={gCarbs} label="Carbs" value={carbs} onChangeText={setCarbs} suffix="g" next={gFat} />
          <Field ref={gFat} label="Fat" value={fat} onChangeText={setFat} suffix="g" next={gWater} />
        </View>
        <Text style={[styles.hint, { color: Math.abs(diff) > 100 ? colors.warning : colors.textMuted }]}>
          Your macros add up to {macroKcal} kcal
          {Math.abs(diff) > 100 ? ` (${diff > 0 ? '+' : ''}${Math.round(diff)} vs your calorie goal)` : '.'}
        </Text>
        <Field ref={gWater} label="Water" value={water} onChangeText={setWater} suffix="litres" flex={false} />
        <Button
          title="Save goals"
          size="lg"
          style={styles.cta}
          disabled={n(kcal) <= 0}
          onPress={() =>
            onSave({
              calories: Math.round(n(kcal)),
              protein: Math.round(n(protein)) || goals.protein,
              carbs: Math.round(n(carbs)) || goals.carbs,
              fat: Math.round(n(fat)) || goals.fat,
              waterMl: Math.round(n(water) * 1000) || goals.waterMl,
            })
          }
        />
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  sheetBody: {
    gap: 12,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 10,
  },
  suffix: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
  },
  cta: {
    marginTop: 4,
    borderRadius: 14,
  },
});
