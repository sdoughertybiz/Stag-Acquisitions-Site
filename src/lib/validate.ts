import { collapse, isValidEmail, isValidPhone, splitName } from './parse';

/** Which intake a submission came from. Defaults to `seller`. */
export type LeadType = 'seller' | 'investor';

/** Raw, untrusted values as they arrive from either form. */
export interface RawLead {
  /** Discriminator set by a hidden field on each form. */
  leadType?: string;
  firstName?: string;
  lastName?: string;
  /** Fallback single-field name, supported so the endpoint stays tolerant. */
  name?: string;
  phone?: string;
  email?: string;
  notes?: string;
  smsConsent?: string | boolean;
  /** Honeypot — must stay empty. */
  company?: string;
  pageUrl?: string;

  /* Seller intake */
  address?: string;
  condition?: string;
  timeline?: string;
  /** Set by a market landing page so campaigns are attributable. */
  market?: string;

  /* Buy-side intake */
  organization?: string;
  assetTypes?: string;
  targetMarkets?: string;
  priceRange?: string;
  scope?: string;
  volume?: string;
  financing?: string;
}

/** Fields both intakes share. */
interface CleanBase {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  notes: string;
  smsConsent: boolean;
  pageUrl: string;
}

/** A homeowner asking us to look at a property. */
export interface CleanSellerLead extends CleanBase {
  type: 'seller';
  address: string;
  condition: string;
  timeline: string;
  /** Landing page the submission came from; empty for the generic /offer form. */
  market: string;
}

/** A developer or investor handing us a buy box. */
export interface CleanInvestorLead extends CleanBase {
  type: 'investor';
  organization: string;
  assetTypes: string;
  targetMarkets: string;
  priceRange: string;
  scope: string;
  volume: string;
  financing: string;
}

export type CleanLead = CleanSellerLead | CleanInvestorLead;

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
  /** Multi-select values arrive joined, so this needs more room than `choice`. */
  multiChoice: 300,
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

/** Anything that isn't explicitly the buy-side form is treated as a seller. */
export function resolveLeadType(raw: RawLead): LeadType {
  return collapse(String(raw.leadType ?? '')).toLowerCase() === 'investor' ? 'investor' : 'seller';
}

/**
 * Validate and normalize a submission from either intake.
 *
 * Both forms require a first name and a usable phone number; the seller form
 * additionally requires the property address. Every other field is optional —
 * a partially filled lead is still a lead worth having, and the selects are
 * marked required in the markup rather than gated here.
 */
export function validateLead(raw: RawLead): ValidationResult {
  const type = resolveLeadType(raw);
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
  if (!phoneInput) errors.phone = 'Please enter a phone number so we can reach you.';
  else if (!isValidPhone(phoneInput)) errors.phone = 'That phone number does not look complete.';

  const email = truncate(raw.email, LIMITS.email);
  if (email && !isValidEmail(email)) errors.email = 'That email address does not look right.';

  const address = truncate(raw.address, LIMITS.address);
  if (type === 'seller' && !address) errors.address = 'Please enter the property address.';

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const base: CleanBase = {
    firstName,
    lastName,
    phone: phoneInput,
    email,
    notes: truncate(raw.notes, LIMITS.notes),
    smsConsent: isChecked(raw.smsConsent),
    pageUrl: truncate(raw.pageUrl, LIMITS.pageUrl),
  };

  if (type === 'investor') {
    return {
      ok: true,
      data: {
        ...base,
        type: 'investor',
        organization: truncate(raw.organization, LIMITS.name),
        assetTypes: truncate(raw.assetTypes, LIMITS.multiChoice),
        targetMarkets: truncate(raw.targetMarkets, LIMITS.multiChoice),
        priceRange: truncate(raw.priceRange, LIMITS.choice),
        scope: truncate(raw.scope, LIMITS.choice),
        volume: truncate(raw.volume, LIMITS.choice),
        financing: truncate(raw.financing, LIMITS.choice),
      },
    };
  }

  return {
    ok: true,
    data: {
      ...base,
      type: 'seller',
      address,
      condition: truncate(raw.condition, LIMITS.choice),
      timeline: truncate(raw.timeline, LIMITS.choice),
      market: truncate(raw.market, LIMITS.choice),
    },
  };
}
