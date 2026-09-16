// Web build of the Supabase client: runs in a real browser, which already has
// a native `localStorage`, so unlike supabase.ts (native) this deliberately
// skips expo-sqlite's localStorage shim (its web/wasm build is alpha and needs
// extra Metro + COOP/COEP config we don't want to take on for this).
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// This module also loads during Expo Router's static server-render pass
// (app.json has web.output: "static"), where `window` doesn't exist yet.
// Referencing window.localStorage directly at module scope would crash that
// pass, so this only touches `window` lazily, inside calls that only ever
// happen client-side (triggered by supabase-js's own session persistence).
const webStorage = {
  getItem: (key: string) => (typeof window === 'undefined' ? null : window.localStorage.getItem(key)),
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: webStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// AppState's web implementation reads document visibility, which (like
// localStorage above) doesn't exist during the static server-render pass.
if (typeof window !== 'undefined') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
