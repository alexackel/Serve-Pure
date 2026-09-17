const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    // Deno runtime (Supabase Edge Functions) — separate toolchain, not RN/Expo.
    ignores: ['dist/*', 'supabase/functions/**'],
  },
];
