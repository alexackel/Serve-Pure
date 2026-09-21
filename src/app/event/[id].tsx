import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { Avatar } from '@/components/avatar';
import { BackButton } from '@/components/back-button';
import { VerificationBadge } from '@/components/cards/verification-badge';
import { ExpandablePhoto } from '@/components/expandable-photo';
import { LocationMapCard } from '@/components/map';
import { OverflowMenu } from '@/components/overflow-menu';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VerifiedBadge } from '@/components/verified-badge';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useSession } from '@/context/auth-context';
import { useOrganization } from '@/context/organization-context';
import { useRegistrations } from '@/context/registrations-context';
import { cancelEvent, getEvent } from '@/data/events';
import type { EventDetail } from '@/data/mock-events';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/use-theme';
import { parseEventDateTime } from '@/utils/dates';
import { eventToPin } from '@/utils/map-pins';

type Registrant = { userId: string; fullName: string; verified: boolean };

type RegistrantRow_DB = { user_id: string; profiles: { full_name: string; identity_verified: boolean } | null };

async function fetchRoster(eventId: string): Promise<Registrant[]> {
  // registrations has two FKs into profiles (user_id and cancelled_by_user_id)
  // — the embed hint disambiguates which one to join on.
  const { data, error } = await supabase
    .from('registrations')
    .select('user_id, profiles!user_id(full_name, identity_verified)')
    .eq('event_id', eventId)
    .neq('status', 'cancelled');

  if (error) {
    console.error('Failed to load roster', error);
    return [];
  }

  return ((data ?? []) as unknown as RegistrantRow_DB[]).map((row) => ({
    userId: row.user_id,
    fullName: row.profiles?.full_name ?? 'Unknown volunteer',
    verified: row.profiles?.identity_verified ?? false,
  }));
}

