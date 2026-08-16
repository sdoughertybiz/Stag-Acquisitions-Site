import { normalizePhone, parseAddress } from './parse';
import type { CleanInvestorLead, CleanLead, CleanSellerLead } from './validate';

export const FUB_EVENTS_URL = 'https://api.followupboss.com/v1/events';

/** Follow Up Boss event type used for homeowners submitting a property. */
export const FUB_EVENT_TYPE = 'Seller Inquiry';

/**
 * Event type used for buy-side clients sending us a buy box. Follow Up Boss
 * only accepts values from its own fixed list, so change this with care.
 */
export const FUB_INVESTOR_EVENT_TYPE = 'General Inquiry';

/** The event type Follow Up Boss should record for a given submission. */
export function eventTypeFor(lead: CleanLead): string {
  return lead.type === 'investor' ? FUB_INVESTOR_EVENT_TYPE : FUB_EVENT_TYPE;
}

export interface FubConfig {
  /** FUB API key — used as the HTTP Basic username with an empty password. */
  apiKey: string;
  /** Lead source shown in FUB. */
  source: string;
  /** Registered integration name for the X-System header. */
  system: string;
  /** Registered system key for the X-System-Key header. Optional. */
  systemKey?: string;
  /** Full name of the agent the lead is assigned to. */
  assignedTo: string;
  /** Numeric FUB user id of the assignee — unambiguous even if a name changes. */
  assignedUserId?: number;
}

export interface FubEventPayload {
  source: string;
  system: string;
  type: string;
  message: string;
  person: {
    firstName: string;
    lastName?: string;
    emails?: Array<{ value: string; type?: string }>;
    phones?: Array<{ value: string; type?: string }>;
    addresses?: Array<{
      type: string;
      street?: string;
      city?: string;
      state?: string;
      code?: string;
      country?: string;
    }>;
    tags: string[];
    source: string;
    sourceUrl?: string;
    assignedTo: string;
    assignedUserId?: number;
  };
  property?: {
    street?: string;
    city?: string;
    state?: string;
    code?: string;
  };
}

export type FubResult =
  | { ok: true; status: number; personId?: number }
  | { ok: false; status: number; error: string };

/**
 * Human-readable summary of the inquiry, shown as the event message on the
 * person's timeline in Follow Up Boss.
 */
export function buildMessage(lead: CleanLead): string {
  const lines = lead.type === 'investor' ? investorLines(lead) : sellerLines(lead);
  lines.push(`SMS consent: ${lead.smsConsent ? 'Yes' : 'No'}`);
  if (lead.notes) lines.push('', `Notes: ${lead.notes}`);
  return lines.join('\n');
}

function sellerLines(lead: CleanSellerLead): string[] {
  const lines = [`Property: ${lead.address}`];
  if (lead.condition) lines.push(`Condition: ${lead.condition}`);
  if (lead.timeline) lines.push(`Timeline: ${lead.timeline}`);
  if (lead.market) lines.push(`Campaign: ${lead.market}`);
  return lines;
}

function investorLines(lead: CleanInvestorLead): string[] {
  const lines = ['Buy box submission'];
  if (lead.organization) lines.push(`Company: ${lead.organization}`);
  if (lead.assetTypes) lines.push(`Asset types: ${lead.assetTypes}`);
  if (lead.targetMarkets) lines.push(`Target markets: ${lead.targetMarkets}`);
  if (lead.priceRange) lines.push(`Price range: ${lead.priceRange}`);
  if (lead.scope) lines.push(`Scope: ${lead.scope}`);
  if (lead.volume) lines.push(`Volume: ${lead.volume}`);
  if (lead.financing) lines.push(`Financing: ${lead.financing}`);
  return lines;
}

/**
 * Tags applied to every lead so website submissions are filterable in FUB.
 * The second tag is the side of the deal, which is what the team filters on.
 */
