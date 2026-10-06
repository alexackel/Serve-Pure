import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { BackButton } from '@/components/back-button';
import { formatPostAge, formatPostMeta, PostPhoto } from '@/components/cards/post-card-shared';
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
  organization: string | null;
  activityTitle: string | null;
  hours: number | null;
  description: string | null;
  createdAt: string;
  photoUrl: string | null;
  city: string | null;
  address: string | null;
  website: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
};

// Compact label for comment rows, where "3 days ago" would crowd the line.
function timeAgo(isoDate: string): string {
  const minutes = Math.floor((Date.now() - new Date(isoDate).getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

// Website may be saved without a scheme ("example.org"), so Linking needs one added.
function toWebUrl(website: string): string {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
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
          'user_id, activity_title, activity_org_name, hours_claimed, hours_awarded, notes, created_at, photo_url, org_contact_email, org_contact_phone, events(address, website, contact_email, contact_phone), profiles!user_id(full_name, identity_verified, city)',
        )
        .eq('id', id)
        .single();
      if (cancelled) return;
      if (error || !data) {
        console.error('Failed to load activity', error);
        return;
      }
      const profile = data.profiles as unknown as {
        full_name: string;
        identity_verified: boolean;
        city: string | null;
      } | null;
      const event = data.events as unknown as {
        address: string | null;
        website: string | null;
        contact_email: string | null;
        contact_phone: string | null;
      } | null;
      setHeader({
        ownerId: data.user_id,
        ownerName: profile?.full_name ?? 'Unknown',
        identityVerified: profile?.identity_verified ?? false,
        organization: data.activity_org_name,
        activityTitle: data.activity_title,
        hours: data.hours_awarded ?? data.hours_claimed,
        description: data.notes,
        createdAt: data.created_at,
        photoUrl: data.photo_url,
        city: profile?.city ?? null,
        address: event?.address ?? null,
        website: event?.website ?? null,
        // The volunteer's own org contact (self-reports) wins over the event's.
        contactEmail: data.org_contact_email ?? event?.contact_email ?? null,
        contactPhone: data.org_contact_phone ?? event?.contact_phone ?? null,
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

  const hasOrgDetails =
    !!header?.organization && !!(header.address || header.website || header.contactEmail || header.contactPhone);

  return (
    <View style={styles.flex}>
      <ScreenScrollView containerStyle={styles.container}>
        <BackButton fallbackHref="/" />

        {header && (
          <ThemedView style={styles.postHeader}>
            <View style={styles.identityRow}>
              <InitialsAvatar fullName={header.ownerName} size={48} />
              <View style={styles.identityText}>
                <Pressable
                  accessibilityRole="link"
                  onPress={() =>
                    router.push({ pathname: '/profile/[userId]', params: { userId: header.ownerId, fullName: header.ownerName } })
                  }>
                  <View style={styles.nameRow}>
                    <ThemedText type="bodyBold">{header.ownerName}</ThemedText>
                    {header.identityVerified && <VerifiedBadge size="sm" />}
                  </View>
                </Pressable>
                <ThemedText type="caption" themeColor="textSecondary">
                  {formatPostMeta(header.city, formatPostAge(header.createdAt))}
                </ThemedText>
              </View>
            </View>

            {header.organization ? (
              <ThemedText type="h3">
                Volunteered at {header.organization}
                {header.hours !== null ? ` for ${header.hours} ${header.hours === 1 ? 'hour' : 'hours'}` : ''}
              </ThemedText>
            ) : (
              <ThemedText type="h2">{header.activityTitle ?? 'An activity'}</ThemedText>
            )}

            {header.photoUrl && <PostPhoto uri={header.photoUrl} />}

            {header.description && <MentionText type="body" body={header.description} />}

            {hasOrgDetails && (
              <View style={[styles.orgBlock, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="label" themeColor="textSecondary">
                  Organization
                </ThemedText>
                <ThemedText type="bodyBold">{header.organization}</ThemedText>

                {header.address && (
                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={16} color={theme.textSecondary} />
                    <ThemedText type="body" themeColor="textSecondary" style={styles.detailText}>
                      {header.address}
                    </ThemedText>
                  </View>
                )}

                {header.contactEmail && (
                  <Pressable
                    style={styles.detailRow}
                    onPress={() => Linking.openURL(`mailto:${header.contactEmail}`).catch((e) => console.error('Failed to open mail', e))}
                    accessibilityRole="link">
                    <Ionicons name="mail-outline" size={16} color={theme.primary} />
                    <ThemedText type="body" themeColor="primary" style={styles.detailText}>
                      {header.contactEmail}
                    </ThemedText>
                  </Pressable>
                )}

                {header.contactPhone && (
                  <Pressable
                    style={styles.detailRow}
                    onPress={() => Linking.openURL(`tel:${header.contactPhone}`).catch((e) => console.error('Failed to open phone', e))}
                    accessibilityRole="link">
                    <Ionicons name="call-outline" size={16} color={theme.primary} />
                    <ThemedText type="body" themeColor="primary" style={styles.detailText}>
                      {header.contactPhone}
                    </ThemedText>
                  </Pressable>
                )}

                {header.website && (
                  <Pressable
                    style={styles.detailRow}
                    onPress={() => Linking.openURL(toWebUrl(header.website!)).catch((e) => console.error('Failed to open website', e))}
                    accessibilityRole="link">
                    <Ionicons name="globe-outline" size={16} color={theme.primary} />
                    <ThemedText type="body" themeColor="primary" style={styles.detailText}>
                      {header.website}
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            )}
          </ThemedView>
        )}

        <ThemedText type="h3">Comments</ThemedText>

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
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  identityText: {
    gap: Spacing.half,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  orgBlock: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  detailText: {
    flex: 1,
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
