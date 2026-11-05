import React, { useEffect } from 'react';
import {
  Modal as RNModal,
  View,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { TouchableOpacity } from './Touchable';
import { Text } from './Typography';
import { X } from 'lucide-react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, typography, borderRadius, spacing } from '../../theme/theme';
import { prefersReducedMotion, usePresence } from './Motion';

/**
 * App-wide sheet. Same API as before (visible / onClose / title / children),
 * now presented as a bottom sheet:
 *  - springs up from the bottom, backdrop fades in
 *  - drag the handle or title bar down to dismiss (with velocity)
 *  - tap the backdrop, the X, or Android back to close
 * Animations run on the UI thread via Reanimated.
 */

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const SCREEN_H = Dimensions.get('window').height;
const EXIT_MS = 220;
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 900;
const OPEN_SPRING = { damping: 26, stiffness: 260, mass: 0.9 };

export const Modal: React.FC<ModalProps> = ({ visible, onClose, title, children }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const mounted = usePresence(visible, EXIT_MS + 30);

  const translateY = useSharedValue(SCREEN_H);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    if (!mounted) return;
    const reduce = prefersReducedMotion();
    if (visible) {
      translateY.value = reduce ? 0 : withSpring(0, OPEN_SPRING);
      backdrop.value = reduce ? 1 : withTiming(1, { duration: 220 });
    } else {
      const ease = { duration: EXIT_MS, easing: Easing.in(Easing.cubic) };
      translateY.value = reduce ? SCREEN_H : withTiming(SCREEN_H * 0.6, ease);
      backdrop.value = reduce ? 0 : withTiming(0, ease);
    }
  }, [visible, mounted, translateY, backdrop]);

  const drag = Gesture.Pan()
    .activeOffsetY(8)
    .failOffsetX([-24, 24])
    .onUpdate((e) => {
      // Follow the finger downwards; resist a little when pulled up.
      translateY.value = e.translationY > 0 ? e.translationY : e.translationY / 6;
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, OPEN_SPRING);
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    // Fade the dim with the backdrop value, and lighten it as the sheet is dragged away.
    opacity: backdrop.value * interpolate(translateY.value, [0, SCREEN_H * 0.5], [1, 0.2], 'clamp'),
  }));

  return (
    <RNModal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      {/* Gestures inside an RN Modal need their own root on Android. */}
      <GestureHandlerRootView style={styles.fill}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
          <View style={styles.root}>
            <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, backdropStyle]}>
              <Pressable style={styles.fill} onPress={onClose} accessibilityLabel="Close" />
            </Animated.View>

            <Animated.View
              style={[
                styles.sheet,
                {
                  backgroundColor: colors.surfaceCard,
                  paddingBottom: Math.max(insets.bottom, spacing.md),
                },
                sheetStyle,
              ]}
              accessibilityViewIsModal
            >
              <GestureDetector gesture={drag}>
                <View>
                  <View style={styles.handleArea}>
                    <View style={[styles.handle, { backgroundColor: colors.borderLight }]} />
                  </View>
                  <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                      {title}
                    </Text>
                    <TouchableOpacity
                      style={[styles.closeButton, { backgroundColor: colors.surfaceHighlight }]}
                      onPress={onClose}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityRole="button"
                      accessibilityLabel="Close"
                    >
                      <X size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </GestureDetector>

              <View style={styles.content}>{children}</View>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    maxHeight: '90%',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 24,
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  title: {
    ...typography.titleMedium,
    fontSize: 18,
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexShrink: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
