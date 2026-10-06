import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';

import { useSession } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';

export type ActivityVisibility = 'everyone' | 'followers' | 'only_me';

export type ActivityLiker = {
  userId: string;
  fullName: string;
  likedAt: string;
  isFollowing: boolean;
};

export type ActivityComment = {
  id: string;
  userId: string;
  fullName: string;
  body: string;
  mentionedUserIds: string[];
  createdAt: string;
};

export type MentionableUser = {
  userId: string;
  fullName: string;
};

export type SuggestedPerson = {
  userId: string;
  fullName: string;
  identityVerified: boolean;
};

export type FollowCounts = { followers: number; following: number };

export type FollowListPerson = {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  identityVerified: boolean;
};

export type FeedActivity = {
  recordId: string;
  userId: string;
  fullName: string;
  identityVerified: boolean;
  activityTitle: string | null;
  activityOrgName: string | null;
  category: string | null;
  hours: number | null;
  photoUrl: string | null;
  visibility: ActivityVisibility;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  createdAt: string;
};

// Postgres errors from the likes/comments/follow hard-block triggers surface
// as raw exception text — translate the ones a volunteer can actually hit,
// matching registrations-context.tsx's friendlyRegistrationError for the
// same errcode.
function friendlySocialError(error: PostgrestError): string {
  if (error.code === '23514' || error.message.includes('self_dealing_violation')) {
    return "You can't like your own activity.";
  }
  if (error.message.includes('blocked_relationship')) {
    return "You can't follow this person.";
  }
  return error.message;
}

type LikersRow = { user_id: string; full_name: string; liked_at: string; is_following: boolean };
type CommentsRow = { id: string; user_id: string; full_name: string; body: string; mentioned_user_ids: string[]; created_at: string };
type MentionableRow = { user_id: string; full_name: string };
type SuggestedRow = { user_id: string; full_name: string; identity_verified: boolean };
type FollowCountsRow = { followers: number; following: number };
type FollowListRow = { user_id: string; full_name: string; avatar_url: string | null; identity_verified: boolean };
type FeedRow = {
  id: string;
  user_id: string;
  full_name: string;
  identity_verified: boolean;
  activity_title: string | null;
  activity_org_name: string | null;
  category: string | null;
  hours_claimed: number | null;
  hours_awarded: number | null;
  photo_url: string | null;
  visibility: ActivityVisibility;
  like_count: number;
  comment_count: number;
  viewer_has_liked: boolean;
  created_at: string;
};

type SocialContextValue = {
  followingIds: Set<string>;
  refetchFollowing: () => Promise<void>;
  followUser: (userId: string) => Promise<{ error: string | null }>;
  unfollowUser: (userId: string) => Promise<{ error: string | null }>;
  blockUser: (userId: string) => Promise<{ error: string | null }>;
  unblockUser: (userId: string) => Promise<{ error: string | null }>;
  toggleLike: (recordId: string) => Promise<{ liked: boolean | null; error: string | null }>;
  getActivityLikers: (recordId: string, limit?: number, offset?: number) => Promise<ActivityLiker[]>;
  getActivityComments: (recordId: string, limit?: number, offset?: number) => Promise<ActivityComment[]>;
  createComment: (recordId: string, body: string) => Promise<{ error: string | null }>;
  deleteComment: (commentId: string) => Promise<{ error: string | null }>;
  getMentionableUsers: (recordId: string, query: string) => Promise<MentionableUser[]>;
  getMentionableUsersForComposer: (query: string) => Promise<MentionableUser[]>;
  setActivityVisibility: (recordId: string, visibility: ActivityVisibility) => Promise<{ error: string | null }>;
  getActivityFeed: (limit?: number, offset?: number) => Promise<FeedActivity[]>;
  getSuggestedPeople: (limit?: number) => Promise<SuggestedPerson[]>;
  getFollowCounts: (userId: string) => Promise<FollowCounts>;
  getFollowers: (userId: string, limit?: number, offset?: number) => Promise<FollowListPerson[]>;
  getFollowing: (userId: string, limit?: number, offset?: number) => Promise<FollowListPerson[]>;
};

const SocialContext = createContext<SocialContextValue | null>(null);

