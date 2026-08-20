import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Dumbbell, Flame, Plus, Minus, Check } from 'lucide-react-native';
import { useTheme, typography, borderRadius, spacing } from '../../theme/theme';
import { Modal } from '../common/Modal';
import { Card } from '../common/Card';

interface PlateCalculatorModalProps {
  visible: boolean;
  initialWeight?: number;
  exerciseName?: string;
  onClose: () => void;
}

interface PlateConfig {
  weight: number;
  color: string;
  label: string;
}

const AVAILABLE_PLATES: PlateConfig[] = [
  { weight: 25, color: '#EF4444', label: '25kg' },
  { weight: 20, color: '#3B82F6', label: '20kg' },
  { weight: 15, color: '#EAB308', label: '15kg' },
  { weight: 10, color: '#22C55E', label: '10kg' },
  { weight: 5, color: '#FFFFFF', label: '5kg' },
  { weight: 2.5, color: '#090A0D', label: '2.5kg' },
  { weight: 1.25, color: '#94A3B8', label: '1.25kg' },
];

export const PlateCalculatorModal: React.FC<PlateCalculatorModalProps> = ({
  visible,
  initialWeight = 60,
  exerciseName = 'Barbell Exercise',
  onClose,
}) => {
  const { colors } = useTheme();

  const [targetWeight, setTargetWeight] = useState<number>(initialWeight > 0 ? initialWeight : 60);
  const [barWeight, setBarWeight] = useState<number>(20); // 20kg standard Olympic bar

  const calculatePlatesPerSide = () => {
    let remainingWeight = (targetWeight - barWeight) / 2;
    if (remainingWeight <= 0) return [];

    const plates: { plate: PlateConfig; count: number }[] = [];

    for (const p of AVAILABLE_PLATES) {
      if (remainingWeight >= p.weight) {
        const count = Math.floor(remainingWeight / p.weight);
        plates.push({ plate: p, count });
        remainingWeight -= count * p.weight;
      }
    }

    return plates;
  };

  const platesPerSide = calculatePlatesPerSide();
  const totalLoaded =
    barWeight + platesPerSide.reduce((acc, p) => acc + p.plate.weight * p.count * 2, 0);

  // Warmup sets calculations
  const warmupSets = [
    { label: 'Warmup 1', percent: 'Bar only', weight: barWeight, reps: '10 reps' },
    {
      label: 'Warmup 2',
      percent: '50%',
      weight: Math.max(barWeight, Math.round((targetWeight * 0.5) / 2.5) * 2.5),
      reps: '5 reps',
    },
    {
      label: 'Warmup 3',
      percent: '70%',
      weight: Math.max(barWeight, Math.round((targetWeight * 0.7) / 2.5) * 2.5),
      reps: '3 reps',
    },
    {
      label: 'Warmup 4',
      percent: '90%',
      weight: Math.max(barWeight, Math.round((targetWeight * 0.9) / 2.5) * 2.5),
      reps: '1 rep',
    },
  ];

  const adjustWeight = (delta: number) => {
    setTargetWeight((prev) => Math.max(barWeight, Math.round((prev + delta) * 10) / 10));
  };

  return (
    <Modal visible={visible} onClose={onClose} title="Plate & Warmup Calculator">
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Target Weight Card */}
        <Card style={[styles.weightInputCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <Text style={[styles.exTitle, { color: colors.textSecondary }]}>{exerciseName}</Text>
          <View style={styles.weightDisplayRow}>
            <TextInput
              style={[styles.weightInput, { color: colors.primary }]}
              keyboardType="decimal-pad"
              value={String(targetWeight)}
              onChangeText={(val) => {
                const num = parseFloat(val);
                if (!isNaN(num)) setTargetWeight(num);
              }}
            />
            <Text style={[styles.kgUnit, { color: colors.textSecondary }]}>kg Total</Text>
          </View>

          {/* Stepper buttons */}
          <View style={styles.steppersRow}>
            {[-10, -5, -2.5, 2.5, 5, 10].map((delta) => (
              <TouchableOpacity
                key={delta}
                style={[
                  styles.stepperPill,
                  { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
                ]}
                onPress={() => adjustWeight(delta)}
                activeOpacity={0.7}
              >
                <Text style={[styles.stepperText, { color: colors.text }]}>
                  {delta > 0 ? `+${delta}` : delta}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Barbell Selector */}
          <View style={styles.barSelectorRow}>
            <Text style={[styles.barLabel, { color: colors.textMuted }]}>Bar Weight:</Text>
            {[20, 15].map((b) => (
              <TouchableOpacity
                key={b}
                style={[
                  styles.barChip,
                  { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
                  barWeight === b && { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
                ]}
                onPress={() => setBarWeight(b)}
              >
                <Text style={[styles.barChipText, { color: barWeight === b ? colors.primary : colors.textSecondary }]}>
                  {b} kg Olympic Bar
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Visual Barbell Plate Sleeve */}
        <Card style={[styles.visualCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Per Side Loading (One Sleeve)</Text>
          <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
            Load the following plates on EACH side of the barbell:
          </Text>

          {/* Visual Bar Graphic */}
          <View style={styles.sleeveGraphicContainer}>
            {/* Barbell collar */}
            <View style={[styles.collarBar, { backgroundColor: '#64748B' }]} />
            <View style={[styles.sleeveBar, { backgroundColor: '#334155' }]}>
              {platesPerSide.map((item, idx) =>
                Array.from({ length: item.count }).map((_, cIdx) => {
                  const p = item.plate;
                  const height = 40 + (p.weight / 25) * 45;
                  return (
                    <View
                      key={`${p.weight}-${idx}-${cIdx}`}
                      style={[
                        styles.visualPlate,
                        {
                          backgroundColor: p.color,
                          height,
                          borderColor: p.weight === 2.5 ? '#64748B' : 'rgba(0,0,0,0.3)',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.visualPlateText,
                          { color: p.weight === 5 ? '#090A0D' : '#FFFFFF' },
                        ]}
                      >
                        {p.weight}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          </View>

          {/* Plates Count Table */}
          <View style={styles.platesSummaryRow}>
            {platesPerSide.length > 0 ? (
              platesPerSide.map((item) => (
                <View key={item.plate.weight} style={styles.plateBadgeItem}>
                  <View style={[styles.plateDot, { backgroundColor: item.plate.color }]} />
                  <Text style={[styles.plateBadgeText, { color: colors.text }]}>
                    {item.count} × {item.plate.label}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyPlatesText, { color: colors.textMuted }]}>
                Empty barbell (No additional plates needed)
              </Text>
            )}
          </View>
        </Card>

        {/* Automated Warmup Sets Generator */}
        <Card style={[styles.warmupCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
          <View style={styles.warmupHeader}>
            <Flame size={16} color={colors.warning} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Pyramid Warm-Up Progression
            </Text>
          </View>

          <View style={styles.warmupTable}>
            {warmupSets.map((w, idx) => (
              <View
                key={idx}
                style={[
                  styles.warmupRow,
                  { borderBottomColor: colors.border },
                  idx % 2 === 0 && { backgroundColor: colors.surfaceElevated },
                ]}
              >
                <View style={styles.warmupColLeft}>
                  <Text style={[styles.warmupLabel, { color: colors.textSecondary }]}>{w.label}</Text>
                  <Text style={[styles.warmupPct, { color: colors.textMuted }]}>({w.percent})</Text>
                </View>
                <Text style={[styles.warmupWeight, { color: colors.primary }]}>{w.weight} kg</Text>
                <Text style={[styles.warmupReps, { color: colors.text }]}>{w.reps}</Text>
              </View>
            ))}

            {/* Final working set */}
            <View style={[styles.warmupRow, styles.workingSetRow, { backgroundColor: colors.primaryMuted }]}>
              <View style={styles.warmupColLeft}>
                <Text style={[styles.warmupLabel, { color: colors.primary, fontWeight: '800' }]}>
                  Working Sets
                </Text>
                <Text style={[styles.warmupPct, { color: colors.primary }]}> (100%)</Text>
              </View>
              <Text style={[styles.warmupWeight, { color: colors.primary, fontWeight: '800' }]}>
                {targetWeight} kg
              </Text>
              <Text style={[styles.warmupReps, { color: colors.primary, fontWeight: '800' }]}>
                Target Reps
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    maxHeight: 520,
  },
  weightInputCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  exTitle: {
    ...typography.caption,
    fontSize: 12,
  },
  weightDisplayRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: spacing.xs,
  },
  weightInput: {
    ...typography.mono,
    fontSize: 38,
    textAlign: 'center',
    minWidth: 120,
  },
  kgUnit: {
    ...typography.titleSmall,
    fontSize: 16,
    marginLeft: 6,
  },
  steppersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginVertical: spacing.xs,
  },
  stepperPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  stepperText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 12,
  },
  barSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  barLabel: {
    ...typography.caption,
    fontSize: 11,
  },
  barChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  barChipText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
  },
  visualCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  sectionTitle: {
    ...typography.titleSmall,
    fontSize: 15,
  },
  sectionSub: {
    ...typography.caption,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  sleeveGraphicContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 100,
    backgroundColor: '#0F172A',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    marginVertical: spacing.xs,
    overflow: 'hidden',
  },
  collarBar: {
    width: 14,
    height: 60,
    borderRadius: 2,
  },
  sleeveBar: {
    flex: 1,
    height: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
    gap: 3,
  },
  visualPlate: {
    width: 16,
    borderRadius: 3,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visualPlateText: {
    fontSize: 9,
    fontWeight: '800',
    transform: [{ rotate: '-90deg' }],
  },
  platesSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  plateBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  plateDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  plateBadgeText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyPlatesText: {
    ...typography.caption,
    fontStyle: 'italic',
  },
  warmupCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  warmupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  warmupTable: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  warmupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
  },
  workingSetRow: {
    borderBottomWidth: 0,
  },
  warmupColLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 110,
  },
  warmupLabel: {
    ...typography.caption,
    fontWeight: '700',
  },
  warmupPct: {
    ...typography.caption,
    fontSize: 10,
  },
  warmupWeight: {
    ...typography.mono,
    fontSize: 14,
    width: 70,
    textAlign: 'center',
  },
  warmupReps: {
    ...typography.bodySecondary,
    fontSize: 12,
    width: 80,
    textAlign: 'right',
  },
});
