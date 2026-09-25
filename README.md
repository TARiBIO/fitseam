# Fitseam

Fit intelligence for real bodies. Fitseam estimates your size at a chosen brand
from your measurements and, optionally, sizes you already wear elsewhere —
covering jeans, dresses and bikinis.

React SPA with History-API routing (no router library — see `src/routes.js`),
Supabase for persistence, Cloudflare Turnstile guarding every write.

---

## ⚠️ Read this before trusting a recommendation

**The `BRANDS` size dataset is synthetic placeholder data and is known to be
wrong.** It was not transcribed from any brand's published size guide. Two
brands were spot-checked against live sources and both were off by more than the
gap between adjacent sizes — recommendations are wrong by multiple sizes, not
marginally inaccurate.

The failure mode is the dangerous kind: the numbers are plausible in the middle
of each range and wrong at the extremes, so the data survives casual inspection
while failing precisely the users who most need it.

[`src/brands-sources.md`](src/brands-sources.md) holds the full audit — the
structural tells, the spot-check diffs, verified source data collected so far,
and why partial correction is unsafe (`blendValues()` averages across brands, so
one corrected brand blended with synthetic ones is *harder* to reason about than
a uniformly wrong dataset).

**Correct the dataset as a whole, or not at all. This gates launch.**

---

## Setup

Requires Node 20+.

```sh
npm install
cp .env.example .env.local   # then fill it in — see below
npm start
```

The app runs without any environment variables: no Supabase means writes fall
back to `localStorage` and no Turnstile site key means the widget is skipped.
Browsing works fine in that state, but **submitting a form will report that it
could not send** — with no backend configured nothing was delivered, and saying
otherwise is the bug that lost every message on the live site. See "Telling the
user when a write fails" below.

### Environment

Every client variable must be prefixed `REACT_APP_` for Create React App to
inline it. All three are **public** and ship in the browser bundle.

| Variable | Where it comes from |
|---|---|
| `REACT_APP_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `REACT_APP_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon public |
| `REACT_APP_TURNSTILE_SITE_KEY` | Cloudflare dash → Turnstile → your widget |

Never put the Supabase `service_role` key or the Turnstile **secret** key in
`.env.local`. Both belong only to the Edge Function's environment, set with
`supabase secrets set`.

⚠️ **One combination is broken**: Supabase keys set *without* the Turnstile site
key. Writes then go out with no token and the Edge Function rejects them. The
app logs a warning at startup when it detects this.

---

## How writes work

The browser holds no insert rights. Everything goes through one Edge Function
that verifies a Turnstile token server-side, then writes with the service-role
key — which never leaves the function.

```
browser ──{table, row, turnstileToken}──▶ verified-insert ──▶ Cloudflare siteverify
                                               │
                                               └─ service-role insert ──▶ Postgres
```

The service role **bypasses RLS**, so a function accepting an arbitrary table
and row would be a *wider* hole than the anon insert policies it replaced. It
therefore allowlists both table names and column names; anything else is
dropped. **Adding a table to `ALLOWED` grants public write access to it** — keep
it in sync with `schema.sql`.

Deployment steps, ordering constraints and the RLS lockdown are in
[`supabase/README.md`](supabase/README.md). Order matters: locking down RLS
before the function is live takes every form offline.

---

## Scripts

| Command | Does |
|---|---|
| `npm start` | Dev server on :3000 |
| `npm test` | Jest in watch mode |
| `CI=true npm test` | Single run, for CI |
| `npm run build` | Production bundle into `build/` |

---

## Tests

[`src/recommend.test.js`](src/recommend.test.js) covers the recommendation
engine. It is deliberately split in two, because the dataset is due to be
replaced:

- **Pure-helper tests** — `closest`, `getBetween`, `blendValues`, `prefOffset`,
  `anchorConfidence` — use hand-built fixture charts and assert exact values.
  They survive the dataset rebuild untouched.
- **`recommend()` tests** assert invariants only. Where a concrete number is
  needed it is derived at runtime from whichever chart is loaded, so the
  assertions hold for any dataset.

A **dataset shape** block validates schema rather than numbers — every brand row
carries its metadata, measurements increase with size, bikini brands split into
top and bottom charts. Those are the tests worth keeping green *during* the
rebuild; they catch a malformed row the moment it is added.

