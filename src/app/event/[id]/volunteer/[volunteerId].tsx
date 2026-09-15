import { StyleSheet, View } from 'react-native';

import { useLocalSearchParams } from 'expo-router';

import { Avatar } from '@/components/avatar';
import { BackButton } from '@/components/back-button';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VerifiedBadge } from '@/components/verified-badge';
import { BorderRadius, Spacing } from '@/constants/theme';
import { getUser } from '@/data/mock-users';

export default function EventVolunteerDetailScreen() {
  const { id, volunteerId } = useLocalSearchParams<{ id: string; volunteerId: string }>();
  const volunteer = getUser(volunteerId);

  if (!volunteer) {
    return (
      <ScreenScrollView containerStyle={styles.container}>
        <BackButton fallbackHref={{ pathname: '/event/[id]', params: { id: id ?? '' } }} />
        <ThemedText type="h3">Volunteer not found</ThemedText>
      </ScreenScrollView>
    );
  }

  return (
    <ScreenScrollView containerStyle={styles.container}>
      <BackButton fallbackHref={{ pathname: '/event/[id]', params: { id: id ?? '' } }} />

      <View style={styles.headerRow}>
        <Avatar size={48} icon="person" iconSize={22} />
        <View style={styles.nameRow}>
          <ThemedText type="h2">{volunteer.name}</ThemedText>
          {volunteer.verified && <VerifiedBadge />}
        </View>
      </View>

      <ThemedView type="backgroundElement" style={styles.comingSoon}>
        <ThemedText type="body" themeColor="textSecondary">
          More volunteer details — hours history, reliability, and past events with this organization — are coming
          soon.
        </ThemedText>
      </ThemedView>
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  comingSoon: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.four,
  },
});
