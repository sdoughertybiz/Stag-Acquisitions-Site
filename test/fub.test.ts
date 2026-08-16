import { describe, expect, it, vi } from 'vitest';
import {
  basicAuthHeader,
  buildEventPayload,
  buildHeaders,
  buildMessage,
  buildTags,
  FUB_EVENTS_URL,
  FUB_EVENT_TYPE,
  FUB_INVESTOR_EVENT_TYPE,
  sendLeadToFub,
  type FubConfig,
} from '../src/lib/fub';
import type { CleanInvestorLead, CleanSellerLead } from '../src/lib/validate';

const config: FubConfig = {
  apiKey: 'fka_test_key',
  source: 'StagAcquisitions.com',
  system: 'StagAcqSite',
  assignedTo: 'Stephen Dougherty',
  assignedUserId: 1,
};

const lead: CleanSellerLead = {
  type: 'seller',
  firstName: 'Dana',
  lastName: 'Whitfield',
  phone: '615-555-1234',
  email: 'dana@example.com',
  address: '123 Main St, Nashville, TN 37205',
  condition: 'Needs work — real repairs needed',
  timeline: '30 days',
  notes: 'Tenant in place through March.',
  smsConsent: true,
  pageUrl: 'https://stagacquisitions.com/offer',
  market: '',
};

