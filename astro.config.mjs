// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

// Pages are prerendered to static HTML at build time. Only /api/lead opts out
// (`export const prerender = false`) so the Worker handles form submissions.
export default defineConfig({
  site: 'https://stagacquisitions.com',
  output: 'static',
  adapter: cloudflare({
    platformProxy: { enabled: true },
  }),
  integrations: [sitemap()],
  build: {
    format: 'file',
  },
});
