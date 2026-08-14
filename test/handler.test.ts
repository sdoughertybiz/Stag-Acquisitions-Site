import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CONTACT_FALLBACK, handleLeadRequest } from '../src/lib/handler';
import type { LeadEnv } from '../src/lib/env';

const env: LeadEnv = {
  FUB_API_KEY: 'fka_test_key',
  FUB_SOURCE: 'StagAcquisitions.com',
  FUB_SYSTEM: 'StagAcqSite',
  FUB_ASSIGNED_TO: 'Stephen Dougherty',
  FUB_ASSIGNED_USER_ID: '1',
};

const validLead = {
  firstName: 'Dana',
  lastName: 'Whitfield',
  phone: '(615) 555-1234',
  email: 'dana@example.com',
  address: '123 Main St, Nashville, TN 37205',
  condition: 'Needs work — real repairs needed',
  timeline: '30 days',
  notes: 'Tenant in place.',
  smsConsent: 'yes',
};

function jsonRequest(body: unknown, method = 'POST'): Request {
  return new Request('https://stagacquisitions.com/api/lead', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method === 'POST' ? JSON.stringify(body) : undefined,
  });
}

function formRequest(fields: Record<string, string>, accept = 'text/html'): Request {
  const body = new URLSearchParams(fields);
  return new Request('https://stagacquisitions.com/api/lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: accept },
    body,
  });
}

const created = () =>
  new Response(JSON.stringify({ id: 42 }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('handleLeadRequest — happy path', () => {
  it('accepts a JSON submission and reports success', async () => {
    const fetchMock = vi.fn(async () => created());
    const response = await handleLeadRequest(
      jsonRequest(validLead),
      env,
      fetchMock as unknown as typeof fetch,
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends the lead to Follow Up Boss assigned to Stephen Dougherty', async () => {
    const fetchMock = vi.fn(async () => created());
    await handleLeadRequest(jsonRequest(validLead), env, fetchMock as unknown as typeof fetch);

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const payload = JSON.parse(init.body as string);
    expect(payload.person.assignedTo).toBe('Stephen Dougherty');
    expect(payload.person.assignedUserId).toBe(1);
    expect(payload.person.phones[0].value).toBe('(615) 555-1234');
    expect(payload.property.city).toBe('Nashville');
  });

  it('redirects a no-JS form post back to the offer page', async () => {
    const fetchMock = vi.fn(async () => created());
    const response = await handleLeadRequest(
      formRequest(validLead),
      env,
      fetchMock as unknown as typeof fetch,
    );

    expect(response.status).toBe(303);
    expect(response.headers.get('Location')).toContain('/offer?status=ok');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('answers a form post with JSON when the client asks for it', async () => {
    const fetchMock = vi.fn(async () => created());
    const response = await handleLeadRequest(
      formRequest(validLead, 'application/json'),
      env,
      fetchMock as unknown as typeof fetch,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true });
  });

  it('never caches the response', async () => {
    const fetchMock = vi.fn(async () => created());
    const response = await handleLeadRequest(
      jsonRequest(validLead),
      env,
      fetchMock as unknown as typeof fetch,
    );
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});

describe('handleLeadRequest — rejections', () => {
  it('rejects non-POST methods', async () => {
    const fetchMock = vi.fn();
    const response = await handleLeadRequest(
      jsonRequest(validLead, 'GET'),
      env,
      fetchMock as unknown as typeof fetch,
    );
    expect(response.status).toBe(405);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 400 with per-field errors and calls nothing', async () => {
    const fetchMock = vi.fn();
    const response = await handleLeadRequest(
      jsonRequest({ ...validLead, firstName: '', phone: '', address: '' }),
      env,
      fetchMock as unknown as typeof fetch,
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { ok: boolean; errors: Record<string, string> };
    expect(body.ok).toBe(false);
    expect(Object.keys(body.errors).sort()).toEqual(['address', 'firstName', 'phone']);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('redirects an invalid no-JS post with an invalid status flag', async () => {
    const fetchMock = vi.fn();
    const response = await handleLeadRequest(
      formRequest({ ...validLead, phone: '' }),
      env,
      fetchMock as unknown as typeof fetch,
    );
    expect(response.status).toBe(303);
    expect(response.headers.get('Location')).toContain('status=invalid');
  });

  it('silently swallows honeypot submissions', async () => {
    const fetchMock = vi.fn();
    const response = await handleLeadRequest(
      jsonRequest({ ...validLead, company: 'Spam Co' }),
      env,
      fetchMock as unknown as typeof fetch,
    );

    // Looks successful to the bot, but nothing reaches the CRM.
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 400 on an unreadable body', async () => {
    const request = new Request('https://stagacquisitions.com/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not json',
    });
    const response = await handleLeadRequest(request, env, vi.fn() as unknown as typeof fetch);
    expect(response.status).toBe(400);
  });
});

describe('handleLeadRequest — failure handling', () => {
  it('returns 500 with a fallback message when the API key is missing', async () => {
    const fetchMock = vi.fn();
    const response = await handleLeadRequest(
      jsonRequest(validLead),
      { ...env, FUB_API_KEY: '' },
      fetchMock as unknown as typeof fetch,
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ ok: false, message: CONTACT_FALLBACK });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 502 when Follow Up Boss rejects the request', async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ errorMessage: 'Unauthorized' }), { status: 401 }),
    );
    const response = await handleLeadRequest(
      jsonRequest(validLead),
      env,
      fetchMock as unknown as typeof fetch,
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ ok: false, message: CONTACT_FALLBACK });
  });

  it('returns 502 when the network call fails', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('socket hang up');
    });
    const response = await handleLeadRequest(
      jsonRequest(validLead),
      env,
      fetchMock as unknown as typeof fetch,
    );
    expect(response.status).toBe(502);
  });

  it('never exposes the API key or upstream detail to the browser', async () => {
    const fetchMock = vi.fn(
      async () => new Response('key fka_test_key was rejected', { status: 403 }),
    );
    const response = await handleLeadRequest(
      jsonRequest(validLead),
      env,
      fetchMock as unknown as typeof fetch,
    );

    const text = await response.text();
    expect(text).not.toContain('fka_test_key');
    expect(text).not.toContain('403');
  });
});

describe('handleLeadRequest — configuration defaults', () => {
  it('falls back to Stephen Dougherty when the assignment vars are absent', async () => {
    const fetchMock = vi.fn(async () => created());
    await handleLeadRequest(
      jsonRequest(validLead),
      { FUB_API_KEY: 'fka_test_key' },
      fetchMock as unknown as typeof fetch,
    );

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const payload = JSON.parse(init.body as string);
    expect(payload.person.assignedTo).toBe('Stephen Dougherty');
    expect(payload.person.assignedUserId).toBe(1);
    expect(payload.source).toBe('StagAcquisitions.com');
  });
});
