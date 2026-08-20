import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Trash2, MessageSquare, Award } from 'lucide-react-native';
import { useTheme, typography, borderRadius, spacing } from '../../theme/theme';
import { ExerciseLog, DifficultyLevel, TrackingType } from '../../types/database';

interface SetRowProps {
  log: ExerciseLog;
  trackingType?: TrackingType;
  prevInfoText?: string;
  onUpdate: (updates: Partial<ExerciseLog>) => void;
  onDelete: () => void;
}

export const SetRow: React.FC<SetRowProps> = ({
  log,
  trackingType = 'weight_reps',
  prevInfoText,
  onUpdate,
  onDelete,
}) => {
  const { colors } = useTheme();
  const [showCommentInput, setShowCommentInput] = useState(false);

  const isPR = (log.weight_kg || 0) >= 50 && (log.reps || 0) >= 8;

  const handleDifficultyCycle = () => {
    let next: DifficultyLevel | null = 'Easy';
    if (!log.difficulty) next = 'Easy';
    else if (log.difficulty === 'Easy') next = 'Moderate';
    else if (log.difficulty === 'Moderate') next = 'Hard';
    else next = null;

    onUpdate({ difficulty: next });
  };

  const getDifficultyColor = (diff?: DifficultyLevel | null) => {
    switch (diff) {
      case 'Easy':
        return colors.easy;
      case 'Moderate':
        return colors.moderate;
      case 'Hard':
        return colors.hard;
      default:
        return colors.textMuted;
    }
  };

  return (
    <View style={[styles.wrapper, { borderBottomColor: colors.border }]}>
      <View style={styles.container}>
        {/* Set Number / PR Trophy */}
        <View style={styles.setNumberCol}>
          {isPR ? (
            <Award size={16} color={colors.primary} />
          ) : (
            <Text style={[styles.setNumberText, { color: colors.textSecondary }]}>{log.set_number}</Text>
          )}
        </View>

        {/* Previous Set Info */}
        <View style={styles.prevCol}>
          <Text style={[styles.prevText, { color: colors.textMuted }]} numberOfLines={1}>
            {prevInfoText || '— —'}
          </Text>
        </View>

        {/* Input 1: Weight / Distance / Time */}
        <View style={styles.inputCol}>
          {trackingType === 'weight_reps' && (
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border, color: colors.text }]}
              keyboardType="decimal-pad"
              value={log.weight_kg ? String(log.weight_kg) : ''}
              placeholder="0"
              placeholderTextColor={colors.textDisabled}
              onChangeText={(val) => {
                const num = parseFloat(val);
                onUpdate({ weight_kg: isNaN(num) ? 0 : num });
              }}
            />
          )}

          {trackingType === 'distance_time' && (
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border, color: colors.text }]}
              keyboardType="decimal-pad"
              value={log.distance_val ? String(log.distance_val) : ''}
              placeholder="0.0"
              placeholderTextColor={colors.textDisabled}
              onChangeText={(val) => {
                const num = parseFloat(val);
                onUpdate({ distance_val: isNaN(num) ? 0 : num });
              }}
            />
          )}

          {trackingType === 'time_only' && (
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border, color: colors.text }]}
              value={log.time_duration || ''}
              placeholder="00:00"
              placeholderTextColor={colors.textDisabled}
              onChangeText={(val) => onUpdate({ time_duration: val })}
            />
          )}
        </View>

        {/* Input 2: Reps / Time (if not time_only) */}
        {trackingType !== 'time_only' && (
          <View style={styles.inputCol}>
            {trackingType === 'weight_reps' ? (
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border, color: colors.text }]}
                keyboardType="number-pad"
                value={log.reps ? String(log.reps) : ''}
                placeholder="0"
                placeholderTextColor={colors.textDisabled}
                onChangeText={(val) => {
                  const num = parseInt(val, 10);
                  onUpdate({ reps: isNaN(num) ? 0 : num });
                }}
              />
            ) : (
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border, color: colors.text }]}
                value={log.time_duration || ''}
                placeholder="00:00"
                placeholderTextColor={colors.textDisabled}
                onChangeText={(val) => onUpdate({ time_duration: val })}
              />
            )}
          </View>
        )}

        {/* RPE / Difficulty Pill */}
        <TouchableOpacity
          style={[
            styles.difficultyBtn,
            { backgroundColor: colors.surfaceHighlight, borderColor: colors.border },
            log.difficulty && {
              borderColor: getDifficultyColor(log.difficulty),
              backgroundColor: `${getDifficultyColor(log.difficulty)}20`,
            },
          ]}
          onPress={handleDifficultyCycle}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.difficultyText,
              { color: getDifficultyColor(log.difficulty) },
              log.difficulty && { fontWeight: '700' },
            ]}
          >
            {log.difficulty ? log.difficulty.toUpperCase() : 'RPE'}
          </Text>
        </TouchableOpacity>

        {/* Actions: Comment & Delete */}
        <View style={styles.actionsCol}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowCommentInput(!showCommentInput)}
            activeOpacity={0.7}
          >
            <MessageSquare
              size={15}
              color={log.comment ? colors.primary : colors.textDisabled}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onDelete}
            activeOpacity={0.7}
          >
            <Trash2 size={15} color={colors.textDisabled} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Set Comment Input row */}
      {showCommentInput && (
        <View style={styles.commentRow}>
          <TextInput
            style={[styles.commentInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
            placeholder="Set notes (e.g. paused reps, drop set...)"
            placeholderTextColor={colors.textDisabled}
            value={log.comment || ''}
            onChangeText={(val) => onUpdate({ comment: val })}
            autoFocus
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: 1,
    paddingVertical: 4,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  setNumberCol: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setNumberText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
  },
  prevCol: {
    width: 58,
    alignItems: 'center',
  },
  prevText: {
    ...typography.caption,
    fontSize: 10,
  },
  inputCol: {
    flex: 1,
  },
  input: {
    ...typography.mono,
    borderRadius: borderRadius.md,
    paddingVertical: 6,
    paddingHorizontal: 4,
    textAlign: 'center',
    borderWidth: 1,
    fontSize: 13,
  },
  difficultyBtn: {
    width: 62,
    paddingVertical: 7,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  difficultyText: {
    ...typography.caption,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  actionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    width: 54,
    justifyContent: 'flex-end',
  },
  actionBtn: {
    padding: 5,
  },
  commentRow: {
    marginTop: 4,
    paddingHorizontal: 4,
  },
  commentInput: {
    ...typography.caption,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderWidth: 1,
  },
});
