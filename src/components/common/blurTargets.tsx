import React, { useEffect, useReducer, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurTargetView } from 'expo-blur';

/**
 * Android blur (expo-blur's "dimezisBlurView") needs to know which view it
 * blurs. Each tab screen is wrapped in a BlurTargetView (see TabBlurTarget),
 * and the tab bar asks for the target of the tab that is open.
 */

type TargetRef = React.RefObject<React.ComponentRef<typeof View> | null>;

const targets = new Map<string, TargetRef>();
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((l) => l());

/** Wraps one tab screen so the floating tab bar can blur it. */
export const TabBlurTarget: React.FC<{ routeKey: string; children: React.ReactNode }> = ({ routeKey, children }) => {
  const ref = useRef<React.ComponentRef<typeof View>>(null);
  useEffect(() => {
    targets.set(routeKey, ref);
    changed();
    return () => {
      if (targets.get(routeKey) === ref) targets.delete(routeKey);
      changed();
    };
  }, [routeKey]);
  return (
    <BlurTargetView ref={ref} style={styles.fill} collapsable={false}>
      {children}
    </BlurTargetView>
  );
};

/** The blur target of the given tab, re-rendering once that tab has mounted. */
export function useBlurTarget(routeKey: string): TargetRef | undefined {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    listeners.add(bump);
    return () => {
      listeners.delete(bump);
    };
  }, []);
  return targets.get(routeKey);
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
