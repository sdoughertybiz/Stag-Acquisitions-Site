# Stag Acquisitions — marketing site

Astro 5 marketing site for **Stag Acquisitions**, a family-owned specialized
acquisitions firm. Developers and investors give Stag a defined buy box; Stag
sources off-market property that matches it.

The site serves **both sides of that business** on split paths: sellers submit a
property at `/offer`, and buy-side clients submit acquisition criteria at
`/investors`. Static pages plus one server route that pushes both intakes into
Follow Up Boss as leads assigned to **Stephen Dougherty**.

> **Positioning matters here.** Stag is *not* the end buyer — it sources for its
> clients. Copy must never say the company buys with its own capital. See
> `test/pages.test.ts` → "positioning — we source, we are not the end buyer",
> which fails the build if that language comes back.

> **The assignment disclosure is load-bearing.** Because the marketing copy uses
> general language about the model, the disclosure is what actually tells a
> seller that we act as a principal, may assign the agreement, and owe them no
> fiduciary duty. It renders in three places — the footer of every page, inside
> the seller form above the submit button, and in full at `/disclosures` — all
> from constants in `src/data/site.ts`. `test/pages.test.ts` → "assignment
> disclosure" enforces all three, and also fails the build on any copy that
> would contradict it (`your best interest`, `on your side`, `we work for you`,
> and similar). If a test there fails, fix the copy, not the test.

