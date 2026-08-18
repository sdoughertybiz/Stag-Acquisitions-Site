/**
 * Single source of truth for brand, contact, and market content.
 * Everything a non-developer would want to change lives here.
 */

export const site = {
  name: 'Stag Acquisitions',
  shortName: 'STAG',
  wordmarkSuffix: 'Acquisitions',
  tagline: 'Family-owned · Specialized acquisitions',
  legalEntity: 'Stag Acquisitions',
  url: 'https://stagacquisitions.com',
  description:
    'Sell your property off-market, without listing it. Stag Acquisitions is a family-owned specialized acquisitions firm — developers and investors tell us what they are buying, and we source the properties that match. No commission, no showings, no repairs.',
  // Both sides call or text this line; there is no public inbox.
  phone: '+12164888920',
  phoneDisplay: '(216) 488-8920',
} as const;

export const nav = [
  { href: '/', label: 'Home' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/values', label: 'Our Values' },
  { href: '/markets', label: 'Markets' },
  { href: '/investors', label: 'For Investors' },
  { href: '/offer', label: 'Sell A Property' },
] as const;

/**
 * Scripture anchor for the values page and the homepage values section.
 *
 * King James Version, which is public domain — do not swap in a modern
 * translation without checking its licensing terms first.
 */
export const scripture = {
  text: 'A false balance is abomination to the LORD: but a just weight is his delight.',
  reference: 'Proverbs 11:1',
  translation: 'KJV',
} as const;

/**
 * What the company holds itself to. Deliberately written as conduct rather
 * than as promises about whose side we are on — see `assignmentDisclosure`,
 * which states plainly that we act in our own interest. Nothing here may
 * contradict that.
 */
export const values = [
  {
    title: 'An honest number',
    body: 'We tell you what we can actually do, not the figure most likely to get a signature. If it changes, you hear why.',
  },
  {
    title: 'Straight answers',
    body: 'Including when the answer is no. If a property is not a fit, we say so that day instead of leaving you waiting on a call that is not coming.',
  },
  {
    title: 'No pressure',
    body: 'You can walk away at any point before signing, and we will not chase you. A decision made in a hurry is not one we want.',
  },
  {
    title: 'We do what we said',
    body: 'The number we agreed and the date we agreed are the number and the date. If we cannot hold to it, we tell you early, not at the table.',
  },
] as const;

/**
 * The two audiences the site serves. Used for the homepage path chooser and
 * anywhere the site needs to fork sellers from buy-side clients.
 */
export const paths = [
  {
    key: 'seller',
    eyebrow: 'I own a property',
    title: 'Selling a property',
    body: 'Skip the listing. Tell us the address and we will tell you whether it matches what our buyers are actively looking for — and what they are prepared to pay.',
    cta: 'Submit your property',
    href: '/offer',
  },
  {
    key: 'investor',
    eyebrow: 'I am buying',
    title: 'Developer or investor',
    body: 'Give us your buy box once. We work our markets, filter the noise, and bring you only the properties that fit — so your team stays on the projects you already own.',
    cta: 'Send us your buy box',
    // Straight to the form, not the top of the page — the label promises the
    // form, so making them scroll for it is friction we put there ourselves.
    href: '/investors#buy-box',
  },
] as const;

/** Regions listed on /markets and summarized in the footer. */
export const markets = [
  {
    label: 'Market 01',
    name: 'Nashville, Tennessee',
    body: 'The south and west side — Crieve Hall, Green Hills, Forest Hills, Oak Hill, West Meade, Belle Meade, 12 South, Berry Hill, and down the corridor into Brentwood. We know these blocks lot by lot.',
  },
  {
    label: 'Market 02',
    name: 'Scottsdale, Arizona',
    body: 'Old Town, North Scottsdale, Paradise Valley, and the greater Phoenix valley. Fast-moving inventory and a rehab market our clients work every week.',
  },
  {
    label: 'Market 03',
    name: 'Charlotte, North Carolina',
    body: 'Myers Park, Eastover, Lansdowne, Foxcroft, SouthPark, Dilworth, and Plaza Midwood — the established neighbourhoods on the south side of the city.',
  },
  {
    label: 'Everywhere else',
    name: 'Across the United States',
    body: 'Our clients buy outside our home markets too. If the address is somewhere else, send it anyway — we will tell you straight whether it is a fit.',
  },
] as const;

/** Short list used in the footer contact column. */
export const marketSummary = [
  'Nashville · Scottsdale · Charlotte',
  'And across the United States',
] as const;

/** Structured-data service areas. */
export const areaServed = [
  'Nashville, TN',
  'Scottsdale, AZ',
  'Charlotte, NC',
  'United States',
] as const;

/* ---------------------------------------------------------------------------
 * Ways to sell
 *
 * Ordered deliberately: fastest and most certain first, highest price last.
 * The trade-off between speed and money is the whole point of the page, and
 * a seller should be able to find themselves on it without being sold to.
 *
 * Options 01-03 are principal transactions — Stag contracts and may assign,
 * exactly as the disclosure says. Option 04 is not: a brokerage licensed in
 * that market lists the property and represents the seller. Stag never acts
 * as the seller\u2019s agent on any of the four, which is what keeps the sitewide
 * disclosure accurate.
 * ------------------------------------------------------------------------ */

export interface SellingOption {
  key: string;
  label: string;
  name: string;
  summary: string;
  body: string[];
  speed: string;
  price: string;
  cost: string;
  bestFor: string;
  /** Rendered as a highlighted aside under the option. */
  note?: string;
}

export const sellingOptions: SellingOption[] = [
  {
    key: 'direct',
    label: 'Option 01',
    name: 'We buy it ourselves',
    summary: 'The fastest and most certain of the four. Also the lowest number.',
    body: [
      'We purchase for our own account. There is no third party to line up and nothing to market, so this moves as fast as title will allow.',
      'We do not do this often. Most of the time one of our clients is a better fit and pays more, and we will tell you when that is the case. But it is on the table when speed matters more than anything else.',
    ],
    speed: 'As fast as title allows',
    price: 'Lowest of the four',
    cost: 'No commission, no repairs',
    bestFor: 'Certainty and speed above all',
  },
  {
    key: 'investor',
    label: 'Option 02',
    name: 'We bring it to our buyers',
    summary: 'A cash close, at a better number than we would pay ourselves.',
    body: [
      'This is what we do most. We match the property against the buy boxes our developer and investor clients have already given us, agree terms with you, and the client closes.',
      'You get the convenience of a cash deal \u2014 no listing, no showings, no repairs, no financing that can fall through \u2014 and a better number than we would offer on our own account, because there is a real pool of buyers competing for it.',
    ],
    speed: 'Days to a few weeks, on your date',
    price: 'Above a direct purchase',
    cost: 'No commission, no repairs',
    bestFor: 'Cash and certainty without leaving money on the table',
  },
  {
    key: 'sold-before-built',
    label: 'Option 03',
    name: 'Sold Before Built',
    summary:
      'We find the buyer for the new build before it is built. That is worth real money to a developer, and it goes to you.',
    body: [
      'The biggest risk on a new build is finishing it and not knowing who will buy it. We take that risk off the table. We produce digital renderings of the finished home, put it in front of the market, and secure an end buyer before construction starts.',
      'A developer who already knows their exit can pay considerably more for the property. That difference is the reason this option exists.',
      'It takes time. We usually ask for three months, which is still shorter than a typical listing runs. You pay nothing for any of it \u2014 the marketing, the renderings, the buyer search are ours, and we are paid by the developer.',
    ],
    speed: 'About three months',
    price: 'Well above a straight cash offer',
    cost: 'Nothing to you',
    bestFor: 'Sellers who want meaningfully more and can give it a quarter',
    note:
      'If no end buyer turns up, we come back to you with what we have. Where the offers were close we will ask whether a renegotiation makes sense; if it does not, you walk away with no obligation and nothing owed. And if you find your own cash offer while we are marketing, take it \u2014 we only ask to be covered for what we spent on marketing. Tying people up so they cannot sell their own property is not how we work.',
  },
  {
    key: 'traditional',
    label: 'Option 04',
    name: 'A traditional sale',
    summary: 'Top of market, listed by a brokerage licensed where your property is.',
    body: [
      'If the house is in good shape \u2014 recently renovated, nothing deferred, nothing a buyer would flinch at \u2014 and you are not in a hurry, the open market will usually beat any off-market number. When that is true we will say so rather than talk you out of it.',
      'We introduce you to a brokerage licensed in your market, and they list it properly. They represent you in that sale. We do not, and we are not a brokerage.',
    ],
    speed: 'Months, plus the sale itself',
    price: 'Highest potential',
    cost: 'Standard commission, repairs and concessions',
    bestFor: 'Move-in-ready homes with no time pressure',
  },
];

/* ---------------------------------------------------------------------------
 * Testimonials
 *
 * REAL ONES ONLY. Every entry must be something a specific person actually
 * said, kept with a record of where it came from and their permission to use
 * it. Inventing these is illegal under the FTC rule on fake endorsements, and
 * on a site whose values page is about honest weights it is the one thing that
 * would discredit everything else on it.
 *
 * The section renders nothing while this list is empty, so the site can ship
 * today and gain the section the moment there is something true to put in it.
 *
 * Deliberately NOT marked up as schema.org AggregateRating: Google disallows
 * self-serving review markup on your own site and penalises it. Reviews you
 * collect on Google Business Profile are the ones that show up as stars.
 * ------------------------------------------------------------------------ */

export interface Testimonial {
  /** Their words, verbatim. Trim with an ellipsis if long; never rewrite. */
  quote: string;
  /** First name and last initial — enough to be a real person, not a full name. */
  name: string;
  /** Neighbourhood or city, when the review states one. Often it does not. */
  location?: string;
  /** Optional one-liner on the situation: "Inherited property". */
  context?: string;
  /**
   * The business the review was actually left for, when that is not Stag.
   * RENDERED, not internal. Reviews earned elsewhere have to say so — claiming
   * another company's reviews as your own is what the FTC rule prohibits.
   */
  earnedAt?: string;
  /** Where it came from. Internal audit trail; never rendered. */
  source: string;
}

/**
 * Empty on purpose. The section renders nothing while this list is empty, so
 * the site ships without it and gains it the moment there is a real review.
 *
 * To add one: quote verbatim, name as first-name-last-initial, and `source`
 * recording where it came from. Set `earnedAt` only if the review was left for
 * a different business — that draws the attribution line under the heading.
 */
export const testimonials: Testimonial[] = [];

/* ---------------------------------------------------------------------------
 * Market landing pages
 *
 * Campaign destinations for direct mail and outbound, one per market. The
 * slugs are short on purpose — they get printed on postcards and typed by
 * hand, so `/nashville` beats `/sell-my-house-fast-nashville-tn`.
 *
 * These are deliberately NOT in the main nav. They are landing pages, reached
 * from a campaign or from /markets, and each one tags its own leads so a
 * campaign can be measured.
 * ------------------------------------------------------------------------ */

export interface LandingMarket {
  slug: string;
  city: string;
  state: string;
  /** Value sent to Follow Up Boss so leads are attributable to a campaign. */
  tag: string;
  title: string;
  description: string;
  /**
   * Hero photograph. Chosen to match the housing stock each market actually
   * buys — mid-century brick in Nashville, large-lot estates in Brentwood,
   * historic brick in Charlotte, desert modern in Scottsdale — NOT to depict
   * the neighbourhood itself. Stock libraries have no imagery of Crieve Hall
   * or Foxcroft; city-level results are downtown and tourism shots, which are
   * the wrong subject for a page about selling a house. Replace with real
   * local photography when you have it.
   */
  heroImage: string;
  lead: string;
  intro: string[];
  neighborhoods: string[];
  /** What our buy-side clients are actively looking for in this market. */
  demand: string;
}

export const landingMarkets: LandingMarket[] = [
  {
    slug: 'nashville',
    city: 'Nashville',
    state: 'TN',
    tag: 'Nashville, TN',
    title: 'Sell Your Nashville Home Without Listing It — Stag Acquisitions',
    description:
      'Sell your Nashville home off-market — no commission, no showings, no repairs. We tell you the same day whether your property matches what our developer and investor clients are buying in Crieve Hall, Green Hills, Forest Hills, Belle Meade and the rest of the south and west side.',
    heroImage:
      'https://images.unsplash.com/photo-1783628092605-6fc6fb2a3b8c?auto=format&fit=crop&w=2400&q=80',
    lead: 'Crieve Hall, Green Hills, Forest Hills and Belle Meade — the south and west side. Tell us the address and we will tell you the same day whether it fits what our buyers are looking for.',
    intro: [
      'These are neighbourhoods where the lot usually carries the value. Much of the stock through Crieve Hall, West Meade and Forest Hills is mid-century \u2014 solid brick ranch homes on large, established lots, sitting next to new construction that makes them look older than they are.',
      'Our clients are not looking for the house that has already been renovated. They want the one that has not been touched since it was built, because the work is the point. The dated kitchen you would have to replace before listing is not something they need you to touch.',
    ],
    neighborhoods: [
      'Crieve Hall', 'Berry Hill', '12 South', 'Green Hills',
      'Forest Hills', 'Oak Hill', 'West Meade', 'Belle Meade',
    ],
    demand:
      'Renovation candidates and rebuild sites on large lots across the south and west side — Crieve Hall and West Meade ranch homes, and land in Forest Hills, Oak Hill and Belle Meade where the parcel is worth more than the structure.',
  },
  {
    slug: 'brentwood',
    city: 'Brentwood',
    state: 'TN',
    tag: 'Brentwood, TN',
    title: 'Sell Your Brentwood Home Without Listing It — Stag Acquisitions',
    description:
      'Sell your Brentwood or Williamson County home off-market — no commission, no showings, no repairs. We tell you the same day whether it matches what our developer and investor clients are buying.',
    heroImage:
      'https://images.unsplash.com/photo-1782594700873-bbeefef37e11?auto=format&fit=crop&w=2400&q=80',
    lead: 'Williamson County, straight down the corridor from the Nashville streets we already work.',
    intro: [
      'Brentwood is a different problem from Nashville proper. The lots are large, the neighborhoods are established, and a lot of the housing stock is thirty or forty years old sitting next to new construction that makes it look older than it is.',
      'Selling that on the open market usually means a renovation you do not want to fund, or a price cut that prices in the work anyway. Our clients would rather buy it as it stands and do the work themselves.',
    ],
    neighborhoods: [
      'Brenthaven', 'Concord', 'Sunset', 'Maryland Farms', 'Raintree Forest',
      'Annandale', 'Governors Club', 'Cool Springs', 'Franklin', 'Nolensville',
    ],
    demand:
      'Renovation candidates on large lots, dated-but-solid homes in established neighborhoods, and land where the value is in the parcel rather than the structure.',
  },
  {
    slug: 'charlotte',
    city: 'Charlotte',
    state: 'NC',
    tag: 'Charlotte, NC',
    title: 'Sell Your Charlotte Home Without Listing It — Stag Acquisitions',
    description:
      'Sell your Charlotte home off-market — no commission, no showings, no repairs. We tell you the same day whether your property matches what our developer and investor clients are buying in Myers Park, Eastover, Foxcroft, SouthPark and Dilworth.',
    heroImage:
      'https://images.unsplash.com/photo-1750569449345-45b897ea2190?auto=format&fit=crop&w=2400&q=80',
    lead: 'Myers Park, Eastover, Foxcroft and SouthPark — the established side of Charlotte, where the parcel usually matters more than the floor plan.',
    intro: [
      'Charlotte\u2019s established neighbourhoods are a large-lot market. Myers Park and Eastover are mature and tightly held; Foxcroft and Lansdowne carry a lot of mid-century ranch stock on parcels that support considerably more than what sits on them today.',
      'That is exactly why our clients want them as they stand. A house nobody has updated since it was built is not a discount to argue over \u2014 for a builder it is the entire opportunity.',
    ],
    neighborhoods: [
      'Myers Park', 'Eastover', 'Lansdowne', 'Foxcroft',
      'SouthPark', 'Dilworth', 'Plaza Midwood', 'Berry Hill',
    ],
    demand:
      'Rebuild sites and renovation candidates across the established south side — mid-century ranch homes in Foxcroft and Lansdowne, land in Myers Park, Eastover and SouthPark where the parcel carries the value, and bungalow renovations in Dilworth and Plaza Midwood.',
  },
  {
    slug: 'scottsdale',
    city: 'Scottsdale',
    state: 'AZ',
    tag: 'Scottsdale, AZ',
    title: 'Sell Your Scottsdale Home Without Listing It — Stag Acquisitions',
    description:
      'Sell your Scottsdale home off-market — no commission, no showings, no repairs. We tell you the same day whether it matches what our developer and investor clients are buying across the valley.',
    heroImage:
      'https://images.unsplash.com/photo-1785024773247-1e3d7fc81ee9?auto=format&fit=crop&w=2400&q=80',
    lead: 'Old Town to North Scottsdale, and the greater Phoenix valley around it.',
    intro: [
      'A lot of what we are asked to find in Scottsdale is a good lot with a tired house on it. Seventies and eighties construction on well-placed parcels is exactly what our clients want, and the dated kitchen you would have to replace before listing is not something they need you to touch.',
      'We also see a lot of second homes and inherited property here \u2014 owners two time zones away who do not want to manage a renovation, a listing, and a stream of showings from somewhere else.',
    ],
    neighborhoods: [
      'Old Town', 'North Scottsdale', 'McCormick Ranch', 'Paradise Valley',
      'Grayhawk', 'DC Ranch', 'Gainey Ranch', 'Arcadia', 'Troon', 'Tempe', 'Mesa', 'Phoenix',
    ],
    demand:
      'Teardown and rebuild parcels, dated homes on strong lots, and rehab candidates across Scottsdale and the wider valley.',
  },
];

/* ---------------------------------------------------------------------------
 * Seller intake (/offer)
 * ------------------------------------------------------------------------ */

/** Condition options on the seller form. Values are sent to Follow Up Boss verbatim. */
export const conditionOptions = [
  'Excellent — move-in ready',
  'Good — minor cosmetics',
  'Fair — some deferred maintenance',
  'Needs work — real repairs needed',
  'Major issues — down to the studs',
] as const;

/** Timeline options on the seller form. Values are sent to Follow Up Boss verbatim. */
export const timelineOptions = [
  'ASAP — within a week',
  '30 days',
  '60 days',
  '90 days',
  'Flexible / exploring',
] as const;

/* ---------------------------------------------------------------------------
 * Buy-side intake (/investors)
 * ------------------------------------------------------------------------ */

/** Asset classes a developer or investor can select. Multi-select on the form. */
export const assetTypes = [
  'Single-family',
  'Small multifamily (2–4)',
  'Multifamily (5+)',
  'Land / lots',
  'Teardown / redevelopment',
  'Commercial',
] as const;

/** Price bands for the buy box. Values are sent to Follow Up Boss verbatim. */
export const priceRanges = [
  'Under $250k',
  '$250k – $500k',
  '$500k – $1M',
  '$1M – $3M',
  '$3M – $10M',
  '$10M+',
] as const;

/** How much work the client is willing to take on. */
export const scopeOptions = [
  'Turnkey only — no work',
  'Light cosmetic rehab',
  'Full gut rehab',
  'Teardown and rebuild',
  'Any scope — price it right',
] as const;

/** Rough acquisition pace, which tells us how hard to work a market. */
export const volumeOptions = [
  '1–2 deals a year',
  '3–5 deals a year',
  '6–12 deals a year',
  '12+ deals a year',
  'As many as fit the box',
] as const;

/** How the client funds acquisitions — drives how fast they can close. */
export const financingOptions = [
  'Cash',
  'Hard money / bridge',
  'Conventional financing',
  'Fund or institutional capital',
  'Varies by deal',
] as const;

/* ---------------------------------------------------------------------------
 * Assignment disclosure
 *
 * The short form is rendered next to the seller intake form and in the footer;
 * the long form is the /disclosures page. Both say the same thing, and neither
 * may be softened without the other — the point of the short form is that a
 * seller sees it at the moment they submit, not only if they go looking.
 * ------------------------------------------------------------------------ */

/** One-sentence version for the footer of every page. */
export const DISCLOSURE_FOOTER =
  'We act as a principal in our own interest, may assign our purchase agreement to a third party, and do not represent you.';

/** Shown directly above the submit button on the seller intake form. */
export const DISCLOSURE_SHORT = [
  'Stag Acquisitions is a principal, not your agent or broker. We do not represent you and owe you no fiduciary duty. We act in our own interest.',
  'If we agree to purchase your property, we may assign that agreement to one of our developer or investor clients or another third party, who may complete the purchase in our place. We may be paid a fee or earn a profit on that assignment.',
] as const;

/** Sections of the full /disclosures page. */
export const disclosureSections = [
  {
    id: 'our-role',
    heading: 'Our role',
    body: [
      'Stag Acquisitions is a specialized acquisitions firm. Developers and investors give us defined purchase criteria, and we source off-market property that matches them.',
      'When we enter into an agreement to purchase a property, we do so as a principal — for our own account and in our own interest — not on your behalf.',
    ],
  },
  {
    id: 'assignment',
    heading: 'We may assign the agreement',
    body: [
      'If we agree to purchase your property, we may assign that purchase agreement to one of our developer or investor clients, or to another third party. That party may complete the purchase in our place.',
      'This means the buyer who closes on your property may not be Stag Acquisitions. We may be paid a fee or earn a profit on that assignment, and that amount may differ from what you receive.',
      'Any purchase agreement you sign will set out the assignment terms. Read it, and have your own attorney read it.',
    ],
  },
  {
    id: 'no-representation',
    heading: 'We do not represent you',
    body: [
      'We are not your agent and we are not your broker. We do not represent you in any transaction, and we owe you no fiduciary duty — no duty of loyalty, no duty to obtain the best available price for you, and no duty to put your interests ahead of our own.',
      'Our interests and yours are not the same. We are on our own side of the transaction. You are entitled to your own representation, and we encourage you to get it.',
    ],
  },
  {
    id: 'not-a-brokerage',
    heading: 'We are not a brokerage',
    body: [
      'Stag Acquisitions is not a licensed real estate brokerage. We do not provide brokerage services, we do not list properties for sale, and we do not market properties on behalf of owners.',
      'Where an open-market sale is the better outcome for you, we will say so and introduce you to a brokerage licensed in your market. That brokerage represents you in the sale and owes you the duties of your agent. We do not become your agent by making the introduction, and nothing in this disclosure changes because you took it.',
    ],
  },
  {
    id: 'no-advice',
    heading: 'We do not give legal, tax, or financial advice',
    body: [
      'Nothing on this website, and nothing said by anyone at Stag Acquisitions, is legal, tax, accounting, or financial advice. Selling real property has legal and tax consequences that depend on your circumstances.',
      'Consult your own attorney, accountant, or financial adviser before signing anything.',
    ],
  },
  {
    id: 'nothing-binding',
    heading: 'Nothing is binding until it is signed',
    body: [
      'Any figure we discuss — on the phone, by text, by email, or on this website — is an indication only. It is not a formal offer and it does not bind either of us.',
      'Neither party is committed until both have signed a written purchase agreement. Until that point you are free to stop at any time, for any reason or none, and you owe us nothing.',
    ],
  },
] as const;

export const LEGAL_UPDATED = 'August 14, 2026';
