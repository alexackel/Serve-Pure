import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type MemberRowProps = {
  rank: number;
  name: string;
  hours: number;
};

export function MemberRow({ rank, name, hours }: MemberRowProps) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <View style={[styles.rankCircle, { backgroundColor: theme.primaryTint }]}>
        <ThemedText type="bodyBold" themeColor="primary">
          {rank}
        </ThemedText>
      </View>
      <ThemedText type="bodyBold" style={styles.name} numberOfLines={1}>
        {name}
      </ThemedText>
      <View style={[styles.hoursPill, { backgroundColor: theme.backgroundSelected }]}>
        <ThemedText type="label">{hours} hrs</ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  rankCircle: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    flex: 1,
  },
  hoursPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: BorderRadius.pill,
  },
});
