/**
 * Pure parsing/normalization helpers shared by the lead endpoint and its tests.
 * No runtime dependencies, so these run anywhere (Workers, Node, Vitest).
 */

export interface ParsedName {
  firstName: string;
  lastName: string;
}

export interface ParsedAddress {
  street: string;
  city: string;
  state: string;
  /** ZIP / postal code — named `code` to match the Follow Up Boss schema. */
  code: string;
  /** The full address exactly as the seller typed it, whitespace-collapsed. */
  raw: string;
}

const US_STATES: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', 'district of columbia': 'DC',
  florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID', illinois: 'IL',
  indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA',
  maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN',
  mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK',
  oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI',
  wyoming: 'WY',
};

const STATE_ABBRS = new Set(Object.values(US_STATES));

/** Collapse runs of whitespace and trim. */
export function collapse(value: string): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Split a free-text full name into first/last.
 * A single token becomes the first name with an empty last name; everything
 * after the first token stays together so "Van Der Berg" and "Smith Jr." survive.
 */
export function splitName(full: string): ParsedName {
  const tokens = collapse(full).split(' ').filter(Boolean);
  if (tokens.length === 0) return { firstName: '', lastName: '' };
  if (tokens.length === 1) return { firstName: tokens[0]!, lastName: '' };
  return { firstName: tokens[0]!, lastName: tokens.slice(1).join(' ') };
}

/** Count of digits in a string — the basis for phone validation. */
export function digitsOf(value: string): string {
  return String(value ?? '').replace(/\D/g, '');
}

/**
 * Format a US phone number as (555) 555-5555 so Follow Up Boss stores it
 * consistently. Non-US or unrecognized formats pass through untouched.
 */
export function normalizePhone(value: string): string {
  const raw = collapse(value);
  let digits = digitsOf(raw);
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  if (digits.length !== 10) return raw;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** A phone is usable if it carries at least 10 digits (US) or a leading +. */
export function isValidPhone(value: string): boolean {
  const digits = digitsOf(value);
  if (collapse(value).startsWith('+')) return digits.length >= 8 && digits.length <= 15;
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'));
}

/** Deliberately permissive: one @, a dot in the domain, no whitespace. */
export function isValidEmail(value: string): boolean {
  const email = collapse(value);
  if (!email) return false;
  if (email.length > 254) return false;
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email);
}

/** Match a trailing state (abbreviation or full name) on a fragment. */
function takeTrailingState(fragment: string): { state: string; rest: string } | null {
  const text = collapse(fragment);
  if (!text) return null;

  const abbrMatch = text.match(/(^|[\s,])([A-Za-z]{2})\s*$/);
  if (abbrMatch) {
    const candidate = abbrMatch[2]!.toUpperCase();
    if (STATE_ABBRS.has(candidate)) {
      return { state: candidate, rest: text.slice(0, abbrMatch.index! + abbrMatch[1]!.length).trim() };
    }
  }

  // Full state names, longest first so "West Virginia" beats "Virginia".
  const names = Object.keys(US_STATES).sort((a, b) => b.length - a.length);
  const lower = text.toLowerCase();
  for (const name of names) {
    if (lower === name || lower.endsWith(` ${name}`)) {
      return { state: US_STATES[name]!, rest: text.slice(0, text.length - name.length).trim() };
    }
  }
  return null;
}

/**
 * Best-effort split of a single-line US address into street/city/state/zip.
 *
 * Works from the end of the string (zip, then state, then city) because those
 * pieces are the most reliably shaped. Anything it cannot confidently assign
 * stays in `street`, and `raw` always preserves the original input — so no
 * detail is ever lost on the way to Follow Up Boss.
 */
export function parseAddress(input: string): ParsedAddress {
  const raw = collapse(input).replace(/\s*,\s*/g, ', ').replace(/,\s*$/, '');
  const empty: ParsedAddress = { street: '', city: '', state: '', code: '', raw };
  if (!raw) return empty;

  let parts = raw.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return empty;

  // Drop a trailing country.
  const country = parts[parts.length - 1]!.toLowerCase();
  if (parts.length > 1 && ['usa', 'us', 'u.s.', 'u.s.a.', 'united states'].includes(country)) {
    parts.pop();
  }

  let code = '';
  const zipMatch = parts[parts.length - 1]!.match(/\b(\d{5}(?:-\d{4})?)\s*$/);
  if (zipMatch) {
    code = zipMatch[1]!;
    const rest = parts[parts.length - 1]!.slice(0, zipMatch.index).trim().replace(/,$/, '').trim();
    if (rest) parts[parts.length - 1] = rest;
    else parts.pop();
  }

  let state = '';
  if (parts.length > 0) {
    const found = takeTrailingState(parts[parts.length - 1]!);
    if (found) {
      state = found.state;
      const rest = found.rest.replace(/,$/, '').trim();
      if (rest) parts[parts.length - 1] = rest;
      else parts.pop();
    }
  }

  let city = '';
  let street = '';
  if (parts.length > 1) {
    city = parts.pop()!;
    street = parts.join(', ');
  } else if (parts.length === 1) {
    const only = parts[0]!;
    // A lone fragment starting with a number is a street; otherwise a city.
    if (/^\d/.test(only) || !(state || code)) street = only;
    else city = only;
  }

  return { street, city, state, code, raw };
}
