import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');

const read = (file: string): string => readFileSync(join(dist, file), 'utf8');

/** Whitespace-collapsed copy, so assertions survive source line wrapping. */
const text = (file: string): string => read(file).replace(/\s+/g, ' ');

/** Campaign landing pages, one per market. */
const LANDING = [
  { file: 'nashville.html', city: 'Nashville', tag: 'Nashville, TN' },
  { file: 'brentwood.html', city: 'Brentwood', tag: 'Brentwood, TN' },
  { file: 'charlotte.html', city: 'Charlotte', tag: 'Charlotte, NC' },
  { file: 'scottsdale.html', city: 'Scottsdale', tag: 'Scottsdale, AZ' },
];

/**
 * The neighbourhoods the team actually buys in, as supplied. The site must not
 * advertise areas outside these — a seller in an area we do not work is a
 * wasted call for them and for us.
 */
const FOOTPRINT: Record<string, string[]> = {
  'nashville.html': ['Crieve Hall', 'Berry Hill', '12 South', 'Green Hills',
                     'Forest Hills', 'Oak Hill', 'West Meade', 'Belle Meade'],
  'charlotte.html': ['Myers Park', 'Eastover', 'Lansdowne', 'Foxcroft',
                     'SouthPark', 'Dilworth', 'Plaza Midwood', 'Berry Hill'],
};

