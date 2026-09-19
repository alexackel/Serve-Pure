// Remembers the last address a volunteer entered when creating an event, to
// pre-fill the form next time. Backed by the global `localStorage` this app
// already polyfills on every platform (src/lib/supabase.ts installs
// expo-sqlite/localStorage/install on native; web has it natively) — wrapped
// in try/catch since private-mode/blocked storage should just mean "no
// prefill," never a crash.

export type SavedAddress = { street: string; city: string; state: string; zip: string };

const STORAGE_KEY = 'serve-pure:last-event-address';

export function loadLastAddress(): SavedAddress | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedAddress) : null;
  } catch {
    return null;
  }
}

export function saveLastAddress(address: SavedAddress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(address));
  } catch {
    // Non-fatal — just means no prefill next time.
  }
}
