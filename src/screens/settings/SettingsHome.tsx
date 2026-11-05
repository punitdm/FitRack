import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, TextInput as RNTextInput, Keyboard, useWindowDimensions } from 'react-native';
import Animated, {
  Extrapolation,
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  scrollTo,
  runOnUI,
  runOnJS,
  useAnimatedReaction,
} from 'react-native-reanimated';
import {
  ArrowDownToLine,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  HardDrive,
  Info,
  Palette,
  Ruler,
  Scale,
  Search,
  X,
  Check,
} from 'lucide-react-native';
import { Text, TextInput } from '../../components/common/Typography';
import { ScalePressable } from '../../components/common/Motion';
import { useTheme } from '../../theme/theme';
import { ACCENT_PRESETS } from '../../theme/ThemeContext';
import { haptics } from '../../utils/haptics';
import type { SettingsSubScreenKey } from '../ImportExportScreen';
import { Modal } from '../../components/common/Modal';
import { useUnits, WeightUnit } from '../../utils/units';

/**
 * Settings home.
 *  - Large "Settings" title that shrinks up next to the back button as you scroll.
 *  - A search pill that folds into a round search button; search finds any
 *    individual setting across categories.
 *  - Categories as tall rounded rows, grouped by App / Training / Data.
 */

type IconCmp = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

type HomeKey = SettingsSubScreenKey | 'units';

interface Category {
  key: HomeKey;
  title: string;
  Icon: IconCmp;
  /** Individual settings inside, for search. */
  rows: string[];
}

const GROUPS: { title: string; keys: HomeKey[] }[] = [
  { title: 'App', keys: ['theme', 'units'] },
  { title: 'Training', keys: ['catalog', 'bodystats'] },
  { title: 'Data & info', keys: ['backup', 'importApps', 'about'] },
];

const CATEGORIES: Record<HomeKey, Category> = {
  units: { key: 'units', title: 'Weight units', Icon: Scale, rows: ['Kilograms (kg)', 'Pounds (lb)'] },
  theme: { key: 'theme', title: 'Theme & colours', Icon: Palette, rows: ['Dark mode', 'Light mode', 'Accent colour'] },
  catalog: { key: 'catalog', title: 'Exercise catalog', Icon: BookOpen, rows: ['Custom exercises', 'Muscle categories', 'Tracking type'] },
  bodystats: { key: 'bodystats', title: 'Body measurements', Icon: Ruler, rows: ['Body weight log', 'Body fat', 'Chest, waist, hips, arm, thigh'] },
  backup: { key: 'backup', title: 'Backup & restore', Icon: HardDrive, rows: ['Export full JSON backup', 'Restore from backup', 'Export spreadsheet (CSV)'] },
  importApps: { key: 'importApps', title: 'Import from other apps', Icon: ArrowDownToLine, rows: ['Import from FitNotes', 'Import from GymMane'] },
  about: { key: 'about', title: 'About FitRack', Icon: Info, rows: ['Version', 'Offline & privacy', 'Storage used'] },
};

// Header geometry
const TOP = 12;
const BACK = 36;
const TITLE_SIZE = 32;
const TITLE_TOP = TOP + BACK + 16;
const TITLE_H = TITLE_SIZE * 1.1;
const PILL_TOP = TITLE_TOP + TITLE_H + 16;
const PILL_H = 52;
const CONTENT_TOP = PILL_TOP + PILL_H + 20;
const FOLD = 96;
const SMALL = 0.56;
const SIDE = 20;

const plain = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

interface SettingsHomeProps {
  onBack?: () => void;
  onOpen: (key: SettingsSubScreenKey) => void;
}

