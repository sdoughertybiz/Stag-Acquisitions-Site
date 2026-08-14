/**
 * Single source of truth for brand, contact, and market content.
 * Everything a non-developer would want to change lives here.
 */

export const site = {
  name: 'Stag Acquisitions',
  shortName: 'STAG',
  wordmarkSuffix: 'Acquisitions',
  tagline: 'Family-owned · Real estate investment group',
  legalEntity: 'Stag Acquisitions',
  url: 'https://stagacquisitions.com',
  description:
    'Stag Acquisitions is a family-owned real estate investment group buying homes off-market for cash. No commission, no showings, no repairs — a straight number and a closing date you pick.',
  // Sellers call or text this line; there is no public inbox.
  phone: '+12164888920',
  phoneDisplay: '(216) 488-8920',
} as const;

export const nav = [
  { href: '/', label: 'Home' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/markets', label: 'Markets' },
  { href: '/offer', label: 'Get An Offer' },
] as const;

/** Regions listed on /markets and summarized in the footer. */
export const markets = [
  {
    label: 'Market 01',
    name: 'Nashville, Tennessee',
    body: 'Davidson and Williamson counties — Green Hills, Belle Meade, Forest Hills, Brentwood, Franklin, East Nashville, Sylvan Park. We know these blocks lot by lot.',
  },
  {
    label: 'Market 02',
    name: 'Scottsdale, Arizona',
    body: 'Old Town, North Scottsdale, Paradise Valley, and the greater Phoenix valley. Fast-moving inventory and a rehab market we work every week.',
  },
  {
    label: 'Market 03',
    name: 'Charlotte, North Carolina',
    body: 'Myers Park, Dilworth, Eastover, SouthPark, and the rest of Mecklenburg County out through the surrounding Piedmont.',
  },
  {
    label: 'Everywhere else',
    name: 'Across the United States',
    body: "We buy outside our home markets too. If the address is somewhere else, send it anyway — we will tell you straight whether it is a fit.",
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

/** Condition options on the offer form. Values are sent to Follow Up Boss verbatim. */
export const conditionOptions = [
  'Excellent — move-in ready',
  'Good — minor cosmetics',
  'Fair — some deferred maintenance',
  'Needs work — real repairs needed',
  'Major issues — down to the studs',
] as const;

/** Timeline options on the offer form. Values are sent to Follow Up Boss verbatim. */
export const timelineOptions = [
  'ASAP — within a week',
  '30 days',
  '60 days',
  '90 days',
  'Flexible / exploring',
] as const;

export const LEGAL_UPDATED = 'August 14, 2026';
