// Remembers whether the volunteer has already seen the Discovered tab's
// one-time explainer modal. Backed by the same global `localStorage` polyfill
// as last-address.ts — wrapped in try/catch since private-mode/blocked
// storage should just mean "show the explainer again next time," never a
// crash.

const STORAGE_KEY = 'serve-pure:discovered-intro-seen';

export function hasSeenDiscoveredIntro(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markDiscoveredIntroSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // Non-fatal — just means the explainer shows again next visit.
  }
}
