import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useLocalSearchParams } from 'expo-router';

import { Avatar } from '@/components/avatar';
import { BackButton } from '@/components/back-button';
import { VerificationBadge, type VerificationStatus } from '@/components/cards/verification-badge';
import { ConfirmCancelRow } from '@/components/confirm-cancel-row';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VerifiedBadge } from '@/components/verified-badge';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useSession } from '@/context/auth-context';
import {
  approveEventAttendance,
  denyEventAttendance,
  getAttendanceRecordForVolunteer,
  getEvent,
  type EventAttendanceRecord,
} from '@/data/events';
import type { EventDetail } from '@/data/mock-events';
import { supabase } from '@/lib/supabase';
import { parseEventDateTime } from '@/utils/dates';

type Volunteer = { name: string; verified: boolean };

// Maps a raw attendance_records status + verified_by_role to the badge shown
// once the creator has acted — mirrors history-context.tsx's mapHistoryStatus
// for the two outcomes this screen can produce.
function mapAttendanceBadgeStatus(record: EventAttendanceRecord): VerificationStatus | null {
  if (record.status === 'verified' || record.status === 'partial') {
    return record.verifiedByRole === 'event_organizer' ? 'personal' : 'verified';
  }
  if (record.status === 'no_show' || record.status === 'rejected') {
    return 'no-show';
  }
  return null;
}

export default function EventVolunteerDetailScreen() {
  const { id, volunteerId } = useLocalSearchParams<{ id: string; volunteerId: string }>();
  const { session } = useSession();
  const [volunteer, setVolunteer] = useState<Volunteer | null | undefined>(undefined);
  const [event, setEvent] = useState<EventDetail | null | undefined>(undefined);
  const [attendance, setAttendance] = useState<EventAttendanceRecord | null | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadAttendance = useCallback(async () => {
    if (!id || !volunteerId) return;
    const record = await getAttendanceRecordForVolunteer(id, volunteerId);
    setAttendance(record);
  }, [id, volunteerId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setVolunteer(undefined);
      setEvent(undefined);
      setAttendance(undefined);

      const [profileResult, eventResult, attendanceResult] = await Promise.all([
        supabase.from('profiles').select('full_name, identity_verified').eq('id', volunteerId).maybeSingle(),
        getEvent(id),
        getAttendanceRecordForVolunteer(id, volunteerId),
      ]);
      if (cancelled) return;

      if (profileResult.error || !profileResult.data) {
        if (profileResult.error) console.error('Failed to load volunteer profile', profileResult.error);
        setVolunteer(null);
      } else {
        setVolunteer({ name: profileResult.data.full_name, verified: profileResult.data.identity_verified });
      }

      setEvent(eventResult);
      setAttendance(attendanceResult);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, volunteerId]);

  const handleApprove = async () => {
    if (!session || !attendance || isSubmitting) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await approveEventAttendance(session.user.id, attendance.id);
      await loadAttendance();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to approve attendance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeny = async () => {
    if (!session || !attendance || isSubmitting) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await denyEventAttendance(session.user.id, attendance.id);
      await loadAttendance();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to deny attendance.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (volunteer === undefined || event === undefined || attendance === undefined) {
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

  // Casual/individual posts only (org events keep using the org-admin
  // approval flow in org-you.tsx) — creator-only, and only once the event has
  // actually happened, mirroring the Five Core States' "Completed / Pending
  // Verification" step.
  const eventEnded =
    event !== null && parseEventDateTime(event.date, event.endTime ?? event.startTime, new Date()) <= new Date();
  const canApprove =
    event !== null &&
    session !== null &&
    session.user.id === event.createdBy &&
    !event.organizationId &&
    eventEnded &&
    attendance !== null &&
    attendance.status === 'pending';

  const badgeStatus = attendance ? mapAttendanceBadgeStatus(attendance) : null;

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

      {badgeStatus && (
        <View style={styles.badgeRow}>
          <VerificationBadge status={badgeStatus} />
        </View>
      )}

      {canApprove ? (
        <ThemedView type="backgroundElement" style={styles.actionCard}>
          <ThemedText type="body" themeColor="textSecondary">
            Confirm whether {volunteer.name} attended your event. Approving marks it as{' '}
            <ThemedText type="bodyBold" themeColor="textSecondary">
              Personal
            </ThemedText>{' '}
            — it still needs a platform admin&apos;s final sign-off before it counts toward their verified hours.
          </ThemedText>
          {actionError && (
            <ThemedText type="caption" themeColor="error">
              {actionError}
            </ThemedText>
          )}
          <ConfirmCancelRow cancelLabel="Deny" confirmLabel="Approve" onCancel={handleDeny} onConfirm={handleApprove} />
        </ThemedView>
      ) : (
        !badgeStatus && (
          <ThemedView type="backgroundElement" style={styles.comingSoon}>
            <ThemedText type="body" themeColor="textSecondary">
              More volunteer details — hours history, reliability, and past events with this organization — are coming
              soon.
            </ThemedText>
          </ThemedView>
        )
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
    gap: Spacing.three,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  comingSoon: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.four,
  },
  actionCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.four,
    gap: Spacing.three,
  },
});