const investorLead: CleanInvestorLead = {
  type: 'investor',
  firstName: 'Marcus',
  lastName: 'Feld',
  phone: '480-555-9090',
  email: 'marcus@example.com',
  organization: 'Feld Development',
  assetTypes: 'Teardown / redevelopment, Land / lots',
  targetMarkets: 'Scottsdale, Paradise Valley',
  priceRange: '$1M – $3M',
  scope: 'Teardown and rebuild',
  volume: '6–12 deals a year',
  financing: 'Hard money / bridge',
  notes: 'Prefers corner lots over 12,000 sq ft.',
  smsConsent: false,
  pageUrl: 'https://stagacquisitions.com/investors',
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('buildEventPayload', () => {
  const payload = buildEventPayload(lead, config);

  it('uses the Seller Inquiry event type', () => {
    expect(payload.type).toBe(FUB_EVENT_TYPE);
    expect(FUB_EVENT_TYPE).toBe('Seller Inquiry');
  });

  it('carries the configured source and system', () => {
    expect(payload.source).toBe('StagAcquisitions.com');
    expect(payload.system).toBe('StagAcqSite');
    expect(payload.person.source).toBe('StagAcquisitions.com');
  });

  it('assigns the lead to Stephen Dougherty by name and by id', () => {
    expect(payload.person.assignedTo).toBe('Stephen Dougherty');
    expect(payload.person.assignedUserId).toBe(1);
  });

  it('splits the seller name onto the person', () => {
    expect(payload.person.firstName).toBe('Dana');
    expect(payload.person.lastName).toBe('Whitfield');
  });

  it('normalizes the phone number into the phones array', () => {
    expect(payload.person.phones).toEqual([{ value: '(615) 555-1234', type: 'mobile' }]);
  });

  it('puts the email in the emails array', () => {
    expect(payload.person.emails).toEqual([{ value: 'dana@example.com', type: 'home' }]);
  });

  it('parses the property address into the person address', () => {
    expect(payload.person.addresses?.[0]).toMatchObject({
      type: 'home',
      street: '123 Main St',
      city: 'Nashville',
      state: 'TN',
      code: '37205',
      country: 'US',
    });
  });

  it('mirrors the address onto the property object', () => {
    expect(payload.property).toMatchObject({
      street: '123 Main St',
      city: 'Nashville',
      state: 'TN',
      code: '37205',
    });
  });

  it('records the submitting page as the source url', () => {
    expect(payload.person.sourceUrl).toBe('https://stagacquisitions.com/offer');
  });

  it('omits optional keys rather than sending empty values', () => {
    const bare = buildEventPayload(
      { ...lead, lastName: '', email: '', pageUrl: '' },
      { ...config, assignedUserId: undefined },
    );
    expect(bare.person).not.toHaveProperty('lastName');
    expect(bare.person).not.toHaveProperty('emails');
    expect(bare.person).not.toHaveProperty('sourceUrl');
    expect(bare.person).not.toHaveProperty('assignedUserId');
    // The assignee name is never optional.
    expect(bare.person.assignedTo).toBe('Stephen Dougherty');
  });

  it('falls back to the raw address when it cannot be parsed', () => {
    const messy = buildEventPayload({ ...lead, address: 'the blue house on the corner' }, config);
    expect(messy.person.addresses?.[0]?.street).toBe('the blue house on the corner');
    expect(messy.property?.street).toBe('the blue house on the corner');
  });

  it('serializes to valid JSON', () => {
    expect(() => JSON.parse(JSON.stringify(payload))).not.toThrow();
  });
});

describe('buildMessage', () => {
  it('summarizes the inquiry for the FUB timeline', () => {
    const message = buildMessage(lead);
    expect(message).toContain('Property: 123 Main St, Nashville, TN 37205');
    expect(message).toContain('Condition: Needs work — real repairs needed');
    expect(message).toContain('Timeline: 30 days');
    expect(message).toContain('SMS consent: Yes');
    expect(message).toContain('Notes: Tenant in place through March.');
  });

  it('records the campaign on the timeline', () => {
    expect(buildMessage({ ...lead, market: 'Scottsdale, AZ' })).toContain('Campaign: Scottsdale, AZ');
    expect(buildMessage(lead)).not.toContain('Campaign:');
  });

  it('records a declined SMS consent explicitly', () => {
    expect(buildMessage({ ...lead, smsConsent: false })).toContain('SMS consent: No');
  });

  it('skips empty optional lines', () => {
    const message = buildMessage({ ...lead, condition: '', timeline: '', notes: '' });
    expect(message).not.toContain('Condition:');
    expect(message).not.toContain('Timeline:');
    expect(message).not.toContain('Notes:');
  });
});

describe('buildMessage — buy-box submissions', () => {
  it('summarizes the criteria for the FUB timeline', () => {
    const message = buildMessage(investorLead);
    expect(message).toContain('Buy box submission');
    expect(message).toContain('Company: Feld Development');
    expect(message).toContain('Asset types: Teardown / redevelopment, Land / lots');
    expect(message).toContain('Target markets: Scottsdale, Paradise Valley');
    expect(message).toContain('Price range: $1M – $3M');
    expect(message).toContain('Scope: Teardown and rebuild');
    expect(message).toContain('Volume: 6–12 deals a year');
    expect(message).toContain('Financing: Hard money / bridge');
    expect(message).toContain('SMS consent: No');
  });

  it('never labels a buy-box submission as a property', () => {
    expect(buildMessage(investorLead)).not.toContain('Property:');
  });

  it('skips empty optional lines', () => {
    const sparse = buildMessage({
      ...investorLead,
      organization: '',
      assetTypes: '',
      targetMarkets: '',
      priceRange: '',
      scope: '',
      volume: '',
      financing: '',
      notes: '',
    });
    expect(sparse).toContain('Buy box submission');
    for (const label of ['Company:', 'Asset types:', 'Price range:', 'Notes:']) {
      expect(sparse, label).not.toContain(label);
    }
  });
});

describe('buildEventPayload — buy-box submissions', () => {
  const payload = buildEventPayload(investorLead, config);

  it('uses the buy-side event type', () => {
    expect(payload.type).toBe(FUB_INVESTOR_EVENT_TYPE);
    expect(payload.type).not.toBe(FUB_EVENT_TYPE);
  });

  it('carries no property or address, since a buy box has neither', () => {
    expect(payload.property).toBeUndefined();
    expect(payload.person.addresses).toBeUndefined();
  });

  it('still routes to the assignee with contact details intact', () => {
    expect(payload.person.assignedTo).toBe('Stephen Dougherty');
    expect(payload.person.phones?.[0]?.value).toBe('(480) 555-9090');
    expect(payload.person.emails?.[0]?.value).toBe('marcus@example.com');
  });

  it('serializes to valid JSON', () => {
    expect(() => JSON.parse(JSON.stringify(payload))).not.toThrow();
  });
});

describe('buildTags', () => {
  it('always tags website seller leads', () => {
    expect(buildTags({ ...lead, smsConsent: false })).toEqual(['Website Lead', 'Seller']);
  });

  it('tags the market when the lead came from a landing page', () => {
    // This tag is what makes a mail campaign measurable in Follow Up Boss.
    const tags = buildTags({ ...lead, market: 'South Nashville, TN' });
    expect(tags).toContain('South Nashville, TN');
    expect(tags).toContain('Seller');
  });

  it('adds no market tag for the generic seller form', () => {
    expect(buildTags(lead)).toEqual(['Website Lead', 'Seller', 'SMS Consent']);
  });

  it('tags buy-side leads as investors, so the two sides stay filterable', () => {
    expect(buildTags(investorLead)).toEqual(['Website Lead', 'Investor']);
  });

  it('adds an SMS consent tag when consent was given', () => {
    expect(buildTags(lead)).toContain('SMS Consent');
    expect(buildTags({ ...investorLead, smsConsent: true })).toContain('SMS Consent');
  });
});

describe('auth headers', () => {
  it('sends the API key as the Basic username with an empty password', () => {
    expect(basicAuthHeader('fka_test_key')).toBe(`Basic ${btoa('fka_test_key:')}`);
  });

  it('omits the X-System headers when no system key is registered', () => {
    const headers = buildHeaders(config);
    expect(headers['X-System']).toBeUndefined();
    expect(headers['X-System-Key']).toBeUndefined();
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('sends the X-System headers when a system key is configured', () => {
    const headers = buildHeaders({ ...config, systemKey: 'sys_key_123' });
    expect(headers['X-System']).toBe('StagAcqSite');
    expect(headers['X-System-Key']).toBe('sys_key_123');
  });
});

describe('sendLeadToFub', () => {
  it('POSTs the payload to the events endpoint', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(201, { id: 42 }));
    await sendLeadToFub(lead, config, fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(FUB_EVENTS_URL);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      `Basic ${btoa('fka_test_key:')}`,
    );

    const body = JSON.parse(init.body as string);
    expect(body.person.assignedTo).toBe('Stephen Dougherty');
    expect(body.person.assignedUserId).toBe(1);
    expect(body.type).toBe('Seller Inquiry');
  });

  it('treats 201 as created and returns the person id', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(201, { id: 42 }));
    const result = await sendLeadToFub(lead, config, fetchMock as unknown as typeof fetch);
    expect(result).toEqual({ ok: true, status: 201, personId: 42 });
  });

  it('treats 200 as a matched existing person', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, { person: { id: 7 } }));
    const result = await sendLeadToFub(lead, config, fetchMock as unknown as typeof fetch);
    expect(result).toEqual({ ok: true, status: 200, personId: 7 });
  });

  it('treats 204 (archived lead flow) as delivered', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    const result = await sendLeadToFub(lead, config, fetchMock as unknown as typeof fetch);
    expect(result).toEqual({ ok: true, status: 204 });
  });

  it('still succeeds when a 2xx body is unparseable', async () => {
    const fetchMock = vi.fn(async () => new Response('not json', { status: 200 }));
    const result = await sendLeadToFub(lead, config, fetchMock as unknown as typeof fetch);
    expect(result.ok).toBe(true);
  });

  it('reports an API error without leaking the key', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(401, { errorMessage: 'Unauthorized' }));
    const result = await sendLeadToFub(lead, config, fetchMock as unknown as typeof fetch);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(401);
    expect(result.error).not.toContain('fka_test_key');
  });

  it('reports a network failure without throwing', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('connection reset');
    });
    const result = await sendLeadToFub(lead, config, fetchMock as unknown as typeof fetch);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(0);
    expect(result.error).toContain('connection reset');
    expect(result.error).not.toContain('fka_test_key');
  });
});
