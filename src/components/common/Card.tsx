import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme, borderRadius, spacing } from '../../theme/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'surface' | 'elevated' | 'card' | 'highlight';
}

export const Card: React.FC<CardProps> = ({ children, style, variant = 'card' }) => {
  const { colors } = useTheme();

  const getBackgroundColor = () => {
    switch (variant) {
      case 'surface':
        return colors.surface;
      case 'elevated':
        return colors.surfaceElevated;
      case 'highlight':
        return colors.surfaceHighlight;
      case 'card':
      default:
        return colors.surfaceCard;
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
  },
});
