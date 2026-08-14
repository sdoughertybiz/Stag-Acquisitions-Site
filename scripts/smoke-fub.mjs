#!/usr/bin/env node
/**
 * Live end-to-end check against the real Follow Up Boss account.
 *
 * Submits one clearly-marked test lead through a running local server, reads
 * the person back out of FUB to confirm the fields and the assignment landed,
 * then deletes it so nothing is left behind in the CRM.
 *
 * Usage:
 *   npm run build && npx wrangler dev --port 8787    # in another shell
 *   npm run smoke:fub
 *
 * Env:
 *   FUB_API_KEY   required (read from .dev.vars if present)
 *   SMOKE_URL     endpoint to post to (default http://localhost:8787/api/lead)
 *   KEEP_LEAD=1   skip the cleanup delete
 */

import { readFileSync, existsSync } from 'node:fs';

const SMOKE_URL = process.env.SMOKE_URL ?? 'http://localhost:8787/api/lead';
const FUB_BASE = 'https://api.followupboss.com/v1';

function loadApiKey() {
  if (process.env.FUB_API_KEY) return process.env.FUB_API_KEY;
  if (existsSync('.dev.vars')) {
    const match = readFileSync('.dev.vars', 'utf8').match(/^FUB_API_KEY=(.+)$/m);
    if (match) return match[1].trim();
  }
  throw new Error('FUB_API_KEY not found in the environment or .dev.vars');
}

const apiKey = loadApiKey();
const auth = `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`;

const stamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
const lead = {
  firstName: 'ZZTest',
  lastName: `Smoke${stamp}`,
  phone: '(615) 555-0199',
  email: `smoke+${stamp}@stagacquisitions.test`,
  address: '123 Test St, Nashville, TN 37205',
  condition: 'Needs work — real repairs needed',
  timeline: '30 days',
  notes: 'AUTOMATED SMOKE TEST — safe to delete.',
  smsConsent: 'yes',
  pageUrl: 'http://localhost:8787/offer',
};

const results = [];
const check = (label, passed, detail = '') => {
  results.push({ label, passed, detail });
  console.log(`${passed ? '  ✓' : '  ✗'} ${label}${detail ? ` — ${detail}` : ''}`);
};

async function fub(path, init = {}) {
  const response = await fetch(`${FUB_BASE}${path}`, {
    ...init,
    headers: { Authorization: auth, 'Content-Type': 'application/json', ...init.headers },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, body };
}

console.log(`\nSubmitting smoke lead to ${SMOKE_URL}\n`);

const submit = await fetch(SMOKE_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify(lead),
});
const submitBody = await submit.json().catch(() => ({}));
check('endpoint accepted the lead', submit.status === 200 && submitBody.ok === true,
  `HTTP ${submit.status} ${JSON.stringify(submitBody)}`);

if (!submit.ok) {
  console.error('\nAborting — the endpoint rejected the submission.\n');
  process.exit(1);
}

// FUB indexes asynchronously; give it a moment before searching.
await new Promise((resolve) => setTimeout(resolve, 2500));

const search = await fub(`/people?lastName=${encodeURIComponent(lead.lastName)}&limit=5`);
const person = search.body?.people?.[0];
check('lead is present in Follow Up Boss', Boolean(person), person ? `person id ${person.id}` : 'not found');

if (!person) {
  console.error('\nAborting — could not find the lead in Follow Up Boss.\n');
  process.exit(1);
}

check('assigned to Stephen Dougherty', person.assignedTo === 'Stephen Dougherty', `assignedTo=${person.assignedTo}`);
check('assigned user id is 1', person.assignedUserId === 1, `assignedUserId=${person.assignedUserId}`);
check('first name stored', person.firstName === 'ZZTest', person.firstName);
check('phone normalized', person.phones?.[0]?.value?.includes('555-0199'), person.phones?.[0]?.value);
check('email stored', person.emails?.[0]?.value === lead.email, person.emails?.[0]?.value);
check('source recorded', person.source === 'StagAcquisitions.com', person.source);
check('tagged as a website seller lead',
  ['Website Lead', 'Seller'].every((tag) => (person.tags ?? []).includes(tag)),
  JSON.stringify(person.tags));

const addr = person.addresses?.[0];
check('property address parsed',
  addr?.city === 'Nashville' && addr?.state === 'TN' && addr?.code === '37205',
  JSON.stringify(addr));

if (process.env.KEEP_LEAD === '1') {
  console.log(`\nKEEP_LEAD=1 — leaving person ${person.id} in Follow Up Boss.\n`);
} else {
  const del = await fub(`/people/${person.id}`, { method: 'DELETE' });
  check('smoke lead deleted from Follow Up Boss', del.status === 204 || del.status === 200, `HTTP ${del.status}`);
}

const failed = results.filter((r) => !r.passed);
console.log(`\n${results.length - failed.length}/${results.length} checks passed\n`);
process.exit(failed.length === 0 ? 0 : 1);
