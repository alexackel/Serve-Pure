import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { Avatar } from '@/components/avatar';
import { BackButton } from '@/components/back-button';
import { VerificationBadge } from '@/components/cards/verification-badge';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VerifiedBadge } from '@/components/verified-badge';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useHistory } from '@/context/history-context';
import { useRegistrations } from '@/context/registrations-context';
import { CURRENT_USER } from '@/data/current-user';
import { getEvent } from '@/data/events';
import type { EventDetail } from '@/data/mock-events';
import { getUser } from '@/data/mock-users';
import { useTheme } from '@/hooks/use-theme';
import { parseEventDateTime } from '@/utils/dates';

function RegistrantRow({ eventId, userId }: { eventId: string; userId: string }) {
  const theme = useTheme();
  const registrant = getUser(userId);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/event/[id]/volunteer/[volunteerId]', params: { id: eventId, volunteerId: userId } })}
      style={[styles.registrantRow, { backgroundColor: theme.backgroundElement }]}>
      <Avatar size={32} icon="person" iconSize={16} />
      <View style={styles.registrantNameRow}>
        <ThemedText type="bodyBold" numberOfLines={1} style={styles.registrantName}>
          {registrant?.name ?? 'Unknown volunteer'}
        </ThemedText>
        {registrant?.verified && <VerifiedBadge size="sm" />}
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
    </Pressable>
  );
}

function SectionDivider() {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.border }]} />;
}

function InfoRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={theme.textSecondary} />
      <ThemedText type="body" themeColor="textSecondary" style={styles.infoRowText}>
        {text}
      </ThemedText>
    </View>
  );
}

