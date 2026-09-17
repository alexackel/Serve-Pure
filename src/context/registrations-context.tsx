import type { PostgrestError } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useSession } from '@/context/auth-context';
import { EVENT_SELECT, mapEventRow, type EventRow } from '@/data/events';
import type { EventDetail } from '@/data/mock-events';
import { supabase } from '@/lib/supabase';

const REGISTRATION_SELECT = `id, event_id, status, registered_at, penalized, events(${EVENT_SELECT})`;

type RegistrationStatus = 'pending_confirmation' | 'confirmed' | 'cancelled';

type RegistrationRow = {
  id: string;
  event_id: string;
  status: RegistrationStatus;
  registered_at: string;
  penalized: boolean;
  events: EventRow;
};

export type RegistrationWithEvent = {
  id: string;
  eventId: string;
  status: RegistrationStatus;
  registeredAt: string;
  penalized: boolean;
  event: EventDetail;
};

function mapRegistrationRow(row: RegistrationRow): RegistrationWithEvent {
  return {
    id: row.id,
    eventId: row.event_id,
    status: row.status,
    registeredAt: row.registered_at,
    penalized: row.penalized,
    event: mapEventRow(row.events),
  };
}

// Postgres errors from the registration triggers (self-dealing block, minor/
// guardian gate) surface as raw exception text — translate the ones a
// volunteer can actually hit into something readable.
function friendlyRegistrationError(error: PostgrestError): string {
  if (error.code === '23514' || error.message.includes('self_dealing_violation')) {
    return "You can't register for an event created by you or your organization.";
  }
  if (error.message.includes('is a minor with no guardian on file')) {
    return 'Guardian info is required before you can register for events. Please add a guardian in your profile.';
  }
  if (error.code === '23505') {
    return "You're already registered for this event.";
  }
  return error.message;
}

type RegistrationsContextValue = {
  registrations: RegistrationWithEvent[];
  isLoading: boolean;
  isRegistered: (eventId: string) => boolean;
  register: (eventId: string) => Promise<{ error: string | null }>;
  unregister: (eventId: string) => Promise<{ error: string | null }>;
};

const RegistrationsContext = createContext<RegistrationsContextValue | null>(null);

export function RegistrationsProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const [registrations, setRegistrations] = useState<RegistrationWithEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!session) {
        if (!cancelled) {
          setRegistrations([]);
          setIsLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from('registrations')
        .select(REGISTRATION_SELECT)
        .eq('user_id', session.user.id)
        .order('registered_at', { ascending: false });

      if (cancelled) return;
      if (error) {
        console.error('Failed to load registrations', error);
      } else {
        setRegistrations(((data ?? []) as unknown as RegistrationRow[]).map(mapRegistrationRow));
      }
      setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const register = useCallback(
    async (eventId: string) => {
      if (!session) {
        return { error: 'You must be signed in to register.' };
      }

      const { data, error } = await supabase
        .from('registrations')
        .insert({ event_id: eventId, user_id: session.user.id })
        .select(REGISTRATION_SELECT)
        .single();

      if (error) {
        // A 23505 here means a row for (event_id, user_id) already exists —
        // if it's a previously cancelled registration, revive it instead of
        // reporting a false "already registered" (see uq_registrations_active,
        // 0014_fix_registration_rejoin_and_visibility.sql).
        if (error.code === '23505') {
          const { data: revived, error: reviveError } = await supabase
            .from('registrations')
            .update({ status: 'pending_confirmation' })
            .eq('event_id', eventId)
            .eq('user_id', session.user.id)
            .eq('status', 'cancelled')
            .select(REGISTRATION_SELECT)
            .single();

          if (!reviveError && revived) {
            const mapped = mapRegistrationRow(revived as unknown as RegistrationRow);
            setRegistrations((current) => [mapped, ...current.filter((registration) => registration.id !== mapped.id)]);
            return { error: null };
          }
        }
        return { error: friendlyRegistrationError(error) };
      }

      setRegistrations((current) => [mapRegistrationRow(data as unknown as RegistrationRow), ...current]);
      return { error: null };
    },
    [session],
  );

  const unregister = useCallback(
    async (eventId: string) => {
      if (!session) {
        return { error: 'You must be signed in to manage registrations.' };
      }

      const existing = registrations.find((registration) => registration.eventId === eventId && registration.status !== 'cancelled');
      if (!existing) {
        return { error: null };
      }

      const { data, error } = await supabase
        .from('registrations')
        .update({ status: 'cancelled', cancelled_by_type: 'volunteer', cancelled_by_user_id: session.user.id })
        .eq('id', existing.id)
        .select(REGISTRATION_SELECT)
        .single();

      if (error) {
        return { error: error.message };
      }

      const updated = mapRegistrationRow(data as unknown as RegistrationRow);
      setRegistrations((current) => current.map((registration) => (registration.id === updated.id ? updated : registration)));
      return { error: null };
    },
    [session, registrations],
  );

  const isRegistered = useCallback(
    (eventId: string) => registrations.some((registration) => registration.eventId === eventId && registration.status !== 'cancelled'),
    [registrations],
  );

  const value = useMemo(
    () => ({ registrations, isLoading, isRegistered, register, unregister }),
    [registrations, isLoading, isRegistered, register, unregister],
  );

  return <RegistrationsContext.Provider value={value}>{children}</RegistrationsContext.Provider>;
}

export function useRegistrations() {
  const context = useContext(RegistrationsContext);
  if (!context) {
    throw new Error('useRegistrations must be used within a RegistrationsProvider');
  }
  return context;
}
