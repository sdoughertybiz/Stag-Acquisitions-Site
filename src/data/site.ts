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
    'Stag Acquisitions is a family-owned real estate investment group buying homes off-market for cash. No agent commissions, no showings, no repairs — a straight number and a closing date you choose.',
  email: 'stephen@sellnowpros.com',
  phone: '',
  phoneDisplay: '',
  principals: ['Stephen Dougherty', 'Phillip Dougherty'],
  foundedNote: 'A family business — two brothers, one phone number, no call center.',
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
    label: 'Region 01',
    name: 'Nashville & Middle Tennessee',
    body: 'Davidson and Williamson counties through Green Hills, Belle Meade, Forest Hills, Brentwood, and Franklin, plus East Nashville and the Sylvan Park corridor. Our deepest comp set — we know these blocks lot by lot.',
  },
  {
    label: 'Region 02',
    name: 'Charlotte & the Carolinas',
    body: 'Charlotte proper through Myers Park, Dilworth, Eastover, and SouthPark, out through Mecklenburg County and the surrounding Piedmont into Raleigh and the Triangle.',
  },
  {
    label: 'Region 03',
    name: 'Atlanta & North Georgia',
    body: 'Atlanta inside the perimeter through Buckhead, Brookhaven, and Decatur, plus the OTP counties of Cobb, Gwinnett, DeKalb, and Fulton.',
  },
  {
    label: 'Region 04',
    name: 'Florida — major metros',
    body: 'Tampa, Orlando, Jacksonville, and the southeast corridor from West Palm Beach through Boca Raton and Fort Lauderdale into Miami-Dade.',
  },
  {
    label: 'Region 05',
    name: 'Texas triangle',
    body: 'Dallas-Fort Worth, Houston proper and the surrounding counties, and the Austin metro through Travis and Williamson.',
  },
  {
    label: 'Region 06',
    name: 'The Southeast, broadly',
    body: "Birmingham, Greenville, Knoxville, Chattanooga, Savannah. If the address is outside our named markets, send it anyway — we'll tell you straight if it isn't a fit.",
  },
] as const;

/** Short list used in the footer contact column. */
export const marketSummary = [
  'Nashville · Charlotte · Atlanta',
  'Florida · Texas · The Southeast',
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
