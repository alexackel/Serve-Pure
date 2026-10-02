import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useSession } from '@/context/auth-context';
import { supabase } from '@/lib/supabase';

export type NotificationType = 'like' | 'comment' | 'mention';

export type NotificationItem = {
  id: string;
  type: NotificationType;
  attendanceRecordId: string;
  commentId: string | null;
  latestActorName: string;
  otherActorCount: number;
  activityTitle: string;
  isOwnActivity: boolean;
  seen: boolean;
  read: boolean;
  createdAt: string;
  updatedAt: string;
};

type NotificationRow = {
  id: string;
  type: NotificationType;
  attendance_record_id: string;
  comment_id: string | null;
  latest_actor_name: string;
  other_actor_count: number;
  activity_title: string;
  is_own_activity: boolean;
  seen: boolean;
  read: boolean;
  created_at: string;
  updated_at: string;
};

function mapNotificationRow(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    type: row.type,
    attendanceRecordId: row.attendance_record_id,
    commentId: row.comment_id,
    latestActorName: row.latest_actor_name,
    otherActorCount: row.other_actor_count,
    activityTitle: row.activity_title,
    isOwnActivity: row.is_own_activity,
    seen: row.seen,
    read: row.read,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type NotificationsContextValue = {
  notifications: NotificationItem[];
  unseenCount: number;
  isLoading: boolean;
  refetch: () => Promise<void>;
  markSeen: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!session) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }
    const { data, error } = await supabase.rpc('get_notifications', { p_limit: 50, p_offset: 0 });
    if (error) {
      console.error('Failed to load notifications', error);
      setIsLoading(false);
      return;
    }
    setNotifications((data as NotificationRow[]).map(mapNotificationRow));
    setIsLoading(false);
  }, [session]);

  // Bulk-clears the bell badge: every currently-unseen row flips to seen,
  // which also ends its aggregation window (0046) so the next like/comment
  // on that activity starts a fresh row instead of silently reopening this
  // dismissed one.
  const markSeen = useCallback(async () => {
    if (!session) return;
    const { error } = await supabase
      .from('notifications')
      .update({ seen: true })
      .eq('recipient_id', session.user.id)
      .eq('seen', false);
    if (error) {
      console.error('Failed to mark notifications seen', error);
      return;
    }
    setNotifications((current) => current.map((item) => ({ ...item, seen: true })));
  }, [session]);

  const markRead = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      console.error('Failed to mark notification read', error);
      return;
    }
    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      await refetch();
    }
    if (!cancelled) load();
    return () => {
      cancelled = true;
    };
  }, [refetch]);

  const unseenCount = useMemo(() => notifications.filter((item) => !item.seen).length, [notifications]);

  const value = useMemo(
    () => ({ notifications, unseenCount, isLoading, refetch, markSeen, markRead }),
    [notifications, unseenCount, isLoading, refetch, markSeen, markRead],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
