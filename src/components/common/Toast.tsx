import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_BOTTOM_GAP, TAB_BAR_HEIGHT } from './tabBarSpace';
import { Text } from './Typography';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react-native';
import { useTheme, typography, borderRadius, spacing } from '../../theme/theme';
import { motion, prefersReducedMotion } from './Motion';

export interface ToastMessage {
  type: 'success' | 'error' | 'info';
  text: string;
  /** Optional button (e.g. Undo). Toasts with an action sit at the bottom, above the navbar. */
  action?: { label: string; onPress: () => void };
  /** Makes repeated identical messages re-animate. */
  id?: number;
}

interface ToastProps {
  toast: ToastMessage | null;
}

export const Toast: React.FC<ToastProps> = ({ toast: incoming }) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // Keep the last message on screen while it animates out.
  const [toast, setToast] = useState<ToastMessage | null>(incoming);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (incoming) {
      setToast(incoming);
      progress.setValue(prefersReducedMotion() ? 1 : 0);
      Animated.spring(progress, {
        toValue: 1,
        damping: 18,
        stiffness: 240,
        mass: 0.8,
        useNativeDriver: true,
      }).start();
      return;
    }
    const anim = Animated.timing(progress, {
      toValue: 0,
      duration: motion.fast,
      easing: motion.easeIn,
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished) setToast(null);
    });
    return () => anim.stop();
  }, [incoming, progress]);

  if (!toast) return null;

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return colors.success;
      case 'error':
        return colors.danger;
      case 'info':
      default:
        return colors.primary;
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 size={16} color={colors.success} />;
      case 'error':
        return <AlertTriangle size={16} color={colors.danger} />;
      case 'info':
      default:
        return <Info size={16} color={colors.primary} />;
    }
  };

  const bottom = !!toast.action;
  return (
    <View
      style={[
        styles.toastContainer,
        bottom ? { top: undefined, bottom: insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP + 14 } : null,
      ]}
      pointerEvents="box-none"
    >
      <Animated.View
        accessibilityLiveRegion="polite"
        style={[
          styles.toastCard,
          {
            backgroundColor: colors.surfaceCard,
            borderColor: getBorderColor(),
            opacity: progress,
            transform: [
              { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [bottom ? 16 : -16, 0] }) },
              { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
            ],
          },
        ]}
      >
        {getIcon()}
        <Text style={[styles.toastText, { color: colors.text, flexShrink: 1 }]}>{toast.text}</Text>
        {toast.action && (
          <Pressable
            onPress={toast.action.onPress}
            hitSlop={10}
            style={({ pressed }) => [styles.action, { backgroundColor: pressed ? colors.primaryMuted : 'transparent' }]}
            accessibilityRole="button"
            accessibilityLabel={toast.action.label}
          >
            <Text style={[styles.actionText, { color: colors.primary }]}>{toast.action.label}</Text>
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 55,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
    alignItems: 'center',
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    maxWidth: '90%',
  },
  action: {
    marginLeft: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '800',
  },
  toastText: {
    ...typography.bodySecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
