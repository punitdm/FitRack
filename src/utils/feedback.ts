/**
 * App-wide feedback, callable from anywhere (no prop drilling):
 *
 *   notify('success', 'Saved');
 *   notifyUndo('Removed Oats', () => restore());       // 5 s with an Undo button
 *   if (await confirmAction({ title: 'Delete?', confirmLabel: 'Delete', destructive: true })) …
 *
 * App.tsx renders the toast and the confirmation sheet and subscribes here.
 */

export type ToastType = 'success' | 'error' | 'info';

export interface ToastRequest {
  type: ToastType;
  text: string;
  action?: { label: string; onPress: () => void };
  durationMs?: number;
}

export interface ConfirmRequest {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type ToastListener = (t: ToastRequest) => void;
type ConfirmListener = (req: ConfirmRequest, resolve: (ok: boolean) => void) => void;

let toastListener: ToastListener | null = null;
let confirmListener: ConfirmListener | null = null;

export function setToastListener(l: ToastListener | null) {
  toastListener = l;
}
export function setConfirmListener(l: ConfirmListener | null) {
  confirmListener = l;
}

export function notify(type: ToastType, text: string): void {
  toastListener?.({ type, text });
}

/** Shows a message with an Undo button for a few seconds. */
export function notifyUndo(text: string, onUndo: () => void, durationMs = 5000): void {
  toastListener?.({ type: 'info', text, action: { label: 'Undo', onPress: onUndo }, durationMs });
}

/** App-styled confirmation sheet. Resolves true when confirmed. */
export function confirmAction(req: ConfirmRequest): Promise<boolean> {
  return new Promise((resolve) => {
    if (!confirmListener) {
      resolve(false);
      return;
    }
    confirmListener(req, resolve);
  });
}
