import type { FubConfig } from './fub';

/** Shape of the bindings/vars available to the Worker. */
export interface LeadEnv {
  FUB_API_KEY?: string;
  FUB_SYSTEM_KEY?: string;
  FUB_SOURCE?: string;
  FUB_SYSTEM?: string;
  FUB_ASSIGNED_TO?: string;
  FUB_ASSIGNED_USER_ID?: string | number;
}

export const DEFAULTS = {
  source: 'StagAcquisitions.com',
  system: 'StagAcqSite',
  assignedTo: 'Stephen Dougherty',
  assignedUserId: 1,
} as const;

export type ConfigResult =
  | { ok: true; config: FubConfig }
  | { ok: false; error: string };

/**
 * Resolve the Follow Up Boss configuration from the environment.
 *
 * The API key is the only hard requirement; everything else falls back to the
 * defaults above so a missing var can never silently misroute a lead.
 */
export function resolveFubConfig(env: LeadEnv | undefined): ConfigResult {
  const apiKey = String(env?.FUB_API_KEY ?? '').trim();
  if (!apiKey) return { ok: false, error: 'FUB_API_KEY is not configured' };

  const assignedUserIdRaw = env?.FUB_ASSIGNED_USER_ID;
  const parsedUserId = Number.parseInt(String(assignedUserIdRaw ?? ''), 10);

  const config: FubConfig = {
    apiKey,
    source: str(env?.FUB_SOURCE) || DEFAULTS.source,
    system: str(env?.FUB_SYSTEM) || DEFAULTS.system,
    assignedTo: str(env?.FUB_ASSIGNED_TO) || DEFAULTS.assignedTo,
    assignedUserId: Number.isFinite(parsedUserId) && parsedUserId > 0 ? parsedUserId : DEFAULTS.assignedUserId,
  };

  const systemKey = str(env?.FUB_SYSTEM_KEY);
  if (systemKey) config.systemKey = systemKey;

  return { ok: true, config };
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
