import type { APIRoute } from 'astro';
import { handleLeadRequest } from '../../lib/handler';
import type { LeadEnv } from '../../lib/env';

// The only route that runs on the Worker; every page is prerendered.
export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const runtimeEnv = (locals as { runtime?: { env?: LeadEnv } }).runtime?.env;
  return handleLeadRequest(request, runtimeEnv);
};

export const GET: APIRoute = () =>
  new Response(JSON.stringify({ ok: false, message: 'Method not allowed.' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json; charset=utf-8', Allow: 'POST' },
  });
