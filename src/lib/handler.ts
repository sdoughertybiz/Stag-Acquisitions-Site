import { resolveFubConfig, type LeadEnv } from './env';
import { sendLeadToFub } from './fub';
import { isHoneypotTripped, validateLead, type RawLead } from './validate';

export const CONTACT_FALLBACK =
  "We couldn't submit that just now. Please email stephen@sellnowpros.com and we'll pick it up right away.";

const SUCCESS_MESSAGE =
  "Got it. We'll review the property and call you with a number — usually same day.";

/**
 * Core POST /api/lead logic, deliberately framework-free so it can be exercised
 * directly in tests with a plain Request and a fake fetch.
 *
 * Browsers without JS post `application/x-www-form-urlencoded` and get a 303
 * back to /offer with a status flag; the enhanced form posts JSON and gets JSON.
 */
export async function handleLeadRequest(
  request: Request,
  env: LeadEnv | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ ok: false, message: 'Method not allowed.' }, 405, { Allow: 'POST' });
  }

  let raw: RawLead;
  let wantsJson: boolean;
  try {
    const parsed = await readBody(request);
    raw = parsed.raw;
    wantsJson = parsed.wantsJson;
  } catch {
    return json({ ok: false, message: 'We could not read that submission.' }, 400);
  }

  // Bots fill hidden fields. Look successful, do nothing.
  if (isHoneypotTripped(raw)) {
    return respond(wantsJson, { ok: true, message: SUCCESS_MESSAGE }, 200, 'ok');
  }

  const validation = validateLead(raw);
  if (!validation.ok) {
    return respond(
      wantsJson,
      { ok: false, message: 'Please check the highlighted fields.', errors: validation.errors },
      400,
      'invalid',
    );
  }

  const configResult = resolveFubConfig(env);
  if (!configResult.ok) {
    console.error(`[lead] configuration error: ${configResult.error}`);
    return respond(wantsJson, { ok: false, message: CONTACT_FALLBACK }, 500, 'error');
  }

  const result = await sendLeadToFub(validation.data, configResult.config, fetchImpl);
  if (!result.ok) {
    // Logged for observability; the seller only ever sees the fallback text.
    console.error(`[lead] Follow Up Boss delivery failed (${result.status}): ${result.error}`);
    return respond(wantsJson, { ok: false, message: CONTACT_FALLBACK }, 502, 'error');
  }

  return respond(wantsJson, { ok: true, message: SUCCESS_MESSAGE }, 200, 'ok');
}

async function readBody(request: Request): Promise<{ raw: RawLead; wantsJson: boolean }> {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const body = (await request.json()) as Record<string, unknown>;
    return { raw: body as RawLead, wantsJson: true };
  }

  const form = await request.formData();
  const raw: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === 'string') raw[key] = value;
  }
  const accept = request.headers.get('accept') ?? '';
  return { raw: raw as RawLead, wantsJson: accept.includes('application/json') };
}

interface LeadResponseBody {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
}

function respond(
  wantsJson: boolean,
  body: LeadResponseBody,
  status: number,
  redirectStatus: 'ok' | 'invalid' | 'error',
): Response {
  if (wantsJson) return json(body, status);
  return new Response(null, {
    status: 303,
    headers: { Location: `/offer?status=${redirectStatus}#offer-form` },
  });
}

function json(body: unknown, status: number, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}