Two result-screen bugs were found by writing these tests and have since been
fixed; the tests that caught them are now regression guards, so if you are
tempted to "simplify" either of these, read the comment first:

- **`getBetween()` used inclusive bounds**, so a measurement landing exactly on
  a chart value still reported as "between sizes" — the screen showed a
  confident size next to a warning contradicting it. And because the matched
  size came back as the larger end, an exact S and an exact M both returned
  `{S, M}`, giving two users a full size apart identical copy. The comparisons
  are now strict on both ends.
- **`anchorConfidence()` had no branch for conflicting anchors.** Two or more
  anchors disagreeing by more than 6cm fell through to the no-anchors case,
  telling a user who had supplied three of them that the estimate was "based on
  your measurements alone. More anchors sharpen this." It now reports the
  actual spread: "Your anchors disagree by about 20cm…".

---

## Layout

```
src/
  fitseam-v2.jsx     everything: BRANDS, engine, all pages (~2100 lines)
  brands-sources.md  size-chart audit trail — READ THIS
  routes.js          page id <-> URL map; canonical host lives here
  turnstile.jsx      widget loader + useTurnstile hook
  supabase.js        client; read-only now, writes go via the function
  ErrorBoundary.jsx
  recommend.test.js
  routes.test.js
supabase/
  schema.sql         tables, constraints, RLS policies + lockdown section
  functions/verified-insert/index.ts
public/
  og-image.svg       editable master for the social card
  og-image.png       rendered from it at 1200x630 — what scrapers actually get
  sitemap.xml        kept in step with routes.js by routes.test.js
```

### Routing

There is no router library — `FitseamV2` holds a `page` id and mirrors it into
the address bar with the History API. `src/routes.js` is the single source of
truth for the id ↔ path map, the page titles and the canonical host, and it is
pure so it can be tested without a DOM.

Two things depend on it staying honest, and `routes.test.js` enforces both:
every `page === '...'` branch in `fitseam-v2.jsx` must have a route, and
`public/sitemap.xml` must list exactly the indexable ones.

`/your-size` renders from in-memory state, so a cold load has nothing to show
and is rewritten to `/`. Unknown paths resolve to home and normalise the URL —
the host serves `index.html` for everything, so the app is its own 404 handler.

### Telling the user when a write fails

`useSubmission` wraps every form write. Forms used to call `insertRow`
fire-and-forget and render their success screen unconditionally, so a failed
write still told the visitor *"Thank you — we've got it. Expect to hear from us
within a working day."* Nothing read the `{ ok, reason }` that `insertRow`
returns.

`offline` counts as a failure there on purpose: it means Supabase is not
configured and the row only reached this browser's `localStorage`, so nobody
received anything. That also makes a misconfigured deployment loud on the first
submission instead of silently swallowing real messages.

### Regenerating the social card

`og-image.png` is rendered from `og-image.svg`. Scrapers reject SVG and ignore
root-relative URLs, so `index.html` points at an absolute `https://` PNG. After
editing the SVG, re-render at exactly 1200x630 and check the headline still fits
inside the canvas — it overflowed silently until the file was first rasterized.

---

## Known gaps

- **Size dataset is synthetic** — the launch blocker, above.
- **H&M and Zara are structurally unrepresentable.** They publish charts per
  garment, not per brand, so one `BRANDS` row cannot be correct. Drop them or
  scope them to a single product line and label it in the UI.
- **No per-IP rate limiting.** Turnstile raises the cost of a request but does
  not cap volume. RLS cannot see IPs; this needs logic in the Edge Function or a
  proxy in front.
- **No retention policy.** Nothing purges old rows, so a flood is permanent
  until someone deletes it by hand.
- **No deployment config in the repo.** The Vercel project is configured in its
  dashboard, not here. As of 2026-09-24 production serves a build older than the
  Turnstile work, with no `REACT_APP_SUPABASE_*` set — so every submission on
  the live site reaches `localStorage` and nothing else.
- **Feedback writes stay fire-and-forget.** The thumbs up/down on the result
  screen is the one write with no failure UI: the visitor expects no reply and
  has no action to take, so an error banner would be noise. Deliberate.
- **No error reporting.** `ErrorBoundary` logs to the console only, so a crash
  in production is invisible.
- **No CI.** Nothing runs the test suite on push.
