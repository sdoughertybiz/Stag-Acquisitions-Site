// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Pages are prerendered to static HTML at build time. Only /api/lead opts out
// (`export const prerender = false`) so the Worker handles form submissions.
export default defineConfig({
  site: 'https://doughertyacquisitions.com',
  output: 'static',
  adapter: cloudflare({
    platformProxy: { enabled: true },
  }),
  build: {
    format: 'file',
  },
});
