import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';

import { BackButton } from '@/components/back-button';
import { ConfirmCancelRow } from '@/components/confirm-cancel-row';
import { DiscoverySourceTag } from '@/components/discovery-source-tag';
import { ExpandablePhoto } from '@/components/expandable-photo';
import { LocationMapCard } from '@/components/map';
import { MetaRow } from '@/components/meta-row';
import { ScreenScrollView } from '@/components/screen-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BorderRadius, Spacing } from '@/constants/theme';
import { useSession } from '@/context/auth-context';
import { useDiscovery } from '@/context/discovery-context';
import { useTheme } from '@/hooks/use-theme';
import { useUserLocation } from '@/hooks/use-user-location';
import { aiOrgCategoryLabel } from '@/utils/ai-orgs';
import { getDistanceMiles } from '@/utils/geo';
import { discoveredPostToPin } from '@/utils/map-pins';
import { ensureUrlScheme } from '@/utils/normalize-url';

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
    <Pressable onPress={() => Linking.openURL(ensureUrlScheme(url))} style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={theme.primary} />
      <ThemedText type="body" themeColor="primary" style={styles.infoRowText}>
        {text}
      </ThemedText>
    </Pressable>
  );
}

export default function DiscoveredPostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { session } = useSession();
  const { userPosts, userPostsStatus, reportedUserPostIds, reportUserPost, unreportUserPost, removeUserPost } = useDiscovery();
  const userLocation = useUserLocation();
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmingReport, setConfirmingReport] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const post = useMemo(() => userPosts.find((candidate) => candidate.id === id), [userPosts, id]);
  const postPin = useMemo(() => (post ? discoveredPostToPin(post) : null), [post]);

  const distanceMiles =
    post &&
    userLocation.latitude !== null &&
    userLocation.longitude !== null &&
    post.latitude !== null &&
    post.longitude !== null
      ? getDistanceMiles(userLocation.latitude, userLocation.longitude, post.latitude, post.longitude)
      : null;

  if (!post) {
    return (
      <ScreenScrollView containerStyle={styles.container}>
        <BackButton fallbackHref="/find" />
        <ThemedText type="h3">{userPostsStatus === 'loading' ? 'Loading…' : 'Post not found'}</ThemedText>
      </ScreenScrollView>
    );
  }

  const isOwner = session?.user.id === post.createdBy;
  const reported = reportedUserPostIds.has(post.id);

  const handleReport = () => {
    setActionError(null);
    setConfirmingReport(false);
    reportUserPost(post.id).catch((error) => {
      console.error('Failed to report Discovered post', error);
      setActionError('Could not submit report. Try again.');
    });
  };

  const handleUndoReport = () => {
    setActionError(null);
    unreportUserPost(post.id).catch((error) => {
      console.error('Failed to undo Discovered post report', error);
      setActionError('Could not undo report. Try again.');
    });
  };

  const handleDelete = () => {
    setActionError(null);
    setIsDeleting(true);
    removeUserPost(post.id)
      .then(() => router.back())
      .catch((error) => {
        console.error('Failed to delete Discovered post', error);
        setActionError('Could not delete this post. Try again.');
        setIsDeleting(false);
        setConfirmingDelete(false);
      });
  };

  return (
    <ScreenScrollView containerStyle={styles.container}>
      <BackButton fallbackHref="/find" />

      <DiscoverySourceTag source="community" />

      <View style={styles.titleBlock}>
        <ThemedText type="h1">{post.name}</ThemedText>
        {post.category !== 'other' && (
          <View style={[styles.categoryPill, { backgroundColor: theme.primaryTint }]}>
            <ThemedText type="label" themeColor="primary">
              {aiOrgCategoryLabel(post.category)}
            </ThemedText>
          </View>
        )}
      </View>

      <SectionDivider />

      {distanceMiles !== null && (
        <View style={styles.infoList}>
          <MetaRow icon="navigate-outline" text={`${distanceMiles.toFixed(1)} mi away`} />
        </View>
      )}

      {post.photoUrl && <ExpandablePhoto uri={post.photoUrl} style={styles.photo} />}

      <ThemedView style={styles.section}>
        <ThemedText type="h3">Location</ThemedText>
        <InfoRow icon="location-outline" text={post.address} />
        <LocationMapCard pin={postPin} />
      </ThemedView>

      {post.description && (
        <ThemedView style={styles.section}>
          <ThemedText type="h3">About this opportunity</ThemedText>
          <ThemedText type="body">{post.description}</ThemedText>
        </ThemedView>
      )}

      <ThemedView style={styles.section}>
        <ThemedText type="h3">Contact</ThemedText>
        <View style={styles.infoList}>
          <LinkRow icon="globe-outline" text={post.website} url={post.website} />
          {post.contactEmail && <InfoRow icon="mail-outline" text={post.contactEmail} />}
          {post.contactPhone && <InfoRow icon="call-outline" text={post.contactPhone} />}
        </View>
      </ThemedView>

      {actionError && (
        <View style={[styles.warningBanner, { backgroundColor: theme.errorBackground }]}>
          <Ionicons name="warning-outline" size={16} color={theme.error} />
          <ThemedText type="body" themeColor="error" style={styles.warningText}>
            {actionError}
          </ThemedText>
        </View>
      )}

      {isOwner ? (
        confirmingDelete ? (
          <ThemedView type="backgroundElement" style={styles.reportConfirm}>
            <ThemedText type="body">Delete this post? This can&apos;t be undone.</ThemedText>
            <ConfirmCancelRow
              confirmLabel={isDeleting ? 'Deleting…' : 'Delete'}
              confirmColor="error"
              onCancel={() => setConfirmingDelete(false)}
              onConfirm={handleDelete}
            />
          </ThemedView>
        ) : (
          <Pressable onPress={() => setConfirmingDelete(true)} style={[styles.reportButton, { borderColor: theme.error }]}>
            <Ionicons name="trash-outline" size={16} color={theme.error} />
            <ThemedText type="bodyBold" themeColor="error">
              Delete post
            </ThemedText>
          </Pressable>
        )
      ) : confirmingReport ? (
        <ThemedView type="backgroundElement" style={styles.reportConfirm}>
          <ThemedText type="body">Report this post&apos;s info as incorrect?</ThemedText>
          <ConfirmCancelRow
            confirmLabel="Report"
            confirmColor="error"
            onCancel={() => setConfirmingReport(false)}
            onConfirm={handleReport}
          />
        </ThemedView>
      ) : reported ? (
        <Pressable onPress={handleUndoReport} style={[styles.reportButton, { borderColor: theme.error }]}>
          <Ionicons name="flag" size={16} color={theme.error} />
          <ThemedText type="bodyBold" themeColor="error">
            Reported · Undo
          </ThemedText>
        </Pressable>
      ) : (
        <Pressable onPress={() => setConfirmingReport(true)} style={[styles.reportButton, { borderColor: theme.border }]}>
          <Ionicons name="flag-outline" size={16} color={theme.textSecondary} />
          <ThemedText type="bodyBold" themeColor="textSecondary">
            Report incorrect info
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
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BorderRadius.lg,
  },
  section: {
    gap: Spacing.two,
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
  reportButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingVertical: Spacing.three,
  },
  reportConfirm: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
  },
});
