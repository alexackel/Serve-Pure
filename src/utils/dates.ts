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

// Parses a "9:00 AM" style time-of-day input, applying it onto `date`'s
// year/month/day. Shares EVENT_TIME_PATTERN's shape (see parseEventDateTime
// above) since it's the same label format events already render/store.
export function parseTimeInput(date: Date, text: string): Date | null {
  const match = EVENT_TIME_PATTERN.exec(text.trim());
  if (!match) {
    return null;
  }

  const rawHours = Number(match[1]);
  const minutes = Number(match[2]);
  const isPM = match[3].toUpperCase() === 'PM';
  const hours = (rawHours % 12) + (isPM ? 12 : 0);

  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
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

// The three independent columns TimePickerField's picker scrolls: hour
// (12-hour clock), minute (15-minute increments), and AM/PM.
export function generateHourOptions(): number[] {
  return Array.from({ length: 12 }, (_, i) => i + 1);
}

export function generateMinuteOptions(): string[] {
  return ['00', '15', '30', '45'];
}

export const PERIOD_OPTIONS = ['AM', 'PM'] as const;
export type Period = (typeof PERIOD_OPTIONS)[number];

// Splits a "9:00 AM" label into TimePickerField's three column values, so
// reopening the picker (or seeding a minTime comparison) can start from
// the label already stored on the event rather than re-deriving it.
export function parseTimeLabel(label: string): { hour: number; minute: string; period: Period } | null {
  const match = EVENT_TIME_PATTERN.exec(label.trim());
  if (!match) {
    return null;
  }
  return { hour: Number(match[1]), minute: match[2], period: match[3].toUpperCase() as Period };
}

export function composeTimeLabel(hour: number, minute: string, period: Period): string {
  return `${hour}:${minute} ${period}`;
}

// Parses the same "9:00 AM" label format as EVENT_TIME_PATTERN into
// minutes-of-day, so TimePickerField can compare a pending selection
// against a minimum (e.g. an event's start time) without touching Date.
export function timeLabelToMinutes(label: string): number | null {
  const match = EVENT_TIME_PATTERN.exec(label.trim());
  if (!match) {
    return null;
  }
  const rawHours = Number(match[1]);
  const minutes = Number(match[2]);
  const isPM = match[3].toUpperCase() === 'PM';
  const hours = (rawHours % 12) + (isPM ? 12 : 0);
  return hours * 60 + minutes;
}

export function endOfDay(date: Date) {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}
