import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  clearDeviceAccounts,
  loadDeviceAccounts,
  saveDeviceAccount,
  type AccountType,
  type DeviceAccount,
} from '@/lib/device-accounts';
import { createTemporaryAuthClient, supabase } from '@/lib/supabase';

type Profile = { accountType: AccountType };

export type PersonalSignUp = {
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  birthdate: string;
  school: string;
  termsAcceptedAt: string;
};

export type OrganizationSignUp = {
  email: string;
  password: string;
  username: string;
  phone: string;
  birthdate: string;
  organizationName: string;
  organizationType: string;
  website: string;
  facebookUrl: string;
  is501c3: boolean;
  ein: string;
  address: string;
  managerName: string;
  managerTitle: string;
  termsAcceptedAt: string;
};

type SignUpResult = { error: string | null; needsEmailConfirmation: boolean };

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  activeAccountType: AccountType | null;
  deviceAccounts: DeviceAccount[];
  activeUserId: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  addAccount: (email: string, password: string) => Promise<{ error: string | null }>;
  switchAccount: (userId: string) => Promise<{ error: string | null }>;
  signUpPersonal: (input: PersonalSignUp) => Promise<SignUpResult>;
  signUpOrganization: (input: OrganizationSignUp) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Maps Supabase and Postgres errors to copy a volunteer can act on.
function friendlyError(message: string): string {
  if (message.includes('phone_already_registered')) {
    return 'That phone number is already linked to another account of this type.';
  }
  if (message.includes('profiles_username_unique') || /duplicate key.*username/i.test(message)) {
    return 'That username is taken. Try another.';
  }
  if (message.includes('organization_manager_must_be_18')) {
    return 'Organization accounts must be set up by someone 18 or older.';
  }
  if (message.includes('username_change_too_soon')) {
    return 'You can change your username once every 30 days.';
  }
  return message;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [deviceAccounts, setDeviceAccounts] = useState<DeviceAccount[]>(() => loadDeviceAccounts());

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  // Reload the profile when the user changes.
  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    let cancelled = false;
    setProfileLoading(true);
    supabase
      .from('profiles')
      .select('account_type')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          console.error('Failed to load profile', error);
          setProfile(null);
        } else {
          setProfile({ accountType: data.account_type as AccountType });
        }
        setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Remember this login's tokens on the device, so the switcher can return to it.
  useEffect(() => {
    if (!session || !profile) return;
    setDeviceAccounts(
      saveDeviceAccount({
        userId: session.user.id,
        email: session.user.email ?? '',
        accountType: profile.accountType,
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      }),
    );
  }, [session, profile]);

  const isLoading = sessionLoading || (!!userId && profileLoading);
  const activeAccountType = profile?.accountType ?? null;

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? friendlyError(error.message) : null };
  }, []);

  // Adds an existing login to this device and makes it the active one.
  const addAccount = useCallback(async (email: string, password: string) => {
    const temp = createTemporaryAuthClient();
    const { data, error } = await temp.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      return { error: error ? friendlyError(error.message) : 'Could not sign in.' };
    }
    const { data: row } = await temp.from('profiles').select('account_type').eq('id', data.session.user.id).single();
    const accountType = (row?.account_type ?? 'personal') as AccountType;
    setDeviceAccounts(
      saveDeviceAccount({
        userId: data.session.user.id,
        email: data.session.user.email ?? email,
        accountType,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      }),
    );
    const { error: setError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    return { error: setError ? friendlyError(setError.message) : null };
  }, []);

  const switchAccount = useCallback(
    async (targetUserId: string) => {
      const account = deviceAccounts.find((existing) => existing.userId === targetUserId);
      if (!account) return { error: 'That account is no longer on this device. Sign in to it again.' };
      const { error } = await supabase.auth.setSession({
        access_token: account.accessToken,
        refresh_token: account.refreshToken,
      });
      return { error: error ? friendlyError(error.message) : null };
    },
    [deviceAccounts],
  );

  const signUpPersonal = useCallback(async (input: PersonalSignUp): Promise<SignUpResult> => {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          account_type: 'personal',
          username: input.username,
          full_name: `${input.firstName} ${input.lastName}`.trim(),
          phone: input.phone,
          birthdate: input.birthdate,
          school: input.school,
          terms_accepted_at: input.termsAcceptedAt,
        },
      },
    });
    // Without a session the email must be confirmed first; the phone gate runs
    // after that first sign-in.
    return {
      error: error ? friendlyError(error.message) : null,
      needsEmailConfirmation: !error && !data.session,
    };
  }, []);

  // Creates an organization login without replacing the current session, then
  // makes it active. Used from the sign-up screen and from Settings.
  const signUpOrganization = useCallback(async (input: OrganizationSignUp): Promise<SignUpResult> => {
    const temp = createTemporaryAuthClient();
    const { data, error } = await temp.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          account_type: 'organization',
          username: input.username,
          full_name: input.managerName,
          phone: input.phone,
          birthdate: input.birthdate,
          terms_accepted_at: input.termsAcceptedAt,
          organization_name: input.organizationName,
          organization_type: input.organizationType,
          website: input.website,
          facebook_url: input.facebookUrl,
          is_501c3: input.is501c3,
          ein: input.ein,
          address: input.address,
          manager_name: input.managerName,
          manager_title: input.managerTitle,
        },
      },
    });
    if (error) {
      return { error: friendlyError(error.message), needsEmailConfirmation: false };
    }
    if (!data.session) {
      return { error: null, needsEmailConfirmation: true };
    }
    setDeviceAccounts(
      saveDeviceAccount({
        userId: data.session.user.id,
        email: data.session.user.email ?? input.email,
        accountType: 'organization',
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      }),
    );
    const { error: setError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    return { error: setError ? friendlyError(setError.message) : null, needsEmailConfirmation: false };
  }, []);

  const signOut = useCallback(async () => {
    clearDeviceAccounts();
    setDeviceAccounts([]);
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({
      session,
      isLoading,
      activeAccountType,
      deviceAccounts,
      activeUserId: userId,
      signIn,
      addAccount,
      switchAccount,
      signUpPersonal,
      signUpOrganization,
      signOut,
    }),
    [
      session,
      isLoading,
      activeAccountType,
      deviceAccounts,
      userId,
      signIn,
      addAccount,
      switchAccount,
      signUpPersonal,
      signUpOrganization,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSession() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useSession must be used within an AuthProvider');
  }
  return context;
}
