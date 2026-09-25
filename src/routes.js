// URL map for the app.
//
// The app has no router library: page state lives in FitseamV2. Until now that
// state was never reflected in the address bar, so /terms, /privacy and the
// rest were not URLs at all — they could not be linked, shared, bookmarked or
// indexed. The Terms page says "we'll post the current version here with a
// Last updated date"; there was no *here* to point anyone at.
//
// This module is the single source of truth for page id ↔ path, and it is pure
// so it can be tested without a DOM.

// Production redirects the apex to www (fitseam.co → www.fitseam.co, 308), so
// www is the canonical host. Change this one constant if that ever flips — and
// change the Vercel redirect with it, or the canonical will point at a URL that
// immediately redirects.
export const SITE_ORIGIN = 'https://www.fitseam.co';

const TITLE_SUFFIX = 'Fitseam';

export const ROUTES = {
  home:    { path: '/',             title: 'Fitseam — Find your real size', indexable: true },
  form:    { path: '/find-my-size', title: `Find my size — ${TITLE_SUFFIX}`, indexable: true },
  about:   { path: '/about',        title: `About — ${TITLE_SUFFIX}`,        indexable: true },
  brands:  { path: '/for-brands',   title: `For brands — ${TITLE_SUFFIX}`,   indexable: true },
  contact: { path: '/contact',      title: `Contact — ${TITLE_SUFFIX}`,      indexable: true },
  terms:   { path: '/terms',        title: `Terms of Service — ${TITLE_SUFFIX}`, indexable: true },
  privacy: { path: '/privacy',      title: `Privacy Policy — ${TITLE_SUFFIX}`,   indexable: true },
  cookies: { path: '/cookies',      title: `Cookies — ${TITLE_SUFFIX}`,      indexable: true },
  refunds: { path: '/refunds',      title: `Refunds — ${TITLE_SUFFIX}`,      indexable: true },

  // Rendered from in-memory state only. A direct hit has nothing to show, so it
  // is not indexable and FitseamV2 sends it home. It still gets a path so the
  // back button works after a result, rather than jumping out of the app.
  result:  { path: '/your-size',    title: `Your size — ${TITLE_SUFFIX}`,    indexable: false, transient: true },
};

export const DEFAULT_PAGE = 'home';

/** Page id for a pathname. Unknown paths fall back to home. */
export function pageForPath(pathname) {
  if (typeof pathname !== 'string' || pathname === '') return DEFAULT_PAGE;
  // Tolerate a trailing slash and a missing leading one so that /terms,
  // /terms/ and terms all resolve. Everything else is a miss.
  let p = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  const hit = Object.entries(ROUTES).find(([, r]) => r.path === p);
  return hit ? hit[0] : DEFAULT_PAGE;
}

/** Path for a page id. Unknown pages fall back to home's path. */
export function pathForPage(page) {
  return ROUTES[page]?.path ?? ROUTES[DEFAULT_PAGE].path;
}

export const titleForPage = (page) => ROUTES[page]?.title ?? ROUTES[DEFAULT_PAGE].title;

export const canonicalForPage = (page) => `${SITE_ORIGIN}${pathForPage(page)}`;

export const isTransient = (page) => !!ROUTES[page]?.transient;

/** Every path a crawler should see. Feeds the sitemap. */
export const indexablePaths = () =>
  Object.values(ROUTES).filter((r) => r.indexable).map((r) => r.path);
