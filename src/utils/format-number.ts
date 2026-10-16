// Abbreviates a count for dense KPI/axis display: 1200 -> "1.2K", 2_500_000 -> "2.5M".
export function abbreviateNumber(value: number): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (abs < 1000) return sign + (Number.isInteger(abs) ? String(abs) : abs.toFixed(1));
  if (abs < 1_000_000) return `${sign}${trimTrailingZero(abs / 1000)}K`;
  return `${sign}${trimTrailingZero(abs / 1_000_000)}M`;
}

function trimTrailingZero(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
}

export function formatCurrencyAbbreviated(value: number): string {
  return `$${abbreviateNumber(value)}`;
}

export function formatPercent(value: number | null, fractionDigits = 0): string {
  if (value === null) return '—';
  return `${value.toFixed(fractionDigits)}%`;
}

export type SignedDelta = {
  direction: 'up' | 'down' | 'flat';
  magnitude: string; // abbreviated, unsigned (e.g. "12%", "1.2K")
};

// Magnitude/direction only — "is this good or bad" (e.g. down is good for
// Pending Verifications) is a per-KPI judgment the caller makes, not this util.
export function formatSignedDelta(current: number, previous: number): SignedDelta {
  if (previous === 0) {
    if (current === 0) return { direction: 'flat', magnitude: '0%' };
    return { direction: 'up', magnitude: 'new' };
  }
  const change = ((current - previous) / previous) * 100;
  if (Math.abs(change) < 0.5) return { direction: 'flat', magnitude: '0%' };
  return { direction: change > 0 ? 'up' : 'down', magnitude: `${Math.abs(Math.round(change))}%` };
}
