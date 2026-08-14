# Stag Acquisitions — marketing site

Astro 5 marketing site for **Stag Acquisitions**, a family-owned real estate
investment group. Static pages plus one server route that pushes seller
inquiries into Follow Up Boss as leads assigned to **Stephen Dougherty**.

Deployed to Cloudflare Workers with static assets.

> The directory, repo, and Worker are still named `dougherty-acq-site` from
> before the rebrand. That is deliberate — only the brand changed.

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
| `/offer` | `src/pages/offer.astro` — the lead form |
| `/privacy` | `src/pages/privacy.astro` — includes `#sms-messaging` terms |
| `POST /api/lead` | `src/pages/api/lead.ts` — the only non-prerendered route |

## Editing content

Almost everything a non-developer would change lives in **`src/data/site.ts`**:
brand name, contact email, nav, market regions, and the condition/timeline
dropdown options. Page copy lives in the frontmatter arrays at the top of each
`.astro` page.

## Follow Up Boss integration

`POST /api/lead` maps the form onto FUB's
[`POST /v1/events`](https://docs.followupboss.com/reference/events-post) schema:

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
  `/offer?status=…`; with JS it posts JSON and swaps in an inline success panel.

Server-side validation requires first name, phone, and property address.
Condition and timeline are marked required in the markup but are *not* enforced
server-side — a partially filled lead is still worth having.

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

132 tests across five files, no network access required:

- `test/parse.test.ts` — name splitting, phone normalization, address parsing
- `test/validate.test.ts` — required fields, honeypot, truncation, consent
- `test/fub.test.ts` — payload shape, auth headers, every FUB response code
- `test/handler.test.ts` — the endpoint end to end with a fake `fetch`
- `test/pages.test.ts` — rendered HTML: form fields, labels, SMS disclosures,
  canonical URLs, and assertions that no secret ever appears in the output

`npm run smoke:fub` is the only test that touches the real CRM. It submits one
clearly-marked lead through a running local server, verifies the fields and the
assignment landed, then deletes the person. Pass `KEEP_LEAD=1` to skip cleanup.

## Design notes

- Fraunces (display) + Jost (body/UI), dark navy `#06101c` with brass `#c39a52`.
- Backdrops are architectural stills with a slow Ken Burns drift rather than
  video — the freely-hosted stock video available was all coastal/resort
  footage, and four autoplaying 1080p loops is a poor trade on mobile.
- Scroll reveals use `IntersectionObserver`; anything above the fold reveals
  immediately, and a `<noscript>` block shows everything when JS is off.
- The stag mark is a self-contained SVG in `src/components/StagMark.astro`.
  To swap in a supplied asset, drop it in `public/` and replace that component's
  body with an `<img>` — it is used in the nav and footer only.

## Deploying

```bash
npx wrangler login
npx wrangler secret put FUB_API_KEY
npm run deploy
```

To attach a custom domain, add a `routes` entry to `wrangler.jsonc` and update
`site` in `astro.config.mjs` plus `url` in `src/data/site.ts` so canonical URLs,
`og:url`, and `robots.txt` all match.

## Known advisories

`npm audit` reports issues in transitive dev dependencies (miniflare, sharp,
esbuild, ws) with no fixed versions published, plus an Astro advisory for
`define:vars` — a feature this site does not use. Nothing ships to the browser
from those packages.
