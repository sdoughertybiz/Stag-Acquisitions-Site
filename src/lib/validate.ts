import { collapse, isValidEmail, isValidPhone, splitName } from './parse';

/** Raw, untrusted values as they arrive from the form. */
export interface RawLead {
  firstName?: string;
  lastName?: string;
  /** Fallback single-field name, supported so the endpoint stays tolerant. */
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  condition?: string;
  timeline?: string;
  notes?: string;
  smsConsent?: string | boolean;
  /** Honeypot — must stay empty. */
  company?: string;
  pageUrl?: string;
}

/** Validated, normalized values safe to hand to the Follow Up Boss client. */
export interface CleanLead {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  condition: string;
  timeline: string;
  notes: string;
  smsConsent: boolean;
  pageUrl: string;
}

export type ValidationResult =
  | { ok: true; data: CleanLead }
  | { ok: false; errors: Record<string, string> };

/** Upper bounds so a single request can't be used to push junk into the CRM. */
export const LIMITS = {
  name: 80,
  phone: 40,
  email: 254,
  address: 250,
  choice: 80,
  notes: 2000,
  pageUrl: 500,
} as const;

function truncate(value: unknown, max: number): string {
  return collapse(String(value ?? '')).slice(0, max);
}

function isChecked(value: string | boolean | undefined): boolean {
  if (typeof value === 'boolean') return value;
  const normalized = collapse(String(value ?? '')).toLowerCase();
  return ['yes', 'on', 'true', '1'].includes(normalized);
}

/** True when the hidden honeypot field was filled in — i.e. a bot submitted. */
export function isHoneypotTripped(raw: RawLead): boolean {
  return collapse(String(raw.company ?? '')).length > 0;
}

/**
 * Validate and normalize a submission.
 *
 * Only first name, phone, and property address are enforced. Condition and
 * timeline are marked required in the markup for completeness but are not
 * gated here — a partially filled lead is still a lead worth having.
 */
export function validateLead(raw: RawLead): ValidationResult {
  const errors: Record<string, string> = {};

  let firstName = truncate(raw.firstName, LIMITS.name);
  let lastName = truncate(raw.lastName, LIMITS.name);
  if (!firstName && raw.name) {
    const split = splitName(truncate(raw.name, LIMITS.name * 2));
    firstName = split.firstName;
    lastName = lastName || split.lastName;
  }
  if (!firstName) errors.firstName = 'Please enter your first name.';

  const phoneInput = truncate(raw.phone, LIMITS.phone);
  if (!phoneInput) errors.phone = 'Please enter a phone number so we can call you with a number.';
  else if (!isValidPhone(phoneInput)) errors.phone = 'That phone number does not look complete.';

  const email = truncate(raw.email, LIMITS.email);
  if (email && !isValidEmail(email)) errors.email = 'That email address does not look right.';

  const address = truncate(raw.address, LIMITS.address);
  if (!address) errors.address = 'Please enter the property address.';

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      firstName,
      lastName,
      phone: phoneInput,
      email,
      address,
      condition: truncate(raw.condition, LIMITS.choice),
      timeline: truncate(raw.timeline, LIMITS.choice),
      notes: truncate(raw.notes, LIMITS.notes),
      smsConsent: isChecked(raw.smsConsent),
      pageUrl: truncate(raw.pageUrl, LIMITS.pageUrl),
    },
  };
}
