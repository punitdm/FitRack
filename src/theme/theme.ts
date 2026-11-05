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
    fontSize: 26,
    fontWeight: '800' as const,
    letterSpacing: -0.6,
  },
  titleMedium: {
    fontSize: 18,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  titleSmall: {
    fontSize: 15,
    fontWeight: '600' as const,
    letterSpacing: -0.1,
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
  },
  bodySecondary: {
    fontSize: 13,
    lineHeight: 18,
  },
  caption: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  /** Small section label (sentence case, not ALL CAPS). */
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
  },
  mono: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
};
