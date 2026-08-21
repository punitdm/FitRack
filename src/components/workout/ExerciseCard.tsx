import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MessageSquare, Award, ArrowUp, ArrowDown, Check } from 'lucide-react-native';
import { useTheme, typography, borderRadius, spacing } from '../../theme/theme';
import { ExerciseWithLogs } from '../../types/database';

interface ExerciseCardProps {
  item: ExerciseWithLogs;
  onOpenLogger: (item: ExerciseWithLogs) => void;
  onLongPress: (exerciseId: number) => void;
  isReorderMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (exerciseId: number) => void;
  onMoveUp?: (exerciseId: number) => void;
  onMoveDown?: (exerciseId: number) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  item,
  onOpenLogger,
  onLongPress,
  isReorderMode = false,
  isSelected = false,
  onToggleSelect,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
}) => {
  const { colors } = useTheme();
  const { exercise, logs, supersetId, supersetColor } = item;

  const isSuperset = !!supersetId;
  const isWeightReps = exercise.tracking_type === 'weight_reps';
  const isDistanceTime = exercise.tracking_type === 'distance_time';

  // Find max weight in this session to mark with 🏆
  const maxWeightInSession = logs.reduce((max, l) => Math.max(max, l.weight_kg || 0), 0);

  const barColor = supersetColor || colors.primary;

  return (
    <TouchableOpacity
      style={[
        styles.cardContainer,
        isSelected && styles.cardSelectedBorder,
      ]}
      activeOpacity={0.75}
      onPress={() => {
        if (isReorderMode && onToggleSelect) {
          onToggleSelect(exercise.id);
        } else {
          onOpenLogger(item);
        }
      }}
      onLongPress={() => onLongPress(exercise.id)}
    >
      {/* Left Superset Color Bar (Screenshot 1) */}
      {isSuperset && (
        <View style={[styles.supersetLeftBar, { backgroundColor: barColor }]} />
      )}

      <View style={styles.cardInner}>
        {/* Card Header (FitNotes Style) */}
        <View style={styles.headerRow}>
          <View style={styles.titleWrapper}>
            <Text style={styles.exerciseTitle} numberOfLines={1}>
              {exercise.name}
            </Text>
            <View style={[styles.headerUnderline, { backgroundColor: '#206E8A' }]} />
          </View>

          {/* Reorder Buttons (Screenshot 3) */}
          {isReorderMode && (
            <View style={styles.reorderArrowsRow}>
              {canMoveUp && (
                <TouchableOpacity
                  style={styles.arrowBtn}
                  onPress={() => onMoveUp && onMoveUp(exercise.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <ArrowUp size={16} color="#38BDF8" strokeWidth={2.5} />
                </TouchableOpacity>
              )}
              {canMoveDown && (
                <TouchableOpacity
                  style={styles.arrowBtn}
                  onPress={() => onMoveDown && onMoveDown(exercise.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <ArrowDown size={16} color="#38BDF8" strokeWidth={2.5} />
                </TouchableOpacity>
              )}
              {isSelected && (
                <View style={styles.selectedCheckBadge}>
                  <Check size={14} color="#38BDF8" strokeWidth={3} />
                </View>
              )}
            </View>
          )}
        </View>

        {/* Individual Sets Rows (FitNotes Screenshot 1 & 2) */}
        {logs.length > 0 ? (
          <View style={styles.setsListContainer}>
            {logs.map((log) => {
              const hasComment = !!log.comment;
              const isPr = maxWeightInSession > 0 && log.weight_kg === maxWeightInSession && isWeightReps;

              return (
                <View key={log.id} style={styles.setRowItem}>
                  {/* Left Icon Column */}
                  <View style={styles.iconCol}>
                    {hasComment ? (
                      <MessageSquare size={16} color="#38BDF8" fill="#38BDF8" />
                    ) : isPr ? (
                      <Award size={16} color="#38BDF8" />
                    ) : null}
                  </View>

                  {/* Weight Column */}
                  <Text style={styles.weightCol}>
                    {isWeightReps
                      ? `${(Math.round(log.weight_kg * 10) / 10).toFixed(1)} kgs`
                      : isDistanceTime
                      ? `${log.distance_val} km`
                      : log.time_duration}
                  </Text>

                  {/* Reps Column */}
                  <Text style={styles.repsCol}>
                    {isWeightReps
                      ? `${log.reps} reps`
                      : isDistanceTime
                      ? log.time_duration
                      : ''}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptySetsPrompt}>
            <Text style={styles.emptyPromptText}>Tap to log sets</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#262930',
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333742',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  cardSelectedBorder: {
    borderColor: '#38BDF8',
    borderWidth: 1.5,
    backgroundColor: '#2A303C',
  },
  supersetLeftBar: {
    width: 5,
    alignSelf: 'stretch',
  },
  cardInner: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  titleWrapper: {
    flex: 1,
  },
  exerciseTitle: {
    ...typography.titleMedium,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  headerUnderline: {
    height: 1.5,
    marginTop: 4,
    width: '100%',
  },
  reorderArrowsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 8,
  },
  arrowBtn: {
    padding: 4,
  },
  selectedCheckBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#38BDF820',
    alignItems: 'center',
    justifyContent: 'center',
  },
  setsListContainer: {
    paddingVertical: 2,
  },
  setRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  iconCol: {
    width: 28,
    alignItems: 'flex-start',
  },
  weightCol: {
    ...typography.body,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  repsCol: {
    ...typography.body,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
    width: 90,
    textAlign: 'right',
    paddingRight: 6,
  },
  emptySetsPrompt: {
    paddingVertical: 6,
  },
  emptyPromptText: {
    ...typography.caption,
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
});
