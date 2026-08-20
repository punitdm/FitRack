import { buildThemeColors, ThemeColors } from './ThemeContext';

export * from './ThemeContext';

// Default static fallback colors
export const colors = buildThemeColors('dark', 'volt');

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  full: 9999,
};

export const typography = {
  titleLarge: {
    fontSize: 24,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  titleMedium: {
    fontSize: 18,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  titleSmall: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 14,
  },
  bodySecondary: {
    fontSize: 13,
  },
  caption: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  mono: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
};
