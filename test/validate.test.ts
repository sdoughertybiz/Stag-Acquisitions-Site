import { describe, expect, it } from 'vitest';
import {
  isHoneypotTripped,
  LIMITS,
  resolveLeadType,
  validateLead,
  type RawLead,
} from '../src/lib/validate';

const good: RawLead = {
  firstName: 'Dana',
  lastName: 'Whitfield',
  phone: '(615) 555-1234',
  email: 'dana@example.com',
  address: '123 Main St, Nashville, TN 37205',
  condition: 'Needs work — real repairs needed',
  timeline: '30 days',
  notes: 'Tenant in place through March.',
  smsConsent: 'yes',
};

describe('validateLead', () => {
  it('accepts a complete submission', () => {
    const result = validateLead(good);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.firstName).toBe('Dana');
    expect(result.data.lastName).toBe('Whitfield');
    expect(result.data.smsConsent).toBe(true);
  });

  it('requires a first name', () => {
    const result = validateLead({ ...good, firstName: '' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.firstName).toBeDefined();
  });

  it('falls back to splitting a single name field', () => {
    const result = validateLead({ ...good, firstName: '', lastName: '', name: 'Dana Whitfield' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data).toMatchObject({ firstName: 'Dana', lastName: 'Whitfield' });
  });

  it('requires a phone number', () => {
    const missing = validateLead({ ...good, phone: '' });
    expect(missing.ok).toBe(false);

    const bad = validateLead({ ...good, phone: '555' });
    expect(bad.ok).toBe(false);
    if (bad.ok) return;
    expect(bad.errors.phone).toBeDefined();
  });

  it('requires a property address', () => {
    const result = validateLead({ ...good, address: '   ' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.address).toBeDefined();
  });

  it('allows a missing email but rejects a malformed one', () => {
    expect(validateLead({ ...good, email: '' }).ok).toBe(true);

    const bad = validateLead({ ...good, email: 'not-an-email' });
    expect(bad.ok).toBe(false);
    if (bad.ok) return;
    expect(bad.errors.email).toBeDefined();
  });

  it('does not block on a missing condition or timeline — a partial lead is still a lead', () => {
    const result = validateLead({ ...good, condition: '', timeline: '' });
    expect(result.ok).toBe(true);
  });

  it('reports every problem at once', () => {
    const result = validateLead({ firstName: '', phone: '', address: '' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(['address', 'firstName', 'phone']);
  });

  it('treats several checkbox encodings as consent', () => {
    for (const value of ['yes', 'on', 'true', '1', true]) {
      const result = validateLead({ ...good, smsConsent: value });
      expect(result.ok && result.data.smsConsent, String(value)).toBe(true);
    }
  });

  it('treats a missing checkbox as no consent', () => {
    const result = validateLead({ ...good, smsConsent: undefined });
    expect(result.ok && result.data.smsConsent).toBe(false);
  });

  it('truncates oversized fields instead of failing', () => {
    const result = validateLead({ ...good, notes: 'x'.repeat(5000) });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.notes).toHaveLength(LIMITS.notes);
  });
});

describe('lead type routing', () => {
  const buyBox: RawLead = {
    leadType: 'investor',
    firstName: 'Marcus',
    phone: '(480) 555-9090',
    organization: 'Feld Development',
    assetTypes: 'Land / lots, Teardown / redevelopment',
    targetMarkets: 'Scottsdale, Paradise Valley',
    priceRange: '$1M – $3M',
    scope: 'Teardown and rebuild',
    volume: '6–12 deals a year',
    financing: 'Hard money / bridge',
  };

  it('defaults to a seller lead when no type is given', () => {
    expect(resolveLeadType({})).toBe('seller');
    expect(resolveLeadType({ leadType: 'nonsense' })).toBe('seller');
  });

  it('recognizes the buy-side intake regardless of casing', () => {
    expect(resolveLeadType({ leadType: 'investor' })).toBe('investor');
    expect(resolveLeadType({ leadType: '  Investor ' })).toBe('investor');
  });

  it('keeps every buy-box field', () => {
    const result = validateLead(buyBox);
    expect(result.ok).toBe(true);
    if (!result.ok || result.data.type !== 'investor') throw new Error('expected an investor lead');
    expect(result.data).toMatchObject({
      organization: 'Feld Development',
      assetTypes: 'Land / lots, Teardown / redevelopment',
      targetMarkets: 'Scottsdale, Paradise Valley',
      priceRange: '$1M – $3M',
      scope: 'Teardown and rebuild',
      volume: '6–12 deals a year',
      financing: 'Hard money / bridge',
    });
  });

  it('does not require a property address on the buy side', () => {
    // The seller form gates on address; a buy box has no single property.
    expect(validateLead(buyBox).ok).toBe(true);
    expect(validateLead({ ...buyBox, leadType: 'seller' }).ok).toBe(false);
  });

  it('still requires a name and phone on the buy side', () => {
    const result = validateLead({ ...buyBox, firstName: '', phone: '' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(['firstName', 'phone']);
  });

  it('gives multi-select values room to survive truncation', () => {
    const many = 'Single-family, Small multifamily (2–4), Multifamily (5+), Land / lots';
    const result = validateLead({ ...buyBox, assetTypes: many });
    expect(result.ok).toBe(true);
    if (!result.ok || result.data.type !== 'investor') throw new Error('expected an investor lead');
    expect(result.data.assetTypes).toBe(many);
    expect(LIMITS.multiChoice).toBeGreaterThan(LIMITS.choice);
  });
});

describe('isHoneypotTripped', () => {
  it('is false when the hidden field is empty or absent', () => {
    expect(isHoneypotTripped(good)).toBe(false);
    expect(isHoneypotTripped({ ...good, company: '   ' })).toBe(false);
  });

  it('is true when a bot fills the hidden field', () => {
    expect(isHoneypotTripped({ ...good, company: 'Acme Bots LLC' })).toBe(true);
  });
});
