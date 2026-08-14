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

  it('emits a sitemap on the same origin as the canonical URLs', () => {
    // astro.config's `site` and site.ts's `url` are set independently; a
    // mismatch silently publishes a sitemap for the wrong domain.
    const index = readFileSync(join(dist, 'sitemap-index.xml'), 'utf8');
    const urls = readFileSync(join(dist, 'sitemap-0.xml'), 'utf8');
    expect(index).toContain('https://stagacquisitions.com/');
    expect(urls).toContain('https://stagacquisitions.com/');
    expect(urls).not.toContain('doughertyacquisitions');

    const robots = readFileSync(join(dist, 'robots.txt'), 'utf8');
    const declared = robots.match(/Sitemap:\s*(\S+)/)?.[1];
    expect(declared).toBe('https://stagacquisitions.com/sitemap-index.xml');
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

  // The brand speaks for itself; individuals are never named in public copy.
  // Lead assignment still routes to a named user, but that lives in the Worker.
  it('names no individual person', () => {
    for (const name of ['Stephen', 'Phillip', 'Dougherty', 'brothers']) {
      expect(html, `"${name}" appears in ${page}`).not.toContain(name);
    }
  });

  it('publishes the phone line and no email address', () => {
    // Sellers call or text; there is no public inbox to leak or bounce.
    expect(html, `no mailto expected in ${page}`).not.toContain('mailto:');
    expect(html).not.toMatch(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
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

describe('AI crawler surface', () => {
  const robots = () => readFileSync(join(dist, 'robots.txt'), 'utf8');
  const llms = () => readFileSync(join(dist, 'llms.txt'), 'utf8');

  const AI_AGENTS = [
    'GPTBot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'ClaudeBot',
    'Claude-User',
    'Claude-SearchBot',
    'Google-Extended',
    'PerplexityBot',
    'Applebot-Extended',
    'CCBot',
  ];

  it.each(AI_AGENTS)('robots.txt explicitly allows %s', (agent) => {
    const block = robots().split(/User-agent:/).find((b) => b.trim().startsWith(agent));
    expect(block, `no group for ${agent}`).toBeDefined();
    expect(block).toContain('Allow: /');
  });

  it('keeps the lead endpoint out of every crawler group', () => {
    const groups = robots().split(/User-agent:/).slice(1);
    expect(groups.length).toBeGreaterThan(5);
    for (const group of groups) {
      // Named groups override the wildcard, so each must exclude /api/ itself.
      expect(group, group.split('\n')[0]).toContain('Disallow: /api/');
    }
  });

  it('points crawlers at the sitemap', () => {
    expect(robots()).toContain('Sitemap: https://stagacquisitions.com/sitemap-index.xml');
  });

  it('publishes an llms.txt that leads with the brand and a summary', () => {
    expect(llms()).toMatch(/^# Stag Acquisitions/);
    expect(llms()).toMatch(/\n> /);
  });

  it('llms.txt states the markets and the non-brokerage disclaimer', () => {
    const body = llms();
    for (const phrase of [
      'Nashville, Tennessee',
      'Scottsdale, Arizona',
      'Charlotte, North Carolina',
      'not a licensed real estate brokerage',
      '(216) 488-8920',
    ]) {
      expect(body, phrase).toContain(phrase);
    }
  });

  it('llms.txt links only to canonical absolute URLs', () => {
    const links = [...llms().matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1]);
    expect(links.length).toBeGreaterThan(3);
    for (const link of links) {
      expect(link, link).toMatch(/^https:\/\/stagacquisitions\.com/);
    }
  });

  it('how-it-works carries FAQ structured data', () => {
    const blocks = [...read('how-it-works.html').matchAll(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
    )].map((m) => JSON.parse(m[1]!));
    const faq = blocks.find((b) => b['@type'] === 'FAQPage');
    expect(faq, 'no FAQPage schema').toBeDefined();
    expect(faq.mainEntity).toHaveLength(3);
    for (const entry of faq.mainEntity) {
      expect(entry['@type']).toBe('Question');
      expect(entry.acceptedAnswer.text.length).toBeGreaterThan(30);
    }
  });
});

describe('markets.html', () => {
  const copy = text('markets.html');

  it('lists exactly the three home markets plus nationwide coverage', () => {
    for (const market of [
      'Nashville, Tennessee',
      'Scottsdale, Arizona',
      'Charlotte, North Carolina',
      'Across the United States',
    ]) {
      expect(copy, market).toContain(market);
    }
  });

  it('no longer advertises the markets we dropped', () => {
    for (const stale of ['Atlanta', 'Texas triangle', 'Boston', 'Seattle', 'Washington DC']) {
      expect(copy, `stale market "${stale}"`).not.toContain(stale);
    }
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

/**
 * Every section that should render body content, page by page.
 *
 * These exist because a bad search-and-replace once emptied all four
 * `.section.ambient` blocks — the pages still built, still had nav, title, and
 * canonical, and every other test passed. Asserting the actual copy is the only
 * thing that catches a section quietly rendering as a bare backdrop.
 */
const SECTION_CONTENT: Record<string, Array<[string, string[]]>> = {
  'index.html': [
    ['who', ['Private buyers.', 'No realtor fees', 'Any condition']],
    ['process', ['Four steps. Zero headaches.', 'You reach out', 'We run comps', 'Pick your date', 'Full process breakdown']],
    ['situations', ['Real situations. Real solutions.', 'Tired landlord', 'Pre-foreclosure']],
    ['final-cta', ["Let's see a number together.", 'Get a cash offer']],
  ],
  'how-it-works.html': [
    ['steps', ['How we actually buy your house.', 'Step 01', 'Step 04']],
    ['why', ['Three questions we get every week.', 'Why off-market?', 'Why Stag?']],
    ['final-cta', ['Tell us about the property.']],
  ],
  'markets.html': [
    ['primary-markets', ['The markets we live in.', 'Nashville, Tennessee', 'Scottsdale, Arizona', 'Charlotte, North Carolina', 'Across the United States']],
    ['criteria', ['What makes a property work for us.', 'Situation', 'Numbers', 'Title']],
    ['final-cta', ['Send the address anyway.']],
  ],
  'offer.html': [['offer', ['What happens next', 'No commission.', '(216) 488-8920']]],
  'privacy.html': [],
};

describe.each(Object.entries(SECTION_CONTENT))('%s section content', (page, sections) => {
  const copy = text(page);

  it.each(sections)('#%s renders its content', (id, phrases) => {
    expect(copy, `#${id} is missing from ${page}`).toContain(`id="${id}"`);
    for (const phrase of phrases) {
      expect(copy, `"${phrase}" missing from #${id} in ${page}`).toContain(phrase);
    }
  });

  it('has no section rendering as a bare backdrop', () => {
    // Split on section boundaries rather than trying to match balanced tags —
    // a loose regex here is exactly what let the original bug through.
    const chunks = read(page).split('<section').slice(1);
    const bare = chunks
      .filter((chunk) => /^[^>]*class="section ambient"/.test(chunk))
      .filter((chunk) => !chunk.slice(0, chunk.indexOf('</section>')).includes('section-inner'));
    expect(bare, 'an ambient section has a backdrop but no content').toHaveLength(0);
  });
});

describe('index.html', () => {
  const html = read('index.html');

  it('leads with the off-market hero and both CTAs', () => {
    expect(html).toContain('Sell your home');
    expect(html).toMatch(/class="cta"[^>]*href="\/offer"/);
    expect(html).toContain('/how-it-works');
  });

  it('describes the family-owned positioning without naming anyone', () => {
    expect(html).toContain('family-owned');
  });

  it('includes organization structured data', () => {
    const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(match).not.toBeNull();
    const schema = JSON.parse(match![1]!);
    expect(schema['@type']).toBe('RealEstateAgent');
    expect(schema.name).toBe('Stag Acquisitions');
  });
});

describe('contact channel', () => {
  it.each(PAGES)('%s links the phone line as a tel: URL', (page) => {
    const html = read(page);
    // The footer is on every page, so every page should carry the number.
    expect(html, `no tel: link in ${page}`).toContain('href="tel:+12164888920"');
    expect(text(page)).toContain('(216) 488-8920');
  });

  it('the endpoint failure message tells the seller to call', async () => {
    const { CONTACT_FALLBACK } = await import('../src/lib/handler');
    expect(CONTACT_FALLBACK).toContain('(216) 488-8920');
    expect(CONTACT_FALLBACK).not.toContain('@');
  });

  it('organization schema publishes the phone, not an email', () => {
    const schema = JSON.parse(
      read('index.html').match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]!,
    );
    expect(schema.telephone).toBe('+12164888920');
    expect(schema.email).toBeUndefined();
  });
});

describe('brand palette', () => {
  const css = (): string => {
    const dir = join(dist, '_astro');
    const file = readdirSync(dir).find((f) => f.endsWith('.css'));
    return readFileSync(join(dir, file!), 'utf8');
  };

  it('defines the reference palette tokens', () => {
    const sheet = css();
    for (const [token, value] of [
      ['--sage', '#4A6650'],
      ['--sage-mid', '#6B8F71'],
      ['--sage-light', '#A8C5AC'],
      ['--sage-pale', '#E8EDE9'],
      ['--cream', '#FAF8F4'],
      ['--stone', '#F0EDE7'],
      ['--bark', '#2C2C27'],
      ['--tan', '#C8BBA8'],
    ]) {
      expect(sheet.toUpperCase(), `${token}: ${value}`).toContain(value!.toUpperCase());
    }
  });

  it('has no leftover navy or brass literals from the old theme', () => {
    const sheet = css();
    expect(sheet).not.toContain('6,16,28');
    expect(sheet).not.toContain('195,154,82');
    expect(sheet.toLowerCase()).not.toContain('#c39a52');
    expect(sheet.toLowerCase()).not.toContain('#06101c');
  });
});

describe('stag mark', () => {
  it.each(PAGES)('%s renders the brand artwork, not a placeholder', (page) => {
    const html = read(page);
    expect(html).toContain('class="stag-mark');
    expect(html).toContain('viewBox="0 0 1500 1500"');
    // The reference artwork is a single long evenodd path.
    const mark = html.match(/<svg class="stag-mark[\s\S]*?<\/svg>/)![0];
    expect(mark).toContain('fill-rule="evenodd"');
    expect(mark.length).toBeGreaterThan(5000);
  });
});
