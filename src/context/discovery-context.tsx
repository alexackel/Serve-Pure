import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { useSession } from '@/context/auth-context';
import { discoverAiOrgs, reportAiOrg, unreportAiOrg, type AiDiscoveredOrg } from '@/data/ai-orgs';
import {
  createDiscoveredPost,
  deleteDiscoveredPost,
  listDiscoveredPosts,
  reportDiscoveredPost,
  unreportDiscoveredPost,
  type CreateDiscoveredPostInput,
  type DiscoveredPost,
} from '@/data/discovered-posts';
import { useUserLocation } from '@/hooks/use-user-location';

export type AiDiscoveryStatus = 'idle' | 'loading' | 'ready' | 'error';
export type UserPostsStatus = 'idle' | 'loading' | 'ready' | 'error';

type DiscoveryContextValue = {
  aiOrgs: AiDiscoveredOrg[];
  aiStatus: AiDiscoveryStatus;
  metroId: string | null;
  refetchAiOrgs: () => void;
  reportedAiOrgIds: Set<string>;
  reportAiOrgById: (orgId: string) => Promise<void>;
  unreportAiOrgById: (orgId: string) => Promise<void>;

  userPosts: DiscoveredPost[];
  userPostsStatus: UserPostsStatus;
  refetchUserPosts: () => void;
  createUserPost: (input: CreateDiscoveredPostInput) => Promise<DiscoveredPost>;
  removeUserPost: (id: string) => Promise<void>;
  reportedUserPostIds: Set<string>;
  reportUserPost: (id: string) => Promise<void>;
  unreportUserPost: (id: string) => Promise<void>;
};

const DiscoveryContext = createContext<DiscoveryContextValue | null>(null);