function LinkRow({ icon, text, url }: { icon: keyof typeof Ionicons.glyphMap; text: string; url: string }) {
  const theme = useTheme();
  return (
    <Pressable onPress={() => Linking.openURL(url)} style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={theme.primary} />
      <ThemedText type="body" themeColor="primary" style={styles.infoRowText}>
        {text}
      </ThemedText>
    </Pressable>
  );
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const [event, setEvent] = useState<EventDetail | null | undefined>(undefined);
  const { isRegistered, register, unregister } = useRegistrations();
  const { addCancellationRecord } = useHistory();

  const [confirmingUnregister, setConfirmingUnregister] = useState(false);
  const [rosterExpanded, setRosterExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setEvent(undefined);
    getEvent(id)
      .then((result) => {
        if (!cancelled) setEvent(result);
      })
      .catch((error) => {
        console.error('Failed to load event', error);
        if (!cancelled) setEvent(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (event === undefined) {
    return (
      <ScreenScrollView containerStyle={styles.container}>
        <BackButton fallbackHref="/find" />
        <ThemedText type="h3">Loading…</ThemedText>
      </ScreenScrollView>
    );
  }

  if (!event) {
    return (
      <ScreenScrollView containerStyle={styles.container}>
        <BackButton fallbackHref="/find" />
        <ThemedText type="h3">Event not found</ThemedText>
      </ScreenScrollView>
    );
  }

  const { maxVolunteers } = event;
  const signedUp = isRegistered(event.id);
  const volunteerCount = event.volunteers === undefined ? undefined : event.volunteers + (signedUp ? 1 : 0);
  const hasCapacity = volunteerCount !== undefined && maxVolunteers !== undefined;
  const isFull = volunteerCount !== undefined && maxVolunteers !== undefined && volunteerCount >= maxVolunteers;
  const displayedRegistrantIds = event.registrants
    ? signedUp
      ? [...event.registrants, CURRENT_USER.id]
      : event.registrants
    : undefined;

  const now = new Date();
  const eventStart = parseEventDateTime(event.date, event.startTime, now);
  const hoursUntilEvent = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60);
  const isLateCancellation = signedUp && hoursUntilEvent >= 0 && hoursUntilEvent < 24;

  const handleSignUpPress = () => {
    if (signedUp) {
      setConfirmingUnregister(true);
      return;
    }
    register(event.id);
  };

  const handleConfirmUnregister = () => {
    if (isLateCancellation) {
      const cancelTime = new Date();
      const timeLabel = cancelTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      addCancellationRecord(event.organization, timeLabel);
    }
    unregister(event.id);
    setConfirmingUnregister(false);
  };

  const handleCancelUnregister = () => setConfirmingUnregister(false);

  const { age, skills, physical, whatToBring } = event.requirements ?? {};
  const hasRequirements = Boolean(age || skills || physical || whatToBring);
  const hasContactSection = event.contactInfo || event.website;

  return (
    <ScreenScrollView containerStyle={styles.container}>
      <BackButton fallbackHref="/find" />

      <View style={styles.orgRow}>
        <Avatar size={40} icon="business-outline" iconSize={22} />
        <View style={styles.orgInfo}>
          <ThemedText type="bodyBold">{event.organization}</ThemedText>
          {event.organizationVerified && (
            <VerificationBadge status="verified" label="Verified Organization" size="sm" />
          )}
        </View>
      </View>

      <View style={styles.titleBlock}>
        <ThemedText type="h1">{event.title}</ThemedText>
        {event.category && (
          <View style={[styles.categoryPill, { backgroundColor: theme.primaryTint }]}>
            <ThemedText type="label" themeColor="primary">
              {event.category}
            </ThemedText>
          </View>
        )}
      </View>

      <SectionDivider />

      <View style={styles.infoList}>
        <InfoRow icon="calendar-outline" text={event.date} />
        {(event.startTime || event.endTime) && (
          <InfoRow icon="time-outline" text={[event.startTime, event.endTime].filter(Boolean).join(' – ')} />
        )}
        {event.hours !== undefined && (
          <InfoRow icon="hourglass-outline" text={`${event.hours} hrs`} />
        )}
      </View>

      <ThemedView style={styles.section}>
        <ThemedText type="h3">Location</ThemedText>
        <InfoRow icon="location-outline" text={event.location} />
        <View style={[styles.mapPlaceholder, { backgroundColor: theme.backgroundSelected }]}>
          <Ionicons name="map-outline" size={28} color={theme.textSecondary} />
          <ThemedText type="caption" themeColor="textSecondary">
            Map view coming soon
          </ThemedText>
        </View>
      </ThemedView>

      {event.description && (
        <ThemedView style={styles.section}>
          <ThemedText type="h3">About this event</ThemedText>
          <ThemedText type="body">{event.description}</ThemedText>
        </ThemedView>
      )}

      {hasRequirements && (
        <ThemedView style={styles.section}>
          <ThemedText type="h3">Requirements</ThemedText>
          <View style={styles.infoList}>
            {age && <InfoRow icon="person-outline" text={`Age: ${age}`} />}
            {skills && <InfoRow icon="ribbon-outline" text={`Skills: ${skills}`} />}
            {physical && <InfoRow icon="fitness-outline" text={`Physical: ${physical}`} />}
            {whatToBring && <InfoRow icon="bag-outline" text={`What to bring: ${whatToBring}`} />}
          </View>
        </ThemedView>
      )}

      {hasContactSection && (
        <ThemedView style={styles.section}>
          <ThemedText type="h3">Contact</ThemedText>
          <View style={styles.infoList}>
            {event.contactInfo && <InfoRow icon="mail-outline" text={event.contactInfo} />}
            {event.website && <LinkRow icon="globe-outline" text={event.website} url={event.website} />}
          </View>
        </ThemedView>
      )}

      {displayedRegistrantIds ? (
        <ThemedView style={styles.section}>
          <Pressable
            onPress={() => setRosterExpanded((current) => !current)}
            style={[styles.registrantToggle, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="h3" style={styles.registrantToggleText}>
              Registered Volunteers
              {maxVolunteers !== undefined && ` (${displayedRegistrantIds.length}/${maxVolunteers})`}
            </ThemedText>
            <Ionicons
              name={rosterExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={theme.textSecondary}
            />
          </Pressable>
          {rosterExpanded && (
            <View style={styles.registrantList}>
              {displayedRegistrantIds.map((userId) => (
                <RegistrantRow key={userId} eventId={event.id} userId={userId} />
              ))}
            </View>
          )}
        </ThemedView>
      ) : (
        hasCapacity && (
          <InfoRow icon="people-outline" text={`${volunteerCount}/${maxVolunteers} volunteers registered`} />
        )
      )}

      {confirmingUnregister ? (
        <View style={styles.confirmBlock}>
          {isLateCancellation && (
            <View style={[styles.warningBanner, { backgroundColor: theme.errorBackground }]}>
              <Ionicons name="warning-outline" size={16} color={theme.error} />
              <ThemedText type="body" themeColor="error" style={styles.warningText}>
                This event starts in less than 24 hours. Cancelling now will negatively affect your reliability
                score.
              </ThemedText>
            </View>
          )}
          <ThemedText type="body">Are you sure you want to unregister from this event?</ThemedText>
          <View style={styles.confirmActions}>
            <Pressable
              onPress={handleCancelUnregister}
              style={[styles.confirmButton, styles.cancelButton, { borderColor: theme.border }]}>
              <ThemedText type="bodyBold">Cancel</ThemedText>
            </Pressable>
            <Pressable
              onPress={handleConfirmUnregister}
              style={[styles.confirmButton, { backgroundColor: theme.errorBackground }]}>
              <ThemedText type="bodyBold" themeColor="error">
                Unregister
              </ThemedText>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          disabled={isFull && !signedUp}
          onPress={handleSignUpPress}
          style={[
            styles.cta,
            { backgroundColor: isFull ? theme.backgroundSelected : theme.primary },
            signedUp && { backgroundColor: theme.successBackground },
          ]}>
          <ThemedText
            type="bodyBold"
            themeColor={isFull && !signedUp ? 'textSecondary' : signedUp ? 'success' : 'background'}>
            {signedUp ? 'Registered ✓' : isFull ? 'Full' : 'Sign Up'}
          </ThemedText>
        </Pressable>
      )}
    </ScreenScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  orgInfo: {
    gap: Spacing.one,
  },
  titleBlock: {
    gap: Spacing.two,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: BorderRadius.pill,
  },
  divider: {
    height: 1,
  },
  infoList: {
    gap: Spacing.two,
  },
  registrantToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
  },
  registrantToggleText: {
    flex: 1,
  },
  registrantList: {
    gap: Spacing.two,
  },
  registrantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
  },
  registrantNameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  registrantName: {
    flexShrink: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  infoRowText: {
    flex: 1,
  },
  section: {
    gap: Spacing.two,
  },
  mapPlaceholder: {
    height: 140,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  cta: {
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  confirmBlock: {
    gap: Spacing.three,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
  },
  warningText: {
    flex: 1,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  confirmButton: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
});
