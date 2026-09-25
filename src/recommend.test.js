// Tests for the recommendation engine in fitseam-v2.jsx.
//
// ⚠️ READ BEFORE ADDING TESTS
//
// The BRANDS dataset is synthetic placeholder data and is due to be rebuilt
// wholesale (see brands-sources.md). Any test that hardcodes a brand's
// measurements will break on that rebuild and tell you nothing useful when it
// does. So this file is deliberately split in two:
//
//   1. Pure-helper tests  — exact values, hand-built fixture charts. These pin
//      the actual arithmetic and survive the dataset rebuild untouched.
//   2. recommend() tests  — invariants only. Where a concrete number is needed
//      it is DERIVED AT RUNTIME from whichever chart is loaded, so the
//      assertions stay true for any dataset.
//
// A handful of tests are marked CHARACTERIZATION. They document behaviour that
// is arguably wrong but is currently relied upon; they exist so a future change
// is a deliberate decision rather than an accident. Each says what it thinks
// the right behaviour would be.

import {
  BRANDS,
  chartOf,
  closest,
  getBetween,
  blendValues,
  prefOffset,
  anchorConfidence,
  recommend,
} from './fitseam-v2';

// ─── Fixtures ────────────────────────────────────────────────────────────────
// Round numbers, irregular steps, nothing borrowed from BRANDS.

const CHART = {
  S: { w: 60, h: 85 },
  M: { w: 70, h: 95 },
  L: { w: 84, h: 110 },
};

// Same data, keys declared out of measurement order — getBetween must sort.
const SCRAMBLED = {
  L: { w: 84, h: 110 },
  S: { w: 60, h: 85 },
  M: { w: 70, h: 95 },
};

/** Sizes of `chart` ordered by ascending `key`, for index comparisons. */
const orderedBy = (chart, key) =>
  Object.entries(chart)
    .sort((a, b) => a[1][key] - b[1][key])
    .map(([size]) => size);

/** A chart entry from the middle of a brand's range — avoids range-end edges. */
const midEntry = (chart, key) => {
  const order = orderedBy(chart, key);
  const size = order[Math.floor(order.length / 2)];
  return { size, values: chart[size], order };
};

// ═══════════════════════════════════════════════════════════════════════════
// closest()
// ═══════════════════════════════════════════════════════════════════════════

