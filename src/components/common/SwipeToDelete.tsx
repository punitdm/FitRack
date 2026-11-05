import React, { useRef } from 'react';
import { StyleSheet, Pressable } from 'react-native';
import ReanimatedSwipeable, {
  SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { SharedValue, useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated';
import { Trash2 } from 'lucide-react-native';
import { Text } from './Typography';
import { useTheme, borderRadius } from '../../theme/theme';
import { haptics } from '../../utils/haptics';

/**
 * Swipe a row left to reveal a Delete action. Tapping the action calls
 * `onDelete` (which should keep its own confirmation), then the row closes.
 * The tap-to-delete button inside the row keeps working as before.
 */

const ACTION_WIDTH = 88;

interface SwipeToDeleteProps {
  children: React.ReactNode;
  onDelete: () => void;
  enabled?: boolean;
  /** Match the row's corner radius so the action looks attached. */
  radius?: number;
}

function DeleteAction({
  progress,
  onPress,
  radius,
}: {
  progress: SharedValue<number>;
  onPress: () => void;
  radius: number;
}) {
  const { colors } = useTheme();
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.4, 1], [0, 0.8, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.8, 1], Extrapolation.CLAMP) }],
  }));
  return (
    <Animated.View style={[styles.actionWrap, style]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Delete"
        style={[styles.action, { backgroundColor: colors.danger, borderRadius: radius }]}
      >
        <Trash2 size={20} color="#FFFFFF" />
        <Text style={styles.actionText}>Delete</Text>
      </Pressable>
    </Animated.View>
  );
}

export const SwipeToDelete: React.FC<SwipeToDeleteProps> = ({
  children,
  onDelete,
  enabled = true,
  radius = borderRadius.lg,
}) => {
  const ref = useRef<SwipeableMethods>(null);

  if (!enabled) return <>{children}</>;

  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={1.6}
      overshootRight={false}
      rightThreshold={ACTION_WIDTH / 2}
      onSwipeableWillOpen={() => haptics.threshold()}
      renderRightActions={(progress) => (
        <DeleteAction
          progress={progress}
          radius={radius}
          onPress={() => {
            ref.current?.close();
            onDelete();
          }}
        />
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
};

const styles = StyleSheet.create({
  actionWrap: {
    width: ACTION_WIDTH,
    paddingLeft: 10,
    justifyContent: 'center',
  },
  action: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