export function SocialProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  const refetchFollowing = useCallback(async () => {
    if (!session) {
      setFollowingIds(new Set());
      return;
    }
    const { data, error } = await supabase.from('follows').select('followee_id').eq('follower_id', session.user.id);
    if (error) {
      console.error('Failed to load following list', error);
      return;
    }
    setFollowingIds(new Set((data ?? []).map((row) => row.followee_id as string)));
  }, [session]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      await refetchFollowing();
    }
    if (!cancelled) load();
    return () => {
      cancelled = true;
    };
  }, [refetchFollowing]);

  const followUser = useCallback(
    async (userId: string) => {
      if (!session) return { error: 'You must be signed in.' };
      const { error } = await supabase.from('follows').insert({ follower_id: session.user.id, followee_id: userId });
      if (error) return { error: friendlySocialError(error) };
      await refetchFollowing();
      return { error: null };
    },
    [session, refetchFollowing],
  );

  const unfollowUser = useCallback(
    async (userId: string) => {
      if (!session) return { error: 'You must be signed in.' };
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', session.user.id)
        .eq('followee_id', userId);
      if (error) return { error: error.message };
      await refetchFollowing();
      return { error: null };
    },
    [session, refetchFollowing],
  );

  const blockUser = useCallback(
    async (userId: string) => {
      if (!session) return { error: 'You must be signed in.' };
      const { error } = await supabase.from('blocks').insert({ blocker_id: session.user.id, blocked_id: userId });
      if (error) return { error: error.message };
      await refetchFollowing();
      return { error: null };
    },
    [session, refetchFollowing],
  );

  const unblockUser = useCallback(
    async (userId: string) => {
      if (!session) return { error: 'You must be signed in.' };
      const { error } = await supabase.from('blocks').delete().eq('blocker_id', session.user.id).eq('blocked_id', userId);
      if (error) return { error: error.message };
      return { error: null };
    },
    [session],
  );

  const toggleLike = useCallback(async (recordId: string) => {
    const { data, error } = await supabase.rpc('toggle_like', { p_record_id: recordId });
    if (error) return { liked: null, error: friendlySocialError(error) };
    return { liked: data as boolean, error: null };
  }, []);

  const getActivityLikers = useCallback(async (recordId: string, limit = 20, offset = 0): Promise<ActivityLiker[]> => {
    const { data, error } = await supabase.rpc('get_activity_likers', {
      p_record_id: recordId,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) {
      console.error('Failed to load activity likers', error);
      return [];
    }
    return (data as LikersRow[]).map((row) => ({
      userId: row.user_id,
      fullName: row.full_name,
      likedAt: row.liked_at,
      isFollowing: row.is_following,
    }));
  }, []);

  const getActivityComments = useCallback(async (recordId: string, limit = 50, offset = 0): Promise<ActivityComment[]> => {
    const { data, error } = await supabase.rpc('get_activity_comments', {
      p_record_id: recordId,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) {
      console.error('Failed to load activity comments', error);
      return [];
    }
    return (data as CommentsRow[]).map((row) => ({
      id: row.id,
      userId: row.user_id,
      fullName: row.full_name,
      body: row.body,
      mentionedUserIds: row.mentioned_user_ids ?? [],
      createdAt: row.created_at,
    }));
  }, []);

  const createComment = useCallback(
    async (recordId: string, body: string) => {
      if (!session) return { error: 'You must be signed in.' };
      const { error } = await supabase
        .from('comments')
        .insert({ attendance_record_id: recordId, user_id: session.user.id, body });
      if (error) return { error: error.message };
      return { error: null };
    },
    [session],
  );

  const deleteComment = useCallback(async (commentId: string) => {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const getMentionableUsers = useCallback(async (recordId: string, query: string): Promise<MentionableUser[]> => {
    const { data, error } = await supabase.rpc('get_mentionable_users', { p_record_id: recordId, p_query: query });
    if (error) {
      console.error('Failed to load mentionable users', error);
      return [];
    }
    return (data as MentionableRow[]).map((row) => ({ userId: row.user_id, fullName: row.full_name }));
  }, []);

  const getMentionableUsersForComposer = useCallback(async (query: string): Promise<MentionableUser[]> => {
    const { data, error } = await supabase.rpc('get_mentionable_users_for_composer', { p_query: query });
    if (error) {
      console.error('Failed to load mentionable users', error);
      return [];
    }
    return (data as MentionableRow[]).map((row) => ({ userId: row.user_id, fullName: row.full_name }));
  }, []);

  const setActivityVisibility = useCallback(async (recordId: string, visibility: ActivityVisibility) => {
    const { error } = await supabase.rpc('set_activity_visibility', {
      p_record_id: recordId,
      p_visibility: visibility,
    });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const getActivityFeed = useCallback(async (limit = 20, offset = 0): Promise<FeedActivity[]> => {
    const { data, error } = await supabase.rpc('get_activity_feed', { p_limit: limit, p_offset: offset });
    if (error) {
      console.error('Failed to load activity feed', error);
      return [];
    }
    return (data as FeedRow[]).map((row) => ({
      recordId: row.id,
      userId: row.user_id,
      fullName: row.full_name,
      identityVerified: row.identity_verified,
      activityTitle: row.activity_title,
      activityOrgName: row.activity_org_name,
      category: row.category,
      hours: row.hours_awarded ?? row.hours_claimed,
      photoUrl: row.photo_url,
      visibility: row.visibility,
      likeCount: row.like_count,
      commentCount: row.comment_count,
      likedByMe: row.viewer_has_liked,
      createdAt: row.created_at,
    }));
  }, []);

  const getSuggestedPeople = useCallback(async (limit = 5): Promise<SuggestedPerson[]> => {
    const { data, error } = await supabase.rpc('get_suggested_people', { p_limit: limit });
    if (error) {
      console.error('Failed to load suggested people', error);
      return [];
    }
    return (data as SuggestedRow[]).map((row) => ({
      userId: row.user_id,
      fullName: row.full_name,
      identityVerified: row.identity_verified,
    }));
  }, []);

  const getFollowCounts = useCallback(async (userId: string): Promise<FollowCounts> => {
    const { data, error } = await supabase.rpc('get_follow_counts', { p_user_id: userId });
    if (error) {
      console.error('Failed to load follow counts', error);
      return { followers: 0, following: 0 };
    }
    const row = (data as FollowCountsRow[])[0];
    return { followers: row?.followers ?? 0, following: row?.following ?? 0 };
  }, []);

  const getFollowList = useCallback(
    async (rpc: 'get_followers' | 'get_following', userId: string, limit: number, offset: number) => {
      const { data, error } = await supabase.rpc(rpc, { p_user_id: userId, p_limit: limit, p_offset: offset });
      if (error) {
        console.error(`Failed to load ${rpc}`, error);
        return [];
      }
      return (data as FollowListRow[]).map((row) => ({
        userId: row.user_id,
        fullName: row.full_name,
        avatarUrl: row.avatar_url,
        identityVerified: row.identity_verified,
      }));
    },
    [],
  );

  const getFollowers = useCallback(
    (userId: string, limit = 20, offset = 0) => getFollowList('get_followers', userId, limit, offset),
    [getFollowList],
  );

  const getFollowing = useCallback(
    (userId: string, limit = 20, offset = 0) => getFollowList('get_following', userId, limit, offset),
    [getFollowList],
  );

  const value = useMemo(
    () => ({
      followingIds,
      refetchFollowing,
      followUser,
      unfollowUser,
      blockUser,
      unblockUser,
      toggleLike,
      getActivityLikers,
      getActivityComments,
      createComment,
      deleteComment,
      getMentionableUsers,
      getMentionableUsersForComposer,
      setActivityVisibility,
      getActivityFeed,
      getSuggestedPeople,
      getFollowCounts,
      getFollowers,
      getFollowing,
    }),
    [
      followingIds,
      refetchFollowing,
      followUser,
      unfollowUser,
      blockUser,
      unblockUser,
      toggleLike,
      getActivityLikers,
      getActivityComments,
      createComment,
      deleteComment,
      getMentionableUsers,
      getMentionableUsersForComposer,
      setActivityVisibility,
      getActivityFeed,
      getSuggestedPeople,
      getFollowCounts,
      getFollowers,
      getFollowing,
    ],
  );

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

export function useSocial() {
  const context = useContext(SocialContext);
  if (!context) {
    throw new Error('useSocial must be used within a SocialProvider');
  }
  return context;
}