export const SettingsHome: React.FC<SettingsHomeProps> = ({ onBack, onOpen }) => {
  const { colors, isDark, accent } = useTheme();
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<RNTextInput>(null);

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
  });
  // Only when the header is folded does the pill act as a "search" button.
  const [folded, setFolded] = useState(false);
  useAnimatedReaction(
    () => y.value > FOLD * 0.5,
    (now, prev) => {
      if (now !== prev) runOnJS(setFolded)(now);
    }
  );

  // ------------------------------------------------------------ search
  const q = plain(query.trim());
  const searching = focused || q.length > 0;
  const hits = useMemo(() => {
    if (!q) return [];
    const out: { cat: Category; row: string }[] = [];
    for (const g of GROUPS) {
      for (const key of g.keys) {
        const cat = CATEGORIES[key];
        if (plain(cat.title).includes(q)) out.push({ cat, row: cat.title });
        for (const row of cat.rows) if (plain(row).includes(q)) out.push({ cat, row });
      }
    }
    return out;
  }, [q]);

  const units = useUnits();
  const [unitsOpen, setUnitsOpen] = useState(false);

  const open = (key: HomeKey) => {
    haptics.select();
    Keyboard.dismiss();
    if (key === 'units') setUnitsOpen(true);
    else onOpen(key);
  };

  const openSearch = () => {
    haptics.select();
    runOnUI(() => {
      'worklet';
      scrollTo(scrollRef, 0, 0, true);
    })();
    setTimeout(() => inputRef.current?.focus(), 260);
  };

  // ------------------------------------------------------------ header morph
  const titleStyle = useAnimatedStyle(() => {
    const p = interpolate(y.value, [0, FOLD], [0, 1], Extrapolation.CLAMP);
    const smallTop = TOP + BACK / 2 - (TITLE_H * SMALL) / 2;
    return {
      transform: [
        { translateX: (onBack ? BACK + 12 : 0) * p },
        { translateY: (smallTop - TITLE_TOP) * p },
        { scale: 1 - (1 - SMALL) * p },
      ],
    };
  });

  const pillStyle = useAnimatedStyle(() => {
    const p = interpolate(y.value, [0, FOLD], [0, 1], Extrapolation.CLAMP);
    const fullW = width - SIDE * 2;
    return {
      left: SIDE + (width - SIDE - BACK - SIDE) * p,
      top: PILL_TOP + (TOP - PILL_TOP) * p,
      width: fullW + (BACK - fullW) * p,
      height: PILL_H + (BACK - PILL_H) * p,
      borderRadius: (PILL_H + (BACK - PILL_H) * p) / 2,
    };
  });
  const pillInputStyle = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [0, FOLD * 0.6], [1, 0], Extrapolation.CLAMP),
  }));
  const pillIconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [FOLD * 0.45, FOLD], [0, 1], Extrapolation.CLAMP),
  }));
  const barStyle = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [FOLD * 0.4, FOLD], [0, 1], Extrapolation.CLAMP),
  }));

  const accentName = ACCENT_PRESETS[accent]?.name ?? 'Volt Green';
  const valueFor = (key: HomeKey) =>
    key === 'theme' ? `${isDark ? 'Dark' : 'Light'} · ${accentName}` : key === 'units' ? (units.unit === 'kg' ? 'Kilograms' : 'Pounds') : undefined;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: CONTENT_TOP, paddingHorizontal: SIDE, paddingBottom: 48, minHeight: '100%' }}
        showsVerticalScrollIndicator={false}
      >
        {searching ? (
          <Animated.View key="results" entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} style={{ gap: 10 }}>
            {q.length === 0 ? (
              <Text style={[styles.hint, { color: colors.textMuted }]}>Search for any setting, e.g. “backup” or “dark”.</Text>
            ) : hits.length === 0 ? (
              <Text style={[styles.hint, { color: colors.textSecondary }]}>No settings match “{query.trim()}”.</Text>
            ) : (
              hits.map((h, i) => (
                <ScalePressable
                  key={`${h.cat.key}-${h.row}-${i}`}
                  style={[styles.result, { backgroundColor: colors.surfaceCard }]}
                  onPress={() => open(h.cat.key)}
                  pressedScale={0.975}
                  accessibilityLabel={`${h.row}, in ${h.cat.title}`}
                >
                  <View style={[styles.circle, { backgroundColor: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(15,23,42,0.06)' }]}>
                    <h.cat.Icon size={19} color={colors.text} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
                      {h.row}
                    </Text>
                    {h.row !== h.cat.title && (
                      <Text style={[styles.resultSub, { color: colors.textMuted }]} numberOfLines={1}>
                        {h.cat.title}
                      </Text>
                    )}
                  </View>
                  <ChevronRight size={16} color={colors.textMuted} />
                </ScalePressable>
              ))
            )}
          </Animated.View>
        ) : (
          <Animated.View key="cats" entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)}>
            {GROUPS.map((g) => (
              <View key={g.title} style={styles.group}>
                <Text style={[styles.groupLabel, { color: colors.textMuted }]}>{g.title}</Text>
                {g.keys.map((key) => {
                  const cat = CATEGORIES[key];
                  const value = valueFor(key);
                  return (
                    <ScalePressable
                      key={key}
                      style={[styles.bubble, { backgroundColor: colors.surfaceCard }]}
                      onPress={() => open(key)}
                      pressedScale={0.975}
                      accessibilityLabel={value ? `${cat.title}, ${value}` : cat.title}
                    >
                      <View style={[styles.circle, { backgroundColor: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(15,23,42,0.06)' }]}>
                        <cat.Icon size={19} color={colors.text} />
                      </View>
                      <Text style={[styles.rowTitle, { color: colors.text, flex: 1 }]} numberOfLines={1}>
                        {cat.title}
                      </Text>
                      {!!value && (
                        <Text style={[styles.value, { color: colors.textMuted }]} numberOfLines={1}>
                          {value}
                        </Text>
                      )}
                      <ChevronRight size={16} color={colors.textMuted} />
                    </ScalePressable>
                  );
                })}
              </View>
            ))}
          </Animated.View>
        )}
      </Animated.ScrollView>

      <Modal visible={unitsOpen} onClose={() => setUnitsOpen(false)} title="Weight units">
        <View style={{ paddingBottom: 8 }}>
          <Text style={[styles.hint, { color: colors.textMuted, marginLeft: 0, marginTop: 0, marginBottom: 10, fontSize: 13 }]}>
            Your data is kept as is; only how weights are shown and typed changes.
          </Text>
          {(
            [
              ['kg', 'Kilograms', 'kg · steps of 2.5'],
              ['lb', 'Pounds', 'lb · steps of 5'],
            ] as [WeightUnit, string, string][]
          ).map(([u, title, sub]) => {
            const on = units.unit === u;
            return (
              <Pressable
                key={u}
                onPress={() => {
                  haptics.select();
                  units.setUnit(u);
                  setUnitsOpen(false);
                }}
                style={[styles.unitRow, { backgroundColor: on ? colors.primaryMuted : colors.surfaceHighlight }]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
                  <Text style={[styles.resultSub, { color: colors.textMuted }]}>{sub}</Text>
                </View>
                {on && <Check size={18} color={colors.primary} />}
              </Pressable>
            );
          })}
        </View>
      </Modal>

      {/* Backdrop behind the collapsed header so content doesn't show through */}
      <Animated.View
        pointerEvents="none"
        style={[styles.bar, { backgroundColor: colors.background, borderBottomColor: colors.border }, barStyle]}
      />

      {/* Header: back, morphing title, morphing search pill */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {onBack && (
          <ScalePressable
            style={[styles.round, { backgroundColor: colors.surfaceCard, left: SIDE, top: TOP }]}
            onPress={onBack}
            pressedScale={0.9}
            accessibilityLabel="Back"
          >
            <ChevronLeft size={20} color={colors.text} />
          </ScalePressable>
        )}

        <Animated.View pointerEvents="none" style={[styles.titleWrap, titleStyle]}>
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.pill,
            { backgroundColor: colors.surfaceCard, borderColor: focused ? colors.borderLight : 'transparent' },
            pillStyle,
          ]}
        >
          <Animated.View style={[styles.pillInner, { width: width - SIDE * 2 }, pillInputStyle]}>
            <Search size={18} color={focused ? colors.text : colors.textMuted} />
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: colors.text }]}
              value={query}
              onChangeText={setQuery}
              placeholder="Search settings"
              placeholderTextColor={colors.textMuted}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              returnKeyType="search"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear search">
                <X size={16} color={colors.textMuted} />
              </Pressable>
            )}
          </Animated.View>
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.center, pillIconStyle]}
            pointerEvents={folded ? 'auto' : 'none'}
          >
            <Pressable style={[StyleSheet.absoluteFill, styles.center]} onPress={openSearch} accessibilityLabel="Search settings">
              <Search size={16} color={colors.text} />
            </Pressable>
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: TOP * 2 + BACK,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  round: {
    position: 'absolute',
    width: BACK,
    height: BACK,
    borderRadius: BACK / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    position: 'absolute',
    left: SIDE,
    top: TITLE_TOP,
    transformOrigin: 'left top',
  },
  title: { fontSize: TITLE_SIZE, fontWeight: '800', letterSpacing: -0.9, lineHeight: TITLE_H },
  pill: {
    position: 'absolute',
    overflow: 'hidden',
    borderWidth: 1,
  },
  pillInner: {
    height: PILL_H,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
  },
  input: { flex: 1, fontSize: 16, fontWeight: '500', paddingVertical: 0 },
  center: { alignItems: 'center', justifyContent: 'center' },

  group: { marginBottom: 22 },
  groupLabel: { fontSize: 13, fontWeight: '700', marginLeft: 4, marginBottom: 10 },
  bubble: {
    height: 64,
    borderRadius: 22,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
  },
  circle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  value: { fontSize: 13, fontWeight: '600', maxWidth: 140 },

  result: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  resultSub: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  hint: { fontSize: 15, fontWeight: '500', marginTop: 4, marginLeft: 4 },
  unitRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 14, marginBottom: 10 },
});
