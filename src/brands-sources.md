# Brand size-chart sources & verification status

Audit trail for the `BRANDS` object in [`fitseam-v2.jsx`](./fitseam-v2.jsx).

**Status as of 2026-09-17: the dataset is UNVERIFIED and believed to be synthetic
placeholder data.** Do not treat any row below as sourced unless it is marked
Verified with a URL and a date.

---

## Why we believe the data is synthetic

Three structural tells, all reproducible from the `BRANDS` object itself:

1. **Hip-minus-waist is a perfect constant within every jeans brand.** Levi's is
   exactly 25cm at all 11 sizes; Good American exactly 27cm at all 6; ASOS
   exactly 26cm at all 6. Real grading widens the hip-waist drop as sizes
   increase — a fixed drop across an entire range does not occur in a published
   chart.
2. **Sizes step in near-perfect arithmetic runs.** Zara, H&M, ASOS, Good
   American and River Island all advance exactly +4cm per size on both waist and
   hip. Real charts use irregular steps and change grade at the plus-size break.
3. **Two brand pairs are byte-identical.** PrettyLittleThing == Boohoo (jeans),
   Zara == Mango (dress). Independent brands do not publish identical charts.

## Spot-check results

Two brands were checked against live sources. Both were wrong by far more than
the gap between adjacent sizes, meaning recommendations are off by multiple
sizes rather than marginally inaccurate.

### Good American (jeans) — WRONG, structural

Source: <https://www.scheels.com/size-chart/good-american-womens-apparel-size-chart>
(Good American stockist), retrieved 2026-09-17. Published in inches.

| Size | Real waist | In code | Δ | Real hip | In code | Δ |
|------|-----------|---------|-----|---------|---------|-----|
| 6  | 28.5in / 72cm | 61cm | **−11cm** | 39in / 99cm  | 88cm  | **−11cm** |
| 8  | 29.5in / 75cm | 65cm | −10cm | 40in / 102cm | 92cm  | −10cm |
| 10 | 30.5in / 77cm | 69cm | −8cm  | 41in / 104cm | 96cm  | −8cm  |
| 12 | 31.5in / 80cm | 73cm | −7cm  | 42in / 107cm | 100cm | −7cm  |
| 14 | 32.5in / 83cm | 77cm | −6cm  | 43in / 109cm | 104cm | −5cm  |
| 16 | 39.5in / 100cm | 81cm | **−19cm** | 50in / 127cm | 108cm | **−19cm** |

Two distinct defects here:

- **Wrong sizing system.** Good American is a US-sized brand. The code has given
  it UK-style body measurements, so every size label is off by roughly four
  steps — the app will recommend a 6 to someone who needs a 14.
- **Missing grade break.** Good American's chart jumps sharply at the 15/16
  boundary where their curve grading starts, so the top of the range is badly
  wrong even after the size-system offset is corrected. The `BRANDS` schema
  itself copes with this fine — see "The Good American discontinuity" below for
  what actually breaks.

### Reformation (dress) — WRONG on hip

Source: <https://www.thereformation.com/fitting-and-sizes.html>, retrieved
2026-09-17.

| Size | Real bust | In code | Real waist | In code | Real hip | In code | Hip Δ |
|------|-----------|---------|-----------|---------|---------|---------|-------|
| 0  | 81  | 81  | 64 | 61 | 94  | 85  | **−9cm**  |
| 2  | 84  | 84  | 66 | 64 | 97  | 88  | **−9cm**  |
| 4  | 86  | 87  | 69 | 67 | 99  | 91  | **−8cm**  |
| 6  | 89  | 90  | 71 | 70 | 102 | 94  | **−8cm**  |
| 8  | 93  | 93  | 75 | 73 | 105 | 97  | **−8cm**  |
| 10 | 98  | 96  | 80 | 76 | 110 | 100 | **−10cm** |
| 12 | 103 | 100 | 85 | 80 | 116 | 104 | **−12cm** |

Bust is roughly right; waist is 3–5cm low; hip is 8–12cm low at every size. Note
the real hip steps widen (3, 2, 3, 3, 5, 6) against the code's flat +3.

