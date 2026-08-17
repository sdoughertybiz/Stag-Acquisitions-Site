/**
 * Generates public/og-image.png — the link-preview card shown when the site is
 * texted or shared.
 *
 * Run with `npm run og`. Regenerate whenever the logo artwork changes.
 *
 * It must be a raster image: iMessage, WhatsApp and most link unfurlers will
 * not render an SVG. It uses the *weighted* mark, which is drawn heavier than
 * the standard one specifically so it survives being shown at ~180px.
 */
import { readFileSync } from 'node:fs';
import sharp from 'sharp';

const num = /-?\d+(?:\.\d+)?/g;
/** Bounding box of a path's points with translate/scale applied. */
function bbox(d, transform = '') {
  let tx = 0, ty = 0, s = 1;
  const t = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)/.exec(transform);
  if (t) { tx = +t[1]; ty = +t[2]; }
  const sc = /scale\(([-\d.]+)\)/.exec(transform);
  if (sc) s = +sc[1];
  const n = d.match(num).map(Number);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i + 1 < n.length; i += 2) {
    const x = tx + n[i] * s, y = ty + n[i + 1] * s;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

const fav = readFileSync('public/favicon.svg', 'utf8');
const markD = fav.match(/ d="([^"]+)"/)[1];
const markSW = +fav.match(/stroke-width="([\d.]+)"/)[1];
const markBox = bbox(markD);

const lock = readFileSync('src/components/StagLockup.astro', 'utf8');
const blk = lock.slice(lock.indexOf("variant === 'stacked'"), lock.indexOf('</Fragment>', lock.indexOf("variant === 'stacked'")));
const text = [...blk.matchAll(/<g transform="([^"]*)">\s*<path class="lockup-text"[^>]*?d="([^"]+)"[^>]*\/>\s*<\/g>/g)]
  .map((m) => ({ transform: m[1], d: m[2], box: bbox(m[2], m[1]) }));
const wordBox = {
  x0: Math.min(...text.map((t) => t.box.x0)), y0: Math.min(...text.map((t) => t.box.y0)),
  x1: Math.max(...text.map((t) => t.box.x1)), y1: Math.max(...text.map((t) => t.box.y1)),
};
wordBox.w = wordBox.x1 - wordBox.x0; wordBox.h = wordBox.y1 - wordBox.y0;

const W = 1200, H = 630, BG = '#22251F', INK = '#FFFFFF', ACCENT = '#5C7560';
const markEl = `<path fill="${INK}" fill-rule="evenodd" stroke="${INK}" stroke-width="${markSW}" stroke-linejoin="round" stroke-linecap="round" d="${markD}"/>`;
const wordEl = text.map((t) => `<g transform="${t.transform}"><path fill="${INK}" fill-rule="evenodd" d="${t.d}"/></g>`).join('');

/** Lay the mark above the wordmark, both centred, scaled to fit the card. */
function lockupCard({ markH = 320, gap = 46, wordW = 560 }) {
  const mS = markH / markBox.h;
  const wS = wordW / wordBox.w;
  const totalH = markBox.h * mS + gap + wordBox.h * wS;
  const top = (H - totalH) / 2;
  const markX = (W - markBox.w * mS) / 2 - markBox.x0 * mS;
  const markY = top - markBox.y0 * mS;
  const wordX = (W - wordBox.w * wS) / 2 - wordBox.x0 * wS;
  const wordY = top + markBox.h * mS + gap - wordBox.y0 * wS;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${BG}"/><rect y="${H - 10}" width="${W}" height="10" fill="${ACCENT}"/>
<g transform="translate(${markX} ${markY}) scale(${mS})">${markEl}</g>
<g transform="translate(${wordX} ${wordY}) scale(${wS})">${wordEl}</g></svg>`;
}

const markOnly = (() => {
  const s = Math.min((W * 0.62) / markBox.w, (H * 0.72) / markBox.h);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${BG}"/><rect y="${H - 10}" width="${W}" height="10" fill="${ACCENT}"/>
<g transform="translate(${(W - markBox.w * s) / 2 - markBox.x0 * s} ${(H - markBox.h * s) / 2 - markBox.y0 * s}) scale(${s})">${markEl}</g></svg>`;
})();

const OUT = 'public/og-image.png';
await sharp(Buffer.from(lockupCard({}))).png({ compressionLevel: 9 }).toFile(OUT);
const meta = await sharp(OUT).metadata();
console.log(`${OUT}  ${meta.width}x${meta.height}  ${(readFileSync(OUT).length / 1024).toFixed(1)} KB`);
