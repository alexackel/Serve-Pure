import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, CardShadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type GroupCardProps = {
  name: string;
  memberCount: number;
  onPress?: () => void;
};

export function GroupCard({ name, memberCount, onPress }: GroupCardProps) {
  const theme = useTheme();

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <ThemedView style={[styles.card, { borderColor: theme.border }, CardShadow]}>
        <View style={[styles.avatar, { backgroundColor: theme.primaryTint }]}>
          <Ionicons name="people" size={22} color={theme.primary} />
        </View>

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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
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
