import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type MemberRowProps = {
  rank: number;
  name: string;
  hours: number;
  isAdmin?: boolean;
  onPress?: () => void;
};

export function MemberRow({ rank, name, hours, isAdmin, onPress }: MemberRowProps) {
  const theme = useTheme();

  const content = (
    <ThemedView type="backgroundElement" style={styles.row}>
      <View style={[styles.rankCircle, { backgroundColor: theme.primaryTint }]}>
        <ThemedText type="bodyBold" themeColor="primary">
          {rank}
        </ThemedText>
      </View>
      <View style={styles.nameColumn}>
        <ThemedText type="bodyBold" numberOfLines={1}>
          {name}
        </ThemedText>
        {isAdmin && (
          <View style={[styles.adminPill, { backgroundColor: theme.primaryTint }]}>
            <ThemedText type="label" themeColor="primary">
              Admin
            </ThemedText>
          </View>
        )}
      </View>
      <View style={[styles.hoursPill, { backgroundColor: theme.backgroundSelected }]}>
        <ThemedText type="label">{hours} hrs</ThemedText>
      </View>
    </ThemedView>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
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
  nameColumn: {
    flex: 1,
    gap: Spacing.half,
    alignItems: 'flex-start',
  },
  adminPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 1,
    borderRadius: BorderRadius.pill,
  },
  hoursPill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: BorderRadius.pill,
  },
  pressed: {
    opacity: 0.7,
  },
});
