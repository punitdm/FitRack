import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Tiny, semantic haptics layer. Every call is fire-and-forget and swallows
 * errors (e.g. devices without a vibration motor), so haptics can never break
 * an action. On Android we use the system haptic constants, which feel crisper
 * than raw vibration and need no permission.
 */

function run(android: Haptics.AndroidHaptics, ios: () => Promise<void>): void {
  try {
    const p = Platform.OS === 'android' ? Haptics.performAndroidHapticsAsync(android) : ios();
    p.catch(() => {});
  } catch {
    // ignore
  }
}

export const haptics = {
  /** Light tick: selecting a chip, tab, date, or opening a card. */
  select: () => run(Haptics.AndroidHaptics.Segment_Tick, () => Haptics.selectionAsync()),
  /** Firmer tap: primary button presses such as "Save set". */
  tap: () => run(Haptics.AndroidHaptics.Virtual_Key, () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Something was saved / completed. */
  success: () =>
    run(Haptics.AndroidHaptics.Confirm, () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** Something failed or was rejected. */
  error: () =>
    run(Haptics.AndroidHaptics.Reject, () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
  /** A swipe action crossed its threshold. */
  threshold: () =>
    run(Haptics.AndroidHaptics.Long_Press, () =>
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    ),
};
