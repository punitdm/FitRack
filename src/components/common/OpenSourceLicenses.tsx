import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { Text } from './Typography';
import { useTheme } from '../../theme/theme';

/**
 * Open-source notices. MIT-licensed code we ship must keep its copyright and
 * permission notice; this lists every bundled library and shows full texts.
 */

const LIBRARIES: { name: string; licence: string; notice?: string }[] = [
  {
    name: 'react-native-body-highlighter',
    licence: 'MIT',
    notice: 'Copyright (c) 2022 ELABBASSI Hicham',
  },
  { name: 'React, React Native', licence: 'MIT', notice: 'Copyright (c) Meta Platforms, Inc. and affiliates.' },
  { name: 'Expo SDK (SQLite, File System, Haptics, Blur, Font…)', licence: 'MIT', notice: 'Copyright (c) 2015-present 650 Industries, Inc. (aka Expo)' },
  { name: 'React Navigation', licence: 'MIT', notice: 'Copyright (c) 2017 React Navigation Contributors' },
  { name: 'React Native Reanimated, Gesture Handler, Screens', licence: 'MIT', notice: 'Copyright (c) 2016 Software Mansion <swmansion.com>' },
  { name: 'react-native-svg', licence: 'MIT', notice: 'Copyright (c) 2015-2016 Horcrux' },
  { name: 'react-native-safe-area-context', licence: 'MIT', notice: 'Copyright (c) 2019 Th3rd Wave' },
  { name: 'Lucide icons', licence: 'ISC', notice: 'Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2022.' },
  { name: 'date-fns', licence: 'MIT', notice: 'Copyright (c) 2021 Sasha Koss and Lesha Koss' },
  { name: 'Papa Parse', licence: 'MIT', notice: 'Copyright (c) 2015 Matthew Holt' },
  { name: 'fflate', licence: 'MIT', notice: 'Copyright (c) 2023 Arjun Barrett' },
  { name: 'Inter typeface', licence: 'SIL Open Font License 1.1', notice: 'Copyright (c) 2016 The Inter Project Authors' },
];

const MIT_TEXT =
  'Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.';

export const OpenSourceLicenses: React.FC = () => {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceCard }]}>
      <Pressable style={styles.head} onPress={() => setOpen((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Open-source licences</Text>
          <Text style={[styles.sub, { color: colors.textMuted }]}>FitRack is built with these libraries</Text>
        </View>
        {open ? <ChevronUp size={18} color={colors.textMuted} /> : <ChevronDown size={18} color={colors.textMuted} />}
      </Pressable>
      {open && (
        <View style={styles.list}>
          {LIBRARIES.map((l) => (
            <View key={l.name} style={[styles.row, { borderTopColor: colors.border }]}>
              <View style={styles.rowHead}>
                <Text style={[styles.name, { color: colors.text }]}>{l.name}</Text>
                <Text style={[styles.licence, { color: colors.textSecondary }]}>{l.licence}</Text>
              </View>
              {!!l.notice && <Text style={[styles.notice, { color: colors.textMuted }]}>{l.notice}</Text>}
            </View>
          ))}
          <Text style={[styles.fullTitle, { color: colors.textSecondary }]}>MIT licence</Text>
          <Text style={[styles.full, { color: colors.textMuted }]}>{MIT_TEXT}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 16, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 2 },
  list: { marginTop: 10 },
  row: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 10, gap: 2 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  name: { flex: 1, fontSize: 14, fontWeight: '700' },
  licence: { fontSize: 12, fontWeight: '700' },
  notice: { fontSize: 12, lineHeight: 16 },
  fullTitle: { fontSize: 13, fontWeight: '800', marginTop: 12 },
  full: { fontSize: 11, lineHeight: 16, marginTop: 4 },
});
