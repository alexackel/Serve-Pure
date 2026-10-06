import { useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';

import { router } from 'expo-router';

import { Avatar } from '@/components/avatar';
import { formatPostAge, formatPostMeta, PostActions, PostPhoto } from '@/components/cards/post-card-shared';
import { VerificationBadge, VerificationStatus } from '@/components/cards/verification-badge';
import { FilterSheet } from '@/components/find/filter-sheet';
import { MentionText } from '@/components/mention-text';
import { OverflowMenu, type OverflowMenuAction } from '@/components/overflow-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing } from '@/constants/theme';
import { type ActivityVisibility, useSocial } from '@/context/social-context';

const VISIBILITY_OPTIONS = [
  { key: 'everyone' as const, label: 'Everyone' },
  { key: 'followers' as const, label: 'Followers' },
  { key: 'only_me' as const, label: 'Only Me' },
];

export type RecordCardProps = {
  recordId: string;
  organization: string;
  hours?: number;
  // Fallback label for the footer when createdAt isn't passed (group screens).
  date: string;
  createdAt?: string;
  city?: string | null;
  description?: string;
  status: VerificationStatus;
  photoUrl?: string;
  likeCount?: number;
  commentCount?: number;
  visibility?: ActivityVisibility;
  note?: string;
  onPress?: () => void;
  // Only the record's own submitter can delete it, and only while it's
  // still pending (attendance_delete_self_report RLS, migration 0030) — the
  // caller decides when that's true and passes this, rather than RecordCard
  // guessing from status alone.
  onDelete?: () => void;
};

export function RecordCard({
  recordId,
  organization,
  hours,
  date,
  createdAt,
  city,
  description,
  status,
  photoUrl,
  likeCount,
  commentCount,
  visibility: initialVisibility,
  note,
  onPress,
  onDelete,
}: RecordCardProps) {
  const { setActivityVisibility } = useSocial();
  const [visibility, setVisibility] = useState(initialVisibility ?? 'everyone');
  const [visibilitySheetVisible, setVisibilitySheetVisible] = useState(false);

  const menuActions: OverflowMenuAction[] = [
    { label: 'Change Visibility', onPress: () => setVisibilitySheetVisible(true) },
    ...(onDelete ? [{ label: 'Delete', destructive: true, onPress: onDelete }] : []),
  ];

  const handleShare = () => {
    Share.share({
      message: `I volunteered at ${organization}${hours !== undefined ? ` for ${hours} hrs` : ''} on ServePure.`,
    }).catch((error) => console.error('Failed to open share sheet', error));
  };

  const footer = formatPostMeta(city, createdAt ? formatPostAge(createdAt) : date);

  return (
    <>
      <Pressable onPress={onPress} disabled={!onPress}>
        <ThemedView type="backgroundElement" style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Avatar icon="person" iconSize={18} />
              <VerificationBadge status={status} size="sm" />
            </View>
            <OverflowMenu actions={menuActions} />
          </View>

          {status === 'denied' ? (
            <ThemedText type="body" style={styles.sentence}>
              Your submission for <ThemedText type="bodyBold">{organization}</ThemedText> was not approved
            </ThemedText>
          ) : status === 'awaiting-resubmission' ? (
            <ThemedText type="body" style={styles.sentence}>
              A group asked you to update your submission for <ThemedText type="bodyBold">{organization}</ThemedText>
            </ThemedText>
          ) : status === 'no-show' ? (
            <ThemedText type="body" style={styles.sentence}>
              You did not check in at <ThemedText type="bodyBold">{organization}</ThemedText>
            </ThemedText>
          ) : status === 'appealed' ? (
            <ThemedText type="body" style={styles.sentence}>
              Your attendance at <ThemedText type="bodyBold">{organization}</ThemedText> is under appeal
            </ThemedText>
          ) : status === 'cancelled' ? (
            <ThemedText type="body" style={styles.sentence}>
              {note}
            </ThemedText>
          ) : (
            <ThemedText type="body" style={styles.sentence}>
              You volunteered at <ThemedText type="bodyBold">{organization}</ThemedText>
              {hours !== undefined ? ` for ${hours} hrs` : ''}
            </ThemedText>
          )}

          {photoUrl && <PostPhoto uri={photoUrl} />}

          {description && status !== 'cancelled' && <MentionText type="body" body={description} />}

          <ThemedText type="caption" themeColor="textSecondary">
            {footer}
          </ThemedText>

          <PostActions
            likeCount={likeCount}
            commentCount={commentCount}
            onCommentPress={() => router.push({ pathname: '/activity/[id]/comments', params: { id: recordId } })}
            onSharePress={handleShare}
          />
        </ThemedView>
      </Pressable>

      <FilterSheet
        visible={visibilitySheetVisible}
        title="Who can see this activity?"
        options={VISIBILITY_OPTIONS}
        mode="single"
        selected={visibility}
        defaultValue={initialVisibility ?? 'everyone'}
        onApply={(value) => {
          const next = value as ActivityVisibility;
          setVisibility(next);
          setActivityVisibility(recordId, next).then(({ error }) => {
            if (error) console.error('Failed to update visibility', error);
          });
        }}
        onDismiss={() => setVisibilitySheetVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  sentence: {},
});
