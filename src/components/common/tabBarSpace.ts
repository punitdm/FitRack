import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Height of the floating navbar capsule. */
export const TAB_BAR_HEIGHT = 64;
/** Gap between the capsule and the bottom of the screen (above the home indicator). */
export const TAB_BAR_BOTTOM_GAP = 8;

/**
 * Bottom padding for scrollable content on tab screens. The navbar floats over
 * the content, so the last item needs this much room to scroll clear of it.
 */
export function useTabBarSpace(extra = 20): number {
  const { bottom } = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_GAP + bottom + extra;
}
