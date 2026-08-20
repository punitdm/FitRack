import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react-native';
import { useTheme, typography, borderRadius, spacing } from '../../theme/theme';

export interface ToastMessage {
  type: 'success' | 'error' | 'info';
  text: string;
}

interface ToastProps {
  toast: ToastMessage | null;
}

export const Toast: React.FC<ToastProps> = ({ toast }) => {
  const { colors } = useTheme();
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

  return (
    <View style={styles.toastContainer} pointerEvents="none">
      <View
        style={[
          styles.toastCard,
          {
            backgroundColor: colors.surfaceCard,
            borderColor: getBorderColor(),
          },
        ]}
      >
        {getIcon()}
        <Text style={[styles.toastText, { color: colors.text }]}>{toast.text}</Text>
      </View>
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
  toastText: {
    ...typography.bodySecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
