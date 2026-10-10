// Mirrors the database rules in migration 0052: 3-20 lowercase letters, numbers
// or underscores, not a reserved word. Uniqueness is checked on the server.
const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

const RESERVED = new Set([
  'admin', 'administrator', 'support', 'help', 'root', 'staff', 'official',
  'serve', 'servepure', 'volunteer', 'organization', 'org', 'api', 'null', 'undefined',
]);

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

export function usernameError(input: string): string | null {
  const value = normalizeUsername(input);
  if (!USERNAME_PATTERN.test(value)) {
    return 'Usernames are 3-20 letters, numbers, or underscores.';
  }
  if (RESERVED.has(value)) {
    return 'That username is reserved. Try another.';
  }
  return null;
}
