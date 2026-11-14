import React, { createContext, forwardRef, useContext } from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  TextProps,
  TextInputProps,
  TextStyle,
  StyleSheet,
  StyleProp,
} from 'react-native';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';

/**
 * App-wide typeface (Inter).
 *
 * On Android a custom font can't pick its weight from `fontWeight`; each weight
 * is its own font family. These wrappers translate `fontWeight` into the right
 * Inter family so every existing style keeps working unchanged.
 *
 * Use these instead of react-native's Text / TextInput.
 */

export const appFonts = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
};

const FAMILY_BY_WEIGHT: Record<string, string> = {
  '100': 'Inter_400Regular',
  '200': 'Inter_400Regular',
  '300': 'Inter_400Regular',
  '400': 'Inter_400Regular',
  normal: 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
  bold: 'Inter_700Bold',
  '800': 'Inter_800ExtraBold',
  '900': 'Inter_900Black',
};

let fontsReady = false;
/** Called once Inter has loaded; until then (or if loading fails) the system font is used. */
export function markFontsReady(ready: boolean): void {
  fontsReady = ready;
}

/** Nested <Text> inherits its parent's font unless it sets its own weight. */
const NestedText = createContext(false);

function withAppFont(style: StyleProp<TextStyle>, nested: boolean): StyleProp<TextStyle> {
  if (!fontsReady) return style;
  const flat = StyleSheet.flatten(style) || {};
  if (flat.fontFamily) return style; // explicit family wins (e.g. monospace)
  const weight = flat.fontWeight != null ? String(flat.fontWeight) : undefined;
  if (nested && weight === undefined) return style;
  const fontFamily = FAMILY_BY_WEIGHT[weight ?? '400'] ?? 'Inter_400Regular';
  // Drop fontWeight so Android doesn't fake-bold an already-bold face.
  const { fontWeight: _dropped, ...rest } = flat;
  return { ...rest, fontFamily };
}

export const Text = forwardRef<React.ComponentRef<typeof RNText>, TextProps>(function AppText({ style, ...rest }, ref) {
  const nested = useContext(NestedText);
  const text = <RNText ref={ref} {...rest} style={withAppFont(style, nested)} />;
  return nested ? text : <NestedText.Provider value>{text}</NestedText.Provider>;
});

export const TextInput = forwardRef<React.ComponentRef<typeof RNTextInput>, TextInputProps>(function AppTextInput({ style, ...rest }, ref) {
  return <RNTextInput ref={ref} {...rest} style={withAppFont(style, false)} />;
});