function RegistrantRow({ eventId, registrant }: { eventId: string; registrant: Registrant }) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/event/[id]/volunteer/[volunteerId]', params: { id: eventId, volunteerId: registrant.userId } })
      }
      style={[styles.registrantRow, { backgroundColor: theme.backgroundElement }]}>
      <Avatar size={32} icon="person" iconSize={16} />
      <View style={styles.registrantNameRow}>
        <ThemedText type="bodyBold" numberOfLines={1} style={styles.registrantName}>
          {registrant.fullName}
        </ThemedText>
        {registrant.verified && <VerifiedBadge size="sm" />}
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
  const [roster, setRoster] = useState<Registrant[]>([]);
  const { isRegistered, register, unregister } = useRegistrations();
  const { session } = useSession();
  const { organizations } = useOrganization();

  const [confirmingUnregister, setConfirmingUnregister] = useState(false);
  const [rosterExpanded, setRosterExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [eventResult, rosterResult] = await Promise.all([getEvent(id), fetchRoster(id)]);
    setEvent(eventResult);
    setRoster(rosterResult);
  }, [id]);

  useEffect(() => {
    async function loadForNewId() {
      setEvent(undefined);
      setRoster([]);
      try {
        await reload();
      } catch (error) {
        console.error('Failed to load event', error);
        setEvent(null);
      }
    }
    loadForNewId();
  }, [reload]);

  const eventPin = useMemo(() => (event ? eventToPin(event) : null), [event]);

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
  const volunteerCount = event.volunteers ?? roster.length;
  const hasCapacity = maxVolunteers !== undefined;
  const isFull = hasCapacity && volunteerCount >= maxVolunteers;

  const now = new Date();
  const eventStart = parseEventDateTime(event.date, event.startTime, now);
  const hoursUntilEvent = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60);
  const isLateCancellation = signedUp && hoursUntilEvent >= 0 && hoursUntilEvent < 24;

  const handleSignUpPress = async () => {
    if (signedUp) {
      setConfirmingUnregister(true);
      return;
    }
    setSubmitError(null);
    setIsSubmitting(true);
    const { error } = await register(event.id);
    setIsSubmitting(false);
    if (error) {
      setSubmitError(error);
    } else {
      reload();
    }
  };

  const handleConfirmUnregister = async () => {
    setSubmitError(null);
    setIsSubmitting(true);
    const { error } = await unregister(event.id);
    setIsSubmitting(false);
    setConfirmingUnregister(false);
    if (error) {
      setSubmitError(error);
    } else {
      reload();
    }
  };

  const handleCancelUnregister = () => setConfirmingUnregister(false);

  // Mirrors events_update_owner RLS exactly: the creator, or an admin of the
  // org that posted it. Cancelling (not deleting — see cancelEvent) is the
  // only management action exposed here.
  const canManageEvent =
    session !== null &&
    (event.createdBy === session.user.id ||
      (event.organizationId !== undefined && organizations.some((org) => org.id === event.organizationId)));

  const handleCancelEvent = async () => {
    setSubmitError(null);
    try {
      await cancelEvent(event.id);
      router.replace('/find');
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to cancel event.');
    }
  };

  const { age, skills, physical, whatToBring } = event.requirements ?? {};
  const hasRequirements = Boolean(age || skills || physical || whatToBring);
  const hasContactSection = event.contactInfo || event.website;

  return (
    <ScreenScrollView containerStyle={styles.container}>
      <View style={styles.headerRow}>
        <BackButton fallbackHref="/find" />
        {canManageEvent && (
          <OverflowMenu actions={[{ label: 'Cancel Event', destructive: true, onPress: handleCancelEvent }]} />
        )}
      </View>

      <View style={styles.orgRow}>
        <Avatar size={40} icon={event.organizationId ? 'business-outline' : 'person-outline'} iconSize={22} />
        <View style={styles.orgInfo}>
          {event.organizationId ? (
            <>
              <ThemedText type="bodyBold">{event.organization}</ThemedText>
              {event.organizationVerified && (
                <VerificationBadge status="verified" label="Verified Organization" size="sm" />
              )}
            </>
          ) : (
            <ThemedText type="bodyBold">Posted by {event.creatorName ?? 'Unknown'}</ThemedText>
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

      {event.photoUrl && <ExpandablePhoto uri={event.photoUrl} style={styles.photo} />}
      <ThemedView style={styles.section}>
        <ThemedText type="h3">Location</ThemedText>
        <InfoRow icon="location-outline" text={event.location} />
        <LocationMapCard pin={eventPin} />
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

      {roster.length > 0 ? (
        <ThemedView style={styles.section}>
          <Pressable
            onPress={() => setRosterExpanded((current) => !current)}
            style={[styles.registrantToggle, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="h3" style={styles.registrantToggleText}>
              Registered Volunteers
              {maxVolunteers !== undefined && ` (${volunteerCount}/${maxVolunteers})`}
            </ThemedText>
            <Ionicons
              name={rosterExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={theme.textSecondary}
            />
          </Pressable>
          {rosterExpanded && (
            <View style={styles.registrantList}>
              {roster.map((registrant) => (
                <RegistrantRow key={registrant.userId} eventId={event.id} registrant={registrant} />
              ))}
            </View>
          )}
        </ThemedView>
      ) : (
        hasCapacity && (
          <InfoRow icon="people-outline" text={`${volunteerCount}/${maxVolunteers} volunteers registered`} />
        )
      )}

      {!event.organizationId && (
        <View style={[styles.warningBanner, { backgroundColor: theme.errorBackground }]}>
          <Ionicons name="warning-outline" size={16} color={theme.error} />
          <ThemedText type="body" themeColor="error" style={styles.warningText}>
            This event was posted by an individual volunteer, not a verified organization. Use caution and meet in
            public places.
          </ThemedText>
        </View>
      )}

      {submitError && (
        <View style={[styles.warningBanner, { backgroundColor: theme.errorBackground }]}>
          <Ionicons name="warning-outline" size={16} color={theme.error} />
          <ThemedText type="body" themeColor="error" style={styles.warningText}>
            {submitError}
          </ThemedText>
        </View>
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
              disabled={isSubmitting}
              style={[styles.confirmButton, styles.cancelButton, { borderColor: theme.border }]}>
              <ThemedText type="bodyBold">Cancel</ThemedText>
            </Pressable>
            <Pressable
              onPress={handleConfirmUnregister}
              disabled={isSubmitting}
              style={[styles.confirmButton, { backgroundColor: theme.errorBackground }]}>
              <ThemedText type="bodyBold" themeColor="error">
                {isSubmitting ? 'Unregistering…' : 'Unregister'}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          disabled={(isFull && !signedUp) || isSubmitting}
          onPress={handleSignUpPress}
          style={[
            styles.cta,
            { backgroundColor: isFull ? theme.backgroundSelected : theme.primary },
            signedUp && { backgroundColor: theme.successBackground },
          ]}>
          <ThemedText
            type="bodyBold"
            themeColor={isFull && !signedUp ? 'textSecondary' : signedUp ? 'success' : 'background'}>
            {isSubmitting ? 'Signing up…' : signedUp ? 'Registered ✓' : isFull ? 'Full' : 'Sign Up'}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BorderRadius.lg,
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
