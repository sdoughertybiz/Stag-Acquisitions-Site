import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * The rendered-output tests read from dist/. Build once if it isn't there yet
 * so `npm test` works from a clean checkout; delete dist/ to force a rebuild.
 */
export default function setup(): void {
  if (existsSync(join(root, 'dist', 'index.html'))) return;
  execFileSync('npx', ['astro', 'build'], { cwd: root, stdio: 'inherit' });
}