Deployed to Cloudflare Workers with static assets. **Pushing to `main` deploys
automatically** — see [Deploying](#deploying).

> **Working on this repo?** Read
> [Working on this codebase](#working-on-this-codebase) first. Several things
> here look like bugs and are not.

> The local directory is still `dougherty-acq-site` from before the rebrand.
> The repo and the Worker are both `stag-acquisitions-site`; only the folder
> on disk lags, and renaming it is safe if you want to.

> **Cloudflare account.** `wrangler.jsonc` deliberately has no `account_id`.
> It used to, and the hardcoded value pointed at a different account, so
> deploys failed with a permissions error that looked like a build failure.
> Wrangler now resolves the account from `wrangler login` locally, and from
> the `CLOUDFLARE_ACCOUNT_ID` secret in CI.

---

## Quick start

```bash
npm install
cp .dev.vars.example .dev.vars    # then paste your real FUB_API_KEY
npm run dev                       # http://localhost:4321
```

`npm run dev` runs Astro's dev server with the Cloudflare platform proxy, so
`.dev.vars` is available to the API route exactly as it will be in production.

To exercise the real Worker runtime and asset routing:

```bash
npm run build
npx wrangler dev --port 8787      # http://localhost:8787
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Astro dev server |
| `npm run build` | Build to `dist/` |
| `npm run preview` | Serve the built Worker locally via wrangler |
| `npm test` | Vitest suite (builds first if `dist/` is missing) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run check` | `astro check` type checking |
| `npm run smoke:fub` | Live end-to-end check against the real FUB account |
| `npm run deploy` | Build and `wrangler deploy` |

## Pages

| Route | File |
| --- | --- |
| `/` | `src/pages/index.astro` |
| `/how-it-works` | `src/pages/how-it-works.astro` |
| `/markets` | `src/pages/markets.astro` |
| `/values` | `src/pages/values.astro` — faith, values, and where we stand |
| `/investors` | `src/pages/investors.astro` — buy-side pitch + buy-box form |
| `/offer` | `src/pages/offer.astro` — the seller intake form |
| `/disclosures` | `src/pages/disclosures.astro` — the full assignment disclosure |
| `/privacy` | `src/pages/privacy.astro` — includes `#sms-messaging` terms |
| `POST /api/lead` | `src/pages/api/lead.ts` — the only non-prerendered route |

## Brand artwork

The lockup lives in `src/components/StagLockup.astro` as inline SVG with three
variants:

| Variant | Aspect | Used by |
| --- | --- | --- |
| `compact` | ~4:1 | the nav — STAG stacked over ACQUISITIONS, so it reads at 40px |
| `horizontal` | ~5.4:1 | the footer, where there is width to spare |
| `stacked` | ~1.1:1 | unused so far; available for square placements |

Three things to know before touching it:

- **It is generated, not hand-written.** The supplied files are 1px raster
  traces — ~17,000 vertices and 140KB each. They are simplified with
  Ramer-Douglas-Peucker at a 1.2-unit tolerance (~88% smaller) and cropped to
  the ink, since the originals carry a wide clear-space margin that shrinks the
  lettering to nothing at nav size. At the sizes the site renders, the result
  differs from the original by under 2% of its edge pixels.
- **Colour comes from CSS, not the file.** Every piece is `currentColor` and
  carries its own class — `lockup-mark`, `lockup-text`, `lockup-rule` — so one
  copy of the artwork reproduces every official variant. The two-tone rules are
  the official ones: fern mark with white lettering on dark, sage mark with
  char lettering on light.
- **`width`/`height` attributes are required.** Without them the SVG has no
  intrinsic size in the nav's flex row and the artwork spills out of the bar.

`public/favicon.svg` is the weighted icon variant, which is drawn heavier so it
survives at tab size.

## Editing content

Almost everything a non-developer would change lives in **`src/data/site.ts`**:
brand name, phone number, nav, the homepage path chooser, market regions,
service areas, the seller form's condition/timeline options, the buy-box form's
asset types, price ranges, scope, volume, and financing options, the company
values, the scripture anchor, and every version of the assignment disclosure
(`DISCLOSURE_FOOTER`, `DISCLOSURE_SHORT`, `disclosureSections`). Page copy lives
in the frontmatter arrays at the top of each `.astro` page.

The scripture in `site.ts` is King James Version, which is public domain. Do not
swap in a modern translation without checking its licensing terms — most are
copyrighted and carry attribution requirements.

## Follow Up Boss integration

`POST /api/lead` serves **both** forms. A hidden `leadType` field (`seller` or
`investor`) selects which shape is validated, which FUB event type is sent, and
which page a no-JS submission is redirected back to. Anything that is not
explicitly `investor` is treated as a seller, so an older cached form still
works.

It maps the form onto FUB's
[`POST /v1/events`](https://docs.followupboss.com/reference/events-post) schema —
a seller submission looks like this:

```jsonc
{
  "source": "StagAcquisitions.com",
  "system": "StagAcqSite",
  "type": "Seller Inquiry",
  "message": "Property / condition / timeline / SMS consent / notes",
  "person": {
    "firstName": "…", "lastName": "…",
    "emails":  [{ "value": "…", "type": "home"   }],
    "phones":  [{ "value": "…", "type": "mobile" }],
    "addresses": [{ "type": "home", "street": "…", "city": "…", "state": "…", "code": "…" }],
    "tags": ["Website Lead", "Seller"],
    "assignedTo": "Stephen Dougherty",
    "assignedUserId": 1
  },
  "property": { "street": "…", "city": "…", "state": "…", "code": "…" }
}
```

A buy-box submission differs in three ways: `type` is `General Inquiry`, the tag
is `Investor` rather than `Seller`, and there is **no** `property` block or
person `addresses` — a buy box has no single address, so the criteria go in the
event `message` instead.

Notes on the implementation:

- **Auth** is HTTP Basic with the API key as the username and an empty
  password. The key lives only in the Worker — it never reaches the browser.
- **Assignment** is sent both by name and by numeric id (`1`). The id is
  unambiguous if the display name is ever edited in FUB.
- **Address parsing** (`src/lib/parse.ts`) splits a single-line address into
  street/city/state/ZIP. Anything it cannot confidently assign stays in
  `street`, and the raw text is always preserved — no detail is ever lost.
- **Success** is `200`, `201`, or `204`. A `204` means a FUB lead flow archived
  the event, which is still a delivered lead.
- **Failures** return `502` with a friendly fallback message. The API key and
  upstream error text are never echoed to the browser — only logged.
- **Honeypot**: a hidden `company` field. If it is filled the endpoint returns
  success and silently drops the submission without calling FUB.
- **No JS required.** The form posts natively and the endpoint replies `303` to
  `/offer?status=…` or `/investors?status=…` depending on the intake; with JS it
  posts JSON and swaps in an inline success panel.
- **Multi-select fields.** `src/scripts/lead-form.ts` serializes the form by
  hand rather than with `Object.fromEntries`, which would keep only the last
  value of a repeated field and silently reduce the buy-box asset-type
  checkboxes to a single selection.

Server-side validation requires first name and phone on both intakes, plus the
property address on the seller intake only. Everything else is marked required
in the markup but is *not* enforced server-side — a partially filled lead is
still worth having.

### Environment variables

| Name | Required | Notes |
| --- | --- | --- |
| `FUB_API_KEY` | **yes** | Secret. FUB → Admin → API |
| `FUB_SYSTEM_KEY` | no | Only if you [register the system](https://apps.followupboss.com/system-registration). When unset the `X-System` headers are omitted and Basic auth alone is used. |
| `FUB_SOURCE` | no | Default `StagAcquisitions.com` |
| `FUB_SYSTEM` | no | Default `StagAcqSite` |
| `FUB_ASSIGNED_TO` | no | Default `Stephen Dougherty` |
| `FUB_ASSIGNED_USER_ID` | no | Default `1` |

Non-secret defaults live in `wrangler.jsonc` under `vars`. Set the secret with:

```bash
npx wrangler secret put FUB_API_KEY
```

## Tests

198 tests across five files, no network access required:

- `test/parse.test.ts` — name splitting, phone normalization, address parsing
- `test/validate.test.ts` — required fields, honeypot, truncation, consent
- `test/fub.test.ts` — payload shape, auth headers, every FUB response code
- `test/handler.test.ts` — the endpoint end to end with a fake `fetch`
- `test/pages.test.ts` — rendered HTML: form fields, labels, SMS disclosures,
  canonical URLs, per-section content, the AI crawler surface, the brand
  palette, the wordmark lockup, and assertions that no secret, email address,
  or personal name ever appears in the output

`test/pages.test.ts` reads from `dist/`. A global setup builds it if missing,
but it will happily assert against a **stale** build — run `rm -rf dist` before
`npm test` if results look impossible.

`npm run smoke:fub` is the only test that touches the real CRM. It submits one
clearly-marked lead through a running local server, verifies the fields and the
assignment landed, then deletes the person. Pass `KEEP_LEAD=1` to skip cleanup.

## Design notes

- **Type:** Playfair Display (headings) + Manrope (everything else). Both are
  set on `--f-display` / `--f-body` in `src/styles/global.css`; swapping the
  pair means changing those two variables and the Google Fonts `<link>` in
  `src/layouts/Base.astro`.
- **Palette:** cream `#FAF8F4`, sage `#4A6650`, bark `#2C2C27`, taken from the
  brand's reference artwork. See the token warning below before renaming any of
  it.
- **Backdrops** are architectural stills with a slow Ken Burns drift rather
  than video — the freely-hosted stock video available was all coastal/resort
  footage, and four autoplaying 1080p loops is a poor trade on mobile.
- **Contrast rhythm:** the page is light, but heroes and `.section.ambient`
  bands stay dark over photography with cream type. That is deliberate; cream
  body text directly on a photo is unreadable.
- **Scroll reveals** use `IntersectionObserver`; anything above the fold
  reveals immediately, and a `<noscript>` block shows everything when JS is
  off. `prefers-reduced-motion` disables the drift and the reveals outright.
- **The stag mark** (`src/components/StagMark.astro`) is the brand's own
  artwork — a single `evenodd` path on a `0 0 1500 1500` viewBox, inheriting
  `currentColor`. It is rendered only through `Wordmark.astro`.

## Deploying

Deployment is automated. **Merging to `main` (or pushing to it) builds, tests,
and deploys**, then smoke-checks the live URLs.

- `.github/workflows/ci.yml` — runs on every PR and on `main`: typecheck →
  build → test → a grep that fails if a FUB key appears in `dist/`.
- `.github/workflows/deploy.yml` — runs the same checks on `main`, deploys, and
  verifies every route returns 200.

The only repo secret is **`CLOUDFLARE_API_TOKEN`** (Settings → Secrets and
variables → Actions), created from the "Edit Cloudflare Workers" token template.
The account id is not secret and lives in `wrangler.jsonc`.

**Prefer pushing over deploying by hand.** `npm run deploy` works and is fine
for a hotfix, but run from a feature branch it ships unreviewed code straight to
production and leaves `main` no longer matching what is live.

To attach a custom domain, add a `routes` entry to `wrangler.jsonc` and update
`site` in `astro.config.mjs` **and** `url` in `src/data/site.ts` together — see
the warning below about those two staying in sync.

To attach a custom domain, add a `routes` entry to `wrangler.jsonc` and update
`site` in `astro.config.mjs` plus `url` in `src/data/site.ts` so canonical URLs,
`og:url`, and `robots.txt` all match.

---

## Working on this codebase

Written for whoever picks this up next, human or AI. Several things below look
like mistakes and are deliberate; the rest are traps that have already caused a
real bug at least once.

### Things that look like bugs but are not

**1. The wordmark uses the body font, not the display serif.**
`STAG / ACQUISITIONS` in the nav and footer renders in Manrope while every
heading is Playfair Display. This is a deliberate, signed-off choice. It began
as an accident — wrapping the nav text in a `<span>` caught a
`font-family: var(--f-body)` rule — but the client preferred it, so it is now
set explicitly in `.wordmark-text`. Do not "harmonize" it with the headings.
Both placements render from one `Wordmark.astro`, so they cannot drift again.

**2. The color tokens are named for a theme that no longer exists.**
This site was built dark navy and brass, then rebranded to cream and sage. To
avoid touching ~200 rules, the old role names were kept as aliases:

```css
--brass: var(--sage);   /* brass is GREEN  */
--void:  var(--cream);  /* void is CREAM   */
--mist:  var(--bark);   /* mist is NEAR-BLACK */
--ink:   #F4F1EA;       /* ink is a LIGHT surface */
```

The names lie. Renaming them requires updating every usage in the same commit;
a partial rename silently produces an unreadable page. If you do rename them,
`test/pages.test.ts` asserts the brand hex values are present in the built CSS,
which will catch a botched job.

**3. Condition and timeline are `required` in the markup but not on the server.**
Deliberate. A partially filled lead is still a lead worth having. Only first
name, phone, and property address are enforced in `validateLead`.

**4. Address parsing is lenient and never fails.**
`parseAddress` works backwards from the ZIP and drops anything it cannot place
into `street`, always preserving the raw input. Do not make it strict — a
rejected submission is a lost customer, and Follow Up Boss receives the full
raw address regardless.

**5. `.scroll-indicator` centers with `left/right: 0` and `margin-inline: auto`,
not `left: 50%; transform: translateX(-50%)`.**
As an absolutely-positioned child of a flex container, the percentage resolved
against the wrong box and sat visibly off-center on narrow screens. The verbose
version is the correct one.

**6. One personal name remains, on purpose.**
`FUB_ASSIGNED_TO` in `src/lib/env.ts` routes leads to a named CRM user. Public
copy names nobody, and a test asserts that "Stephen", "Phillip", "Dougherty",
and "brothers" appear on zero rendered pages. These two facts are not in
conflict — do not "fix" either one to match the other.

### Traps that have already caused a bug here

**Never bulk-edit `.astro` templates with a regex.**
This is the single most damaging thing done to this repo so far. A pattern
intended to swap a `<div>` matched greedily across closing tags and deleted the
entire body of all four `.section.ambient` blocks — the process grid, both
final CTAs, the FAQ callouts, and the markets fit-test. Everything still built.
Every test still passed. The only symptom was blank bands in a screenshot.

Edit templates file by file with exact-match edits. `test/pages.test.ts` now
asserts per-section content and that no ambient section renders as a bare
backdrop, but those tests only cover the sections that exist today.

**The site URL is defined in two places and they must agree.**
`site` in `astro.config.mjs` feeds the sitemap; `url` in `src/data/site.ts`
feeds canonical tags and `og:url`. They were out of sync once and the sitemap
was published for the wrong domain. A test now compares them — keep it.

**`public/.assetsignore` is load-bearing.**
It stops `_worker.js` being uploaded as a public static asset. Without it
`wrangler deploy` refuses to run, and the failure mode it prevents is serving
your server bundle to the internet. Do not delete it.

### Architecture facts you cannot infer from the file tree

- **Only `/api/lead` runs on the server.** Every page is prerendered. A new
  server route needs `export const prerender = false`, or it is built to static
  HTML and silently stops working.
- **`build.format: 'file'`** emits `dist/offer.html`, which Cloudflare serves at
  `/offer`. `Base.astro` strips the `.html` when building canonical URLs. If you
  switch to directory format, update that logic and the test expectations.
- **Env vars reach the Worker through `locals.runtime.env`**, not
  `process.env` or `import.meta.env`. `src/lib/handler.ts` is deliberately
  framework-free so it can be tested with a plain `Request` and a fake `fetch`.
- **`.dev.vars` holds a real Follow Up Boss API key.** It is git-ignored. Never
  commit it, never echo it, never paste it into a log or a commit message.
- **`npm run smoke:fub` writes to the client's live CRM.** It creates a
  clearly-marked test person and deletes it afterwards, but it is not a casual
  command. Everything in `npm test` is offline and safe.
- **Node 22** in CI. `npm ci` there, so `package-lock.json` must stay committed
  and in sync.

### Before you open a PR

```bash
rm -rf dist && npm test && npm run check
```

Then look at the page. Several defects in this project's history — a wrong-brand
sitemap, four gutted sections, an off-center element, unreadable type over a
photo — passed every automated check and were only visible on screen. Rendering
the page in a browser at both a desktop and a mobile width is part of the work,
not an optional extra.

---

## Known advisories

`npm audit` reports issues in transitive dev dependencies (miniflare, sharp,
esbuild, ws) with no fixed versions published, plus an Astro advisory for
`define:vars` — a feature this site does not use. Nothing ships to the browser
from those packages.
