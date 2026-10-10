// Accepts YYYY-MM-DD only (the format the profile trigger stores). Returns the
// normalized string, or null if it isn't a real calendar date.
export function parseBirthdate(input: string): string | null {
  const trimmed = input.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return trimmed;
}

// True when someone born on `isoDate` is at least `years` old today.
export function isAtLeastAge(isoDate: string, years: number): boolean {
  const today = new Date();
  const cutoff = new Date(Date.UTC(today.getUTCFullYear() - years, today.getUTCMonth(), today.getUTCDate()));
  return new Date(`${isoDate}T00:00:00Z`) <= cutoff;
}