const PAGES = [
  ...LANDING.map((m) => m.file),
  'index.html',
  'how-it-works.html',
  'values.html',
  'markets.html',
  'investors.html',
  'offer.html',
  'disclosures.html',
  'privacy.html',
];

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
    for (const href of ['/how-it-works', '/values', '/markets', '/investors', '/offer']) {
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

  // The brand speaks for itself; individuals are never named in the site's own
  // copy. Quoted testimonials are the one exception — a reviewer saying
  // "thankful to Stephen" is their words, and editing them would be worse.
  it('names no individual person outside a quoted testimonial', () => {
    const withoutQuotes = html.replace(/<section[^>]*id="testimonials"[\s\S]*?<\/section>/g, '');
    for (const name of ['Stephen', 'Phillip', 'Dougherty', 'brothers']) {
      expect(withoutQuotes, `"${name}" appears in ${page} outside a testimonial`)
        .not.toContain(name);
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

  it('posts to the lead endpoint and declares itself a seller submission', () => {
    expect(html).toMatch(/<form[^>]+action="\/api\/lead"[^>]*>/);
    expect(html).toMatch(/<form[^>]+method="POST"/i);
    expect(html).toMatch(/name="leadType"[^>]*value="seller"/);
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

/**
 * The site was originally written as if Stag bought the properties itself.
 * It does not — it sources for developer and investor clients. These assertions
 * exist so that positioning cannot quietly regress through a copy edit.
 */
describe('positioning — we source, we are not the end buyer', () => {
  const CLAIMS_TO_BUYING_ITSELF = [
    'buying with its own capital',
    'we buy with our own money',
    'buys with its own capital',
    'Private buyers.',
    'the person who signs the check',
    'How we actually buy your house',
    'Family-Owned Cash Home Buyers',
  ];

  it.each(PAGES)('%s never claims Stag is the buyer', (page) => {
    const copy = text(page);
    for (const claim of CLAIMS_TO_BUYING_ITSELF) {
      expect(copy, `"${claim}" still appears in ${page}`).not.toContain(claim);
    }
  });

  it('the homepage explains the sourcing model in the first section', () => {
    const copy = text('index.html');
    expect(copy).toContain('Developers and investors tell us');
    expect(copy).toContain('specialized acquisitions');
  });

  it('how-it-works answers who actually buys the property', () => {
    const copy = text('how-it-works.html');
    expect(copy).toContain('Who actually buys the property?');
    expect(copy).toContain('developers or investors we work with');
  });

  it('the seller page names the client as the buyer, not Stag', () => {
    const copy = text('offer.html');
    expect(copy).toContain('developer and investor clients');
  });

  it('llms.txt tells assistants Stag is not the end buyer', () => {
    const body = readFileSync(join(dist, 'llms.txt'), 'utf8');
    expect(body).toContain('not the end buyer');
    expect(body).not.toContain('buys with its own capital');
  });
});

describe('investors.html — the buy-box form', () => {
  const html = read('investors.html');

  it('posts to the lead endpoint and declares itself a buy-side submission', () => {
    expect(html).toMatch(/<form[^>]+action="\/api\/lead"[^>]*>/);
    expect(html).toMatch(/<form[^>]+method="POST"/i);
    expect(html).toMatch(/name="leadType"[^>]*value="investor"/);
  });

  it('has every buy-box field the endpoint reads', () => {
    for (const name of [
      'firstName',
      'lastName',
      'organization',
      'phone',
      'email',
      'assetTypes',
      'targetMarkets',
      'priceRange',
      'scope',
      'volume',
      'financing',
      'notes',
      'smsConsent',
      'company',
    ]) {
      expect(html, name).toContain(`name="${name}"`);
    }
  });

  it('offers every asset type as a separate checkbox, so more than one can be picked', () => {
    const checkboxes = [...html.matchAll(/name="assetTypes"/g)];
    expect(checkboxes.length).toBeGreaterThanOrEqual(6);
    expect(html).toContain('Teardown / redevelopment');
    expect(html).toContain('Small multifamily (2–4)');
  });

  it('offers the price, scope, volume, and financing choices', () => {
    for (const option of [
      '$1M – $3M',
      'Teardown and rebuild',
      '12+ deals a year',
      'Fund or institutional capital',
    ]) {
      expect(html, option).toContain(option);
    }
  });

  it('marks name and phone required, but never the buy-box detail', () => {
    for (const id of ['field-first-name', 'field-phone']) {
      const field = html.match(new RegExp(`<input[^>]*id="${id}"[^>]*>`))?.[0] ?? '';
      expect(field, id).toContain('required');
    }
    const markets = html.match(/<input[^>]*id="field-markets"[^>]*>/)?.[0] ?? '';
    expect(markets).not.toContain('required');
  });

  it('labels every visible field', () => {
    for (const id of [
      'field-first-name',
      'field-last-name',
      'field-org',
      'field-phone',
      'field-email',
      'field-markets',
      'field-price',
      'field-scope',
      'field-volume',
      'field-financing',
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
    const copy = text('investors.html');
    expect(copy).toContain('Consent is not a condition of working with us');
    expect(copy).toContain('STOP');
    expect(copy).toContain('Message and data rates may apply');
    expect(copy).toContain('Message frequency varies');
    expect(html).toContain('href="/privacy#sms-messaging"');
  });

  it('ships a success panel and an error banner for the enhanced flow', () => {
    expect(html).toContain('id="form-success"');
    expect(html).toContain('id="form-status"');
  });
});

/**
 * The assignment disclosure is the thing that closes the gap between the
 * general marketing language and what a seller actually needs to understand.
 * It has to be reachable from every page and unavoidable at the point of
 * collection — a disclosure only in the footer is materially weaker.
 */
/**
 * Most traffic is expected to be sellers arriving from direct-mail and outbound
 * campaigns, which land on the root domain. The homepage is built for them; the
 * buy side keeps a complete path but not the primary position.
 */
/**
 * Landing pages are campaign destinations for direct mail and outbound. They
 * are built for someone holding a postcard: the form sits near the top, the
 * copy names the city, and every submission is tagged so the campaign can be
 * measured.
 */
describe('404 page', () => {
  it('builds, and Cloudflare is told to serve it', () => {
    expect(readdirSync(dist)).toContain('404.html');
    const wrangler = readFileSync(join(root, 'wrangler.jsonc'), 'utf8');
    expect(wrangler).toContain('"not_found_handling": "404-page"');
  });

  it('recovers the visit instead of dead-ending', () => {
    const html = read('404.html');
    // A mistyped postcard URL is the likeliest way anyone gets here.
    expect(html).toContain('href="/offer"');
    expect(html).toContain('href="tel:+12164888920"');
    for (const slug of ['nashville', 'brentwood', 'charlotte', 'scottsdale']) {
      expect(html, slug).toContain(`href="/${slug}"`);
    }
  });

  it('suggests the nearest market when the path is a near miss', () => {
    const html = read('404.html');
    expect(html).toContain('did-you-mean');
    expect(html).toContain('Did you mean');
  });

  it('is excluded from search results', () => {
    expect(read('404.html')).toContain('noindex');
  });

  it('renders a legible nav without a hero to sit on', () => {
    // The transparent nav is cream-on-photo; with no hero it would be
    // cream-on-cream. Both the CSS and the script must hold the solid state.
    const html = read('404.html');
    // `.hero-cta` is a different class token, so match the header itself.
    expect(html).not.toMatch(/<header[^>]*class="hero/);
    const dir = join(dist, '_astro');
    const sheet = readFileSync(join(dir, readdirSync(dir).find((f) => f.endsWith('.css'))!), 'utf8');
    expect(sheet).toContain(':not(:has(.hero))');
    // The nav script is inlined per page, so the JS guard lives in the markup.
    expect(html).toMatch(/querySelector\((["'])\.hero\1\)/);
  });
});

/**
 * Testimonials must be real. Fabricated endorsements are unlawful under the
 * FTC rule and would discredit a site whose values page is about honest
 * weights. The section renders nothing while there are none.
 */
describe('testimonials', () => {
  it('renders no empty section while there are none to show', async () => {
    const { testimonials } = await import('../src/data/site');
    if (testimonials.length === 0) {
      for (const page of PAGES) {
        expect(read(page), `empty testimonial section in ${page}`).not.toContain('id="testimonials"');
      }
    }
  });

  it('requires attribution and a source on every entry', async () => {
    const { testimonials } = await import('../src/data/site');
    for (const item of testimonials) {
      expect(item.quote.trim().length, 'quote too short to be real').toBeGreaterThan(20);
      expect(item.name.trim()).not.toBe('');
      // Internal audit trail — never rendered, but must exist.
      expect(item.source.trim(), `no source recorded for "${item.name}"`).not.toBe('');
      // First name + last initial, or a bare first name. Never a full surname.
      expect(item.name, `"${item.name}" should be abbreviated`)
        .toMatch(/^[A-Z][a-z'’-]+( [A-Z]\.)?$/);
    }
  });

  /**
   * These reviews were earned at Flipstream, a separate business. Presenting
   * them as Stag's own — by editing the company name out of the quote, or by
   * dropping the provenance line — is the conduct the FTC review rule
   * prohibits, and it appropriates another company's reputation.
   */
  it('never rebrands a review earned somewhere else', async () => {
    const { testimonials } = await import('../src/data/site');
    for (const item of testimonials.filter((t) => t.earnedAt)) {
      expect(item.quote, `"${item.name}" quote rewritten to name Stag`)
        .not.toMatch(/\bStag\b/);
    }
  });

  it('attributes the section wherever a borrowed review is rendered', async () => {
    const { testimonials } = await import('../src/data/site');
    const borrowed = testimonials.filter((t) => t.earnedAt).map((t) => t.earnedAt!);
    if (borrowed.length === 0) return;

    for (const page of PAGES) {
      const html = read(page);
      if (!html.includes('id="testimonials"')) continue;
      const section = html.match(/<section[^>]*id="testimonials"[\s\S]*?<\/section>/)![0];
      // One line for the section, not one per card — but it must be there, and
      // it must name the business the reviews were actually left for.
      expect(section, `${page}: no attribution on borrowed reviews`)
        .toContain('quote-attribution');
      for (const business of new Set(borrowed)) {
        expect(section, `${page}: attribution does not name ${business}`).toContain(business);
      }
    }
  });

  it('keeps out-of-market reviews off the market landing pages', () => {
    // A Cleveland review under "Sellers in Nashville" would read as local work.
    for (const { file } of LANDING) {
      expect(read(file), `${file} shows reviews from another market`)
        .not.toContain('id="testimonials"');
    }
  });

  it('never ships placeholder or sample copy', async () => {
    const { testimonials } = await import('../src/data/site');
    const blob = JSON.stringify(testimonials).toLowerCase();
    for (const tell of ['lorem', 'ipsum', 'sample', 'placeholder', 'example.com',
                        'john doe', 'jane doe', 'testimonial goes here', 'xxx']) {
      expect(blob, `placeholder text "${tell}" in testimonials`).not.toContain(tell);
    }
  });

  it('claims no star rating of its own', async () => {
    // Google disallows self-serving review markup and penalises it.
    for (const page of PAGES) {
      const html = read(page);
      expect(html, page).not.toContain('AggregateRating');
      expect(html, page).not.toContain('"@type":"Review"');
    }
  });
});

describe('market landing pages', () => {
  it.each(LANDING)('$file leads with the city and its own metadata', ({ file, city }) => {
    const html = read(file);
    const copy = text(file);
    expect(copy).toContain(`Sell your ${city} home`);
    const title = html.match(/<title>([^<]+)<\/title>/)![1]!;
    expect(title).toContain(city);
    const desc = html.match(/<meta name="description" content="([^"]+)"/)![1]!;
    expect(desc).toContain(city);
  });

  it.each(LANDING)('$file tags its leads for campaign attribution', ({ file, tag }) => {
    expect(read(file)).toContain(`name="market" value="${tag}"`);
  });

  it.each(LANDING)('$file puts the form above the long-form copy', ({ file }) => {
    const html = read(file);
    // Someone arriving from a mailer is here to act, not to read a brochure.
    expect(html.indexOf('id="submit"')).toBeLessThan(html.indexOf('id="area"'));
    expect(html.indexOf('<form')).toBeLessThan(html.indexOf('id="reasons"'));
  });

  it.each(LANDING)('$file carries the full seller intake and the disclosure', ({ file }) => {
    const html = read(file);
    for (const name of ['firstName', 'phone', 'address', 'condition', 'timeline', 'company']) {
      expect(html, name).toContain(`name="${name}"`);
    }
    // Shared component — a landing page must not ship without the disclosure.
    expect(html).toContain('disclosure-note');
    expect(text(file)).toContain('we may assign that agreement');
  });

  it.each(LANDING)('$file names real neighbourhoods and offers the phone line', ({ file }) => {
    const html = read(file);
    const chips = [...html.matchAll(/<li>([^<]+)<\/li>/g)].map((m) => m[1]);
    expect(chips.length, 'expected a neighbourhood list').toBeGreaterThanOrEqual(8);
    expect(html).toContain('href="tel:+12164888920"');
  });

  it.each(Object.entries(FOOTPRINT))('%s lists exactly the supplied neighbourhoods', (file, expected) => {
    const chips = [...read(file).matchAll(/<li>([^<]+)<\/li>/g)].map((m) => m[1]!.trim());
    expect(chips).toEqual(expected);
  });

  it('no longer advertises Nashville areas the team does not buy in', () => {
    // These were my invention before the real footprint was supplied.
    const copy = text('nashville.html') + text('markets.html');
    for (const stale of ['East Nashville', 'Sylvan Park', 'The Nations', 'Glencliff',
                         'Woodbine', 'Antioch', 'Nolensville Pike']) {
      expect(copy, `"${stale}" is outside the stated footprint`).not.toContain(stale);
    }
  });

  it('gives each landing page distinct copy rather than one template with the name swapped', () => {
    const intros = LANDING.map(({ file }) => {
      const copy = text(file);
      return copy.slice(copy.indexOf('block by block'), copy.indexOf('block by block') + 400);
    });
    expect(new Set(intros).size, 'landing pages share identical body copy').toBe(LANDING.length);
  });

  it('carries city-scoped structured data', () => {
    for (const { file, city } of LANDING) {
      const blocks = [...read(file).matchAll(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
      )].map((m) => JSON.parse(m[1]!));
      const local = blocks.find((b) => b.areaServed?.['@type'] === 'City');
      expect(local, `no city schema in ${file}`).toBeDefined();
      expect(local.areaServed.name).toBe(city);
    }
  });

  it('reaches the landing pages from the markets page', () => {
    const html = read('markets.html');
    for (const slug of ['nashville', 'brentwood', 'charlotte', 'scottsdale']) {
      expect(html, slug).toContain(`href="/${slug}"`);
    }
  });

  it('keeps the generic seller form untagged so only campaigns are attributed', () => {
    expect(read('offer.html')).not.toContain('name="market"');
  });
});

describe('audience priority — sellers lead, investors stay one click away', () => {
  const firstCta = (html: string): string =>
    html.match(/<a class="cta"[^>]*href="([^"]+)"/)![1]!;

  it('points the homepage hero CTA at the seller intake', () => {
    expect(firstCta(read('index.html'))).toBe('/offer');
  });

  it('puts the seller sections above the buy-side pitch', () => {
    const html = read('index.html');
    const order = [...html.matchAll(/<section class="section[^"]*" id="([^"]+)"/g)].map((m) => m[1]);
    expect(order.indexOf('situations')).toBeLessThan(order.indexOf('service'));
  });

  it('leads the meta description with the seller outcome', () => {
    const desc = read('index.html').match(/<meta name="description" content="([^"]+)"/)![1]!;
    expect(desc.slice(0, 60).toLowerCase()).toContain('sell your property');
  });

  it('keeps the buy side reachable from every page and fully intact', () => {
    for (const page of PAGES) {
      expect(read(page), `no /investors link on ${page}`).toContain('href="/investors"');
    }
    // The buy-box intake must not have been trimmed to make room.
    const investors = read('investors.html');
    for (const name of ['assetTypes', 'targetMarkets', 'priceRange', 'scope', 'volume', 'financing']) {
      expect(investors, name).toContain(`name="${name}"`);
    }
    expect(text('index.html')).toContain('For the buy side');
  });
});

describe('assignment disclosure', () => {
  it.each(PAGES)('%s carries the disclosure and links the full page', (page) => {
    const copy = text(page);
    expect(copy, `no footer disclosure in ${page}`).toContain('act as a principal in our own interest');
    expect(copy).toContain('do not represent you');
    expect(read(page), `no /disclosures link in ${page}`).toContain('href="/disclosures"');
  });

  it('states the three load-bearing points on the disclosures page', () => {
    const copy = text('disclosures.html');
    // Principal, assignment, and no fiduciary duty — the whole point of the page.
    expect(copy).toContain('as a principal');
    expect(copy).toContain('we may assign that purchase agreement');
    expect(copy).toContain('we owe you no fiduciary duty');
    expect(copy).toContain('may be paid a fee or earn a profit');
    expect(copy).toContain('may not be Stag Acquisitions');
  });

  it('says nothing is binding until signed', () => {
    const copy = text('disclosures.html');
    expect(copy).toContain('Nothing is binding until it is signed');
    expect(copy).toContain('written purchase agreement');
  });

  it('puts the disclosure inside the seller form, above the submit button', () => {
    const html = read('offer.html');
    const disclosure = html.indexOf('disclosure-note');
    const submit = html.indexOf('type="submit"');
    const formOpen = html.indexOf('<form');
    const formClose = html.indexOf('</form>');

    expect(disclosure, 'no disclosure on the seller form').toBeGreaterThan(-1);
    expect(disclosure, 'disclosure is outside the form').toBeGreaterThan(formOpen);
    expect(disclosure, 'disclosure is outside the form').toBeLessThan(formClose);
    expect(disclosure, 'disclosure sits below the submit button').toBeLessThan(submit);
  });

  it('uses the standard formulation rather than adversarial phrasing', () => {
    const copy = text('disclosures.html') + text('offer.html') + text('values.html');
    expect(copy).not.toContain('best interest at heart');
  });

  it('never promises to act in the seller\'s interest anywhere on the site', () => {
    // This is the contradiction that would undo the disclosure entirely.
    const forbidden = [
      'your best interest',
      'we represent you',
      'on your side',
      'we work for you',
      'your advocate',
    ];
    for (const page of PAGES) {
      const copy = text(page).toLowerCase();
      for (const phrase of forbidden) {
        expect(copy, `"${phrase}" in ${page} contradicts the disclosure`).not.toContain(phrase);
      }
    }
  });

  it('llms.txt states the disclosure for assistants', () => {
    const body = readFileSync(join(dist, 'llms.txt'), 'utf8');
    expect(body).toContain('owes the seller no fiduciary duty');
    expect(body).toContain('may assign its purchase agreement');
  });
});

describe('values and faith', () => {
  it('names the faith plainly and anchors it with public-domain scripture', () => {
    const copy = text('values.html');
    expect(copy).toContain('Christian faith');
    expect(copy).toContain('Proverbs 11:1');
    // KJV is public domain; a modern translation would need licensing.
    expect(copy).toContain('KJV');
  });

  it('surfaces the values section on the homepage with a link through', () => {
    const html = read('index.html');
    expect(html).toContain('id="values"');
    expect(text('index.html')).toContain('built on faith.');
    expect(html).toContain('href="/values"');
  });

  it('expresses faith as conduct, not as a preference about who we deal with', () => {
    // Religion is a protected class; the copy must never imply a preference
    // about whom the company will transact with.
    const copy = text('values.html').toLowerCase();
    expect(copy).toContain('everyone who calls us');
    for (const phrase of ['christian sellers', 'christian buyers', 'like-minded believers', 'we prefer']) {
      expect(copy, phrase).not.toContain(phrase);
    }
  });

  it('the values page owns the disclosure rather than hiding from it', () => {
    const copy = text('values.html');
    expect(copy).toContain('we owe you no fiduciary duty');
    expect(read('values.html')).toContain('href="/disclosures"');
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
      'not the end buyer',
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
    ['what-we-do', ['We already know', 'who is buying.', 'Selling a property', 'Developer or investor']],
    ['situations', ['Real situations. Real buyers.', 'Tired landlord', 'Pre-foreclosure']],
    ['process', ['How a deal actually comes together.', 'A client sets the criteria', 'We go find it', 'The buyer closes', 'Full process breakdown']],
    ['service', ['You set the box', 'We filter hard', 'You stay on your projects']],
    ['final-cta', ['Send us the address.']],
  ],
  'how-it-works.html': [
    ['steps', ['How a deal actually comes together.', 'Step 01', 'Step 04']],
    ['why', ['Three questions we get every week.', 'Who actually buys the property?', 'Why not just list it?']],
    ['final-cta', ['Start where you stand.']],
  ],
  'investors.html': [
    ['problem', ['You are not short on capital.', 'The good deals never hit the MLS', 'Volume is not the same as fit']],
    ['what-you-get', ['Specialized acquisitions, defined.', 'A defined box', 'Direct-to-owner sourcing']],
    ['buy-box', ['Tell us what you are looking for.', 'What happens next', '(216) 488-8920']],
  ],
  'markets.html': [
    ['primary-markets', ['The markets we live in.', 'Nashville, Tennessee', 'Scottsdale, Arizona', 'Charlotte, North Carolina', 'Across the United States']],
    ['criteria', ['What makes a property a fit.', 'Situation', 'Numbers', 'Title']],
    ['final-cta', ['Send the address anyway.']],
  ],
  'values.html': [
    ['faith', ['A family business built on faith.', 'Christian faith', 'Proverbs 11:1']],
    ['practice', ['What that actually looks like.', 'An honest number', 'No pressure']],
    ['where-we-stand', ['being honest about us.', 'we owe you no fiduciary duty', 'Read the full disclosures']],
    ['final-cta', ['Talk to us and see.']],
  ],
  'offer.html': [['offer', ['What happens next', 'No commission.', '(216) 488-8920']]],
  'disclosures.html': [['disclosures', ['Our role', 'We may assign the agreement', 'We do not represent you']]],
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

  it('leads with the seller hero and a path for each audience', () => {
    expect(html).toContain('Sell it without');
    expect(html).toMatch(/class="cta"[^>]*href="\/offer"/);
    expect(html).toContain('href="/investors"');
    expect(html).toContain('/how-it-works');
  });

  it('describes the family-owned positioning without naming anyone', () => {
    expect(html).toContain('family-owned');
  });

  it('includes organization structured data that does not imply licensure', () => {
    const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(match).not.toBeNull();
    const schema = JSON.parse(match![1]!);
    // RealEstateAgent would assert a role we do not hold in these markets.
    expect(schema['@type']).toBe('ProfessionalService');
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

  // The ten official colours, built from the hero button green (#5C7560).
  const OFFICIAL = [
    ['mist', '#F1F3EF'],
    ['lichen', '#D3DCD2'],
    ['fern', '#8FA391'],
    ['sage', '#5C7560'],
    ['pine', '#3B4B3B'],
    ['moss', '#22251F'],
    ['paper', '#FFFFFF'],
    ['bone', '#F6F5F2'],
    ['stone-warm', '#8A867B'],
    ['char', '#14140F'],
  ] as const;

  it('defines every colour in the official palette', () => {
    const sheet = css().toUpperCase();
    for (const [token, value] of OFFICIAL) {
      expect(sheet, `--${token}: ${value}`).toContain(value.toUpperCase());
    }
  });

  it('uses no colour outside the official palette', () => {
    // Every hex in the sheet must be one of the ten, or the single sanctioned
    // addition (--danger; the palette has no error colour).
    const allowed = new Set([...OFFICIAL.map(([, v]) => v.toUpperCase()), '#B4472F']);
    const found = [...css().matchAll(/#[0-9A-Fa-f]{3,8}\b/g)]
      .map((m) => m[0].toUpperCase())
      // Expand #ABC shorthand, and drop the alpha byte the minifier folds into
      // 8-digit hex — an alpha blend of a palette colour is still on-palette.
      .map((h) => (h.length === 4 ? `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}` : h))
      .map((h) => (h.length === 9 ? h.slice(0, 7) : h));
    const stray = [...new Set(found)].filter((h) => !allowed.has(h));
    expect(stray, `off-palette colours: ${stray.join(', ')}`).toEqual([]);
  });

  /**
   * The palette has a colour named MIST (#F1F3EF, a pale background). The
   * design system separately used `--mist` as the heading/body ink. Pointing
   * one at the other rendered every heading and paragraph pale-on-pale across
   * the whole site. Ink lives in --ink-strong / --ink-body; keep it that way.
   */
  it('keeps text ink separate from the pale palette colours', () => {
    const sheet = css().replace(/\s+/g, '');
    expect(sheet).toContain('--ink-strong:var(--moss)');
    expect(sheet).toContain('--ink-body:var(--pine)');

    // No rule may paint text with one of the three pale grounds.
    const pale = ['--mist', '--lichen', '--bone', '--paper'];
    const rules = [...css().matchAll(/([^{}]+)\{([^}]*)\}/g)];
    const offenders = rules
      .filter(([, sel, decls]) => {
        if (sel.includes(':root')) return false;
        const m = decls.match(/(?:^|;)\s*color:\s*var\((--[\w-]+)\)/);
        // Light-on-dark contexts legitimately use a pale colour for text.
        const onDark = /\.hero|\.ambient|\.nav-brand|\.nav-links|\.cta\b|\.skip-link|lockup/.test(sel);
        return m && pale.includes(m[1]!) && !onDark;
      })
      .map(([, sel]) => sel.trim());
    expect(offenders, `pale text colour on: ${offenders.join(' | ')}`).toEqual([]);
  });

  it('scrims the nav so it stays legible over a bright photograph', () => {
    // The hero overlay is thinnest at top-right, which is where the nav sits.
    const sheet = css().replace(/\s+/g, '');
    expect(sheet).toContain('.nav:before');
    expect(sheet).toMatch(/\.nav:before\{[^}]*linear-gradient/);
    expect(sheet).toContain('.nav.scrolled:before{opacity:0}');
  });

  it('has no leftover literals from either retired theme', () => {
    const sheet = css().toLowerCase();
    for (const dead of ['#c39a52', '#06101c', '#4a6650', '#faf8f4', '#2c2c27', '#a8c5ac']) {
      expect(sheet, dead).not.toContain(dead);
    }
    expect(sheet).not.toContain('6,16,28');
    expect(sheet).not.toContain('195,154,82');
  });
});

describe('brand lockup', () => {
  const css = (): string => {
    const dir = join(dist, '_astro');
    const file = readdirSync(dir).find((f) => f.endsWith('.css'));
    return readFileSync(join(dir, file!), 'utf8');
  };

  it.each(PAGES)('%s renders the supplied artwork, not a placeholder', (page) => {
    const html = read(page);
    expect(html).toContain('class="stag-lockup');
    const lockup = html.match(/<svg class="stag-lockup[\s\S]*?<\/svg>/)![0];
    expect(lockup).toContain('fill-rule="evenodd"');
    // Mark and lettering are separate pieces so each can be coloured
    // independently — that is what the official variants do. Only the
    // horizontal lockup carries the divider rule.
    expect(lockup).toContain('class="lockup-mark"');
    expect(lockup).toContain('class="lockup-text"');
    expect(lockup.length).toBeGreaterThan(5000);
  });

  it.each(PAGES)('%s sizes the lockup from its own viewBox', (page) => {
    // Without width/height the SVG has no intrinsic size in the nav's flex row
    // and the artwork spills out of the bar.
    const lockup = read(page).match(/<svg class="stag-lockup[^>]*>/)![0];
    expect(lockup).toMatch(/viewBox="[\d.\s]+"/);
    expect(lockup).toMatch(/width="[\d.]+"/);
    expect(lockup).toMatch(/height="[\d.]+"/);
  });

  it('colours the artwork through CSS rather than baking fills in', () => {
    const lockup = read('index.html').match(/<svg class="stag-lockup[\s\S]*?<\/svg>/)![0];
    expect(lockup).toContain('fill="currentColor"');
    // A hard-coded brand hex here would defeat the per-context colouring.
    expect(lockup).not.toMatch(/fill="#[0-9A-Fa-f]{6}"/);
  });

  it('gives the nav the compact lockup and the footer the horizontal one', () => {
    const html = read('index.html');
    const lockups = [...html.matchAll(/<svg class="stag-lockup[^"]*"[\s\S]*?<\/svg>/g)].map((m) => m[0]);
    expect(lockups).toHaveLength(2);
    // Compact stacks STAG over ACQUISITIONS, so it reads at nav size where the
    // single-line horizontal lockup does not.
    expect(lockups[0]).toContain('stag-lockup-compact');
    expect(lockups[1]).toContain('stag-lockup-horizontal');

    const aspect = (svg: string) => {
      const [, , w, h] = svg.match(/viewBox="([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)"/)!.slice(1).map(Number);
      return w / h;
    };
    expect(aspect(lockups[0]!)).toBeLessThan(aspect(lockups[1]!));
    // The divider rule belongs to the horizontal artwork only.
    expect(lockups[0]).not.toContain('lockup-rule');
    expect(lockups[1]).toContain('lockup-rule');
  });

  it('applies the official two-tone treatment in both contexts', () => {
    // The minifier merges selectors that share a declaration, so match on the
    // parsed rule rather than on an exact selector string.
    const sheet = css().replace(/@media[^{]*\{/g, '');
    const declsFor = (selector: string): string =>
      [...sheet.matchAll(/([^{}]+)\{([^}]*)\}/g)]
        .filter((m) => m[1]!.split(',').some((sel) => sel.trim() === selector))
        .map((m) => m[2]!)
        .join(';');

    // On dark: the all-white variant. On light: sage mark, char lettering.
    expect(declsFor('.nav-brand .lockup-mark')).toContain('fill:var(--paper)');
    expect(declsFor('.nav-brand .lockup-text')).toContain('fill:var(--paper)');
    expect(declsFor('.nav.scrolled .nav-brand .lockup-mark')).toContain('fill:var(--sage)');
    expect(declsFor('.nav.scrolled .nav-brand .lockup-text')).toContain('fill:var(--char)');
    expect(declsFor('.footer-wordmark .lockup-mark')).toContain('fill:var(--sage)');
    expect(declsFor('.footer-wordmark .lockup-text')).toContain('fill:var(--char)');
  });

  it('ships a real favicon rather than a drawn-on letter', () => {
    const html = read('index.html');
    expect(html).toContain('href="/favicon.svg"');
    const favicon = readFileSync(join(dist, 'favicon.svg'), 'utf8');
    expect(favicon).toContain('fill-rule="evenodd"');
    expect(favicon).toContain('#5C7560');
    expect(favicon.length).toBeGreaterThan(2000);
  });
});

describe('lockup consistency', () => {
  const css = (): string => {
    const dir = join(dist, '_astro');
    const file = readdirSync(dir).find((f) => f.endsWith('.css'));
    return readFileSync(join(dir, file!), 'utf8');
  };

  const lockupsIn = (page: string): string[] =>
    [...read(page).matchAll(/<svg class="stag-lockup[\s\S]*?<\/svg>/g)].map((m) => m[0]);

  it.each(PAGES)('%s renders exactly two lockups', (page) => {
    const lockups = lockupsIn(page);
    expect(lockups.length, `expected 2 lockups in ${page}`).toBe(2);
    expect(lockups[1]).toContain('footer-wordmark');
  });

  it('renders byte-identical lockups on every page', () => {
    // The nav and footer wordmarks once diverged typographically because each
    // was set in CSS. Both are outlined artwork from one component now; holding
    // each slot identical across pages is what stops them drifting again.
    const [navFirst, footFirst] = lockupsIn(PAGES[0]!);
    for (const page of PAGES.slice(1)) {
      const [nav, foot] = lockupsIn(page);
      expect(nav, `nav lockup differs on ${page}`).toBe(navFirst);
      expect(foot, `footer lockup differs on ${page}`).toBe(footFirst);
    }
  });

  it('no longer ships the retired text wordmark', () => {
    for (const page of PAGES) {
      const html = read(page);
      expect(html, page).not.toContain('wordmark-text');
      expect(html, page).not.toContain('<strong>STAG</strong>');
    }
    expect(css()).not.toContain('.footer-brand');
  });
});
