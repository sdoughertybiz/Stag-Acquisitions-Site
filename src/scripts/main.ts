/**
 * Site chrome: sticky nav state, mobile menu, and scroll-triggered reveals.
 * Everything here is progressive enhancement — the page is fully readable
 * without it (see the no-JS fallback that clears the reveal transform).
 */

/* -------- Sticky nav -------- */
const nav = document.getElementById('site-nav');
if (nav) {
  // The transparent nav is styled for a dark hero photograph. A page without a
  // hero (404) would render cream links on a cream page — invisible — so it
  // holds the solid state throughout.
  const overHero = document.querySelector('.hero') !== null;
  const setScrolled = () => nav.classList.toggle('scrolled', !overHero || window.scrollY > 24);
  setScrolled();
  if (overHero) window.addEventListener('scroll', setScrolled, { passive: true });
}

/* -------- Mobile menu -------- */
const toggle = document.querySelector<HTMLButtonElement>('.nav-toggle');
const links = document.getElementById('primary-nav');
if (toggle && links) {
  const setOpen = (open: boolean) => {
    toggle.setAttribute('aria-expanded', String(open));
    links.classList.toggle('open', open);
  };

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  links.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).tagName === 'A') setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setOpen(false);
  });
}

/* -------- Scroll reveals -------- */
const revealables = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (revealables.length > 0) {
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealables.forEach((el) => el.classList.add('in-view'));
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      },
      // Fire slightly before the element reaches the viewport so the motion
      // completes as it settles into view rather than after.
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );

    revealables.forEach((el) => {
      // Anything already on screen at load reveals immediately — no flash of
      // invisible content above the fold.
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92) el.classList.add('in-view');
      else observer.observe(el);
    });
  }
}
