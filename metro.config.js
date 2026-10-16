// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// @tanstack/react-query's package.json "exports" map only lists "." (no
// subpath wildcard), but its own ESM entry internally imports sibling files
// via relative paths (e.g. "./useQuery.js" from "./index.js"). Node.js never
// applies a package's "exports" map to that package's own internal relative
// imports — only to imports from outside the package — but Metro's
// unstable_enablePackageExports (on by default since Expo SDK 53) does, so
// it refuses to resolve those internal imports and bundling fails. Disabling
// it falls back to the "main"/"module"/"react-native" package.json fields,
// which is what every other dependency in this app already resolves through.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
