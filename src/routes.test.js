import fs from 'fs';
import path from 'path';
import {
  ROUTES,
  DEFAULT_PAGE,
  SITE_ORIGIN,
  pageForPath,
  pathForPage,
  titleForPage,
  canonicalForPage,
  isTransient,
  indexablePaths,
} from './routes';

describe('pageForPath', () => {
  it('maps every declared path back to its own page', () => {
    for (const [page, route] of Object.entries(ROUTES)) {
      expect({ page, resolved: pageForPath(route.path) }).toEqual({ page, resolved: page });
    }
  });

  it('resolves the site root to home', () => {
    expect(pageForPath('/')).toBe('home');
  });

  it('tolerates a trailing slash', () => {
    expect(pageForPath('/terms/')).toBe('terms');
  });

  it('tolerates a missing leading slash', () => {
    expect(pageForPath('terms')).toBe('terms');
  });

  it('falls back to home for an unknown path rather than rendering nothing', () => {
    // The host serves index.html for every unmatched path, so the app itself is
    // the 404 handler. Landing on home beats a blank screen.
    expect(pageForPath('/no-such-page')).toBe(DEFAULT_PAGE);
    expect(pageForPath('/terms/extra/segments')).toBe(DEFAULT_PAGE);
  });

  it('survives junk input', () => {
    expect(pageForPath('')).toBe(DEFAULT_PAGE);
    expect(pageForPath(undefined)).toBe(DEFAULT_PAGE);
    expect(pageForPath(null)).toBe(DEFAULT_PAGE);
    expect(pageForPath(42)).toBe(DEFAULT_PAGE);
  });
});

describe('pathForPage', () => {
  it('round-trips every page', () => {
    for (const page of Object.keys(ROUTES)) {
      expect({ page, back: pageForPath(pathForPage(page)) }).toEqual({ page, back: page });
    }
  });

  it('falls back to the home path for an unknown page', () => {
    expect(pathForPage('nonsense')).toBe(ROUTES[DEFAULT_PAGE].path);
  });
});

describe('route table', () => {
  it('gives every page a unique path', () => {
    const paths = Object.values(ROUTES).map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('starts every path with a slash and adds no trailing slash', () => {
    for (const [page, r] of Object.entries(ROUTES)) {
      expect({ page, ok: r.path.startsWith('/') }).toEqual({ page, ok: true });
      expect({ page, ok: r.path === '/' || !r.path.endsWith('/') }).toEqual({ page, ok: true });
    }
  });

  it('gives every page a distinct, non-empty title', () => {
    const titles = Object.keys(ROUTES).map(titleForPage);
    expect(titles.every((t) => typeof t === 'string' && t.length > 0)).toBe(true);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('covers every page the app can render', () => {
    // Guard against a page being added to the switch in fitseam-v2.jsx without
    // a route, which would leave it unreachable by URL — the bug this whole
    // module exists to fix.
    const src = fs.readFileSync(path.join(__dirname, 'fitseam-v2.jsx'), 'utf8');
    const rendered = [...src.matchAll(/page === '(\w+)'/g)].map((m) => m[1]);
    expect(rendered.length).toBeGreaterThan(0);
    for (const page of new Set(rendered)) {
      expect({ page, hasRoute: page in ROUTES }).toEqual({ page, hasRoute: true });
    }
  });

  it('marks the result page transient and nothing else', () => {
    const transient = Object.keys(ROUTES).filter(isTransient);
    expect(transient).toEqual(['result']);
  });

  it('keeps transient pages out of the index', () => {
    for (const [page, r] of Object.entries(ROUTES)) {
      if (r.transient) expect({ page, indexable: !!r.indexable }).toEqual({ page, indexable: false });
    }
  });
});

describe('canonical URLs', () => {
  // Production redirects the apex to www (308). A canonical pointing at a URL
  // that immediately redirects is a self-inflicted SEO wound, so pin the host.
  it('uses the www host that production actually serves', () => {
    expect(SITE_ORIGIN).toBe('https://www.fitseam.co');
  });

  it('builds an absolute URL for every page', () => {
    for (const page of Object.keys(ROUTES)) {
      const url = canonicalForPage(page);
      expect(url.startsWith('https://')).toBe(true);
      expect(() => new URL(url)).not.toThrow();
    }
  });

  it('points home at the bare origin', () => {
    expect(canonicalForPage('home')).toBe(`${SITE_ORIGIN}/`);
  });
});

describe('public/sitemap.xml', () => {
  const sitemap = fs.readFileSync(path.join(__dirname, '..', 'public', 'sitemap.xml'), 'utf8');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  it('lists exactly the indexable routes — no more, no less', () => {
    const expected = indexablePaths().map((p) => `${SITE_ORIGIN}${p}`).sort();
    expect([...locs].sort()).toEqual(expected);
  });

  it('never lists a transient route', () => {
    for (const page of Object.keys(ROUTES)) {
      if (isTransient(page)) expect(locs).not.toContain(canonicalForPage(page));
    }
  });

  it('uses the same host as the canonical tags', () => {
    for (const loc of locs) expect(loc.startsWith(SITE_ORIGIN)).toBe(true);
  });
});

describe('public/index.html', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

  it('has no apex URLs left that would redirect', () => {
    expect(html).not.toMatch(/https:\/\/fitseam\.co/);
  });

  it('points og:image at an absolute PNG', () => {
    // Both halves matter: scrapers ignore root-relative paths, and Facebook, X,
    // LinkedIn and iMessage all reject SVG.
    const og = html.match(/property="og:image" content="([^"]+)"/);
    expect(og).not.toBeNull();
    expect(og[1]).toBe(`${SITE_ORIGIN}/og-image.png`);
  });

  it('ships the PNG it advertises', () => {
    expect(fs.existsSync(path.join(__dirname, '..', 'public', 'og-image.png'))).toBe(true);
  });

  it('declares a canonical link', () => {
    expect(html).toMatch(/<link rel="canonical" href="https:\/\/www\.fitseam\.co\/"/);
  });
});
