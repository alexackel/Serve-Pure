import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useCardShadow, useTheme } from '@/hooks/use-theme';

export type GroupCardProps = {
  name: string;
  memberCount: number;
  onPress?: () => void;
};

export function GroupCard({ name, memberCount, onPress }: GroupCardProps) {
  const theme = useTheme();
  const cardShadow = useCardShadow();

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <ThemedView style={[styles.card, { borderColor: theme.border }, cardShadow]}>
        <Avatar size={44} icon="people" iconSize={22} />

        <View style={styles.info}>
          <ThemedText type="bodyBold" numberOfLines={1}>
            {name}
          </ThemedText>
          <View style={styles.metaRow}>
            <Ionicons name="people-outline" size={14} color={theme.textSecondary} />
            <ThemedText type="caption" themeColor="textSecondary">
              {memberCount} member{memberCount === 1 ? '' : 's'}
            </ThemedText>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  info: {
    flex: 1,
    gap: Spacing.half,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
