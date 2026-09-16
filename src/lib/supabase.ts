// Native (iOS/Android) has no built-in `localStorage`, so expo-sqlite provides
// a drop-in shim backed by SQLite. Web already has real browser localStorage —
// see supabase.web.ts, which skips this entirely (expo-sqlite's web/wasm build
// is alpha and needs extra Metro/COOP/COEP config we don't want to take on).
import 'expo-sqlite/localStorage/install';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Supabase's auth refresh loop runs continuously on Android/iOS unless tied to
// app foreground/background state.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
