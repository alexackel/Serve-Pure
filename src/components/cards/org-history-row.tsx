import { StyleSheet, View } from 'react-native';

import { VerificationBadge } from '@/components/cards/verification-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, CardShadow, Spacing } from '@/constants/theme';
import type { HistoryStatus } from '@/context/history-context';

export type OrgHistoryRowProps = {
  volunteerName: string;
  eventTitle: string;
  date: string;
  hours?: number;
  status: HistoryStatus;
};

export function OrgHistoryRow({ volunteerName, eventTitle, date, hours, status }: OrgHistoryRowProps) {
  return (
    <ThemedView style={[styles.row, CardShadow]}>
      <View style={styles.info}>
        <ThemedText type="bodyBold" numberOfLines={1}>
          {volunteerName}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
          {eventTitle} · {date}
          {hours !== undefined ? ` · ${hours} hrs` : ''}
        </ThemedText>
      </View>
      <VerificationBadge status={status} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  info: {
    flex: 1,
    gap: Spacing.half,
  },
});
