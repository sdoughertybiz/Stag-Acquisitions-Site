import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * wrangler.jsonc is JSONC — strip comments before parsing. Only line comments
 * are used in that file, and none appear inside a string literal.
 */
function readWranglerConfig(): Record<string, any> {
  const raw = readFileSync(join(root, 'wrangler.jsonc'), 'utf8');
  const stripped = raw
    .split('\n')
    .map((line) => line.replace(/^\s*\/\/.*$/, ''))
    .join('\n');
  return JSON.parse(stripped);
}

/**
 * Regression guard for a failure that reached production silently.
 *
 * Cloudflare's asset worker answers navigation requests before the Worker
 * script runs, and it only permits GET/HEAD. The no-JS form fallback posts
 * /api/lead as a native form submission — a navigation POST — so the asset
 * worker replied 405 and the Worker never saw the lead. The enhanced fetch()
 * path was unaffected, so every unit test and the live JS form kept passing
 * while sellers without JS vanished.
 *
 * `assets.run_worker_first` must therefore keep covering the lead endpoint.
 */
describe('worker asset routing', () => {
  const config = readWranglerConfig();

  it('routes the lead endpoint to the Worker before static assets', () => {
    const runWorkerFirst = config.assets?.run_worker_first;
    expect(
      runWorkerFirst,
      'assets.run_worker_first is missing — native (no-JS) form posts to /api/lead will be answered 405 by the asset worker',
    ).toBeDefined();

    if (runWorkerFirst === true) return; // every request goes to the Worker

    expect(Array.isArray(runWorkerFirst)).toBe(true);
    expect(runWorkerFirst).toContain('/api/lead');
  });

  it('still serves the custom 404 page for unmatched paths', () => {
    expect(config.assets?.not_found_handling).toBe('404-page');
  });

  it('has no account_id, which would pin deploys to one Cloudflare account', () => {
    expect(config.account_id).toBeUndefined();
  });
});
