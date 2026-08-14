import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');

const read = (file: string): string => readFileSync(join(dist, file), 'utf8');

/** Whitespace-collapsed copy, so assertions survive source line wrapping. */
const text = (file: string): string => read(file).replace(/\s+/g, ' ');

const PAGES = ['index.html', 'how-it-works.html', 'markets.html', 'offer.html', 'privacy.html'];

describe('build output', () => {
  it('renders every page', () => {
    const files = readdirSync(dist);
    for (const page of PAGES) expect(files, page).toContain(page);
  });

  it('emits the worker entrypoint for the lead endpoint', () => {
    const worker = readdirSync(join(dist, '_worker.js'));
    expect(worker).toContain('index.js');
  });
});

describe.each(PAGES)('%s', (page) => {
  const html = read(page);

  it('has a title and meta description', () => {
    expect(html).toMatch(/<title>[^<]{10,}<\/title>/);
    expect(html).toMatch(/<meta name="description" content="[^"]{40,}"/);
  });

  it('is branded Stag Acquisitions, with no trace of the reference site', () => {
    expect(html).toContain('Stag');
    expect(html.toLowerCase()).not.toContain('lux ventures');
    expect(html.toLowerCase()).not.toContain('luxventuresgroup');
  });

  it('carries the full navigation and an extensionless canonical link', () => {
    for (const href of ['/how-it-works', '/markets', '/offer']) {
      expect(html, href).toContain(`href="${href}"`);
    }
    const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    expect(canonical).toBeDefined();
    expect(canonical).toMatch(/^https:\/\/stagacquisitions\.com\//);
    expect(canonical).not.toContain('.html');
  });

  it('links to the privacy policy from the footer', () => {
    expect(html).toContain('href="/privacy"');
  });

  it('sets the mobile viewport', () => {
    expect(html).toContain('width=device-width, initial-scale=1');
  });

  it('contains no API key or secret material', () => {
    expect(html).not.toMatch(/fka_[A-Za-z0-9]/);
    expect(html.toLowerCase()).not.toContain('fub_api_key');
    expect(html).not.toContain('api.followupboss.com');
  });

  it('has scroll-reveal targets with a no-JS fallback', () => {
    expect(html).toContain('data-reveal');
    expect(html).toContain('<noscript>');
  });
});

describe('offer.html — the lead form', () => {
  const html = read('offer.html');

  it('posts to the lead endpoint', () => {
    expect(html).toMatch(/<form[^>]+action="\/api\/lead"[^>]*>/);
    expect(html).toMatch(/<form[^>]+method="POST"/i);
  });

  it('has every field the endpoint reads', () => {
    for (const name of [
      'firstName',
      'lastName',
      'phone',
      'email',
      'address',
      'condition',
      'timeline',
      'notes',
      'smsConsent',
      'company',
    ]) {
      expect(html, name).toContain(`name="${name}"`);
    }
  });

  it('marks name, phone, and address required in the markup', () => {
    for (const id of ['field-first-name', 'field-phone', 'field-address']) {
      const field = html.match(new RegExp(`<input[^>]*id="${id}"[^>]*>`))?.[0] ?? '';
      expect(field, id).toContain('required');
    }
  });

  it('labels every visible field', () => {
    for (const id of [
      'field-first-name',
      'field-last-name',
      'field-phone',
      'field-email',
      'field-address',
      'field-condition',
      'field-timeline',
      'field-notes',
      'field-sms-consent',
    ]) {
      expect(html, id).toContain(`for="${id}"`);
    }
  });

  it('hides the honeypot from humans', () => {
    expect(html).toMatch(/class="honeypot"[^>]*aria-hidden="true"/);
    expect(html).toMatch(/name="company"[^>]*tabindex="-1"/);
  });

  it('carries the SMS consent disclosure and opt-out language', () => {
    const copy = text('offer.html');
    expect(copy).toContain('Consent is not a condition of getting an offer');
    expect(copy).toContain('STOP');
    expect(copy).toContain('Message and data rates may apply');
    expect(copy).toContain('Message frequency varies');
    expect(html).toContain('href="/privacy#sms-messaging"');
  });

  it('offers the condition and timeline choices', () => {
    expect(html).toContain('move-in ready');
    expect(html).toContain('down to the studs');
    expect(html).toContain('Flexible / exploring');
  });

  it('ships a success panel and an error banner for the enhanced flow', () => {
    expect(html).toContain('id="form-success"');
    expect(html).toContain('id="form-status"');
  });

  it('keeps the enhancement script inside the document', () => {
    const lastScript = html.lastIndexOf('<script');
    const closingHtml = html.lastIndexOf('</html>');
    expect(lastScript).toBeGreaterThan(-1);
    expect(lastScript).toBeLessThan(closingHtml);
  });
});

describe('privacy.html', () => {
  const html = read('privacy.html');

  it('has the SMS terms anchor the form links to', () => {
    expect(html).toContain('id="sms-messaging"');
  });

  it('states the required SMS disclosures', () => {
    expect(html).toContain('Message frequency varies');
    expect(html).toContain('will not be shared with or sold to third parties');
    expect(html).toContain('STOP');
  });
});

describe('index.html', () => {
  const html = read('index.html');

  it('leads with the off-market hero and both CTAs', () => {
    expect(html).toContain('Sell your home');
    expect(html).toMatch(/class="cta"[^>]*href="\/offer"/);
    expect(html).toContain('/how-it-works');
  });

  it('describes the family-owned positioning', () => {
    expect(html).toContain('family business');
    expect(html).toContain('Stephen Dougherty');
  });

  it('includes organization structured data', () => {
    const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(match).not.toBeNull();
    const schema = JSON.parse(match![1]!);
    expect(schema['@type']).toBe('RealEstateAgent');
    expect(schema.name).toBe('Stag Acquisitions');
  });
});