export function buildTags(lead: CleanLead): string[] {
  const tags = ['Website Lead', lead.type === 'investor' ? 'Investor' : 'Seller'];
  // The market tag is what makes a mail campaign measurable in FUB.
  if (lead.type === 'seller' && lead.market) tags.push(lead.market);
  if (lead.smsConsent) tags.push('SMS Consent');
  return tags;
}

/**
 * Map a validated submission onto the Follow Up Boss `POST /v1/events` schema.
 *
 * Seller submissions carry a property address, which is recorded both on the
 * person and as the event's property. Buy-side submissions have no single
 * address — their criteria live in the event message instead.
 */
export function buildEventPayload(lead: CleanLead, config: FubConfig): FubEventPayload {
  const payload: FubEventPayload = {
    source: config.source,
    system: config.system,
    type: eventTypeFor(lead),
    message: buildMessage(lead),
    person: {
      firstName: lead.firstName,
      phones: [{ value: normalizePhone(lead.phone), type: 'mobile' }],
      tags: buildTags(lead),
      source: config.source,
      assignedTo: config.assignedTo,
    },
  };

  if (lead.type === 'seller') {
    const address = parseAddress(lead.address);
    payload.person.addresses = [
      {
        type: 'home',
        street: address.street || address.raw,
        city: address.city,
        state: address.state,
        code: address.code,
        country: 'US',
      },
    ];
    payload.property = {
      street: address.street || address.raw,
      city: address.city,
      state: address.state,
      code: address.code,
    };
  }

  if (lead.lastName) payload.person.lastName = lead.lastName;
  if (lead.email) payload.person.emails = [{ value: lead.email, type: 'home' }];
  if (lead.pageUrl) payload.person.sourceUrl = lead.pageUrl;
  if (typeof config.assignedUserId === 'number' && Number.isFinite(config.assignedUserId)) {
    payload.person.assignedUserId = config.assignedUserId;
  }

  return payload;
}

/** HTTP Basic credential: the API key as username with an empty password. */
export function basicAuthHeader(apiKey: string): string {
  return `Basic ${btoa(`${apiKey}:`)}`;
}

export function buildHeaders(config: FubConfig): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: basicAuthHeader(config.apiKey),
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  // FUB asks integrations to identify themselves. The key is only sent when
  // the system has actually been registered; Basic auth alone still works.
  if (config.systemKey) {
    headers['X-System'] = config.system;
    headers['X-System-Key'] = config.systemKey;
  }
  return headers;
}

/**
 * Send a lead to Follow Up Boss.
 *
 * 200 (matched an existing person), 201 (created), and 204 (the lead flow
 * archived it) all count as delivered. Errors never echo the API key.
 */
export async function sendLeadToFub(
  lead: CleanLead,
  config: FubConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<FubResult> {
  const payload = buildEventPayload(lead, config);

  let response: Response;
  try {
    response = await fetchImpl(FUB_EVENTS_URL, {
      method: 'POST',
      headers: buildHeaders(config),
      body: JSON.stringify(payload),
    });
  } catch (cause) {
    return { ok: false, status: 0, error: `Network error contacting Follow Up Boss: ${errorText(cause)}` };
  }

  if (response.status === 204) return { ok: true, status: 204 };

  if (response.status === 200 || response.status === 201) {
    let personId: number | undefined;
    try {
      const body = (await response.json()) as { id?: number; person?: { id?: number } };
      personId = body?.person?.id ?? body?.id;
    } catch {
      // A 2xx with an unparseable body is still a delivered lead.
    }
    return { ok: true, status: response.status, personId };
  }

  let detail = '';
  try {
    detail = (await response.text()).slice(0, 500);
  } catch {
    // ignore
  }
  return {
    ok: false,
    status: response.status,
    error: `Follow Up Boss returned ${response.status}${detail ? `: ${detail}` : ''}`,
  };
}

function errorText(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  return String(cause);
}
