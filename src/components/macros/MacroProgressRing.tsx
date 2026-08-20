import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flame, Beef, Wheat, Droplet } from 'lucide-react-native';
import { colors, typography, borderRadius, spacing } from '../../theme/theme';
import { Card } from '../common/Card';

interface MacroProgressProps {
  calories: number;
  calorieGoal: number;
  protein: number;
  proteinGoal: number;
  carbs: number;
  carbsGoal: number;
  fat: number;
  fatGoal: number;
}

export const MacroProgressRing: React.FC<MacroProgressProps> = ({
  calories,
  calorieGoal,
  protein,
  proteinGoal,
  carbs,
  carbsGoal,
  fat,
  fatGoal,
}) => {
  const calPercent = Math.min(Math.round((calories / (calorieGoal || 1)) * 100), 100);
  const remainingCal = Math.max(calorieGoal - calories, 0);

  const getPercent = (val: number, goal: number) => Math.min(Math.round((val / (goal || 1)) * 100), 100);

  return (
    <Card style={styles.container}>
      {/* Calories Main Banner */}
      <View style={styles.calBanner}>
        <View style={styles.calInfo}>
          <View style={styles.calHeader}>
            <Flame size={18} color={colors.warning} />
            <Text style={styles.calLabel}>Daily Calories</Text>
          </View>
          <View style={styles.calNumbersRow}>
            <Text style={styles.calBigNumber}>{calories}</Text>
            <Text style={styles.calTarget}> / {calorieGoal} kcal</Text>
          </View>
        </View>

        <View style={styles.calRemainingPill}>
          <Text style={styles.remainingText}>{remainingCal} kcal left</Text>
          <Text style={styles.percentText}>{calPercent}%</Text>
        </View>
      </View>

      {/* Main Calorie Progress Bar */}
      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${calPercent}%`, backgroundColor: colors.warning },
          ]}
        />
      </View>

      {/* Macronutrient Triple Breakdown */}
      <View style={styles.macrosRow}>
        {/* Protein */}
        <View style={styles.macroCard}>
          <View style={styles.macroHeader}>
            <Beef size={14} color={colors.primary} />
            <Text style={[styles.macroName, { color: colors.primary }]}>Protein</Text>
          </View>
          <Text style={styles.macroValue}>
            {protein}<Text style={styles.macroUnit}> / {proteinGoal}g</Text>
          </Text>
          <View style={styles.miniTrack}>
            <View
              style={[
                styles.miniFill,
                { width: `${getPercent(protein, proteinGoal)}%`, backgroundColor: colors.primary },
              ]}
            />
          </View>
        </View>

        {/* Carbs */}
        <View style={styles.macroCard}>
          <View style={styles.macroHeader}>
            <Wheat size={14} color={colors.secondary} />
            <Text style={[styles.macroName, { color: colors.secondary }]}>Carbs</Text>
          </View>
          <Text style={styles.macroValue}>
            {carbs}<Text style={styles.macroUnit}> / {carbsGoal}g</Text>
          </Text>
          <View style={styles.miniTrack}>
            <View
              style={[
                styles.miniFill,
                { width: `${getPercent(carbs, carbsGoal)}%`, backgroundColor: colors.secondary },
              ]}
            />
          </View>
        </View>

        {/* Fat */}
        <View style={styles.macroCard}>
          <View style={styles.macroHeader}>
            <Droplet size={14} color={colors.accent} />
            <Text style={[styles.macroName, { color: colors.accent }]}>Fats</Text>
          </View>
          <Text style={styles.macroValue}>
            {fat}<Text style={styles.macroUnit}> / {fatGoal}g</Text>
          </Text>
          <View style={styles.miniTrack}>
            <View
              style={[
                styles.miniFill,
                { width: `${getPercent(fat, fatGoal)}%`, backgroundColor: colors.accent },
              ]}
            />
          </View>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceCard,
    marginBottom: spacing.md,
  },
  calBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  calInfo: {},
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  calLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  calNumbersRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  calBigNumber: {
    ...typography.titleLarge,
    fontSize: 28,
    color: colors.text,
  },
  calTarget: {
    ...typography.bodySecondary,
    color: colors.textMuted,
  },
  calRemainingPill: {
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  remainingText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '700',
  },
  percentText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  macrosRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  macroCard: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  macroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  macroName: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 11,
  },
  macroValue: {
    ...typography.mono,
    fontSize: 14,
    color: colors.text,
    marginBottom: 6,
  },
  macroUnit: {
    fontSize: 10,
    color: colors.textMuted,
  },
  miniTrack: {
    height: 4,
    backgroundColor: colors.surfaceHighlight,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  miniFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
});
