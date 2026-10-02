import { StyleSheet, View } from 'react-native';

import { InitialsAvatar } from '@/components/initials-avatar';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export type FacepilePerson = { userId: string; fullName: string };

const AVATAR_SIZE = 22;
const OVERLAP = 8;

// Overlapping avatar stack for a like count — the first few entries from
// get_activity_likers, which already orders followed-first, so this reads
// left-to-right as "people you follow, then everyone else".
export function Facepile({ people, totalCount }: { people: FacepilePerson[]; totalCount: number }) {
  const theme = useTheme();
  const overflow = totalCount - people.length;

  if (people.length === 0) {
    return null;
  }

  return (
    <View style={styles.row}>
      {people.map((person, index) => (
        <InitialsAvatar
          key={person.userId}
          fullName={person.fullName}
          size={AVATAR_SIZE}
          style={[
            styles.avatar,
            { borderColor: theme.background, marginLeft: index === 0 ? 0 : -OVERLAP, zIndex: people.length - index },
          ]}
        />
      ))}
      {overflow > 0 && (
        <View
          style={[
            styles.overflowPill,
            { backgroundColor: theme.backgroundSelected, borderColor: theme.background, marginLeft: -OVERLAP },
          ]}>
          <ThemedText type="caption" themeColor="textSecondary">
            +{overflow}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    borderWidth: 2,
  },
  overflowPill: {
    height: AVATAR_SIZE,
    minWidth: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
});
