import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useLocalSearchParams } from 'expo-router';

import { Avatar } from '@/components/avatar';
import { BackButton } from '@/components/back-button';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VerifiedBadge } from '@/components/verified-badge';
import { BorderRadius, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type Volunteer = { name: string; verified: boolean };

export default function EventVolunteerDetailScreen() {
  const { id, volunteerId } = useLocalSearchParams<{ id: string; volunteerId: string }>();
  const [volunteer, setVolunteer] = useState<Volunteer | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setVolunteer(undefined);
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, identity_verified')
        .eq('id', volunteerId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        if (error) console.error('Failed to load volunteer profile', error);
        setVolunteer(null);
      } else {
        setVolunteer({ name: data.full_name, verified: data.identity_verified });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [volunteerId]);

  if (volunteer === undefined) {
    return (
      <ScreenScrollView containerStyle={styles.container}>
        <BackButton fallbackHref={{ pathname: '/event/[id]', params: { id: id ?? '' } }} />
        <ThemedText type="h3">Loading…</ThemedText>
      </ScreenScrollView>
    );
  }

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