**Measurement type — RESOLVED 2026-09-17 (viewed in-browser): body
measurements, US numeric sizing.** The "How to measure" section instructs the
reader to measure their own body ("Measure your bust…", "…to get your
waistline"), and the page frames the chart as "a general guideline… Exact
measurements vary with each style."

⚠️ **One ambiguity remains.** Reformation defines **two** hip measurements —
high hip ("where your hip bone begins") and low hip ("where your hip bone ends,
about 3–4 inches below your high hip") — but the chart publishes a single
unlabelled `Hip` column. Low hip is the conventional reading and is what the
code's `h` key expects, but the brand does not state it. Treat as inferred.

Also note the site has a **separate alpha chart** (XS–3X) above the numeric one
with different values; alpha XS is numeric 0, alpha S is numeric 4. Reading the
wrong table silently shifts every row. The numeric figures above were confirmed
on-screen for sizes 2–12.

---

## Why partial correction is unsafe

`recommend()` blends anchor brands together: `blendValues()` averages the implied
measurements from every brand the user says they already wear
(`fitseam-v2.jsx`, jeans and dress branches). Accuracy is therefore **shared
across brands, not isolated per brand**.

If Good American and Reformation are corrected while the other brands stay
synthetic-low, a user who anchors on a corrected brand has their blend dragged
by the uncorrected ones — and the error becomes harder to reason about than the
uniform offset we have now. **Correct the dataset as a whole, or not at all.**

## The measurement-type trap

Brands publish either *body* measurements (what your body measures) or *garment*
measurements (the finished item, including ease). Mixing the two silently breaks
the recommendation logic even when every individual number is copied correctly.
ASOS and Reformation both publish body measurements (each confirmed on the
brand's own page). Record the type per brand in the table below, not just the
numbers.

`BRANDS` now carries this as a `measurementType` field per brand. It is
`'unknown'` on every row today, because the stored numbers are still the
synthetic placeholders — set it to `'body'`/`'garment'` only when the row's
numbers are actually the brand's published ones.

## Tooling note

Most brand size guides are JavaScript-rendered and bot-protected — Levi's,
Zara, H&M, Dillard's and David Jones all returned 404s, timeouts or access-denied
during this pass. Static stockist mirrors (Scheels) worked. Budget for manual
transcription or a headless browser; plain fetching will not cover the list.

---

## Verified source data

### ASOS (own-brand, standard) — body measurements ✅

Source: <https://www.asos.com/discover/size-charts/women/dresses/>, retrieved
2026-09-17. Page states: "ASOS own buy sizes are designed to fit the following
body measurements." **Body measurements, UK sizing.**

| UK size | Bust cm | Waist cm | Hips cm |
|---------|---------|----------|---------|
| 4  | 78    | 60   | 83.5  |
| 6  | 80.5  | 62.5 | 86    |
| 8  | 83    | 65   | 88.5  |
| 10 | 88    | 70   | 93.5  |
| 12 | 93    | 75   | 98.5  |
| 14 | 98    | 80   | 103.5 |
| 16 | 103   | 85   | 108.5 |
| 18 | 110.5 | 92.5 | 116   |

Bust steps are 2.5, 2.5, 5, 5, 5, 5, 7.5 — the grade **accelerates** at the top
of the range. The code uses a flat +4.

Diff against code (`BRANDS.dress.ASOS`): accurate to ~1cm at sizes 6–10, then
drifts — size 16 waist is 4cm low, size 18 waist is 6.5cm low and hip 6cm low.

> **This is the most dangerous failure mode in the dataset.** The synthetic
> numbers are plausible in the middle of the range and wrong at the ends, so the
> data survives casual inspection while failing precisely the users at the
> extremes — who are the ones most likely to have fit problems and least served
> by existing size charts.

### ASOS Petite — body measurements ✅

Same source, retrieved 2026-09-17. Recorded for reference; not currently in
`BRANDS`.

| UK size | Bust cm | Waist cm | Hips cm |
|---------|---------|----------|---------|
| 2  | 73.5 | 55.5 | 80    |
| 4  | 76   | 58   | 82.5  |
| 6  | 78.5 | 60.5 | 85    |
| 8  | 81   | 63   | 87.5  |
| 10 | 86   | 68   | 92.5  |
| 12 | 91   | 73   | 97.5  |
| 14 | 96   | 78   | 102.5 |
| 16 | 101  | 83   | 107.5 |

### Size-system conversion (ASOS, authoritative) ✅

Source: <https://www.asos.com/discover/size-charts/women/jeans-trousers-leggings/>,
retrieved 2026-09-17.

| UK | 4  | 6  | 8  | 10 | 12 | 14 | 16 | 18 | 20 | 22 |
|----|----|----|----|----|----|----|----|----|----|----|
| US | 0  | 2  | 4  | 6  | 8  | 10 | 12 | 14 | 16 | 18 |
| EU | 32 | 34 | 36 | 38 | 40 | 42 | 44 | 46 | 48 | 50 |

Confirms the Good American defect: **US 6 = UK 10**, so the code's Good American
"6" is four size steps adrift.

### H&M — no central chart exists ⛔ structural

<https://www2.hm.com/en_us/customer-service/sizeguide/ladies.html> now redirects
to a sizing FAQ stating: "To access the Size Guide, simply open the product page
of your choice and click on the provided 'Size Guide' link." The `en_gb` size
guide returns an error page.

H&M publishes size charts **per garment**, not per brand. A single H&M row in
`BRANDS` cannot represent this correctly at all — this is a schema problem, not
a data problem. Same likely applies to Zara. Decide whether to drop H&M, or
scope it to a specific product line and label it as such in the UI.

### Levi's (women's bottoms) ✅

Source: <https://www.levi.com/GB/en_GB/info/sizechart> → Women's Bottoms → "Find
your Levi's size", retrieved 2026-09-17. Published directly in cm.

| Jean size | Real waist | In code | Δ | Real hip | In code | Δ |
|-----------|-----------|---------|-----|---------|---------|-----|
| 24 | 64 | 61 | −3  | 86    | 86  | **0** |
| 25 | 66 | 64 | −2  | 89    | 89  | **0** |
| 26 | 69 | 66 | −3  | 91.5  | 91  | −0.5 |
| 27 | 72 | 69 | −3  | 94    | 94  | **0** |
| 28 | 74 | 71 | −3  | 96.5  | 96  | −0.5 |
| 29 | 77 | 74 | −3  | 99    | 99  | **0** |
| 30 | 79 | 76 | −3  | 101   | 101 | **0** |
| 31 | 83 | 79 | −4  | 105   | 104 | −1 |
| 32 | 87 | 81 | −6  | 109   | 106 | −3 |
| 33 | 90 | 84 | −6  | 113   | 109 | −4 |
| 34 | 96 | 86 | **−10** | 118 | 111 | **−7** |

Hip is **exact through size 30**, then diverges to −7cm by size 34. Waist is
wrong across the whole range and degrades to −10cm.

Real hip steps accelerate (3, 2.5, 2.5, 2.5, 2.5, 2, 4, 4, 4, 5); the code
alternates a fixed 3/2.

**Engine impact:** `recommend()` sizes jeans by hip (`closest(chart, 'h', …)`),
so Levi's recommendations are roughly right up to size 30 and wrong above it.
But the back-gap warning uses waist — `gapCm = recWaist − targetWaist` — and
because every code waist is 3–10cm understated, **the "Back gap risk" flag
systematically under-fires for Levi's**, which is one of the product's headline
features.

## The pattern across all verified brands

ASOS and Levi's fail the same way, and it is the worst possible shape:

| | Low/mid range | Top of range |
|---|---|---|
| ASOS dress | accurate to ~1cm | −6.5cm waist at UK 18 |
| Levi's hip | **exact** to size 30 | −7cm at size 34 |

Real size charts **accelerate** — grade steps widen as sizes increase. The
synthetic data is linear. So it looks correct wherever you spot-check the middle
and is badly wrong at the extremes, failing exactly the users who most need an
accurate size and are least served by existing charts. A casual review of this
dataset would pass.

### ASOS jeans page — conversion only

The jeans/trousers size-chart page carries the international conversion table
and "how to measure" only; no separate jeans body chart. ASOS applies one
own-brand body standard across categories, so the table above is the correct
source for `BRANDS.jeans.ASOS` too.

---

## Verification table

Fill in as each brand is checked. `Type` = body or garment.

| Category | Brand | Status | Type | Source URL | Verified |
|----------|-------|--------|------|-----------|----------|
| jeans | Levi's | ✅ Source captured | body (cm) | levi.com | 2026-09-17 |
| jeans | Zara | ❌ Unverified | ? | — | — |
| jeans | H&M | ⛔ No central chart — per-product | n/a | — | 2026-09-17 |
| jeans | ASOS | ✅ Source captured | body | asos.com | 2026-09-17 |
| jeans | Fashion Nova | ❌ Unverified | ? | — | — |
| jeans | PrettyLittleThing | ❌ Unverified — identical to Boohoo | ? | — | — |
| jeans | Boohoo | ❌ Unverified — identical to PLT | ? | — | — |
| jeans | Shein | ❌ Unverified | ? | — | — |
| jeans | Good American | ⚠️ **Verified wrong** — see above | garment/US | scheels.com | 2026-09-17 |
| jeans | River Island | ❌ Unverified | ? | — | — |
| jeans | Mr Price | ❌ Unverified | ? | — | — |
| jeans | Woolworths SA | ❌ Unverified | ? | — | — |
| dress | Zara | ❌ Unverified — identical to Mango | ? | — | — |
| dress | H&M | ⛔ No central chart — per-product | n/a | — | 2026-09-17 |
| dress | ASOS | ✅ Source captured | body | asos.com | 2026-09-17 |
| dress | Boohoo | ❌ Unverified | ? | — | — |
| dress | PrettyLittleThing | ❌ Unverified | ? | — | — |
| dress | Fashion Nova | ❌ Unverified | ? | — | — |
| dress | Shein | ❌ Unverified | ? | — | — |
| dress | Mango | ❌ Unverified — identical to Zara | ? | — | — |
| dress | Reformation | ⚠️ **Verified wrong** — see above | body (US) | thereformation.com | 2026-09-17 |
| dress | Mr Price | ❌ Unverified | ? | — | — |
| bikini | ASOS | ❌ Unverified | ? | — | — |
| bikini | Fashion Nova | ❌ Unverified | ? | — | — |
| bikini | Shein | ❌ Unverified | ? | — | — |
| bikini | H&M | ❌ Unverified | ? | — | — |
| bikini | PrettyLittleThing | ❌ Unverified | ? | — | — |
| bikini | Triangl | ❌ Unverified | ? | — | — |
| bikini | Cupshe | ❌ Unverified | ? | — | — |
| bikini | Boohoo | ❌ Unverified | ? | — | — |

## Recheck cadence

Once the dataset is genuinely sourced, re-verify quarterly — brands regrade
without announcing it. Next review due one quarter after the first full
verification pass completes.

---

## The Good American discontinuity — resolved, but it exposed two engine bugs

**The schema does not need to change.** `closest()` and `getBetween()` are both
grade-agnostic: they scan entries and compare values, so an irregular or
discontinuous chart is already representable. The 15/16 jump is not a data-shape
problem.

What the jump *does* expose is that the engine never reports how well the user
actually matches the chart. Real Good American rows around the break, in cm:

| Size | Hip | Step |
|------|-----|------|
| 14 | 109 | — |
| 15 | 114 | +5 |
| 16 | 127 | **+13** |
| 18 | 132 | +5 |

That 13cm step is a dead zone. Someone with a 120cm hip is 6cm from the nearest
size in either direction — there is no size that fits them — and the engine says
nothing about it.

### Bug 1 — confidence ignores fit quality

`closest()` returns `{ size, diff }`, but every caller uses only `.size` and
discards `diff`. `anchorConfidence(n, variance)` is computed purely from how
many anchors there are and whether they agree *with each other*; it never looks
at how far the user's body is from the recommended size. Measured, no anchors:

| User hip | Recommended | Off by | Confidence |
|----------|-------------|--------|------------|
| 109 | 14 | 0cm | Medium |
| 114 | 15 | 0cm | Medium |
| **120** | 15 | **6cm** | **Medium** |
| 127 | 16 | 0cm | Medium |

A perfect match and a 6cm miss are reported identically.

*Fix:* thread `hipRec.diff` into the confidence calculation and raise a flag
when it exceeds roughly half the local grade step.

### Bug 2 — anchors dilute the user's own measurement, and raise confidence while doing it

`blendValues()` averages the user's measurement with each anchor's implied
measurement at **equal weight**, so the more anchors a user adds, the less their
actual body counts. With a real 127cm hip:

| Anchors | Recommended | That size's hip | Confidence |
|---------|-------------|-----------------|------------|
| 0 | **16** | 127cm — correct | Medium |
| 1 | 15 | 114cm | Medium |
| 2 | 15 | 114cm | Medium-High |
| 3 | 15 | 114cm | **High** |

Adding anchors moves the answer from correct to 13cm too small **and raises the
stated confidence from Medium to High.** The user's own measurement is only 25%
of the signal at three anchors.

The cause is that agreement *among anchors* is read as certainty. Here the three
anchors agree closely with each other (implied hips 109/110/107, variance 3) and
all disagree with the body by ~15cm. That pattern — anchors tightly clustered
but far from the measurement — is precisely the signal that something is wrong,
and the engine scores it as maximum confidence.

*Fix:* weight the user's measurement above anchor-implied values rather than
averaging equally, and treat measurement-vs-anchor disagreement as a confidence
*penalty*, separate from anchor-vs-anchor variance.

> Both bugs are latent behind the synthetic data today, because the synthetic
> charts are smooth and evenly graded — there are no dead zones to fall into.
> **Correcting the brand data will surface both.** Fix them in the same pass.

---

## Next pass — runbook

**State as of 2026-09-17:** 4 charts sourced, 2 brands found structurally
unrepresentable, 24 rows still unverified. **`BRANDS` has not been modified.**
Nothing here is half-applied; the code is exactly as it was apart from the
warning comment and the hero-copy change.

### Decide these before transcribing anything else

1. **Does `BRANDS` need a per-brand `type` field?** Brands publish body *or*
   garment measurements. `recommend()` compares charts against user **body**
   measurements, so a garment chart is invalid input without an ease
   adjustment. There is currently no way to express this. Adding the field
   later means re-touching every row — do it first.
2. **Does `BRANDS` need a per-brand sizing system (UK/US/EU/SA)?** The Good
   American defect came from flattening US sizes onto a UK scale. Keep each
   brand's published labels and record the system, rather than normalising.
3. **What to do about per-product brands (H&M, probably Zara).** Drop them,
   or pin to one product line and say so in the UI. They cannot be one row.

### Then, per brand

1. Open the brand's size guide in real Chrome (plain fetching is blocked on
   nearly every brand site — see Tooling note above).
2. **Screenshot the table. Do not transcribe from the accessibility tree** —
   `read_page` scrambled row order on the ASOS table, and `find` returned stale
   refs from the previous page after a navigation. Screenshots were reliable.
3. Record: every size, every measurement, the URL, the date, and whether the
   page says body or garment.
4. Check the grade steps widen toward the top of the range. If they are
   constant, you are probably looking at a converted/derived chart, not the
   brand's own.
5. Fill in the verification table row.

### Known-good URLs

- ASOS (all categories, body): `asos.com/discover/size-charts/women/dresses/`
- Levi's (women's bottoms, cm): `levi.com/GB/en_GB/info/sizechart` → Women's
  Bottoms → "Find your Levi's size" (accordion, must be expanded)
- Good American: stockist mirror `scheels.com/size-chart/good-american-womens-apparel-size-chart`
  (own site and Dillard's/David Jones all blocked)

### Dead ends already tried

`levi.com/.../help/size-charts` and `/size-guide/women` (404 — the real path is
`/info/sizechart`), `www2.hm.com/en_gb/customer-service/size-guide/ladies.html`
(error page), Dillard's and David Jones (bot-blocked), all three ASOS URLs via
plain fetch (timeout).

### Still open

- Reformation's `Hip` column is **unlabelled high-vs-low hip**. Body-vs-garment
  is resolved (body); which hip it is, is inferred. Confirm before use.
- **Fix the two engine bugs above in the same pass as the data.** They are
  latent today only because the synthetic charts are smooth; correcting the
  brand data will surface both.
- `measurementType` is `'unknown'` on all 30 rows. Each must be set as its
  numbers are replaced with sourced ones.

### Closed

- ~~Good American's discontinuity needs a schema that can represent a jump.~~
  Resolved: `closest()` and `getBetween()` are grade-agnostic, so the existing
  shape handles it. The real exposure was the two confidence bugs.
