import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { router } from 'expo-router';

import { BackButton } from '@/components/back-button';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { type NotificationItem, useNotifications } from '@/context/notifications-context';
import { useTheme } from '@/hooks/use-theme';

function describe(item: NotificationItem): string {
  const actor =
    item.otherActorCount > 0
      ? `${item.latestActorName} and ${item.otherActorCount} other${item.otherActorCount === 1 ? '' : 's'}`
      : item.latestActorName;

  switch (item.type) {
    case 'like':
      return `${actor} gave ${item.otherActorCount > 0 ? 'likes' : 'a like'} to your ${item.activityTitle}`;
    case 'comment':
      return item.isOwnActivity
        ? `${actor} commented on your ${item.activityTitle}`
        : `${actor} also commented on ${item.activityTitle}`;
    case 'mention':
      return `${actor} mentioned you on ${item.activityTitle}`;
  }
}

function NotificationRow({ item, onPress }: { item: NotificationItem; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.row, { backgroundColor: item.read ? 'transparent' : theme.backgroundElement }]}>
      <ThemedText type={item.read ? 'body' : 'bodyBold'}>{describe(item)}</ThemedText>
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const { notifications, isLoading, refetch, markSeen, markRead } = useNotifications();

  useEffect(() => {
    refetch().then(markSeen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePress = (item: NotificationItem) => {
    markRead(item.id);
    router.push({ pathname: '/activity/[id]/comments', params: { id: item.attendanceRecordId } });
  };

  return (
    <ScreenScrollView containerStyle={styles.container}>
      <BackButton fallbackHref="/" />
      <ThemedText type="h2">Notifications</ThemedText>

      <ThemedView style={styles.list}>
        {!isLoading && notifications.length === 0 && (
          <ThemedText type="body" themeColor="textSecondary">
            You&apos;re all caught up.
          </ThemedText>
        )}
        {notifications.map((item) => (
          <NotificationRow key={item.id} item={item} onPress={() => handlePress(item)} />
        ))}
      </ThemedView>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  list: {
    gap: Spacing.one,
  },
  row: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: 8,
  },
});
