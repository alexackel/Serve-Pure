import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { VerificationBadge } from '@/components/cards/verification-badge';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useHistory } from '@/context/history-context';
import { useRegistrations } from '@/context/registrations-context';
import { MOCK_EVENTS } from '@/data/mock-events';
import { useTheme } from '@/hooks/use-theme';
import { parseEventDateTime } from '@/utils/dates';

function BackButton() {
  const theme = useTheme();
  const handlePress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/find');
    }
  };
  return (
    <Pressable onPress={handlePress} hitSlop={8} style={styles.backButton}>
      <Ionicons name="chevron-back" size={22} color={theme.text} />
      <ThemedText type="bodyBold">Back</ThemedText>
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
  const event = MOCK_EVENTS.find((item) => item.id === id);
  const { isRegistered, register, unregister } = useRegistrations();
  const { addCancellationRecord } = useHistory();

  const [confirmingUnregister, setConfirmingUnregister] = useState(false);

  if (!event) {
    return (
      <ScreenScrollView containerStyle={styles.container}>
        <BackButton />
        <ThemedText type="h3">Event not found</ThemedText>
      </ScreenScrollView>
    );
  }

  const signedUp = isRegistered(event.id);
  const volunteerCount = event.volunteers === undefined ? undefined : event.volunteers + (signedUp ? 1 : 0);
  const hasCapacity = volunteerCount !== undefined && event.maxVolunteers !== undefined;
  const isFull = hasCapacity && volunteerCount! >= event.maxVolunteers!;

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

  const hasRequirements =
    event.requirements &&
    (event.requirements.age || event.requirements.skills || event.requirements.physical || event.requirements.whatToBring);
  const hasContactSection = event.contactInfo || event.website;

  return (
    <ScreenScrollView containerStyle={styles.container}>
      <BackButton />

      <View style={styles.orgRow}>
        <View style={[styles.avatar, { backgroundColor: theme.primaryTint }]}>
          <Ionicons name="business-outline" size={22} color={theme.primary} />
        </View>
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
            {event.requirements!.age && <InfoRow icon="person-outline" text={`Age: ${event.requirements!.age}`} />}
            {event.requirements!.skills && (
              <InfoRow icon="ribbon-outline" text={`Skills: ${event.requirements!.skills}`} />
            )}
            {event.requirements!.physical && (
              <InfoRow icon="fitness-outline" text={`Physical: ${event.requirements!.physical}`} />
            )}
            {event.requirements!.whatToBring && (
              <InfoRow icon="bag-outline" text={`What to bring: ${event.requirements!.whatToBring}`} />
            )}
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

      {hasCapacity && (
        <InfoRow icon="people-outline" text={`${volunteerCount}/${event.maxVolunteers} volunteers registered`} />
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    alignSelf: 'flex-start',
  },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
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