// Kicks off both the AI "check bucket -> search if needed" flow and a plain
// fetch of community posts once per app session, as soon as the user is
// signed in — well before they'd ever tap the Find page's Discovered tab.
// That tab just reads this shared state instead of fetching on its own, so a
// cache hit costs it nothing and both are usually already loaded by the time
// they get there. AI orgs stay location-gated (see runAiDiscovery) to keep
// the discover-ai-orgs edge function's Brave/Haiku/Mapbox calls near-$0;
// user posts are a plain Postgres select with none of that cost concern, so
// they fetch as soon as a session exists, independent of location.
export function DiscoveryProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const { latitude, longitude, loading: locationLoading } = useUserLocation();

  const [aiOrgs, setAiOrgs] = useState<AiDiscoveredOrg[]>([]);
  const [aiStatus, setAiStatus] = useState<AiDiscoveryStatus>('idle');
  const [metroId, setMetroId] = useState<string | null>(null);
  const [reportedAiOrgIds, setReportedAiOrgIds] = useState<Set<string>>(new Set());
  const firedAiRef = useRef(false);

  const [userPosts, setUserPosts] = useState<DiscoveredPost[]>([]);
  const [userPostsStatus, setUserPostsStatus] = useState<UserPostsStatus>('idle');
  const [reportedUserPostIds, setReportedUserPostIds] = useState<Set<string>>(new Set());
  const firedPostsRef = useRef(false);

  const runAiDiscovery = useCallback((lat: number, lng: number) => {
    setAiStatus('loading');
    discoverAiOrgs(lat, lng)
      .then((result) => {
        setAiOrgs(result.orgs);
        setMetroId(result.metroId);
        setAiStatus('ready');
      })
      .catch((error) => {
        console.error('Failed to discover AI orgs', error);
        setAiStatus('error');
      });
  }, []);

  useEffect(() => {
    if (!session || locationLoading || latitude === null || longitude === null || firedAiRef.current) return;
    firedAiRef.current = true;
    runAiDiscovery(latitude, longitude);
  }, [session, locationLoading, latitude, longitude, runAiDiscovery]);

  const refetchAiOrgs = useCallback(() => {
    if (latitude === null || longitude === null) return;
    runAiDiscovery(latitude, longitude);
  }, [latitude, longitude, runAiDiscovery]);

  const runUserPostsFetch = useCallback((userId: string) => {
    setUserPostsStatus('loading');
    listDiscoveredPosts(userId)
      .then((posts) => {
        setUserPosts(posts);
        setUserPostsStatus('ready');
      })
      .catch((error) => {
        console.error('Failed to load Discovered posts', error);
        setUserPostsStatus('error');
      });
  }, []);

  useEffect(() => {
    if (!session || firedPostsRef.current) return;
    firedPostsRef.current = true;
    runUserPostsFetch(session.user.id);
  }, [session, runUserPostsFetch]);

  const refetchUserPosts = useCallback(() => {
    if (!session) return;
    runUserPostsFetch(session.user.id);
  }, [session, runUserPostsFetch]);

  const createUserPost = useCallback(
    async (input: CreateDiscoveredPostInput) => {
      if (!session) throw new Error('Must be signed in to share a Discovered post.');
      const post = await createDiscoveredPost(session.user.id, input);
      setUserPosts((prev) => [post, ...prev]);
      return post;
    },
    [session],
  );

  const removeUserPost = useCallback(async (id: string) => {
    await deleteDiscoveredPost(id);
    setUserPosts((prev) => prev.filter((post) => post.id !== id));
  }, []);

  // Keeps each item's flaggedCount in sync locally on report/undo, since
  // there's no refetch to pick up the server-side count for AI orgs (fetched
  // once per app session on purpose, see runAiDiscovery above) — applied to
  // user posts too for the same optimistic-UI consistency, even though a
  // user-posts refetch would be cheap.
  const adjustAiOrgFlaggedCount = useCallback((orgId: string, delta: number) => {
    setAiOrgs((prev) => prev.map((org) => (org.id === orgId ? { ...org, flaggedCount: Math.max(org.flaggedCount + delta, 0) } : org)));
  }, []);

  const adjustUserPostFlaggedCount = useCallback((postId: string, delta: number) => {
    setUserPosts((prev) =>
      prev.map((post) => (post.id === postId ? { ...post, flaggedCount: Math.max(post.flaggedCount + delta, 0) } : post)),
    );
  }, []);

  // Optimistic add, rolled back on failure — shared by the Discovered card
  // list and the AI-org detail screen so both reflect the same "did I report
  // this" state instantly.
  const reportAiOrgById = useCallback(
    (orgId: string) => {
      setReportedAiOrgIds((prev) => {
        if (prev.has(orgId)) return prev;
        const next = new Set(prev);
        next.add(orgId);
        return next;
      });
      adjustAiOrgFlaggedCount(orgId, 1);
      return reportAiOrg(orgId).catch((error) => {
        setReportedAiOrgIds((prev) => {
          const next = new Set(prev);
          next.delete(orgId);
          return next;
        });
        adjustAiOrgFlaggedCount(orgId, -1);
        throw error;
      });
    },
    [adjustAiOrgFlaggedCount],
  );

  const unreportAiOrgById = useCallback(
    (orgId: string) => {
      setReportedAiOrgIds((prev) => {
        if (!prev.has(orgId)) return prev;
        const next = new Set(prev);
        next.delete(orgId);
        return next;
      });
      adjustAiOrgFlaggedCount(orgId, -1);
      return unreportAiOrg(orgId).catch((error) => {
        setReportedAiOrgIds((prev) => {
          const next = new Set(prev);
          next.add(orgId);
          return next;
        });
        adjustAiOrgFlaggedCount(orgId, 1);
        throw error;
      });
    },
    [adjustAiOrgFlaggedCount],
  );

  const reportUserPost = useCallback(
    (id: string) => {
      setReportedUserPostIds((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      adjustUserPostFlaggedCount(id, 1);
      return reportDiscoveredPost(id).catch((error) => {
        setReportedUserPostIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        adjustUserPostFlaggedCount(id, -1);
        throw error;
      });
    },
    [adjustUserPostFlaggedCount],
  );

  const unreportUserPost = useCallback(
    (id: string) => {
      setReportedUserPostIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      adjustUserPostFlaggedCount(id, -1);
      return unreportDiscoveredPost(id).catch((error) => {
        setReportedUserPostIds((prev) => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
        adjustUserPostFlaggedCount(id, 1);
        throw error;
      });
    },
    [adjustUserPostFlaggedCount],
  );

  const value = useMemo(
    () => ({
      aiOrgs,
      aiStatus,
      metroId,
      refetchAiOrgs,
      reportedAiOrgIds,
      reportAiOrgById,
      unreportAiOrgById,
      userPosts,
      userPostsStatus,
      refetchUserPosts,
      createUserPost,
      removeUserPost,
      reportedUserPostIds,
      reportUserPost,
      unreportUserPost,
    }),
    [
      aiOrgs,
      aiStatus,
      metroId,
      refetchAiOrgs,
      reportedAiOrgIds,
      reportAiOrgById,
      unreportAiOrgById,
      userPosts,
      userPostsStatus,
      refetchUserPosts,
      createUserPost,
      removeUserPost,
      reportedUserPostIds,
      reportUserPost,
      unreportUserPost,
    ],
  );

  return <DiscoveryContext.Provider value={value}>{children}</DiscoveryContext.Provider>;
}

export function useDiscovery() {
  const context = useContext(DiscoveryContext);
  if (!context) {
    throw new Error('useDiscovery must be used within a DiscoveryProvider');
  }
  return context;
}
