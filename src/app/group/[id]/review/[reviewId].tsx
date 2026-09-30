import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { router, useLocalSearchParams } from 'expo-router';

import { Avatar } from '@/components/avatar';
import { BackButton } from '@/components/back-button';
import { CategoryChipRow } from '@/components/find';
import { FormField } from '@/components/form-field';
import { ConfirmCancelRow } from '@/components/confirm-cancel-row';
import { MetaRow } from '@/components/meta-row';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VerifiedBadge } from '@/components/verified-badge';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useGroups, type ReviewDetail } from '@/context/groups-context';
import { useTheme } from '@/hooks/use-theme';

type YesNo = 'yes' | 'no' | '';

const ALLOW_REUPLOAD_OPTIONS: readonly { key: YesNo; label: string }[] = [
  { key: 'yes', label: 'Yes' },
  { key: 'no', label: 'No' },
];

const OUTCOME_DELAY_MS = 900;

type ScreenState = 'loading' | 'not-found' | 'review' | 'denying' | 'outcome' | 'caught-up';

// Mounted fresh only while screenState is 'outcome'/'caught-up' (they don't
// exist in the tree otherwise), so this effect fires on every transition
// into that state without any key/reset bookkeeping. Uses shared-value-driven
// transforms rather than Reanimated's entering/exiting Keyframe API — see
// map-sheet.tsx's comment on why this repo avoids that for anything other
// than the splash overlay (a documented web bug getting stuck at
// visibility: hidden on mount/unmount).
function OutcomePop({ children }: { children: ReactNode }) {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 180 });
    opacity.value = withTiming(1, { duration: 220 });
  }, [scale, opacity]);

  const popStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={[styles.outcomePop, popStyle]}>{children}</Animated.View>;
}

