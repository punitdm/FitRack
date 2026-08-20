import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Plus, Trash2, TrendingUp, Link2, Unlink, Info } from 'lucide-react-native';
import { useTheme, typography, borderRadius, spacing } from '../../theme/theme';
import { ExerciseWithLogs, ExerciseLog, Exercise } from '../../types/database';
import { SetRow } from './SetRow';
import { Card } from '../common/Card';

interface ExerciseCardProps {
  item: ExerciseWithLogs;
  onAddSet: (exerciseId: number, lastLog?: ExerciseLog) => void;
  onUpdateSet: (logId: number, updates: Partial<ExerciseLog>) => void;
  onDeleteSet: (logId: number) => void;
  onRemoveExercise: (exerciseId: number) => void;
  onStartSupersetPairing?: (exerciseId: number) => void;
  onUnlinkSuperset?: (exerciseId: number) => void;
  onOpenDetail?: (exercise: Exercise) => void;
  isPairingMode?: boolean;
  isPairingSource?: boolean;
  onSelectForPairing?: (exerciseId: number) => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  item,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onRemoveExercise,
  onStartSupersetPairing,
  onUnlinkSuperset,
  onOpenDetail,
  isPairingMode = false,
  isPairingSource = false,
  onSelectForPairing,
}) => {
  const { colors } = useTheme();
  const { exercise, logs, previousSetInfo, supersetId, supersetPartnerName } = item;
  const categoryColor = colors.categories[exercise.category] || colors.categories.Custom;

  let prevSummary = '';
  if (previousSetInfo) {
    if (exercise.tracking_type === 'weight_reps') {
      prevSummary = `${previousSetInfo.weight_kg}kg × ${previousSetInfo.reps} reps`;
    } else if (exercise.tracking_type === 'distance_time') {
      prevSummary = `${previousSetInfo.distance_val}km (${previousSetInfo.time_duration})`;
    } else {
      prevSummary = previousSetInfo.time_duration || '';
    }
  }

  const handleAddSetClick = () => {
    const lastLog = logs.length > 0 ? logs[logs.length - 1] : undefined;
    onAddSet(exercise.id, lastLog);
  };

  const isSuperset = !!supersetId;

  return (
    <TouchableOpacity
      activeOpacity={isPairingMode ? 0.8 : 1}
      onLongPress={() => {
        if (onStartSupersetPairing && !isSuperset) {
          onStartSupersetPairing(exercise.id);
        }
      }}
      onPress={() => {
        if (isPairingMode && onSelectForPairing && !isPairingSource) {
          onSelectForPairing(exercise.id);
        }
      }}
    >
      <Card
        style={[
          styles.cardContainer,
          { backgroundColor: colors.surfaceCard, borderColor: colors.border },
          isSuperset && [styles.supersetCardBorder, { borderLeftColor: colors.primary }],
          isPairingSource && { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
          isPairingMode && !isPairingSource && { borderColor: colors.secondary, borderStyle: 'dashed' },
        ]}
      >
        {/* Superset Banner */}
        {isSuperset && (
          <View style={[styles.supersetBannerRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.supersetTag, { backgroundColor: colors.primaryMuted }]}>
              <Link2 size={12} color={colors.primary} />
              <Text style={[styles.supersetTagText, { color: colors.primary }]}>
                SUPERSET {supersetPartnerName ? `↔ ${supersetPartnerName}` : ''}
              </Text>
            </View>
            {onUnlinkSuperset && (
              <TouchableOpacity
                style={styles.unlinkBtn}
                onPress={() => onUnlinkSuperset(exercise.id)}
                activeOpacity={0.7}
              >
                <Unlink size={13} color={colors.textMuted} />
                <Text style={[styles.unlinkText, { color: colors.textMuted }]}>Unlink</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Pairing prompt indicator */}
        {isPairingMode && (
          <View style={[styles.pairingPrompt, { backgroundColor: colors.primaryMuted }]}>
            <Text style={[styles.pairingPromptText, { color: colors.primary }]}>
              {isPairingSource ? '⚡ Linking this exercise... Tap 2nd exercise' : '👉 Tap to link as Superset!'}
            </Text>
          </View>
        )}

        {/* Exercise Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.titleInfo}
            onPress={() => onOpenDetail && onOpenDetail(exercise)}
            activeOpacity={0.7}
          >
            <View style={styles.categoryBadgeRow}>
              <View
                style={[
                  styles.categoryPill,
                  { backgroundColor: `${categoryColor}20`, borderColor: categoryColor },
                ]}
              >
                <Text style={[styles.categoryText, { color: categoryColor }]}>{exercise.category}</Text>
              </View>
              {previousSetInfo && (
                <View style={[styles.prevBadge, { backgroundColor: colors.primaryMuted }]}>
                  <TrendingUp size={11} color={colors.primary} />
                  <Text style={[styles.prevBadgeText, { color: colors.primary }]}>Last: {prevSummary}</Text>
                </View>
              )}
            </View>
            <View style={styles.nameRow}>
              <Text style={[styles.exerciseName, { color: colors.text }]}>{exercise.name}</Text>
              <Info size={14} color={colors.textMuted} style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>

          {/* Action buttons */}
          <View style={styles.headerActions}>
            {!isSuperset && onStartSupersetPairing && (
              <TouchableOpacity
                style={[styles.supersetTriggerBtn, { backgroundColor: colors.surfaceElevated }]}
                onPress={() => onStartSupersetPairing(exercise.id)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Link2 size={15} color={colors.textSecondary} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.removeExerciseBtn, { backgroundColor: colors.surfaceElevated }]}
              onPress={() => onRemoveExercise(exercise.id)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Trash2 size={15} color={colors.textDisabled} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Table Headers */}
        <View style={[styles.tableHeaderRow, { borderBottomColor: colors.border }]}>
          <Text style={[styles.tableHeaderCol, { width: 24, textAlign: 'center', color: colors.textMuted }]}>SET</Text>
          <Text style={[styles.tableHeaderCol, { width: 58, textAlign: 'center', color: colors.textMuted }]}>PREV</Text>
          <Text style={[styles.tableHeaderCol, { flex: 1, textAlign: 'center', color: colors.textMuted }]}>
            {exercise.tracking_type === 'weight_reps' ? 'KG' : exercise.tracking_type === 'distance_time' ? 'KM' : 'TIME'}
          </Text>
          {exercise.tracking_type !== 'time_only' && (
            <Text
              style={[
                styles.tableHeaderCol,
                { flex: exercise.tracking_type === 'distance_time' ? 1.2 : 1, textAlign: 'center', color: colors.textMuted },
              ]}
            >
              {exercise.tracking_type === 'weight_reps' ? 'REPS' : 'TIME'}
            </Text>
          )}
          <Text style={[styles.tableHeaderCol, { width: 62, textAlign: 'center', color: colors.textMuted }]}>RPE</Text>
          <Text style={[styles.tableHeaderCol, { width: 54, textAlign: 'center', color: colors.textMuted }]}>ACT</Text>
        </View>

        {/* Set Rows */}
        <View style={styles.setRowsContainer}>
          {logs.map((log, index) => {
            let prevSetText = '';
            if (index === 0 && previousSetInfo) {
              prevSetText =
                exercise.tracking_type === 'weight_reps'
                  ? `${previousSetInfo.weight_kg}k × ${previousSetInfo.reps}`
                  : `${previousSetInfo.distance_val}k`;
            } else if (index > 0 && logs[index - 1]) {
              const prevLog = logs[index - 1];
              prevSetText =
                exercise.tracking_type === 'weight_reps'
                  ? `${prevLog.weight_kg}k × ${prevLog.reps}`
                  : `${prevLog.distance_val}k`;
            }

            return (
              <SetRow
                key={log.id}
                log={log}
                trackingType={exercise.tracking_type}
                prevInfoText={prevSetText}
                onUpdate={(updates) => onUpdateSet(log.id, updates)}
                onDelete={() => onDeleteSet(log.id)}
              />
            );
          })}
        </View>

        {/* Add Set Button */}
        <TouchableOpacity
          style={[styles.addSetButton, { backgroundColor: colors.primaryMuted, borderColor: colors.primary }]}
          onPress={handleAddSetClick}
          activeOpacity={0.7}
        >
          <Plus size={15} color={colors.primary} />
          <Text style={[styles.addSetText, { color: colors.primary }]}>Add Set {logs.length + 1}</Text>
        </TouchableOpacity>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  supersetCardBorder: {
    borderLeftWidth: 4,
  },
  supersetBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingBottom: 6,
    borderBottomWidth: 1,
  },
  supersetTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  supersetTagText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '800',
  },
  unlinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  unlinkText: {
    ...typography.caption,
    fontSize: 10,
  },
  pairingPrompt: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  pairingPromptText: {
    ...typography.caption,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  titleInfo: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  categoryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  categoryPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  categoryText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  prevBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  prevBadgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseName: {
    ...typography.titleSmall,
    fontSize: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  supersetTriggerBtn: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeExerciseBtn: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 6,
    borderBottomWidth: 1,
    marginBottom: 6,
  },
  tableHeaderCol: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  setRowsContainer: {
    marginTop: 2,
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    marginTop: 4,
    borderWidth: 1,
  },
  addSetText: {
    ...typography.bodySecondary,
    fontSize: 13,
    fontWeight: '700',
  },
});
