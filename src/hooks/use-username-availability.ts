import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { normalizeUsername, usernameError } from '@/utils/username';

export type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

// Checks availability after the user pauses typing. The server is the source of
// truth at submit time; this only gives early feedback.
export function useUsernameAvailability(username: string): UsernameStatus {
  const [status, setStatus] = useState<UsernameStatus>('idle');

  useEffect(() => {
    const value = normalizeUsername(username);
    if (!value) {
      setStatus('idle');
      return;
    }
    if (usernameError(value)) {
      setStatus('invalid');
      return;
    }

    let cancelled = false;
    setStatus('checking');
    const timer = setTimeout(async () => {
      const { data, error } = await supabase.rpc('check_username_available', { p_username: value });
      if (cancelled) return;
      if (error) {
        setStatus('idle');
      } else {
        setStatus(data ? 'available' : 'taken');
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username]);

  return status;
}

export function usernameStatusMessage(status: UsernameStatus): string | undefined {
  if (status === 'available') return 'Available';
  if (status === 'taken') return 'That username is taken.';
  if (status === 'checking') return 'Checking…';
  return undefined;
}
