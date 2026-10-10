// US numbers only, for now. The input is always shown as +1(###)-###-####.

// Formats whatever the user has typed so far. Non-digits are dropped, and a
// leading country code 1 is folded into the +1 prefix, so pasting a full number
// also works. US area codes never start with 1, so this can't eat a real digit.
export function formatUsPhone(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('1')) digits = digits.slice(1);
  digits = digits.slice(0, 10);

  if (digits.length === 0) return '+1';

  const area = digits.slice(0, 3);
  const middle = digits.slice(3, 6);
  const last = digits.slice(6, 10);

  let formatted = `+1(${area}`;
  if (area.length === 3) formatted += ')';
  if (middle) formatted += `-${middle}`;
  if (last) formatted += `-${last}`;
  return formatted;
}

// Returns the E.164 form (+1XXXXXXXXXX) that Supabase expects, or null if the
// input isn't a complete 10-digit US number.
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  return digits.length === 10 ? `+1${digits}` : null;
}

export const PHONE_PLACEHOLDER = '+1(###)-###-####';
export const PHONE_ERROR = 'Enter a 10-digit US mobile number.';
