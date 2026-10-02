import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

import { BackButton } from '@/components/back-button';
import { PostPhoto } from '@/components/cards/post-card-shared';
import { InitialsAvatar } from '@/components/initials-avatar';
import { MentionInput } from '@/components/mention-input';
import { MentionText } from '@/components/mention-text';
import { OverflowMenu, type OverflowMenuAction } from '@/components/overflow-menu';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { VerifiedBadge } from '@/components/verified-badge';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useSession } from '@/context/auth-context';
import { type ActivityComment, useSocial } from '@/context/social-context';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

type ActivityHeader = {
  ownerId: string;
  ownerName: string;
  identityVerified: boolean;
  organization: string;
  hours: number | null;
  notes: string | null;
  createdAt: string;
  photoUrl: string | null;
  address: string | null;
};

function timeAgo(isoDate: string): string {
  const minutes = Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function ActivityCommentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const theme = useTheme();
  const { getActivityComments, createComment, deleteComment } = useSocial();
  const [header, setHeader] = useState<ActivityHeader | null>(null);
  const [comments, setComments] = useState<ActivityComment[]>([]);
  const [draft, setDraft] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadComments = useCallback(async () => {
    if (!id) return;
    const result = await getActivityComments(id);
    setComments(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function loadHeader() {
      const { data, error } = await supabase
        .from('attendance_records')
        .select(
          'user_id, activity_title, activity_org_name, hours_claimed, hours_awarded, notes, created_at, photo_url, event_id, events(address), profiles!user_id(full_name, identity_verified)',
        )
        .eq('id', id)
        .single();
      if (cancelled) return;
      if (error || !data) {
        console.error('Failed to load activity', error);
        return;
      }
      const profile = data.profiles as unknown as { full_name: string; identity_verified: boolean } | null;
      const event = data.events as unknown as { address: string | null } | null;
      setHeader({
        ownerId: data.user_id,
        ownerName: profile?.full_name ?? 'Unknown',
        identityVerified: profile?.identity_verified ?? false,
        organization: data.activity_org_name ?? data.activity_title ?? 'an activity',
        hours: data.hours_awarded ?? data.hours_claimed,
        notes: data.notes,
        createdAt: data.created_at,
        photoUrl: data.photo_url,
        address: event?.address ?? null,
      });
    }
    async function load() {
      await loadComments();
    }
    loadHeader();
    load();
    return () => {
      cancelled = true;
    };
  }, [id, loadComments]);

  const handleSubmit = async () => {
    const body = draft.trim();
    if (!body || !id) return;
    setIsSubmitting(true);
    const { error } = await createComment(id, body);
    setIsSubmitting(false);
    if (error) {
      console.error('Failed to post comment', error);
      return;
    }
    setDraft('');
    loadComments();
  };

  const handleDelete = async (commentId: string) => {
    const { error } = await deleteComment(commentId);
    if (error) {
      console.error('Failed to delete comment', error);
      return;
    }
    loadComments();
  };

  return (
    <View style={styles.flex}>
      <ScreenScrollView containerStyle={styles.container}>
        <BackButton fallbackHref="/" />

        {header && (
          <ThemedView style={[styles.postHeader, { borderColor: theme.border }]}>
            <View style={styles.identityRow}>
              <InitialsAvatar fullName={header.ownerName} size={48} />
              <View style={styles.identityText}>
                <View style={styles.nameRow}>
                  <ThemedText type="bodyBold">{header.ownerName}</ThemedText>
                  {header.identityVerified && <VerifiedBadge size="sm" />}
                </View>
                <ThemedText type="caption" themeColor="textSecondary">
                  {timeAgo(header.createdAt)}
                </ThemedText>
              </View>
            </View>

            <ThemedText type="body">
              Volunteered at <ThemedText type="bodyBold">{header.organization}</ThemedText>
              {header.hours !== null ? ` for ${header.hours} hrs` : ''}
            </ThemedText>

            {header.address && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={15} color={theme.textSecondary} />
                <ThemedText type="caption" themeColor="textSecondary">
                  {header.address}
                </ThemedText>
              </View>
            )}

            {header.notes && <MentionText type="body" body={header.notes} />}

            {header.photoUrl && <PostPhoto uri={header.photoUrl} />}
          </ThemedView>
        )}

        <ThemedText type="bodyBold">Comments</ThemedText>

        <ThemedView style={styles.list}>
          {comments.length === 0 ? (
            <ThemedText type="body" themeColor="textSecondary">
              No comments yet.
            </ThemedText>
          ) : (
            comments.map((comment) => {
              const canDelete =
                !!session && (comment.userId === session.user.id || header?.ownerId === session.user.id);
              const actions: OverflowMenuAction[] = [{ label: 'Delete', destructive: true, onPress: () => handleDelete(comment.id) }];
              return (
                <View key={comment.id} style={styles.commentRow}>
                  <InitialsAvatar fullName={comment.fullName} size={32} />
                  <View style={styles.commentBody}>
                    <View style={styles.commentHeader}>
                      <ThemedText type="bodyBold">{comment.fullName}</ThemedText>
                      <ThemedText type="caption" themeColor="textSecondary">
                        {timeAgo(comment.createdAt)}
                      </ThemedText>
                    </View>
                    <MentionText type="body" body={comment.body} />
                  </View>
                  {canDelete && <OverflowMenu actions={actions} />}
                </View>
              );
            })
          )}
        </ThemedView>
      </ScreenScrollView>

      <View style={[styles.composer, { borderColor: theme.border, backgroundColor: theme.background }]}>
        {id && <MentionInput recordId={id} value={draft} onChangeText={setDraft} placeholder="Add a comment…" />}
        <ThemedText
          type="bodyBold"
          themeColor={draft.trim() && !isSubmitting ? 'primary' : 'textSecondary'}
          onPress={handleSubmit}
          style={styles.sendButton}>
          Send
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    gap: Spacing.four,
  },
  postHeader: {
    gap: Spacing.two,
    paddingBottom: Spacing.four,
    borderBottomWidth: 1,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  identityText: {
    gap: Spacing.half,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  list: {
    gap: Spacing.four,
  },
  commentRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'flex-start',
  },
  commentBody: {
    flex: 1,
    gap: Spacing.half,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    padding: Spacing.three,
    borderTopWidth: 1,
  },
  sendButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
    borderRadius: BorderRadius.sm,
  },
});
