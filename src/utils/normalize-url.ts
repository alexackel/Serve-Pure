// A volunteer typing a website into a plain text field (no https:// prefix,
// e.g. "waspoppin.com" or just "waspoppin") is the common case, not the
// exception. Without a scheme, Linking.openURL treats it as a relative path
// and resolves it against the app bundle instead of the web, which is what
// produced the "Unable to open URL: file:///.../HTTPS/waspoppin" crash.
export function ensureUrlScheme(url: string): string {
  const trimmed = url.trim();
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