export default function GroupReviewScreen() {
  const { id: groupId, reviewId } = useLocalSearchParams<{ id: string; reviewId: string }>();
  const theme = useTheme();
  const { getReviewItem, getGroupReviewQueue, approveReview, denyReview } = useGroups();

  const [detail, setDetail] = useState<ReviewDetail | null | undefined>(undefined);
  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [outcome, setOutcome] = useState<'approved' | 'denied' | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const [allowReupload, setAllowReupload] = useState<YesNo>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setDetail(undefined);
      setScreenState('loading');
      const result = await getReviewItem(reviewId!);
      if (cancelled) return;
      setDetail(result);
      setScreenState(result ? 'review' : 'not-found');
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [reviewId, getReviewItem]);

  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  // Items this admin has skipped this session (e.g. a guardian conflict) —
  // they stay 'pending' in the DB, so without this the FIFO queue would just
  // hand the same item straight back as queue[0].
  const skippedIds = useRef<Set<string>>(new Set());

  const goToNext = useCallback(
    async (excludeId?: string) => {
      if (excludeId) skippedIds.current.add(excludeId);
      const queue = await getGroupReviewQueue(groupId!);
      const next = queue.find((item) => !skippedIds.current.has(item.reviewId));
      if (next) {
        router.replace({ pathname: '/group/[id]/review/[reviewId]', params: { id: groupId!, reviewId: next.reviewId } });
      } else {
        setScreenState('caught-up');
        advanceTimer.current = setTimeout(() => {
          router.replace({ pathname: '/group/[id]', params: { id: groupId! } });
        }, OUTCOME_DELAY_MS);
      }
    },
    [groupId, getGroupReviewQueue],
  );

  const handleSkip = useCallback(() => {
    goToNext(reviewId);
  }, [goToNext, reviewId]);

  const handleApprove = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setActionError(null);
    const { error } = await approveReview(reviewId!);
    setIsSubmitting(false);
    if (error) {
      setActionError(error);
      return;
    }
    setOutcome('approved');
    setScreenState('outcome');
    advanceTimer.current = setTimeout(() => goToNext(), OUTCOME_DELAY_MS);
  };

  const handleConfirmDeny = async () => {
    if (isSubmitting || allowReupload === '') return;
    setIsSubmitting(true);
    setActionError(null);
    const { error } = await denyReview(reviewId!, allowReupload === 'yes', denyReason.trim() || undefined);
    setIsSubmitting(false);
    if (error) {
      setActionError(error);
      return;
    }
    setOutcome('denied');
    setScreenState('outcome');
    advanceTimer.current = setTimeout(() => goToNext(), OUTCOME_DELAY_MS);
  };

  if (screenState === 'loading') {
    return (
      <ScreenScrollView containerStyle={styles.container}>
        <BackButton fallbackHref={{ pathname: '/group/[id]', params: { id: groupId ?? '' } }} />
        <ThemedText type="h3">Loading…</ThemedText>
      </ScreenScrollView>
    );
  }

  if (screenState === 'not-found' || !detail) {
    return (
      <ScreenScrollView containerStyle={styles.container}>
        <BackButton fallbackHref={{ pathname: '/group/[id]', params: { id: groupId ?? '' } }} />
        <ThemedText type="h3">This item is no longer available for review.</ThemedText>
      </ScreenScrollView>
    );
  }

  if (screenState === 'outcome') {
    const approved = outcome === 'approved';
    return (
      <View style={[styles.outcomeScreen, { backgroundColor: approved ? theme.successBackground : theme.backgroundElement }]}>
        <OutcomePop>
          <Ionicons
            name={approved ? 'checkmark-circle' : 'close-circle'}
            size={72}
            color={approved ? theme.success : theme.textSecondary}
          />
          <ThemedText type="h2" themeColor={approved ? 'success' : 'text'}>
            {approved ? 'Approved' : 'Denied'}
          </ThemedText>
        </OutcomePop>
      </View>
    );
  }

  if (screenState === 'caught-up') {
    return (
      <View style={[styles.outcomeScreen, { backgroundColor: theme.backgroundElement }]}>
        <OutcomePop>
          <Ionicons name="checkmark-done-circle" size={72} color={theme.primary} />
          <ThemedText type="h2">You&apos;re all caught up</ThemedText>
        </OutcomePop>
      </View>
    );
  }

  return (
    <ScreenScrollView containerStyle={styles.container}>
      <BackButton fallbackHref={{ pathname: '/group/[id]', params: { id: groupId ?? '' } }} />

      <View style={styles.headerRow}>
        <Avatar size={44} icon="person" iconSize={20} />
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <ThemedText type="h3">{detail.memberName}</ThemedText>
            {detail.memberVerified && <VerifiedBadge size="sm" />}
          </View>
          <ThemedText type="caption" themeColor="textSecondary">
            {detail.date} · {detail.hoursClaimed} hrs claimed
          </ThemedText>
        </View>
      </View>

      <ThemedView type="backgroundElement" style={styles.detailCard}>
        <ThemedText type="bodyBold">{detail.activityTitle}</ThemedText>
        <View style={styles.metaList}>
          <MetaRow icon="calendar-outline" text={detail.date} />
          {detail.activityOrgName && <MetaRow icon="business-outline" text={detail.activityOrgName} />}
          {detail.category && <MetaRow icon="pricetag-outline" text={detail.category} />}
        </View>
        {(detail.orgContactEmail || detail.orgContactPhone) && (
          <ThemedText type="caption" themeColor="textSecondary">
            Org contact: {[detail.orgContactEmail, detail.orgContactPhone].filter(Boolean).join(' · ')}
          </ThemedText>
        )}
        {detail.notes && (
          <View style={[styles.noteBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <Ionicons name="chatbox-ellipses-outline" size={14} color={theme.textSecondary} />
            <ThemedText type="caption" themeColor="textSecondary" style={styles.noteText}>
              {detail.notes}
            </ThemedText>
          </View>
        )}
        {detail.photoUrl && <Image source={{ uri: detail.photoUrl }} style={styles.photo} contentFit="cover" />}
      </ThemedView>

      {actionError && (
        <View style={[styles.errorBanner, { backgroundColor: theme.errorBackground }]}>
          <Ionicons name="warning-outline" size={16} color={theme.error} />
          <ThemedText type="body" themeColor="error" style={styles.errorText}>
            {actionError}
          </ThemedText>
        </View>
      )}

      {detail.reviewerConflict ? (
        <>
          <View style={[styles.errorBanner, { backgroundColor: theme.warningBackground }]}>
            <Ionicons name="shield-outline" size={16} color={theme.warning} />
            <ThemedText type="body" themeColor="warning" style={styles.errorText}>
              You&apos;re the submitter or their registered guardian, so you can&apos;t approve or deny this one. Skip it
              for another admin to review.
            </ThemedText>
          </View>
          <Pressable
            onPress={handleSkip}
            style={[styles.skipButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <ThemedText type="bodyBold">Skip</ThemedText>
          </Pressable>
        </>
      ) : screenState === 'denying' ? (
        <ThemedView type="backgroundElement" style={styles.denyPanel}>
          <FormField
            label="Why was this denied? (optional)"
            value={denyReason}
            onChangeText={setDenyReason}
            placeholder="Let them know what to fix"
            multiline
          />
          <View style={styles.field}>
            <ThemedText type="label" themeColor="textSecondary">
              Allow them to re-upload? *
            </ThemedText>
            <CategoryChipRow chips={ALLOW_REUPLOAD_OPTIONS} activeKey={allowReupload} onChange={setAllowReupload} />
          </View>
          <ConfirmCancelRow
            cancelLabel="Back"
            confirmLabel="Confirm Denial"
            confirmColor="error"
            onCancel={() => {
              setScreenState('review');
              setDenyReason('');
              setAllowReupload('');
              setActionError(null);
            }}
            onConfirm={handleConfirmDeny}
          />
        </ThemedView>
      ) : (
        <ConfirmCancelRow
          cancelLabel="Deny"
          confirmLabel="Approve"
          onCancel={() => setScreenState('denying')}
          onConfirm={handleApprove}
        />
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
  headerInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  detailCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  metaList: {
    gap: Spacing.one,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.one,
    padding: Spacing.two,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  noteText: {
    flex: 1,
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.one,
  },
  field: {
    gap: Spacing.one,
  },
  denyPanel: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: BorderRadius.md,
  },
  errorText: {
    flex: 1,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  outcomeScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outcomePop: {
    alignItems: 'center',
    gap: Spacing.three,
  },
});
