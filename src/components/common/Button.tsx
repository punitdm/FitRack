import React from 'react';
import {
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { Text } from './Typography';
import { useTheme, typography, borderRadius, spacing } from '../../theme/theme';
import { ScalePressable } from './Motion';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const { colors } = useTheme();

  const getContainerStyle = () => {
    let base: ViewStyle = {};

    // Size
    switch (size) {
      case 'sm':
        base = { ...base, paddingVertical: 6, paddingHorizontal: spacing.md };
        break;
      case 'lg':
        base = { ...base, paddingVertical: 14, paddingHorizontal: spacing.xl };
        break;
      case 'md':
      default:
        base = { ...base, paddingVertical: 10, paddingHorizontal: spacing.lg };
        break;
    }

    // Variant
    switch (variant) {
      case 'secondary':
        base = {
          ...base,
          backgroundColor: colors.surfaceHighlight,
          borderWidth: 1,
          borderColor: colors.borderLight,
        };
        break;
      case 'outline':
        base = {
          ...base,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.primary,
        };
        break;
      case 'danger':
        base = {
          ...base,
          backgroundColor: colors.danger,
        };
        break;
      case 'ghost':
        base = {
          ...base,
          backgroundColor: 'transparent',
        };
        break;
      case 'primary':
      default:
        base = {
          ...base,
          backgroundColor: colors.primary,
        };
        break;
    }

    if (disabled || loading) {
      base.opacity = 0.5;
    }

    return base;
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary':
        return colors.textInverse;
      case 'secondary':
        return colors.text;
      case 'outline':
        return colors.primary;
      case 'danger':
        return '#FFFFFF';
      case 'ghost':
        return colors.textSecondary;
      default:
        return colors.textInverse;
    }
  };

  return (
    <ScalePressable
      style={[styles.button, getContainerStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      pressedScale={0.96}
      accessibilityLabel={title}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: getTextColor() }, textStyle]}>{title}</Text>
        </>
      )}
    </ScalePressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    gap: 6,
  },
  text: {
    ...typography.titleSmall,
    fontSize: 14,
    fontWeight: '700',
  },
});