describe('closest', () => {
  it('returns the size with the smallest absolute difference', () => {
    expect(closest(CHART, 'h', 96)).toEqual({ size: 'M', diff: 1 });
  });

  it('reports diff 0 on an exact match', () => {
    expect(closest(CHART, 'h', 95)).toEqual({ size: 'M', diff: 0 });
  });

  it('clamps to the smallest size below the range', () => {
    expect(closest(CHART, 'h', 40).size).toBe('S');
  });

  it('clamps to the largest size above the range', () => {
    expect(closest(CHART, 'h', 200).size).toBe('L');
  });

  it('measures on the requested key only', () => {
    // 70 is an exact waist match for M, but nowhere near any hip value.
    expect(closest(CHART, 'w', 70).size).toBe('M');
    expect(closest(CHART, 'h', 70).size).toBe('S');
  });

  it('breaks an exact tie toward the first size in iteration order', () => {
    // 90 is exactly 5 from both S (85) and M (95). The `d < bestDiff` compare
    // is strict, so whichever comes first in Object.entries order wins.
    const tie = { A: { h: 85 }, B: { h: 95 } };
    expect(closest(tie, 'h', 90).size).toBe('A');
  });

  it('never picks a size that is missing the key', () => {
    const partial = { A: { w: 70 }, B: { h: 95 } };
    expect(closest(partial, 'h', 96).size).toBe('B');
  });

  it('returns a null size for an empty chart', () => {
    expect(closest({}, 'h', 95)).toEqual({ size: null, diff: Infinity });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// getBetween()
// ═══════════════════════════════════════════════════════════════════════════

describe('getBetween', () => {
  it('brackets a value falling between two sizes', () => {
    expect(getBetween(CHART, 'h', 90)).toEqual({ smaller: 'S', larger: 'M' });
  });

  it('sorts by measurement, not by key declaration order', () => {
    expect(getBetween(SCRAMBLED, 'h', 90)).toEqual({ smaller: 'S', larger: 'M' });
  });

  it('returns null below the range', () => {
    expect(getBetween(CHART, 'h', 40)).toBeNull();
  });

  it('returns null above the range', () => {
    expect(getBetween(CHART, 'h', 200)).toBeNull();
  });

  it('picks the correct pair in the upper half of the range', () => {
    expect(getBetween(CHART, 'h', 100)).toEqual({ smaller: 'M', larger: 'L' });
  });

  // Regression guard. The bounds used to be inclusive, which meant a
  // measurement landing exactly on a chart value still reported as "between
  // sizes" — the result screen showed a confident size next to a warning
  // contradicting it. And since the matched size came back as the larger end,
  // an exact S and an exact M both returned {S, M}: two users a full size
  // apart got identical copy.
  it('returns null on an exact chart match — that is a size, not a gap', () => {
    expect(getBetween(CHART, 'h', 95)).toBeNull();
  });

  it('returns null at every size in the chart, including the ends', () => {
    for (const [size, m] of Object.entries(CHART)) {
      expect({ size, between: getBetween(CHART, 'h', m.h) }).toEqual({ size, between: null });
    }
  });

  it('still brackets a value one unit either side of an exact match', () => {
    expect(getBetween(CHART, 'h', 94)).toEqual({ smaller: 'S', larger: 'M' });
    expect(getBetween(CHART, 'h', 96)).toEqual({ smaller: 'M', larger: 'L' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// blendValues()
// ═══════════════════════════════════════════════════════════════════════════

describe('blendValues', () => {
  it('returns the measurements unchanged when there are no anchors', () => {
    const measured = { w: 72, h: 98 };
    expect(blendValues(measured)).toBe(measured); // identity, not a copy
  });

  it('averages the measurements with a single anchor', () => {
    expect(blendValues({ w: 70, h: 100 }, { w: 80, h: 110 })).toEqual({ w: 75, h: 105 });
  });

  it('averages across several anchors', () => {
    expect(
      blendValues({ w: 60, h: 90 }, { w: 70, h: 100 }, { w: 80, h: 110 }),
    ).toEqual({ w: 70, h: 100 });
  });

  it('weights the user measurements equally with each anchor, not 50/50 overall', () => {
    // The user's own numbers are one voice among many. Two anchors agreeing
    // outvote the measurements 2:1 — worth knowing when reading a result.
    expect(blendValues({ h: 90 }, { h: 120 }, { h: 120 })).toEqual({ h: 110 });
  });

  it('parses numeric strings, as arrive from form inputs', () => {
    expect(blendValues({ w: '70' }, { w: '80' })).toEqual({ w: 75 });
  });

  it('drops non-numeric entries rather than poisoning the average with NaN', () => {
    expect(blendValues({ w: 70 }, { w: undefined }, { w: 80 })).toEqual({ w: 75 });
  });

  it('falls back to the measured value when every candidate is non-numeric', () => {
    expect(blendValues({ w: 'oops' }, { w: 'also oops' })).toEqual({ w: 'oops' });
  });

  it('considers only keys present on the measurements', () => {
    // An anchor carrying an extra key must not introduce it into the result.
    expect(blendValues({ w: 70 }, { w: 80, band: 75 })).toEqual({ w: 75 });
  });

  it('ignores null anchors, which is how unmatched brands arrive', () => {
    expect(blendValues({ w: 70 }, null, { w: 80 })).toEqual({ w: 75 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// prefOffset()
// ═══════════════════════════════════════════════════════════════════════════

describe('prefOffset', () => {
  it('shifts fitted down and relaxed up, in centimetres', () => {
    expect(prefOffset('fitted')).toBe(-2);
    expect(prefOffset('relaxed')).toBe(2);
  });

  it('is neutral for regular and for anything unrecognised', () => {
    expect(prefOffset('regular')).toBe(0);
    expect(prefOffset(undefined)).toBe(0);
    expect(prefOffset('snug')).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// anchorConfidence()
// ═══════════════════════════════════════════════════════════════════════════

describe('anchorConfidence', () => {
  it('is High for three or more tightly agreeing anchors', () => {
    expect(anchorConfidence(3, 4).level).toBe('High');
    expect(anchorConfidence(5, 0).level).toBe('High');
  });

  it('is Medium-High for two anchors in broad agreement', () => {
    expect(anchorConfidence(2, 6).level).toBe('Medium-High');
  });

  it('is Medium for a single anchor', () => {
    const { level, note } = anchorConfidence(1, 0);
    expect(level).toBe('Medium');
    expect(note).toMatch(/one anchor/);
  });

  it('is Medium with no anchors, and says so', () => {
    const { level, note } = anchorConfidence(0, 0);
    expect(level).toBe('Medium');
    expect(note).toMatch(/measurements alone/);
  });

  it('holds the boundary between High and Medium-High at variance 4', () => {
    expect(anchorConfidence(3, 4).level).toBe('High');
    expect(anchorConfidence(3, 5).level).toBe('Medium-High');
  });

  it('holds the boundary between Medium-High and Medium at variance 6', () => {
    expect(anchorConfidence(2, 6).level).toBe('Medium-High');
    expect(anchorConfidence(2, 7).level).toBe('Medium');
  });

  // Regression guard. Anchors that disagreed badly used to fall through every
  // branch to the final return, telling a user who had supplied three anchors
  // that the estimate was "based on your measurements alone. More anchors
  // sharpen this." They were used; they conflicted. Asking for more was the
  // opposite of the useful advice.
  describe('when anchors conflict', () => {
    it('says the anchors disagree rather than claiming there were none', () => {
      const { note } = anchorConfidence(3, 20);
      expect(note).toMatch(/disagree/);
      expect(note).not.toMatch(/measurements alone/);
      expect(note).not.toMatch(/More anchors sharpen this/);
    });

    it('reports the size of the disagreement in centimetres', () => {
      expect(anchorConfidence(3, 20).note).toContain('20cm');
      expect(anchorConfidence(2, 9).note).toContain('9cm');
    });

    it('rounds a fractional spread rather than printing decimals at the user', () => {
      expect(anchorConfidence(2, 12.4).note).toContain('12cm');
      expect(anchorConfidence(2, 12.6).note).toContain('13cm');
    });

    it('applies to two conflicting anchors as well as three', () => {
      expect(anchorConfidence(2, 7).note).toMatch(/disagree/);
    });

    it('still reports Medium — conflicting anchors are not a hard failure', () => {
      expect(anchorConfidence(3, 20).level).toBe('Medium');
      expect(anchorConfidence(2, 7).level).toBe('Medium');
    });

    it('leaves the genuine no-anchor and one-anchor notes alone', () => {
      expect(anchorConfidence(0, 0).note).toMatch(/measurements alone/);
      expect(anchorConfidence(1, 0).note).toMatch(/one anchor/);
      expect(anchorConfidence(1, 99).note).toMatch(/one anchor/); // variance is meaningless with one
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// recommend() — invariants only, see header note
// ═══════════════════════════════════════════════════════════════════════════

describe('recommend — guards', () => {
  it('returns null for a brand not in the dataset', () => {
    expect(
      recommend({
        category: 'jeans',
        measurements: { waist: 72, hip: 98 },
        targetBrand: 'Not A Real Brand',
      }),
    ).toBeNull();
  });

  it('returns null for an unknown category', () => {
    expect(
      recommend({
        category: 'hats',
        measurements: { bust: 90 },
        targetBrand: 'ASOS',
      }),
    ).toBeNull();
  });

  it('still returns a size when measurements are blank', () => {
    // Blank inputs parse to 0, which clamps to the smallest size rather than
    // throwing. The UI gates on validation, so this is a safety net.
    const out = recommend({
      category: 'jeans',
      measurements: { waist: '', hip: '' },
      targetBrand: 'ASOS',
    });
    expect(out).not.toBeNull();
    expect(Object.keys(chartOf('jeans', 'ASOS'))).toContain(out.size);
  });
});

describe('recommend — jeans', () => {
  const BRAND = 'ASOS';
  const chart = () => chartOf('jeans', BRAND);

  const forHip = (hip, extra = {}) =>
    recommend({
      category: 'jeans',
      measurements: { waist: 72, hip, ...(extra.measurements || {}) },
      targetBrand: BRAND,
      ...extra,
    });

  it('returns a size that exists in the target chart', () => {
    const out = forHip(98);
    expect(Object.keys(chart())).toContain(out.size);
  });

  it('sizes on hip: an exact chart hip returns that chart size', () => {
    const { size, values } = midEntry(chart(), 'h');
    expect(forHip(values.h).size).toBe(size);
  });

  it('returns a larger size for larger hips, across the whole range', () => {
    const order = orderedBy(chart(), 'h');
    const sizes = order.map((s) => forHip(chart()[s].h).size);
    const indices = sizes.map((s) => order.indexOf(s));
    const ascending = [...indices].sort((a, b) => a - b);
    expect(indices).toEqual(ascending);
  });

  it('never recommends larger for "fitted" than for "relaxed"', () => {
    const order = orderedBy(chart(), 'h');
    for (const s of order) {
      const hip = chart()[s].h;
      const fitted = order.indexOf(forHip(hip, { preference: 'fitted' }).size);
      const relaxed = order.indexOf(forHip(hip, { preference: 'relaxed' }).size);
      expect(fitted).toBeLessThanOrEqual(relaxed);
    }
  });

  it('reports the hip-to-waist drop from the measurements given', () => {
    expect(forHip(100, { measurements: { waist: 70, hip: 100 } }).drop).toBe(30);
  });

  it('counts only anchors that have both a brand and a size', () => {
    const out = recommend({
      category: 'jeans',
      measurements: { waist: 72, hip: 98 },
      targetBrand: BRAND,
      anchors: [
        { brand: 'ASOS', size: '10' },
        { brand: 'ASOS', size: '' }, // half-filled row from the form
        { brand: '', size: '12' },
        {},
      ],
    });
    expect(out.anchorCount).toBe(1);
  });

  it('lets an anchor pull the recommendation away from the raw measurement', () => {
    const order = orderedBy(chart(), 'h');
    const smallest = order[0];
    const largest = order[order.length - 1];

    const alone = forHip(chart()[largest].h);
    const anchored = recommend({
      category: 'jeans',
      measurements: { waist: 72, hip: chart()[largest].h },
      targetBrand: BRAND,
      anchors: [{ brand: BRAND, size: smallest }],
    });

    // Blending against a much smaller anchor must not push the size UP.
    expect(order.indexOf(anchored.size)).toBeLessThan(order.indexOf(alone.size));
  });

  describe('flags', () => {
    const kinds = (out) => out.flags.map((f) => f.title);

    it('warns about back gap when the waist is far below the chart waist', () => {
      const { size, values } = midEntry(chart(), 'h');
      const out = forHip(values.h, {
        measurements: { waist: chart()[size].w - 10, hip: values.h },
      });
      expect(kinds(out)).toContain('Back gap risk');
    });

    it('does not warn about back gap when the waist matches the chart', () => {
      const { size, values } = midEntry(chart(), 'h');
      const out = forHip(values.h, {
        measurements: { waist: chart()[size].w, hip: values.h },
      });
      expect(kinds(out)).not.toContain('Back gap risk');
    });

    it('flags a pronounced curve above a 30cm drop, and not at exactly 30', () => {
      const curvy = forHip(105, { measurements: { waist: 74, hip: 105 } });
      expect(curvy.drop).toBe(31);
      expect(kinds(curvy)).toContain('Pronounced curve');

      const even = forHip(104, { measurements: { waist: 74, hip: 104 } });
      expect(even.drop).toBe(30);
      expect(kinds(even)).not.toContain('Pronounced curve');
    });

    it('does not warn about being between sizes when the hip matches exactly', () => {
      // The contradiction this prevents: closest() returns the size with
      // diff 0, so a "you fall between two sizes" warning beside it told the
      // user two opposite things at once.
      const { values } = midEntry(chart(), 'h');
      const out = forHip(values.h, { measurements: { waist: 72, hip: values.h } });
      expect(kinds(out)).not.toContain('Between sizes');
    });

    it('still warns about being between sizes when the hip falls in a gap', () => {
      const order = orderedBy(chart(), 'h');
      const lower = chart()[order[0]].h;
      const upper = chart()[order[1]].h;
      const midpoint = (lower + upper) / 2;
      expect(midpoint).not.toBe(lower); // guard: the fixture must have a real gap
      const out = forHip(midpoint, { measurements: { waist: 72, hip: midpoint } });
      expect(kinds(out)).toContain('Between sizes');
    });

    it('adds a length note under 160cm and over 178cm, but not between', () => {
      expect(kinds(forHip(98, { height: 155 }))).toContain('Length note');
      expect(kinds(forHip(98, { height: 180 }))).toContain('Length note');
      expect(kinds(forHip(98, { height: 168 }))).not.toContain('Length note');
    });

    it('treats a missing height as no length note rather than as zero', () => {
      // `h > 0 && h < 160` exists precisely so a blank field is not read as a
      // very short user.
      expect(kinds(forHip(98, { height: '' }))).not.toContain('Length note');
      expect(kinds(forHip(98))).not.toContain('Length note');
    });

    it('gives every flag a title, body and known kind', () => {
      const out = forHip(105, { measurements: { waist: 70, hip: 105 }, height: 155 });
      expect(out.flags.length).toBeGreaterThan(0);
      for (const f of out.flags) {
        expect(typeof f.title).toBe('string');
        expect(f.title.length).toBeGreaterThan(0);
        expect(typeof f.body).toBe('string');
        expect(f.body.length).toBeGreaterThan(0);
        expect(['warning', 'tip', 'length', 'positive']).toContain(f.kind);
      }
    });
  });
});

describe('recommend — dress', () => {
  const BRAND = 'ASOS';
  const chart = () => chartOf('dress', BRAND);

  const forBody = (measurements, extra = {}) =>
    recommend({ category: 'dress', measurements, targetBrand: BRAND, ...extra });

  it('sizes on bust: an exact chart bust returns that chart size', () => {
    const { size, values } = midEntry(chart(), 'b');
    const out = forBody({ bust: values.b, waist: values.w, hip: values.h });
    expect(out.size).toBe(size);
  });

  it('ignores hip when choosing the size', () => {
    const { size, values } = midEntry(chart(), 'b');
    const a = forBody({ bust: values.b, waist: values.w, hip: 80 });
    const b = forBody({ bust: values.b, waist: values.w, hip: 130 });
    expect(a.size).toBe(size);
    expect(b.size).toBe(size);
  });

  it('reports the bust-to-waist difference', () => {
    expect(forBody({ bust: 95, waist: 70, hip: 100 }).bustWaistDiff).toBe(25);
  });

  it('flags a chest–waist gap above 20cm', () => {
    const out = forBody({ bust: 95, waist: 70, hip: 100 });
    expect(out.flags.map((f) => f.title)).toContain('Chest–waist gap');
  });

  it('calls out even proportions below an 8cm difference', () => {
    const out = forBody({ bust: 90, waist: 84, hip: 96 });
    expect(out.flags.map((f) => f.title)).toContain('Even proportions');
  });

  // CHARACTERIZATION — a gap between 8cm and 20cm produces neither flag.
  // That is probably intentional (nothing worth saying), but it means the
  // "positive" flag is absent for most people, so the result screen must not
  // depend on one always being present.
  it('CHARACTERIZATION: says nothing about proportions in the 8–20cm band', () => {
    const titles = forBody({ bust: 95, waist: 80, hip: 100 }).flags.map((f) => f.title);
    expect(titles).not.toContain('Chest–waist gap');
    expect(titles).not.toContain('Even proportions');
  });

  it('flags a size split when bust and waist point to different sizes', () => {
    const order = orderedBy(chart(), 'b');
    const small = chart()[order[0]];
    const large = chart()[order[order.length - 1]];
    const out = forBody({ bust: large.b, waist: small.w, hip: large.h });
    const split = out.flags.find((f) => f.title === 'Size split');
    expect(split).toBeDefined();
    // It must name the size it actually returned as the bust size.
    expect(split.body).toContain(out.size);
  });
});

describe('recommend — bikini', () => {
  const BRAND = 'ASOS';
  const data = () => BRANDS.bikini[BRAND].sizes;

  const forBody = (bust, hip, extra = {}) =>
    recommend({
      category: 'bikini',
      measurements: { bust, hip },
      targetBrand: BRAND,
      ...extra,
    });

  it('returns separate top and bottom sizes, not a single size', () => {
    const out = forBody(90, 98);
    expect(out.topSize).toBeDefined();
    expect(out.bottomSize).toBeDefined();
    expect(out.size).toBeUndefined();
    expect(Object.keys(data().top)).toContain(out.topSize);
    expect(Object.keys(data().bottom)).toContain(out.bottomSize);
  });

  it('sizes the top on bust and the bottom on hip, independently', () => {
    const top = midEntry(data().top, 'b');
    const bottom = midEntry(data().bottom, 'h');
    const out = forBody(top.values.b, bottom.values.h);
    expect(out.topSize).toBe(top.size);
    expect(out.bottomSize).toBe(bottom.size);
  });

  it('flags a mixed pairing when top and bottom differ', () => {
    const topOrder = orderedBy(data().top, 'b');
    const bottomOrder = orderedBy(data().bottom, 'h');
    const out = forBody(
      data().top[topOrder[0]].b,
      data().bottom[bottomOrder[bottomOrder.length - 1]].h,
    );
    expect(out.topSize).not.toBe(out.bottomSize);
    expect(out.flags.map((f) => f.title)).toContain('Mix sizes');
  });

  it('uses its own confidence scale, which ignores anchor variance', () => {
    expect(forBody(90, 98).confidence).toBe('Medium');
    expect(forBody(90, 98, { anchors: [{ brand: 'ASOS', size: '10' }] }).confidence).toBe('Medium');
    expect(
      forBody(90, 98, {
        anchors: [
          { brand: 'ASOS', size: '6' },
          { brand: 'ASOS', size: '16' }, // wildly inconsistent, still "High"
        ],
      }).confidence,
    ).toBe('High');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Dataset shape
// ═══════════════════════════════════════════════════════════════════════════
//
// These guard the schema rather than the numbers, so they are the tests most
// worth keeping green during the dataset rebuild — they catch a malformed row
// the moment it is added.

describe('BRANDS dataset shape', () => {
  const flat = Object.entries(BRANDS).flatMap(([category, brands]) =>
    Object.entries(brands).map(([brand, data]) => ({ category, brand, data })),
  );

  it('covers the three categories the UI offers', () => {
    expect(Object.keys(BRANDS).sort()).toEqual(['bikini', 'dress', 'jeans']);
  });

  it('has at least one brand in every category', () => {
    for (const [category, brands] of Object.entries(BRANDS)) {
      expect(Object.keys(brands).length).toBeGreaterThan(0);
      expect(category).toBeTruthy();
    }
  });

  it.each(flat)('$category/$brand carries its metadata fields', ({ data }) => {
    expect(typeof data.sizeSystem).toBe('string');
    expect(typeof data.measurementType).toBe('string');
    expect(['body', 'garment', 'unknown']).toContain(data.measurementType);
    expect(data).toHaveProperty('source');
    expect(data).toHaveProperty('verified');
  });

  it.each(flat.filter((f) => f.category !== 'bikini'))(
    '$category/$brand has non-empty sizes with the keys its category needs',
    ({ category, data }) => {
      const entries = Object.entries(data.sizes);
      expect(entries.length).toBeGreaterThan(0);
      for (const [, m] of entries) {
        expect(typeof m.w).toBe('number');
        expect(typeof m.h).toBe('number');
        if (category === 'dress') expect(typeof m.b).toBe('number');
      }
    },
  );

  it.each(flat.filter((f) => f.category === 'bikini'))(
    'bikini/$brand splits into top and bottom charts',
    ({ data }) => {
      expect(Object.keys(data.sizes.top).length).toBeGreaterThan(0);
      expect(Object.keys(data.sizes.bottom).length).toBeGreaterThan(0);
      for (const [, m] of Object.entries(data.sizes.top)) expect(typeof m.b).toBe('number');
      for (const [, m] of Object.entries(data.sizes.bottom)) expect(typeof m.h).toBe('number');
    },
  );

  it.each(flat.filter((f) => f.category !== 'bikini'))(
    '$category/$brand measurements increase with size',
    ({ category, data }) => {
      // Within a chart, a larger size must never be smaller in any dimension.
      // Nothing here depends on the values being correct — only ordered.
      const key = category === 'dress' ? 'b' : 'h';
      const values = Object.entries(data.sizes)
        .sort((a, b) => a[1][key] - b[1][key])
        .map(([, m]) => m);
      for (let i = 1; i < values.length; i++) {
        expect(values[i].w).toBeGreaterThanOrEqual(values[i - 1].w);
        expect(values[i].h).toBeGreaterThanOrEqual(values[i - 1].h);
      }
    },
  );

  // This is the guard that matters most during the rebuild. brands-sources.md
  // explains why partial correction is unsafe: blendValues() averages across
  // brands, so a corrected brand blended with synthetic ones is harder to
  // reason about than a uniformly wrong dataset.
  //
  // When the rebuild starts, flip this to require `verified` on every row.
  it('marks every unverified row as unverified, with no silent half-states', () => {
    for (const { category, brand, data } of flat) {
      const claimsVerified = data.verified !== null;
      const claimsRealMeasurements = data.measurementType !== 'unknown';
      expect(`${category}/${brand}:${claimsVerified === claimsRealMeasurements}`).toBe(
        `${category}/${brand}:true`,
      );
    }
  });
});
