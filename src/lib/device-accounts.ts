// Logins signed into on this device, so the account switcher can change
// between them without asking for a password again. Stored in the same
// key-value store Supabase uses for its session (localStorage on web, the
// SQLite shim on native). Cleared on sign-out. Not synced across devices.
import '@/lib/supabase';

export type AccountType = 'personal' | 'organization';

export type DeviceAccount = {
  userId: string;
  email: string;
  accountType: AccountType;
  accessToken: string;
  refreshToken: string;
};

const STORAGE_KEY = 'serve-pure.device-accounts';

export function loadDeviceAccounts(): DeviceAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DeviceAccount[]) : [];
  } catch {
    // Storage can be unavailable (private windows, blocked site data).
    return [];
  }
}

export function saveDeviceAccount(account: DeviceAccount): DeviceAccount[] {
  const others = loadDeviceAccounts().filter((existing) => existing.userId !== account.userId);
  const next = [...others, account];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Non-fatal: the active session still works, it just isn't remembered.
  }
  return next;
}

export function clearDeviceAccounts(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}
