import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Typography';
import { Modal } from './Modal';
import { Button } from './Button';
import { useTheme } from '../../theme/theme';
import type { ConfirmRequest } from '../../utils/feedback';

/** App-styled confirmation (bottom sheet) used instead of the system alert. */
export const ConfirmSheet: React.FC<{
  request: ConfirmRequest | null;
  onResult: (ok: boolean) => void;
}> = ({ request, onResult }) => {
  const { colors } = useTheme();
  return (
    <Modal visible={!!request} onClose={() => onResult(false)} title={request?.title ?? ''}>
      <View style={styles.body}>
        {!!request?.message && <Text style={[styles.message, { color: colors.textSecondary }]}>{request.message}</Text>}
        <Button
          title={request?.confirmLabel ?? 'Confirm'}
          variant={request?.destructive ? 'danger' : 'primary'}
          size="lg"
          onPress={() => onResult(true)}
          style={styles.btn}
        />
        <Button title={request?.cancelLabel ?? 'Cancel'} variant="secondary" size="lg" onPress={() => onResult(false)} style={styles.btn} />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  body: { gap: 10, paddingBottom: 6 },
  message: { fontSize: 15, lineHeight: 21, marginBottom: 6 },
  btn: { borderRadius: 14 },
});
