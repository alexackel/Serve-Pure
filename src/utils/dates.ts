const MONTH_ABBREVIATIONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_DAY_PATTERN = /^([A-Za-z]{3})\s+(\d{1,2})$/;

// `new Date(string)` only has spec-guaranteed behavior for ISO 8601 — free-form labels
// like "Aug 24" are implementation-defined, and engines can disagree (Hermes, React
// Native's JS engine, returns Invalid Date for shapes V8/browsers accept). Parsing the
// month/day ourselves and building the Date numerically works identically everywhere.
function parseMonthDayLabel(dateLabel: string) {
  const match = MONTH_DAY_PATTERN.exec(dateLabel.trim());
  if (!match) {
    return null;
  }

  const month = MONTH_ABBREVIATIONS.indexOf(match[1]);
  if (month === -1) {
    return null;
  }

  return { month, day: Number(match[2]) };
}

export function parseRecordDate(dateLabel: string, now: Date) {
  const parts = parseMonthDayLabel(dateLabel);
  if (!parts) {
    return new Date(NaN);
  }

  const parsed = new Date(now.getFullYear(), parts.month, parts.day);
  if (parsed.getTime() > now.getTime()) {
    parsed.setFullYear(parsed.getFullYear() - 1);
  }
  return parsed;
}

const EVENT_TIME_PATTERN = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;
const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 30 * 6;

// Event dates are near-future display labels (e.g. 'Sep 6'), so the year guess only
// rolls forward — the opposite direction from parseRecordDate's past-oriented rollback.
// Missing startTime is left at midnight, which makes the 24-hour cancellation check
// trigger more readily rather than less.
export function parseEventDateTime(dateLabel: string, timeLabel: string | undefined, now: Date) {
  const parts = parseMonthDayLabel(dateLabel);
  const parsed = parts ? new Date(now.getFullYear(), parts.month, parts.day) : new Date(NaN);
  if (now.getTime() - parsed.getTime() > SIX_MONTHS_MS) {
    parsed.setFullYear(parsed.getFullYear() + 1);
  }

  const match = timeLabel ? EVENT_TIME_PATTERN.exec(timeLabel.trim()) : null;
  if (match) {
    const rawHours = Number(match[1]);
    const minutes = Number(match[2]);
    const isPM = match[3].toUpperCase() === 'PM';
    const hours = (rawHours % 12) + (isPM ? 12 : 0);
    parsed.setHours(hours, minutes, 0, 0);
  }

  return parsed;
}

export function parseDateInput(text: string): Date | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) {
    return null;
  }

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

export function formatDateInput(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}/${date.getFullYear()}`;
}

export function formatShortDate(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function startOfDay(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function endOfDay(date: Date) {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}
