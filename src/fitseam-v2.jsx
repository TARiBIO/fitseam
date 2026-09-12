import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { supabase, hasSupabase } from "./supabase";

// ─── Persistence ─────────────────────────────────────────────────────────────
// Supabase when env vars are set; localStorage otherwise (or in addition,
// so a failed network call still leaves a record on the device).

const rid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const local = {
  save(key, data) {
    try { localStorage.setItem(key, JSON.stringify({ ...data, ts: Date.now() })); } catch {}
  },
  readInt(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      const n = v == null ? NaN : parseInt(v, 10);
      return Number.isFinite(n) ? n : fallback;
    } catch { return fallback; }
  },
  writeInt(key, n) {
    try { localStorage.setItem(key, String(n)); } catch {}
  },
};

async function insertRow(table, row, localKey) {
  local.save(localKey, row);
  if (!hasSupabase) return;
  try {
    const { error } = await supabase.from(table).insert(row);
    if (error) console.warn(`[fitseam] Supabase insert failed (${table}):`, error.message);
  } catch (e) {
    console.warn(`[fitseam] Supabase insert threw (${table}):`, e?.message ?? e);
  }
}

async function fetchRemoteCount() {
  if (!hasSupabase) return null;
  try {
    const { data, error } = await supabase.rpc('get_size_count');
    if (error) { console.warn('[fitseam] get_size_count failed:', error.message); return null; }
    const n = typeof data === 'number' ? data : parseInt(data, 10);
    return Number.isFinite(n) ? n : null;
  } catch (e) {
    console.warn('[fitseam] get_size_count threw:', e?.message ?? e);
    return null;
  }
}

// ─── Brand database ───────────────────────────────────────────────────────────

const BRANDS = {
  jeans: {
    "Levi's":         { "24":{w:61,h:86},"25":{w:64,h:89},"26":{w:66,h:91},"27":{w:69,h:94},"28":{w:71,h:96},"29":{w:74,h:99},"30":{w:76,h:101},"31":{w:79,h:104},"32":{w:81,h:106},"33":{w:84,h:109},"34":{w:86,h:111} },
    "Zara":           { "XS":{w:62,h:88},"S":{w:66,h:92},"M":{w:70,h:96},"L":{w:74,h:100},"XL":{w:78,h:104} },
    "H&M":            { "34":{w:62,h:88},"36":{w:66,h:92},"38":{w:70,h:96},"40":{w:74,h:100},"42":{w:78,h:104},"44":{w:82,h:108} },
    "ASOS":           { "6":{w:61,h:87},"8":{w:65,h:91},"10":{w:69,h:95},"12":{w:73,h:99},"14":{w:77,h:103},"16":{w:81,h:107} },
    "Fashion Nova":   { "XS":{w:62,h:88},"S":{w:66,h:92},"M":{w:70,h:97},"L":{w:75,h:102},"XL":{w:80,h:107},"XXL":{w:85,h:112} },
    "PrettyLittleThing": { "6":{w:61,h:87},"8":{w:65,h:91},"10":{w:69,h:95},"12":{w:73,h:100},"14":{w:78,h:105},"16":{w:83,h:110} },
    "Boohoo":         { "6":{w:61,h:87},"8":{w:65,h:91},"10":{w:69,h:95},"12":{w:73,h:100},"14":{w:78,h:105},"16":{w:83,h:110} },
    "Shein":          { "XS":{w:62,h:86},"S":{w:66,h:90},"M":{w:70,h:94},"L":{w:74,h:99},"XL":{w:79,h:104},"XXL":{w:84,h:109} },
    "Good American":  { "6":{w:61,h:88},"8":{w:65,h:92},"10":{w:69,h:96},"12":{w:73,h:100},"14":{w:77,h:104},"16":{w:81,h:108} },
    "River Island":   { "6":{w:61,h:86},"8":{w:65,h:90},"10":{w:69,h:94},"12":{w:73,h:98},"14":{w:77,h:102},"16":{w:81,h:106} },
    "Mr Price":       { "XS":{w:63,h:88},"S":{w:67,h:92},"M":{w:71,h:96},"L":{w:75,h:100},"XL":{w:80,h:105} },
    "Woolworths SA":  { "10":{w:67,h:92},"12":{w:71,h:96},"14":{w:75,h:100},"16":{w:79,h:104},"18":{w:83,h:108} },
  },
  dress: {
    "Zara":           { "XS":{b:84,w:64,h:88},"S":{b:88,w:68,h:92},"M":{b:92,w:72,h:96},"L":{b:96,w:76,h:100},"XL":{b:100,w:80,h:104} },
    "H&M":            { "34":{b:83,w:63,h:87},"36":{b:87,w:67,h:91},"38":{b:91,w:71,h:95},"40":{b:95,w:75,h:99},"42":{b:99,w:79,h:103},"44":{b:103,w:83,h:107} },
    "ASOS":           { "6":{b:81,w:61,h:85},"8":{b:85,w:65,h:89},"10":{b:89,w:69,h:93},"12":{b:93,w:73,h:97},"14":{b:97,w:77,h:101},"16":{b:101,w:81,h:105},"18":{b:106,w:86,h:110} },
    "Boohoo":         { "6":{b:81,w:61,h:85},"8":{b:85,w:65,h:89},"10":{b:89,w:69,h:93},"12":{b:93,w:73,h:98},"14":{b:98,w:78,h:103},"16":{b:103,w:83,h:108} },
    "PrettyLittleThing": { "6":{b:80,w:60,h:84},"8":{b:84,w:64,h:88},"10":{b:88,w:68,h:92},"12":{b:92,w:72,h:97},"14":{b:97,w:77,h:102},"16":{b:102,w:82,h:107} },
    "Fashion Nova":   { "XS":{b:84,w:64,h:88},"S":{b:88,w:68,h:93},"M":{b:92,w:72,h:98},"L":{b:97,w:77,h:103},"XL":{b:102,w:82,h:108},"XXL":{b:107,w:87,h:113} },
    "Shein":          { "XS":{b:83,w:63,h:87},"S":{b:87,w:67,h:91},"M":{b:91,w:71,h:95},"L":{b:95,w:75,h:100},"XL":{b:100,w:80,h:105},"XXL":{b:105,w:85,h:110} },
    "Mango":          { "XS":{b:84,w:64,h:88},"S":{b:88,w:68,h:92},"M":{b:92,w:72,h:96},"L":{b:96,w:76,h:100},"XL":{b:100,w:80,h:104} },
    "Reformation":    { "0":{b:81,w:61,h:85},"2":{b:84,w:64,h:88},"4":{b:87,w:67,h:91},"6":{b:90,w:70,h:94},"8":{b:93,w:73,h:97},"10":{b:96,w:76,h:100},"12":{b:100,w:80,h:104} },
    "Mr Price":       { "XS":{b:84,w:64,h:88},"S":{b:88,w:68,h:92},"M":{b:92,w:72,h:96},"L":{b:96,w:76,h:101},"XL":{b:101,w:81,h:106} },
  },
  bikini: {
    "ASOS":           { top:{"6":{b:81,band:71},"8":{b:84,band:74},"10":{b:87,band:77},"12":{b:91,band:81},"14":{b:96,band:86},"16":{b:101,band:91}}, bottom:{"6":{w:61,h:86},"8":{w:65,h:90},"10":{w:69,h:94},"12":{w:73,h:98},"14":{w:77,h:102},"16":{w:81,h:106}} },
    "Fashion Nova":   { top:{"XS":{b:84,band:72},"S":{b:88,band:76},"M":{b:93,band:81},"L":{b:98,band:86},"XL":{b:103,band:91},"XXL":{b:109,band:97}}, bottom:{"XS":{w:62,h:88},"S":{w:66,h:92},"M":{w:71,h:97},"L":{w:76,h:102},"XL":{w:81,h:107}} },
    "Shein":          { top:{"XS":{b:82,band:70},"S":{b:86,band:74},"M":{b:90,band:78},"L":{b:94,band:82},"XL":{b:99,band:87},"XXL":{b:104,band:92}}, bottom:{"XS":{w:62,h:87},"S":{w:66,h:91},"M":{w:70,h:95},"L":{w:75,h:100},"XL":{w:80,h:105}} },
    "H&M":            { top:{"XS":{b:82,band:70},"S":{b:86,band:74},"M":{b:90,band:78},"L":{b:95,band:83},"XL":{b:100,band:88}}, bottom:{"XS":{w:62,h:88},"S":{w:66,h:92},"M":{w:70,h:96},"L":{w:74,h:100},"XL":{w:78,h:104}} },
    "PrettyLittleThing": { top:{"6":{b:80,band:68},"8":{b:83,band:71},"10":{b:87,band:75},"12":{b:91,band:79},"14":{b:96,band:84},"16":{b:101,band:89}}, bottom:{"6":{w:61,h:87},"8":{w:65,h:91},"10":{w:69,h:95},"12":{w:73,h:99},"14":{w:77,h:103},"16":{w:82,h:108}} },
    "Triangl":        { top:{"XS":{b:83,band:71},"S":{b:87,band:75},"M":{b:91,band:79},"L":{b:95,band:83},"XL":{b:100,band:88}}, bottom:{"XS":{w:62,h:88},"S":{w:66,h:92},"M":{w:70,h:96},"L":{w:75,h:101},"XL":{w:80,h:106}} },
    "Cupshe":         { top:{"S":{b:84,band:72},"M":{b:88,band:76},"L":{b:93,band:81},"XL":{b:98,band:86},"XXL":{b:104,band:92}}, bottom:{"S":{w:64,h:90},"M":{w:68,h:94},"L":{w:73,h:99},"XL":{w:78,h:104},"XXL":{w:83,h:109}} },
    "Boohoo":         { top:{"6":{b:81,band:69},"8":{b:84,band:72},"10":{b:88,band:76},"12":{b:92,band:80},"14":{b:97,band:85},"16":{b:102,band:90}}, bottom:{"6":{w:61,h:87},"8":{w:65,h:91},"10":{w:69,h:95},"12":{w:73,h:99},"14":{w:78,h:104},"16":{w:83,h:109}} },
  },
};

// ─── Recommendation engine ────────────────────────────────────────────────────

const closest = (chart, key, val) => {
  let best = null, bestDiff = Infinity;
  for (const [size, m] of Object.entries(chart)) {
    const d = Math.abs((m[key] ?? Infinity) - val);
    if (d < bestDiff) { bestDiff = d; best = size; }
  }
  return { size: best, diff: bestDiff };
};

const getBetween = (chart, key, val) => {
  const entries = Object.entries(chart).sort((a, b) => (a[1][key] ?? 0) - (b[1][key] ?? 0));
  for (let i = 0; i < entries.length - 1; i++) {
    if (val >= entries[i][1][key] && val <= entries[i + 1][1][key])
      return { smaller: entries[i][0], larger: entries[i + 1][0] };
  }
  return null;
};

const impliedFor = (category, brand, size) => {
  if (category === 'jeans') return BRANDS.jeans[brand]?.[size] ?? null;
  if (category === 'dress') return BRANDS.dress[brand]?.[size] ?? null;
  return null;
};

const blendValues = (measured, ...implied) => {
  const all = [measured, ...implied].filter(Boolean);
  if (all.length === 1) return measured;
  const keys = Object.keys(measured);
  const result = {};
  for (const k of keys) {
    const vals = all.map(m => parseFloat(m[k])).filter(v => !isNaN(v));
    result[k] = vals.length ? vals.reduce((a, b) => a + b) / vals.length : measured[k];
  }
  return result;
};

const prefOffset = (preference) =>
  preference === 'fitted' ? -2 : preference === 'relaxed' ? 2 : 0;

const anchorConfidence = (n, variance) => {
  if (n >= 3 && variance <= 4) return { level: 'High', note: 'Your size signals agree closely across brands.' };
  if (n >= 2 && variance <= 6) return { level: 'Medium-High', note: 'Your anchors broadly agree — a confident estimate.' };
  if (n === 1) return { level: 'Medium', note: 'Based on one anchor plus your measurements.' };
  return { level: 'Medium', note: 'Based on your measurements alone. More anchors sharpen this.' };
};

function recommend({ category, measurements: m, anchors = [], preference = 'regular', targetBrand, shape, height }) {
  const validAnchors = anchors.filter(a => a.brand && a.size);
  const h = parseFloat(height) || 0;
  const off = prefOffset(preference);

  if (category === 'jeans') {
    const chart = BRANDS.jeans[targetBrand];
    if (!chart) return null;

    const implied = validAnchors.map(a => impliedFor('jeans', a.brand, a.size)).filter(Boolean);
    const base = { w: parseFloat(m.waist) || 0, h: parseFloat(m.hip) || 0 };
    const blended = blendValues(base, ...implied);
    const targetHip = blended.h + off;
    const targetWaist = blended.w;

    const hipRec = closest(chart, 'h', targetHip);
    const inBetween = getBetween(chart, 'h', targetHip);
    const recWaist = chart[hipRec.size]?.w ?? 0;
    const gapCm = targetWaist < recWaist ? Math.round(recWaist - targetWaist) : 0;
    const drop = Math.round(blended.h - blended.w);

    const impliedHips = implied.map(i => i.h);
    const variance = impliedHips.length > 1 ? Math.max(...impliedHips) - Math.min(...impliedHips) : 0;
    const conf = anchorConfidence(validAnchors.length, variance);

    const flags = [];
    if (gapCm >= 4) flags.push({ kind: 'warning', title: 'Back gap risk', body: `This size fits your hips but will have ~${gapCm}cm of room at the waist. High-rise styles reduce this gap — or size down and stretch-in.` });
    if (drop > 30) flags.push({ kind: 'tip', title: 'Pronounced curve', body: `You have a ${drop}cm hip-to-waist drop. Brands like Good American and Fashion Nova cut for curves — they'll serve you better here.` });
    if (inBetween) flags.push({ kind: 'warning', title: 'Between sizes', body: `You fall between ${inBetween.smaller} and ${inBetween.larger}. Size up for comfort or if the fabric is rigid; size down for a fitted look in stretch denim.` });
    if (h > 0 && h < 160) flags.push({ kind: 'length', title: 'Length note', body: 'At your height, standard inseam jeans will likely need hemming. Look for petite or short-leg options.' });
    if (h > 178) flags.push({ kind: 'length', title: 'Length note', body: 'Standard inseam lengths may run short. Look for tall or long-leg options.' });
    if (shape === 'pear' && gapCm < 4) flags.push({ kind: 'tip', title: 'Pear shape', body: 'Your hips are your widest point — always size by hip. A belt closes any waist gap without sizing down.' });

    return { size: hipRec.size, confidence: conf.level, confidenceNote: conf.note, flags, drop, anchorCount: validAnchors.length };
  }

  if (category === 'dress') {
    const chart = BRANDS.dress[targetBrand];
    if (!chart) return null;

    const implied = validAnchors.map(a => impliedFor('dress', a.brand, a.size)).filter(Boolean);
    const base = { b: parseFloat(m.bust) || 0, w: parseFloat(m.waist) || 0, h: parseFloat(m.hip) || 0 };
    const blended = blendValues(base, ...implied);
    const targetBust = blended.b + off;

    const bustRec = closest(chart, 'b', targetBust);
    const waistRec = closest(chart, 'w', blended.w);
    const inBetween = getBetween(chart, 'b', targetBust);
    const bustWaistDiff = Math.round(blended.b - blended.w);

    const impliedBusts = implied.map(i => i.b);
    const variance = impliedBusts.length > 1 ? Math.max(...impliedBusts) - Math.min(...impliedBusts) : 0;
    const conf = anchorConfidence(validAnchors.length, variance);

    const flags = [];
    if (bustWaistDiff > 20) flags.push({ kind: 'warning', title: 'Chest–waist gap', body: `A ${bustWaistDiff}cm difference between your bust and waist means size ${bustRec.size} will fit the chest and have extra room at the waist. Wrap, tie-waist, or A-line styles naturally absorb this. Avoid structured shifts.` });
    if (bustWaistDiff < 8) flags.push({ kind: 'positive', title: 'Even proportions', body: 'Your bust and waist are close — you can expect consistent fit through the torso at this size.' });
    if (bustRec.size !== waistRec.size) flags.push({ kind: 'tip', title: 'Size split', body: `Your bust suggests ${bustRec.size} and your waist suggests ${waistRec.size}. We sized by bust — the limiting factor for most styles. If the waist fit matters more to you, go ${waistRec.size}.` });
    if (inBetween) flags.push({ kind: 'warning', title: 'Between sizes', body: `You fall between ${inBetween.smaller} and ${inBetween.larger}. Size up for chest room, down for a defined waist.` });
    if (h > 0 && h < 160) flags.push({ kind: 'length', title: 'Length note', body: 'Midi and maxi lengths will hit lower on you than the label suggests. Midi cuts are a safer starting point.' });
    if (h > 178) flags.push({ kind: 'length', title: 'Length note', body: 'Standard dress lengths may run short on you. Check the listed hem length before ordering midi or mini styles.' });

    return { size: bustRec.size, confidence: conf.level, confidenceNote: conf.note, flags, bustWaistDiff, anchorCount: validAnchors.length };
  }

  if (category === 'bikini') {
    const brandData = BRANDS.bikini[targetBrand];
    if (!brandData) return null;
    const bust = parseFloat(m.bust) || 0;
    const hip  = parseFloat(m.hip)  || 0;
    const topRec    = closest(brandData.top,    'b', bust + off);
    const bottomRec = closest(brandData.bottom, 'h', hip  + off);
    const topBetween    = getBetween(brandData.top,    'b', bust);
    const bottomBetween = getBetween(brandData.bottom, 'h', hip);

    const conf = validAnchors.length >= 2 ? { level: 'High', note: 'Two or more anchors agree.' }
      : validAnchors.length === 1 ? { level: 'Medium', note: 'Based on one anchor plus measurements.' }
      : { level: 'Medium', note: 'Based on your measurements alone.' };

    const flags = [];
    if (topRec.size !== bottomRec.size) flags.push({ kind: 'positive', title: 'Mix sizes', body: 'Your top and bottom are different sizes — completely normal. Most brands let you buy them separately.' });
    if (topBetween) flags.push({ kind: 'tip', title: 'Top: between sizes', body: `You're between ${topBetween.smaller} and ${topBetween.larger} for tops. Size up if you're fuller-busted — bikini tops have less stretch than bras.` });
    if (bottomBetween) flags.push({ kind: 'tip', title: 'Bottom: between sizes', body: `You're between ${bottomBetween.smaller} and ${bottomBetween.larger} for bottoms. Size up for more coverage; down for a more fitted look.` });

    return { topSize: topRec.size, bottomSize: bottomRec.size, confidence: conf.level, confidenceNote: conf.note, flags, anchorCount: validAnchors.length };
  }

  return null;
}

// ─── Design tokens & CSS ─────────────────────────────────────────────────────

const INK = '#1A1A1A', CREAM = '#F5F1EA', RUST = '#B85C3C';

const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --color-surface: ${CREAM};
    --color-ink: ${INK};
    --color-accent: ${RUST};
    --color-text-secondary: rgba(26,26,26,.68);
    --color-text-muted: rgba(26,26,26,.64);
    --color-border: rgba(26,26,26,.18);
    --color-border-light: rgba(26,26,26,.1);
    --font-display: 'Instrument Serif', serif;
    --font-body: 'DM Sans', sans-serif;
    --container-max: 672px;
    --container-wide: 960px;
    --container-padding: 24px;
    --color-surface-raised: #FBF8F2;
    --color-text-inverse: ${CREAM};
    --color-text-disabled: rgba(26,26,26,.28);
    --text-h1: clamp(48px, 8vw, 88px);
    --text-h2: clamp(28px, 5vw, 48px);
    --space-3: 12px; --space-4: 16px; --space-5: 20px; --space-6: 24px;
    --space-7: 32px; --space-8: 48px; --space-9: 64px; --space-10: 80px;
    --fg-icon-stroke: 1.5;
    --fg-icon-join: round;
    --fg-icon-cap: round;
  }
  html, body { background: var(--color-surface); }
  .fg-step-in { animation: fg-step-in .22s cubic-bezier(.4,0,.2,1) both; }
  @keyframes fg-step-in { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }

  .fg-opt {
    display:block; width:100%; text-align:left;
    border:1px solid var(--color-border);
    padding:20px 18px; cursor:pointer;
    background:transparent; color:${INK};
    transition:background .14s, border-color .14s, color .14s;
    font-family:var(--font-body);
  }
  .fg-opt:hover { background:${INK}; color:${CREAM}; border-color:${INK}; }
  .fg-opt.on  { background:${INK}; color:${CREAM}; border-color:${INK}; }

  .fg-input {
    width:100%; background:transparent; border:none;
    border-bottom:1px solid ${INK};
    padding:10px 0; font-size:20px; outline:none;
    color:${INK}; font-family:var(--font-body); border-radius:0;
  }
  .fg-input:focus { border-bottom-color:${RUST}; }
  .fg-input::placeholder { color:rgba(26,26,26,.35); }

  .fg-select {
    width:100%; background:transparent; border:none;
    border-bottom:1px solid ${INK};
    padding:10px 0; font-size:18px; outline:none;
    color:${INK}; font-family:var(--font-body); border-radius:0;
    appearance:none; -webkit-appearance:none; cursor:pointer;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath fill='%231A1A1A' d='M5 6L0 0h10z'/%3E%3C/svg%3E");
    background-repeat:no-repeat; background-position:right 4px center; padding-right:22px;
  }
  .fg-select:focus { border-bottom-color:${RUST}; }
  .fg-select:disabled { opacity:.28; cursor:not-allowed; }

  .fg-btn-dark {
    background:${INK}; color:${CREAM}; border:none;
    padding:16px 28px; font-size:12px; font-weight:500;
    letter-spacing:.1em; text-transform:uppercase; cursor:pointer;
    font-family:var(--font-body); transition:background .18s;
  }
  .fg-btn-dark:hover:not(:disabled) { background:var(--color-accent); }
  .fg-btn-dark:disabled { opacity:.22; cursor:not-allowed; }

  .fg-btn-outline {
    background:transparent; color:${INK}; border:1px solid ${INK};
    padding:16px 28px; font-size:12px; font-weight:500;
    letter-spacing:.1em; text-transform:uppercase; cursor:pointer;
    font-family:var(--font-body); transition:background .18s, color .18s;
  }
  .fg-btn-outline:hover { background:${INK}; color:${CREAM}; }

  .fg-btn-ghost {
    background:transparent; color:${INK}; border:none;
    padding:12px 0; font-size:12px; letter-spacing:.08em;
    text-transform:uppercase; cursor:pointer;
    font-family:var(--font-body); opacity:.4; transition:opacity .15s;
  }
  .fg-btn-ghost:hover { opacity:1; }

  .fg-label {
    display:block; font-size:11px; letter-spacing:.1em;
    text-transform:uppercase; color:${INK}; opacity:.64;
    margin-bottom:10px; font-family:var(--font-body);
  }

  .fg-flag {
    border-left:2px solid var(--color-accent);
    padding:12px 16px; margin-bottom:12px;
  }

  .fg-pill {
    padding:14px 12px; text-align:left; cursor:pointer;
    border:1px solid var(--color-border); background:transparent; color:${INK};
    font-family:var(--font-body); font-size:13px;
    transition:background .14s, border-color .14s, color .14s; width:100%;
  }
  .fg-pill:hover { border-color:${INK}; }
  .fg-pill.on  { background:${INK}; color:${CREAM}; border-color:${INK}; }

  .twk-panel {
    position:fixed; right:16px; bottom:16px; z-index:9999; width:272px;
    max-height:calc(100vh - 32px); display:flex; flex-direction:column;
    background:rgba(250,249,247,.86); color:${INK};
    -webkit-backdrop-filter:blur(20px); backdrop-filter:blur(20px);
    border:.5px solid rgba(255,255,255,.55); border-radius:12px;
    box-shadow:0 12px 40px rgba(0,0,0,.16); font:11.5px/1.4 var(--font-body);
    overflow:hidden;
  }
  .twk-hd { display:flex; align-items:center; justify-content:space-between;
    padding:10px 10px 10px 14px; cursor:move; user-select:none; }
  .twk-hd b { font-size:12px; font-weight:600; }
  .twk-close { appearance:none; border:0; background:transparent; color:rgba(26,26,26,.5);
    width:22px; height:22px; border-radius:6px; cursor:pointer; font-size:13px; line-height:1; }
  .twk-close:hover { background:rgba(0,0,0,.06); color:${INK}; }
  .twk-body { padding:4px 14px 14px; display:flex; flex-direction:column; gap:10px;
    overflow-y:auto; min-height:0; }
  .twk-section { font-size:10px; font-weight:600; letter-spacing:.06em;
    text-transform:uppercase; color:rgba(26,26,26,.4); padding:8px 0 0; }
  .twk-row { display:flex; flex-direction:column; gap:5px; }
  .twk-row-lbl { display:flex; justify-content:space-between;
    color:rgba(26,26,26,.7); font-weight:500; }
  .twk-row-lbl span:last-child { color:rgba(26,26,26,.4); font-variant-numeric:tabular-nums; }
  .twk-slider { appearance:none; -webkit-appearance:none; width:100%; height:4px;
    border-radius:999px; background:rgba(0,0,0,.12); outline:none; margin:4px 0; }
  .twk-slider::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px;
    border-radius:50%; background:#fff; border:.5px solid rgba(0,0,0,.12);
    box-shadow:0 1px 3px rgba(0,0,0,.2); cursor:default; }
  .twk-seg { position:relative; display:flex; padding:2px; border-radius:8px;
    background:rgba(0,0,0,.07); }
  .twk-seg-thumb { position:absolute; top:2px; bottom:2px; border-radius:6px;
    background:rgba(255,255,255,.9); box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s, width .15s; }
  .twk-seg button { position:relative; z-index:1; flex:1; border:0; background:transparent;
    color:inherit; font:inherit; font-weight:500; min-height:22px;
    border-radius:6px; cursor:pointer; padding:4px 6px; }
  .twk-chips { display:flex; gap:6px; }
  .twk-chip { position:relative; appearance:none; flex:1; height:36px; padding:0;
    border:0; border-radius:6px; overflow:hidden; cursor:pointer;
    box-shadow:0 0 0 .5px rgba(0,0,0,.12); transition:transform .12s, box-shadow .12s; }
  .twk-chip:hover { transform:translateY(-1px); box-shadow:0 0 0 .5px rgba(0,0,0,.18), 0 4px 10px rgba(0,0,0,.1); }
  .twk-chip[data-on="1"] { box-shadow:0 0 0 2px ${INK}; }
  .twk-chip svg { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:14px; height:14px; }

  /* ── Layout containers & shared page classes ───────────────────────── */
  .fg-container      { max-width: var(--container-max); margin: 0 auto; padding: 0 var(--container-padding); }
  .fg-container-wide { max-width: var(--container-wide); margin: 0 auto; padding: 0 var(--container-padding); }

  .fg-two-col     { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; }
  .fg-anchor-row  { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .fg-story-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .fg-shape-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .fg-problem-grid{ display: grid; grid-template-columns: 1fr; gap: 28px; }
  @media (min-width: 768px) { .fg-problem-grid { grid-template-columns: repeat(3, 1fr); } }

  .fg-numbers-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px;
    border-top: 1px solid ${INK}; border-bottom: 1px solid ${INK}; padding: 32px 0; }
  .fg-numbers-strip .fg-stat { font-family: var(--font-display); font-size: 56px; line-height: 1; color: ${INK}; margin: 0; }

  .fg-header-bar { display: flex; align-items: center; justify-content: space-between; height: 72px; }
  .fg-nav { display: flex; align-items: center; gap: 28px; }

  .fg-footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 48px; margin-bottom: 48px; }

  .fg-press-grid  { display: grid; grid-template-columns: 180px 1fr auto; gap: 32px; align-items: baseline;
    padding: 28px 0; border-top: 1px solid var(--color-border-light); }
  .fg-press-grid:last-child { border-bottom: 1px solid var(--color-border-light); }

  .fg-kit-row     { display: grid; grid-template-columns: 1fr auto auto; gap: 24px; align-items: center;
    padding: 20px 0; border-top: 1px solid var(--color-border-light); }
  .fg-kit-row:last-child { border-bottom: 1px solid var(--color-border-light); }

  .fg-link         { color: var(--color-text-secondary); text-decoration: none; font-family: var(--font-body); font-size: 13px; transition: color .15s ease; }
  .fg-link:hover   { color: var(--color-accent); }
  .fg-link-accent  { color: var(--color-accent); text-decoration: none; }
  .fg-link-accent:hover { text-decoration: underline; }

  .fg-prose p       { font-family: var(--font-body); font-size: 16px; line-height: 1.7; color: var(--color-text-secondary); margin: 0 0 18px; }
  .fg-prose h3      { font-family: var(--font-display); font-size: 28px; color: ${INK}; margin: 48px 0 16px; letter-spacing: -.01em; }
  .fg-prose ul      { font-family: var(--font-body); font-size: 16px; line-height: 1.7; color: var(--color-text-secondary); padding-left: 20px; margin: 0 0 18px; }
  .fg-prose ul li   { margin-bottom: 8px; }
  .fg-prose strong  { color: ${INK}; font-weight: 500; }

  .fg-textarea { width: 100%; background: transparent; border: 1px solid ${INK};
    padding: 14px; font-family: var(--font-body); font-size: 16px; color: ${INK};
    outline: none; transition: border-color .15s ease; resize: vertical; min-height: 120px; }
  .fg-textarea:focus { border-color: var(--color-accent); }

  /* Responsive */
  @media (max-width: 880px) {
    .fg-footer-grid { grid-template-columns: 1fr 1fr; gap: 40px 32px; }
  }
  @media (max-width: 640px) {
    .fg-container, .fg-container-wide { padding: 0 20px; }
    .fg-header-bar { height: 60px; }
    .fg-nav { gap: 18px; }
    .fg-nav-count { display: none; }
    .fg-two-col, .fg-anchor-row, .fg-story-grid, .fg-shape-grid { grid-template-columns: 1fr; gap: 24px; }
    .fg-numbers-strip { grid-template-columns: 1fr; gap: 28px; padding: 24px 0; }
    .fg-numbers-strip .fg-stat { font-size: 44px; }
    .fg-footer-grid { grid-template-columns: 1fr; gap: 32px; }
    .fg-prose h3 { font-size: 22px; margin: 36px 0 12px; }
    .fg-press-grid { grid-template-columns: 1fr; gap: 8px; padding: 20px 0; }
    .fg-press-grid .fg-press-meta { order: -1; }
    .fg-kit-row { grid-template-columns: 1fr; gap: 8px; padding: 16px 0; }
  }
  @media (max-width: 420px) {
    .fg-nav .fg-nav-link-secondary { display: none; }
  }
`;

// ─── Icons ────────────────────────────────────────────────────────────────────

const svgBase = (size) => ({
  width: size, height: size, viewBox: '0 0 32 36', fill: 'none',
  stroke: 'currentColor', 'aria-hidden': true,
  style: { display: 'block', flexShrink: 0 },
});

const iconStyle = {
  strokeWidth: 'var(--fg-icon-stroke, 1.5)',
  strokeLinejoin: 'var(--fg-icon-join, round)',
  strokeLinecap: 'var(--fg-icon-cap, round)',
  vectorEffect: 'non-scaling-stroke',
};

function JeansIcon({ size = 28 }) {
  return (
    <svg {...svgBase(size)}>
      <path style={iconStyle} d="M7 4 L6 33 L13 33 L16 17 L19 33 L26 33 L25 4 Z" />
      <path style={iconStyle} d="M7 8.5 L25 8.5" />
      <path style={iconStyle} d="M16 8.5 L16 17" />
    </svg>
  );
}

function DressIcon({ size = 28 }) {
  return (
    <svg {...svgBase(size)}>
      <path style={iconStyle} d="M12 4 L10 6 L8.5 14 L6 32 L26 32 L23.5 14 L22 6 L20 4" />
      <path style={iconStyle} d="M12 4 Q16 7.5 20 4" />
      <path style={iconStyle} d="M8.7 15 Q16 18 23.3 15" />
    </svg>
  );
}

function BikiniIcon({ size = 28 }) {
  return (
    <svg {...svgBase(size)}>
      <path style={iconStyle} d="M5 9 L27 9" />
      <path style={iconStyle} d="M10.5 9 L13 4" />
      <path style={iconStyle} d="M21.5 9 L19 4" />
      <path style={iconStyle} d="M7 9 L14 9 L10.5 16 Z" />
      <path style={iconStyle} d="M18 9 L25 9 L21.5 16 Z" />
      <path style={iconStyle} d="M9 23 L23 23 C23 28 19 31.5 16 31.5 C13 31.5 9 28 9 23 Z" />
    </svg>
  );
}

// Serif "F" with a stitched seam and a threaded needle at the base — the brand mark.
function FitseamLogo({ height = 44 }) {
  const width = height * (64 / 92);
  return (
    <svg width={width} height={height} viewBox="0 0 64 92" fill="none" aria-hidden="true"
      style={{ display: 'block', flexShrink: 0, color: 'currentColor' }}>
      <path d="M12 8 Q12 6 14 6 L50 6 Q54 6 54 10 L54 14 Q54 18 50 18 L28 18 Q26 18 26 20 L26 33 Q26 35 28 35 L45 35 Q48 35 48 38 L48 44 Q48 47 45 47 L28 47 Q26 47 26 49 L26 76 Q26 80 22 80 L16 80 Q12 80 12 76 Z"
        stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
      <path d="M14 8 L52 8 L52 16 L28 16 L28 33 L46 33 L46 45 L28 45 L28 78 L14 78 Z"
        stroke="currentColor" strokeWidth="0.7" strokeDasharray="1.5 1.8" fill="none" />
      <line x1="12" y1="82" x2="40" y2="90" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <ellipse cx="12" cy="82" rx="2.4" ry="1.1" stroke="currentColor" strokeWidth="0.8" fill="var(--color-surface)" transform="rotate(16 12 82)" />
      <path d="M12 82 Q4 84 4 78 Q4 73 10 74" stroke="currentColor" strokeWidth="0.7" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

function Container({ children, style, wide = false }) {
  return (
    <div className={wide ? 'fg-container-wide' : 'fg-container'} style={style}>
      {children}
    </div>
  );
}

function NavLink({ onClick, children, secondary = false }) {
  return (
    <button type="button" onClick={onClick}
      className={`fg-link${secondary ? ' fg-nav-link-secondary' : ''}`}
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}>
      {children}
    </button>
  );
}

function Header({ count, onNav }) {
  return (
    <header style={{ borderBottom: '1px solid var(--color-border-light)', background: 'var(--color-surface)', position: 'sticky', top: 0, zIndex: 10 }}>
      <Container wide>
        <div className="fg-header-bar">
          <button type="button" onClick={() => onNav('home')}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, color: INK }}>
            <FitseamLogo height={44} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: '-.01em' }}>Fitseam</span>
          </button>
          <nav className="fg-nav">
            <NavLink onClick={() => onNav('about')} secondary>About</NavLink>
            <NavLink onClick={() => onNav('brands')}>For brands</NavLink>
            <span className="fg-nav-count" style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
              {count >= 500 ? `${count.toLocaleString()} women sized` : 'Now in early access'}
            </span>
          </nav>
        </div>
      </Container>
    </header>
  );
}

function Footer({ onNav }) {
  const linkBtn = (label, page) => (
    <button type="button" onClick={() => onNav(page)}
      className="fg-link"
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', textAlign: 'left' }}>
      {label}
    </button>
  );
  const colHeader = { fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)', margin: '0 0 16px' };
  const colWrap = { display: 'flex', flexDirection: 'column', gap: 10 };
  const bottom = { fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 300, letterSpacing: '.06em', color: 'var(--color-text-muted)', margin: 0 };
  return (
    <footer style={{ borderTop: `1px solid ${INK}`, marginTop: 'auto', padding: '64px 0 48px' }}>
      <Container wide>
        <div className="fg-footer-grid">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: INK }}>
              <FitseamLogo height={68} />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 32 }}>Fitseam</span>
            </div>
            <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, color: RUST, margin: '8px 0 0' }}>Built for every body.</p>
          </div>
          <div>
            <p style={colHeader}>Product</p>
            <div style={colWrap}>
              {linkBtn('Find my size', 'form')}
              {linkBtn('About', 'about')}
              {linkBtn('For brands', 'brands')}
            </div>
          </div>
          <div>
            <p style={colHeader}>Company</p>
            <div style={colWrap}>
              {linkBtn('Contact', 'contact')}
              {linkBtn('Terms', 'terms')}
              {linkBtn('Privacy', 'privacy')}
              {linkBtn('Cookies', 'cookies')}
              {linkBtn('Refunds', 'refunds')}
            </div>
          </div>
          <div>
            <p style={colHeader}>Follow</p>
            <div style={colWrap}>
              <span className="fg-link">Instagram</span>
              <span className="fg-link">TikTok</span>
              <span className="fg-link">Twitter / X</span>
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid var(--color-border-light)', paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <p style={bottom}>
            © 2026 Fitseam. Are you a brand?{' '}
            <button type="button" onClick={() => onNav('brands')} className="fg-link-accent"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}>
              Get in touch →
            </button>
          </p>
          <p style={bottom}>We size by your hips, not by a marketing meeting.</p>
        </div>
      </Container>
    </footer>
  );
}

// ─── Landing page ─────────────────────────────────────────────────────────────

const PROBLEMS = [
  { q: "“I’m a 12 on top and a 10 on the bottom”", a: "Standard sizing assumes your bust, waist, and hip are proportional. Most women’s bodies aren’t." },
  { q: "“These jeans fit but there’s always a gap at the back”", a: "Jeans are sized by waist but fit depends on your hips. No brand tells you this." },
  { q: "“The dress fit my chest but wouldn’t zip at the waist”", a: "Dress sizes are based on one measurement. Your bust and waist are rarely the same size bracket." },
];

const HOW_STEPS = [
  { n: 'Tell us your measurements', d: 'Bust, waist, hips, height. And brands you already wear.' },
  { n: 'We map your proportions', d: 'Not just a size — your actual shape, and how brands\' sizing matches it.' },
  { n: 'You get a real answer', d: 'Your size, a confidence score, and plain notes on where fit problems might occur.' },
];

// Illustrative examples of common sizing complaints — not real user submissions.
// Do not attribute these to real names, handles, or platforms.
const STORIES = [
  { t: 'Returned three pairs of jeans in one month because the gap at the back was so bad.', p: 'Jeans' },
  { t: 'The dress fit my chest but wouldn\'t zip at the waist. Every single time.', p: 'Dresses' },
  { t: 'Bought a bikini set — top was perfect, bottoms were two sizes too small.', p: 'Bikinis' },
  { t: 'A size 10 in one brand is a 14 in another. How am I supposed to shop online?', p: 'Sizing' },
];

function Landing({ count, onStart }) {
  const italicEyebrow = { fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 15, color: RUST, margin: '0 0 18px' };
  const h2Style = { fontFamily: 'var(--font-display)', fontSize: 'var(--text-h2)', color: INK, margin: '0 0 32px', letterSpacing: '-.01em' };
  return (
    <main>
      {/* Hero */}
      <Container style={{ minHeight: '78vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 96, paddingBottom: 64 }}>
        <p style={italicEyebrow}>Fit intelligence for real bodies</p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-h1)', lineHeight: 1.02, letterSpacing: '-.01em', color: INK, margin: 0, maxWidth: 620 }}>
          Your size didn't change.<br />The clothes did.
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 18, lineHeight: 1.6, color: 'var(--color-text-secondary)', maxWidth: 480, margin: '24px 0 36px' }}>
          Fitseam tells you your exact size at any brand — and flags fit problems before you buy. Denim. Dresses. Bikinis.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <button onClick={onStart} className="fg-btn-dark">Find my size →</button>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-text-muted)' }}>
            {count >= 500 ? `${count.toLocaleString()} women have found their size` : 'Now in early access.'}
          </span>
        </div>
      </Container>

      {/* Problem */}
      <Container style={{ paddingTop: 96 }}>
        <h2 style={h2Style}>Sizing is not your fault.</h2>
        <div className="fg-problem-grid">
          {PROBLEMS.map((p, i) => (
            <div key={i} style={{ borderTop: `1px solid ${INK}`, paddingTop: 16 }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 22, lineHeight: 1.2, color: INK, margin: '0 0 10px' }}>{p.q}</p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.6, color: 'var(--color-text-secondary)', margin: 0 }}>{p.a}</p>
            </div>
          ))}
        </div>
      </Container>

      {/* How it works */}
      <Container style={{ paddingTop: 128 }}>
        <h2 style={h2Style}>We treat you like a body, not a number.</h2>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {HOW_STEPS.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 20, padding: '24px 0', borderBottom: '1px solid var(--color-border-light)' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: RUST, lineHeight: 1, width: 52, flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: INK, margin: '0 0 6px' }}>{s.n}</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--color-text-secondary)', margin: 0 }}>{s.d}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 48, maxWidth: 320 }}>
          <button onClick={onStart} className="fg-btn-dark" style={{ width: '100%', padding: '18px' }}>Find my size</button>
        </div>
      </Container>

      {/* Community stories */}
      <Container style={{ paddingTop: 128 }}>
        <h2 style={{ ...h2Style, marginBottom: 8 }}>You're not alone.</h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: 'var(--color-text-secondary)', margin: '0 0 32px' }}>The sizing frustrations we hear about constantly — the exact problems Fitseam is built to fix.</p>
        <div className="fg-story-grid">
          {STORIES.map((s, i) => (
            <div key={i} style={{ border: `1px solid var(--color-border)`, padding: '18px 20px' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 17, lineHeight: 1.45, color: INK, margin: '0 0 14px' }}>"{s.t}"</p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', margin: 0 }}>
                {s.p}
              </p>
            </div>
          ))}
        </div>
      </Container>

      {/* Final CTA */}
      <Container style={{ paddingTop: 128, paddingBottom: 96, textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22, color: RUST, margin: '0 0 12px' }}>One question, three minutes.</p>
        <h2 style={{ ...h2Style, marginBottom: 32 }}>Find out what actually fits.</h2>
        <div style={{ display: 'inline-block' }}>
          <button onClick={onStart} className="fg-btn-dark">Find my size →</button>
        </div>
      </Container>
    </main>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'jeans',  label: 'Denim / Jeans',     desc: 'Sized by waist, fit by hips. We fix the back-gap problem.', Icon: JeansIcon },
  { id: 'dress',  label: 'Dresses',            desc: 'Your bust and waist are rarely the same size bracket.', Icon: DressIcon },
  { id: 'bikini', label: 'Bikinis & Swimwear', desc: 'Top and bottom often need different sizes. We recommend separately.', Icon: BikiniIcon },
];

const SHAPES = [
  { id: 'hourglass',  label: 'Hourglass',  desc: 'Bust and hips similar, defined waist' },
  { id: 'pear',       label: 'Pear',       desc: 'Hips wider than bust' },
  { id: 'apple',      label: 'Apple',      desc: 'Fuller through bust and midsection' },
  { id: 'rectangle',  label: 'Rectangle',  desc: 'Bust, waist, and hips similar width' },
];

const FITS = [
  { id: 'fitted',  label: 'Fitted',  desc: 'Close to the body, defined silhouette.' },
  { id: 'regular', label: 'Regular', desc: 'True to size — how the brand intended it.' },
  { id: 'relaxed', label: 'Relaxed', desc: 'Roomier through the body. More movement.' },
];

const TOTAL = 7;

function FormFlow({ onComplete, onExit }) {
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState('');
  const [m, setM] = useState({ bust: '', waist: '', hip: '', height: '', band: '', cup: '' });
  const [shape, setShape] = useState('');
  const [anchors, setAnchors] = useState([{ brand: '', size: '' }, { brand: '', size: '' }, { brand: '', size: '' }]);
  const [fit, setFit] = useState('');
  const [target, setTarget] = useState('');
  const [consent, setConsent] = useState(false);

  const setMeasure = (k) => (e) => setM(p => ({ ...p, [k]: e.target.value }));
  const brandList = category ? Object.keys(BRANDS[category === 'jeans' ? 'jeans' : category === 'dress' ? 'dress' : 'bikini']) : [];
  const anchorBrandList = (i) => {
    const taken = new Set(anchors.filter((_, j) => j !== i).map(a => a.brand).filter(Boolean));
    return brandList.filter(b => !taken.has(b));
  };
  const targetBrands = brandList.filter(b => !anchors.some(a => a.brand === b));
  const sizesFor = (brand) => {
    const chart = category === 'jeans' ? BRANDS.jeans[brand]
      : category === 'dress' ? BRANDS.dress[brand]
      : BRANDS.bikini[brand]?.top;
    return chart ? Object.keys(chart) : [];
  };

  let anchorVisible = 1;
  if (anchors[0].brand && anchors[0].size) anchorVisible = 2;
  if (anchors[1].brand && anchors[1].size) anchorVisible = 3;

  const heightModifier = m.height ? (+m.height < 160 ? 'petite' : +m.height > 175 ? 'tall' : 'regular') : '';

  const canNext = () => {
    if (step === 0) return !!category;
    if (step === 1) {
      if (category === 'jeans') return m.waist && m.hip && m.height;
      if (category === 'dress') return m.bust && m.waist && m.hip && m.height;
      return m.bust && m.hip;
    }
    if (step === 2) return true; // height+shape optional (height already captured in step 1 for jeans/dress)
    if (step === 3) return anchors[0].brand && anchors[0].size;
    if (step === 4) return !!fit;
    if (step === 5) return !!target;
    return true;
  };

  const finish = () => {
    const profile = { category, measurements: m, shape, anchors, preference: fit, targetBrand: target, height: m.height };
    onComplete({ ...profile, result: recommend(profile) });
  };

  const back = () => setStep(s => Math.max(0, s - 1));
  const next = () => setStep(s => s + 1);

  const reviewRows = [
    ['Category', CATEGORIES.find(c => c.id === category)?.label ?? ''],
    category === 'jeans' ? ['Waist / Hip', `${m.waist} / ${m.hip} cm`] : null,
    category === 'dress' ? ['Bust / Waist / Hip', `${m.bust} / ${m.waist} / ${m.hip} cm`] : null,
    category === 'bikini' ? ['Bust / Hip', `${m.bust} / ${m.hip} cm`] : null,
    m.height ? ['Height', `${m.height} cm${heightModifier ? ' · ' + heightModifier : ''}`] : null,
    shape ? ['Shape', SHAPES.find(s => s.id === shape)?.label ?? ''] : null,
    ['Anchors', anchors.filter(a => a.brand && a.size).map(a => `${a.brand} ${a.size}`).join(' · ') || '—'],
    ['Fit', FITS.find(f => f.id === fit)?.label ?? ''],
    ['Target brand', target],
  ].filter(Boolean);

  return (
    <main>
      {/* Progress */}
      <Container style={{ paddingTop: 'var(--space-5)' }}>
        <div style={{ height: 1, background: 'rgba(26,26,26,.1)' }}>
          <div style={{ height: 1, background: INK, width: `${((step + 1) / TOTAL) * 100}%`, transition: 'width .4s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: INK, opacity: .64 }}>
          <span>{step + 1} / {TOTAL}</span>
          {category && <span>{CATEGORIES.find(c => c.id === category)?.label}</span>}
        </div>
      </Container>

      <Container style={{ paddingTop: 'var(--space-7)', paddingBottom: 'var(--space-9)', minHeight: '60vh' }}>

        {/* ── Step 0 — Category ── */}
        {step === 0 && (
          <div className="fg-step-in">
            <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 14, color: RUST, marginBottom: 12 }}>Step 01</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,8vw,48px)', color: INK, lineHeight: 1.1, marginBottom: 'var(--space-6)' }}>What are you shopping for?</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {CATEGORIES.map(c => (
                <button key={c.id} onClick={() => { setCategory(c.id); setM({ bust: '', waist: '', hip: '', height: '', band: '', cup: '' }); setTarget(''); setAnchors([{brand:'',size:''},{brand:'',size:''},{brand:'',size:''}]); }}
                  className={`fg-opt${category === c.id ? ' on' : ''}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ flexShrink: 0 }}><c.Icon size={28} /></div>
                    <div>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, display: 'block', marginBottom: 2 }}>{c.label}</span>
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, opacity: .62 }}>{c.desc}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 1 — Measurements ── */}
        {step === 1 && (
          <div className="fg-step-in">
            <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 14, color: RUST, marginBottom: 12 }}>Step 02</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,8vw,48px)', color: INK, lineHeight: 1.1, marginBottom: 8 }}>Your measurements.</h2>
            <p style={{ fontFamily: 'var(--font-body)', fontStyle: 'italic', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 'var(--space-7)' }}>Use a flexible tape, held snug but not tight. All in centimetres.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              {category === 'jeans' && <>
                <div>
                  <label className="fg-label" htmlFor="m-jeans-waist">Waist — narrowest point (cm)</label>
                  <input id="m-jeans-waist" type="number" inputMode="numeric" placeholder="e.g. 72" value={m.waist} onChange={setMeasure('waist')} className="fg-input" />
                </div>
                <div>
                  <label className="fg-label" htmlFor="m-jeans-hip">Hip — fullest part (cm)</label>
                  <input id="m-jeans-hip" type="number" inputMode="numeric" placeholder="e.g. 98" value={m.hip} onChange={setMeasure('hip')} className="fg-input" />
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6 }}>We size jeans by hip. Waist gap risk is flagged separately.</p>
                </div>
                <div>
                  <label className="fg-label" htmlFor="m-jeans-height">Height (cm)</label>
                  <input id="m-jeans-height" type="number" inputMode="numeric" placeholder="e.g. 165" value={m.height} onChange={setMeasure('height')} className="fg-input" />
                </div>
              </>}
              {category === 'dress' && <>
                <div>
                  <label className="fg-label" htmlFor="m-dress-bust">Bust — fullest part of chest (cm)</label>
                  <input id="m-dress-bust" type="number" inputMode="numeric" placeholder="e.g. 92" value={m.bust} onChange={setMeasure('bust')} className="fg-input" />
                </div>
                <div>
                  <label className="fg-label" htmlFor="m-dress-waist">Waist — narrowest point (cm)</label>
                  <input id="m-dress-waist" type="number" inputMode="numeric" placeholder="e.g. 72" value={m.waist} onChange={setMeasure('waist')} className="fg-input" />
                </div>
                <div>
                  <label className="fg-label" htmlFor="m-dress-hip">Hip — fullest point (cm)</label>
                  <input id="m-dress-hip" type="number" inputMode="numeric" placeholder="e.g. 98" value={m.hip} onChange={setMeasure('hip')} className="fg-input" />
                </div>
                <div>
                  <label className="fg-label" htmlFor="m-dress-height">Height (cm)</label>
                  <input id="m-dress-height" type="number" inputMode="numeric" placeholder="e.g. 165" value={m.height} onChange={setMeasure('height')} className="fg-input" />
                </div>
              </>}
              {category === 'bikini' && <>
                <div>
                  <label className="fg-label" htmlFor="m-bikini-bust">Bust — fullest part of chest (cm)</label>
                  <input id="m-bikini-bust" type="number" inputMode="numeric" placeholder="e.g. 90" value={m.bust} onChange={setMeasure('bust')} className="fg-input" />
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6 }}>Used for top sizing.</p>
                </div>
                <div>
                  <label className="fg-label" htmlFor="m-bikini-hip">Hip — fullest point (cm)</label>
                  <input id="m-bikini-hip" type="number" inputMode="numeric" placeholder="e.g. 98" value={m.hip} onChange={setMeasure('hip')} className="fg-input" />
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6 }}>Used for bottom sizing.</p>
                </div>
              </>}
            </div>
          </div>
        )}

        {/* ── Step 2 — Height + shape ── */}
        {step === 2 && (
          <div className="fg-step-in">
            <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 14, color: RUST, marginBottom: 12 }}>Step 03</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,8vw,48px)', color: INK, lineHeight: 1.1, marginBottom: 'var(--space-6)' }}>Your shape.</h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-5)' }}>
              Optional — helps us flag proportion notes.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {SHAPES.map(s => (
                <button key={s.id} onClick={() => setShape(shape === s.id ? '' : s.id)}
                  className={`fg-opt${shape === s.id ? ' on' : ''}`}
                  style={{ padding: '14px 16px' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, display: 'block', marginBottom: 3 }}>{s.label}</span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, opacity: .62 }}>{s.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 3 — Brand anchors ── */}
        {step === 3 && (
          <div className="fg-step-in">
            <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 14, color: RUST, marginBottom: 12 }}>Step 04</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,8vw,48px)', color: INK, lineHeight: 1.1, marginBottom: 8 }}>
              Brands you <em>already</em> wear.
            </h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 'var(--space-7)' }}>Add 1–3. More = sharper result.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {anchors.slice(0, anchorVisible).map((a, i) => (
                <div key={i}>
                  {i > 0 && <div style={{ height: 1, background: 'rgba(26,26,26,.08)', margin: '24px 0' }} />}
                  <div style={{ marginBottom: 16 }}>
                    <label className="fg-label" htmlFor={`anchor-brand-${i}`}>Brand {i + 1}{i > 0 ? ' (optional)' : ''}</label>
                    <select id={`anchor-brand-${i}`} value={a.brand} onChange={e => { const n = [...anchors]; n[i] = { brand: e.target.value, size: '' }; setAnchors(n); }}
                      className="fg-select">
                      <option value="">Select…</option>
                      {anchorBrandList(i).map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  <AnimatePresence>
                    {a.brand && (
                      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: .15 }}>
                        <label className="fg-label" htmlFor={`anchor-size-${i}`}>Your size at {a.brand}</label>
                        <select id={`anchor-size-${i}`} value={a.size} onChange={e => { const n = [...anchors]; n[i] = { ...n[i], size: e.target.value }; setAnchors(n); }}
                          className="fg-select">
                          <option value="">Select…</option>
                          {sizesFor(a.brand).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 4 — Fit preference ── */}
        {step === 4 && (
          <div className="fg-step-in">
            <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 14, color: RUST, marginBottom: 12 }}>Step 05</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,8vw,48px)', color: INK, lineHeight: 1.1, marginBottom: 'var(--space-6)' }}>Your preferred fit.</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {FITS.map(f => (
                <button key={f.id} onClick={() => setFit(f.id)}
                  className={`fg-opt${fit === f.id ? ' on' : ''}`}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, display: 'block', marginBottom: 2 }}>{f.label}</span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, opacity: .62 }}>{f.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 5 — Target brand ── */}
        {step === 5 && (
          <div className="fg-step-in">
            <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 14, color: RUST, marginBottom: 12 }}>Step 06</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,8vw,48px)', color: INK, lineHeight: 1.1, marginBottom: 8 }}>Where do you want your size?</h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>Pick a brand you haven't shopped.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {targetBrands.map(b => (
                <button key={b} onClick={() => setTarget(b)}
                  className={`fg-pill${target === b ? ' on' : ''}`}>
                  {b}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 6 — Review ── */}
        {step === 6 && (
          <div className="fg-step-in">
            <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 14, color: RUST, marginBottom: 12 }}>Step 07</p>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,8vw,48px)', color: INK, lineHeight: 1.1, marginBottom: 'var(--space-6)' }}>Does this look right?</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {reviewRows.map(([label, value], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '14px 0', borderBottom: '1px solid var(--color-border-light)' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: INK, opacity: .64 }}>{label}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: INK }}>{value}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 'var(--space-6)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <input
                type="checkbox"
                id="fg-consent"
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
                style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0, accentColor: INK, cursor: 'pointer' }}
              />
              <label htmlFor="fg-consent" style={{ fontFamily: 'var(--font-body)', fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
                I understand my size is an estimate, not a guarantee, and I agree to Fitseam's Privacy Policy and Terms of Service.
              </label>
            </div>
          </div>
        )}

        {/* Nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 'var(--space-8)' }}>
          <button onClick={step === 0 ? onExit : back} className="fg-btn-ghost">← {step === 0 ? 'Home' : 'Back'}</button>
          {step < 6
            ? <button onClick={next} disabled={!canNext()} className="fg-btn-dark">Continue</button>
            : <button onClick={finish} disabled={!consent} className="fg-btn-dark">Get my size</button>
          }
        </div>
      </Container>
    </main>
  );
}

// ─── Result ───────────────────────────────────────────────────────────────────

const FLAG_BORDER = { warning: '#B85C3C', length: '#1A1A1A', tip: 'rgba(26,26,26,.4)', positive: '#3A6B4A', info: 'rgba(26,26,26,.4)' };

function ResultScreen({ profile, onRestart }) {
  const r = profile.result;
  const [feedback, setFeedback] = useState(null);

  if (!r) return (
    <Container style={{ paddingTop: 'var(--space-9)', paddingBottom: 'var(--space-9)' }}>
      <p style={{ fontFamily: 'var(--font-body)', color: INK, opacity: .6 }}>Sorry — we don't have sizing data for {profile.targetBrand} yet.</p>
      <button onClick={onRestart} className="fg-btn-ghost" style={{ marginTop: 24 }}>← Try another brand</button>
    </Container>
  );

  const isBikini = profile.category === 'bikini';
  const attribution = `${r.anchorCount} anchor${r.anchorCount === 1 ? '' : 's'} · measurements · ${profile.preference} fit`;

  const submitFeedback = (accurate) => {
    setFeedback(accurate);
    const recommended = isBikini ? { top: r.topSize, bottom: r.bottomSize } : { size: r.size };
    insertRow('feedback', {
      accurate,
      category: profile.category,
      target_brand: profile.targetBrand,
      recommended,
      confidence: r.confidence,
    }, `fg:feedback:${rid()}`);
  };

  return (
    <main>
      <Container style={{ paddingTop: 'var(--space-9)', paddingBottom: 'var(--space-9)' }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4 }}>

          {/* Size display */}
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4, letterSpacing: '.03em' }}>
            {isBikini ? `Your sizes at ${profile.targetBrand}` : `At ${profile.targetBrand}, you should try`}
          </p>

          {isBikini ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 'var(--space-7)', maxWidth: 400 }}>
              {[{ label: 'Top', size: r.topSize }, { label: 'Bottom', size: r.bottomSize }].map(({ label, size }) => (
                <div key={label} style={{ border: `1px solid ${INK}`, padding: '20px 24px' }}>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: INK, opacity: .64, marginBottom: 8 }}>{label}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(56px,14vw,96px)', color: INK, lineHeight: .88 }}>{size}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(96px,28vw,190px)', color: INK, lineHeight: .88, marginBottom: 'var(--space-7)' }}>
              {r.size}
            </div>
          )}

          {/* Confidence */}
          <div style={{ borderTop: `1px solid ${INK}`, borderBottom: `1px solid ${INK}`, padding: '18px 0', marginBottom: 'var(--space-5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: INK, opacity: .64 }}>Confidence</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: RUST }}>{r.confidence}</span>
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: 0 }}>{r.confidenceNote}</p>
          </div>

          {/* Fit flags */}
          {r.flags && r.flags.length > 0 && (
            <div style={{ marginBottom: 'var(--space-6)' }}>
              {r.flags.map((f, i) => (
                <div key={i} className="fg-flag" style={{ borderLeftColor: FLAG_BORDER[f.kind] ?? FLAG_BORDER.info }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: INK, opacity: .64, marginBottom: 4 }}>{f.title}</p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: INK, lineHeight: 1.6, margin: 0 }}>{f.body}</p>
                </div>
              ))}
            </div>
          )}

          {/* Attribution */}
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: INK, opacity: .64, letterSpacing: '.02em', marginBottom: 'var(--space-7)' }}>
            {attribution}
          </p>

          {/* Feedback */}
          <div style={{ borderTop: `1px solid ${INK}`, paddingTop: 'var(--space-6)' }}>
            {feedback === null && (
              <>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: INK, marginBottom: 6 }}>Does this feel accurate?</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 'var(--space-5)', lineHeight: 1.6 }}>
                  Your gut check — based on your body knowledge, before trying it.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 400 }}>
                  <button onClick={() => submitFeedback(true)}  className="fg-btn-dark">Yes, accurate</button>
                  <button onClick={() => submitFeedback(false)} className="fg-btn-outline">No, it's off</button>
                </div>
              </>
            )}
            {feedback === true && (
              <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22, color: RUST }}>
                Thank you — the real test is the changing room.
              </p>
            )}
            {feedback === false && (
              <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22, color: INK }}>
                Noted. Disagreement helps calibrate as much as agreement.
              </p>
            )}
            {feedback !== null && (
              <button onClick={onRestart} className="fg-btn-dark" style={{ marginTop: 28 }}>Size another item</button>
            )}
          </div>

          <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.6, marginTop: 'var(--space-6)', maxWidth: 480 }}>
            This is an estimate based on the measurements and brands you gave us — not a guarantee of fit. Always check {profile.targetBrand}'s own size guide before you buy. Fitseam is not affiliated with, sponsored by, or endorsed by {profile.targetBrand} or any other brand referenced on this site.
          </p>

        </motion.div>
      </Container>
    </main>
  );
}

// ─── Tweaks panel ─────────────────────────────────────────────────────────────

const ACCENT_OPTIONS = ['#B85C3C', '#C47A2E', '#3A6B4A', '#9C4A3C'];

function Tweaks() {
  const [open, setOpen] = useState(false);
  const [accent, setAccent] = useState('#B85C3C');
  const [stroke, setStroke] = useState(1.5);
  const [corners, setCorners] = useState('Round');
  const dragRef = useRef(null);
  const posRef = useRef({ right: 16, bottom: 16 });

  useEffect(() => {
    document.documentElement.style.setProperty('--color-accent', accent);
    document.documentElement.style.setProperty('--fg-icon-stroke', String(stroke));
    const sharp = corners === 'Sharp';
    document.documentElement.style.setProperty('--fg-icon-join', sharp ? 'miter' : 'round');
    document.documentElement.style.setProperty('--fg-icon-cap', sharp ? 'butt' : 'round');
  }, [accent, stroke, corners]);

  useEffect(() => {
    const onMsg = (e) => {
      if (e?.data?.type === '__activate_edit_mode') setOpen(true);
      if (e?.data?.type === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent?.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const onDragStart = (e) => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const sr = window.innerWidth - r.right, sb = window.innerHeight - r.bottom;
    const move = (ev) => {
      posRef.current = { right: Math.max(8, sr - (ev.clientX - sx)), bottom: Math.max(8, sb - (ev.clientY - sy)) };
      panel.style.right = posRef.current.right + 'px';
      panel.style.bottom = posRef.current.bottom + 'px';
    };
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  if (!open) return null;

  const idx = ACCENT_OPTIONS.indexOf(accent);

  return (
    <div ref={dragRef} className="twk-panel" style={{ right: posRef.current.right, bottom: posRef.current.bottom }}>
      <div className="twk-hd" onMouseDown={onDragStart}>
        <b>Tweaks</b>
        <button className="twk-close" onClick={() => { setOpen(false); window.parent?.postMessage({ type: '__edit_mode_dismissed' }, '*'); }}>✕</button>
      </div>
      <div className="twk-body">
        <div className="twk-section">Brand accent</div>
        <div className="twk-row">
          <div className="twk-row-lbl"><span>Accent</span></div>
          <div className="twk-chips">
            {ACCENT_OPTIONS.map((c) => (
              <button key={c} type="button" className="twk-chip" data-on={accent === c ? '1' : '0'}
                style={{ background: c }} onClick={() => setAccent(c)} aria-label={c} title={c}>
                {accent === c && (
                  <svg viewBox="0 0 14 14" aria-hidden="true" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 14, height: 14 }}>
                    <path d="M3 7.2 5.8 10 11 4.2" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" stroke="#fff" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="twk-section">Garment icons</div>
        <div className="twk-row">
          <div className="twk-row-lbl"><span>Outline weight</span><span>{stroke}px</span></div>
          <input type="range" className="twk-slider" min={1} max={2.5} step={0.25}
            value={stroke} onChange={e => setStroke(Number(e.target.value))} />
        </div>
        <div className="twk-row">
          <div className="twk-row-lbl"><span>Corners</span></div>
          <div className="twk-seg">
            <div className="twk-seg-thumb" style={{ left: `calc(2px + ${idx < 0 ? 0 : (corners === 'Round' ? 0 : 1)} * (100% - 4px) / 2)`, width: 'calc((100% - 4px) / 2)' }} />
            {['Round', 'Sharp'].map(v => (
              <button key={v} type="button" onClick={() => setCorners(v)}
                style={{ fontWeight: corners === v ? 600 : 400 }}>{v}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Static pages ─────────────────────────────────────────────────────────────

const H1 = { fontFamily: 'var(--font-display)', fontSize: 'var(--text-h1)', lineHeight: 1.02, letterSpacing: '-.01em', color: INK, margin: 0 };
const H2 = { fontFamily: 'var(--font-display)', fontSize: 'var(--text-h2)', color: INK, margin: '0 0 32px', letterSpacing: '-.01em' };
const EYEBROW = { fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 15, color: RUST, margin: '0 0 18px' };
const SECTION_EYEBROW = { ...EYEBROW, marginBottom: 12 };
const LEAD = { fontFamily: 'var(--font-body)', fontSize: 20, lineHeight: 1.55, color: 'var(--color-text-secondary)', maxWidth: 560, margin: 0 };

function AboutPage({ onNav }) {
  return (
    <main>
      <Container style={{ paddingTop: 96, paddingBottom: 64 }}>
        <p style={EYEBROW}>About</p>
        <h1 style={{ ...H1, marginBottom: 32, maxWidth: 620 }}>Fit, finally,<br />for every body.</h1>
        <p style={LEAD}>
          Fitseam tells women their correct size across fashion brands — using how clothes actually fit real bodies, not how brands claim they should.
        </p>
      </Container>

      <Container style={{ paddingBottom: 64 }}>
        <div className="fg-prose">
          <h3>Why we exist</h3>
          <p>Ask any woman who shops online and she'll tell you: the size on the label is a guess. A 12 in one brand is a 16 in another. Jeans that fit her hips gap at the waist. The dress that fits her chest won't zip.</p>
          <p>This isn't her body's fault. It's a sizing system built for a standardised customer who has never existed. Brands grade their patterns differently. Some size jeans by waist when fit depends on hips. Some grade dresses from a bust measurement and let the waist drift wherever the maths takes it. None of this is shared with the woman trying to buy a pair of jeans on her lunch break.</p>
          <p>We started Fitseam because we were tired of guessing. So we're building the answer.</p>

          <h3>What we do, plainly</h3>
          <p>You give us your measurements and the brands you already wear. We map your proportions — bust, waist, hips, height — against how each brand actually sizes, and we size you by the measurement that determines fit: hips for jeans, the bust-to-waist relationship for dresses, band and cup for bikini tops.</p>
          <p>You get a size, a confidence score, and plain-language notes on where the fit will be off — before you buy, not after the return.</p>

          <h3>What makes us different</h3>
          <ul>
            <li><strong>We size by the right measurement.</strong> Hips for jeans. Bust for dress tops. Band and cup for bikini tops. Where brands cut corners, we don't.</li>
            <li><strong>We tell you when something will fit poorly.</strong> If your size 14 dress will gape at the waist, we'd rather you know before checkout.</li>
            <li><strong>We get better every time you answer.</strong> After every recommendation we ask one question: did this fit? Every answer sharpens the next woman's recommendation. You're not just getting a size — you're fixing sizing.</li>
            <li><strong>We don't sell your body to brands.</strong> Read our <button type="button" onClick={() => onNav('privacy')} className="fg-link-accent" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}>privacy policy</button>.</li>
          </ul>

          <h3>Who's behind this</h3>
          <p>Fitseam is early, and it's honest about that. It's being built by a founder who watched too many women blame their bodies for a sizing system that was never designed for them — and decided the fix shouldn't be another quiz or another avatar, but the actual maths of fit.</p>
          <p>Right now, every profile submitted and every "this fit / this didn't" answer is reviewed personally. That won't scale forever. At this stage, it's the point.</p>

          <h3>Where we are</h3>
          <p>Fitseam is in early access. The size logic works today for denim, dresses, and bikinis across the brands women shop most. The accuracy is improving weekly — because women like you keep telling us when we're right and when we're off.</p>
          <p>If a recommendation misses, tell us. That's not a failure of the product. That's the product.</p>
        </div>
      </Container>

      <Container style={{ paddingTop: 32, paddingBottom: 96 }}>
        <div style={{ borderTop: `1px solid ${INK}`, paddingTop: 32, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => onNav('form')} className="fg-btn-dark">Find my size →</button>
          <button type="button" onClick={() => onNav('contact')} className="fg-link"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 14 }}>
            Talk to us →
          </button>
        </div>
      </Container>
    </main>
  );
}

function PrivacyPage({ onNav }) {
  return (
    <main>
      <Container style={{ paddingTop: 96, paddingBottom: 32 }}>
        <p style={EYEBROW}>Privacy policy</p>
        <h1 style={{ ...H1, marginBottom: 24, maxWidth: 620 }}>Your body data,<br />your decisions.</h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)', margin: 0 }}>
          Last updated · 12 September 2026
        </p>
      </Container>

      <Container>
        <div className="fg-prose">
          <p>This Privacy Policy explains how Fitseam ("Fitseam", "we", "us") collects, uses, shares, and protects the information you give us when you use our website and fit recommendation service (the "Service"). It also explains the choices you have over that information.</p>
          <p>We've written this policy in plain language. If anything here is unclear, write to us at <strong>privacy@fitseam.co</strong> and we'll answer in plain language too.</p>

          <h3>1. Information we collect</h3>
          <p><strong>Information you give us directly.</strong> When you complete a fit profile, we collect: your measurements (bust, waist, hips, height, bra band and cup where relevant), your body shape if you choose to share it, the brands and sizes you currently wear, your fit preference (fitted, regular, relaxed), and the brand you want a recommendation for. If you contact us through the site — our general contact form or the brand-partner form — we additionally collect your name, email address, and whatever you write to us, so we can reply. We use that contact information only to respond to you and never merge it with a fit profile unless you paste your profile identifier into your own message.</p>
          <p><strong>Information we generate.</strong> We generate a unique anonymous identifier for your fit profile, our internal confidence score, the recommendation we returned, and your accuracy feedback (whether the size was right and, if not, what was off).</p>
          <p><strong>Technical information.</strong> Standard server logs (IP address, browser type, the pages you visited, timestamps) for security and debugging, generated by our hosting provider. We don't use cookies, and we don't use any third-party analytics or advertising trackers. To keep your fit profile available across sessions on the same device, we use your browser's local storage (a standard, non-cookie mechanism) — this stays on your device and isn't a tracking technology.</p>
          <p><strong>What we don't collect.</strong> We don't ask for your name, email, address, date of birth, government ID, payment information, or photographs — unless you volunteer your name and email by using our contact or brand-partner forms, as described above. We don't link your fit profile to social-media accounts. We don't fingerprint your device.</p>

          <h3>2. How we use your information</h3>
          <p>We use your information to:</p>
          <ul>
            <li>Generate your size recommendation and fit notes.</li>
            <li>Improve the accuracy of recommendations for you and for other users — your "this fit / this didn't" feedback is the most important signal we have.</li>
            <li>Build and maintain the brand database, including aggregate statistics on how each brand's grading compares to real bodies.</li>
            <li>Keep the Service secure and operational.</li>
            <li>Communicate with you if you reach out to us directly.</li>
          </ul>
          <p>We never use your measurements to make automated decisions about anything other than your clothing size.</p>

          <h3>3. How we share your information</h3>
          <p><strong>With brand partners — only in aggregate.</strong> When we work with a fashion brand to improve their sizing, we share aggregated and de-identified statistics: e.g. "23% of the women who tried your size 14 dress found it ran small at the waist." We never share an individual fit profile.</p>
          <p><strong>With service providers.</strong> We use Supabase to store fit profiles and run our backend. It is bound by contract to use your data only to provide that hosting to us. If you have Supabase disabled, your fit profile stays only in your own browser's local storage and is never sent to us.</p>
          <p><strong>For legal reasons.</strong> We will disclose information if compelled by a valid legal request, but only the minimum required and only after notifying you where lawful to do so.</p>
          <p><strong>We do not sell, rent, or trade your information.</strong> Not to advertisers, not to data brokers, not to brands. Your body is not a marketing audience.</p>

          <h3>4. How long we keep it</h3>
          <p>We keep your fit profile and the recommendations we've given you for as long as you have an active session and for 24 months after your last visit, so we can keep improving your recommendation. After that, we delete the identifiable record and retain only the aggregate, de-identified statistics described above.</p>
          <p>You can ask us to delete your fit profile at any time — see <em>Your choices</em> below.</p>

          <h3>5. Your choices and rights</h3>
          <p>You have the right to:</p>
          <ul>
            <li><strong>See your data.</strong> Request a copy of the fit profile we hold for you.</li>
            <li><strong>Correct your data.</strong> Edit any of your measurements at any time from the fit profile review screen.</li>
            <li><strong>Delete your data.</strong> Ask us to remove your fit profile and the associated recommendations. We will do so within 14 days.</li>
            <li><strong>Withdraw consent.</strong> Stop using the Service at any time; nothing here requires you to come back.</li>
            <li><strong>Object or complain.</strong> If you're in the UK or EU, you can complain to your local data-protection authority. We hope you'd write to us first.</li>
          </ul>
          <p>To exercise any of these rights, email <strong>privacy@fitseam.co</strong> from the device where you completed your fit profile, or include the anonymous profile identifier you'll find on your result page.</p>

          <h3>6. Security</h3>
          <p>Fit profile data is encrypted in transit (TLS 1.3) and at rest (AES-256). Access to identifiable records is limited to a small number of engineers under audit. No system is perfect; we will tell you within 72 hours if we ever believe your data has been compromised.</p>

          <h3>7. Children</h3>
          <p>Fitseam is not directed at children under 16, and we do not knowingly collect information from anyone under 16. If you believe a child has used the Service, write to us and we will delete the profile.</p>

          <h3>8. International transfers</h3>
          <p>We host the Service through Supabase, in the region configured for our project. If that region is outside your own country, your information will be transferred there. We rely on our provider's standard contractual clauses and technical measures (encryption, access controls) to protect those transfers.</p>

          <h3>9. Changes to this policy</h3>
          <p>If we change this policy in a way that affects how we use your information, we'll surface a notice at the top of the site and at the top of this page for at least 30 days before the change takes effect. The "Last updated" date above always reflects the current version.</p>

          <h3>10. Contact</h3>
          <p>Fitseam is an early-stage project operated under the trading name "Fitseam," based in Nigeria. We have not yet incorporated as a registered company — we'll update this section with formal registration details once we do. For anything privacy-related: <strong>privacy@fitseam.co</strong>. For anything else: <button type="button" onClick={() => onNav('contact')} className="fg-link-accent" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}>our contact page</button>.</p>
        </div>
      </Container>

      <Container style={{ paddingTop: 64, paddingBottom: 96 }}>
        <div style={{ borderTop: `1px solid ${INK}`, paddingTop: 24 }}>
          <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 18, color: RUST, margin: 0 }}>
            Your size didn't change. The clothes did. And your data stays with you.
          </p>
        </div>
      </Container>
    </main>
  );
}

function TermsPage({ onNav }) {
  return (
    <main>
      <Container style={{ paddingTop: 96, paddingBottom: 32 }}>
        <p style={EYEBROW}>Terms of Service</p>
        <h1 style={{ ...H1, marginBottom: 24, maxWidth: 620 }}>Fair terms,<br />plainly stated.</h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)', margin: 0 }}>
          Last updated · 12 September 2026
        </p>
      </Container>

      <Container>
        <div className="fg-prose">
          <h3>1. Who we are, and what this is</h3>
          <p>Fitseam ("we", "us") operates the website and fit-recommendation tool at fitseam.co (the "Service"). Fitseam is an early-stage project, currently run under the trading name "Fitseam" and based in Nigeria; we haven't yet incorporated as a registered company. By using the Service, you agree to these Terms. If you don't agree, please don't use the Service.</p>

          <h3>2. What the Service does — and its limits</h3>
          <p>Fitseam estimates your clothing size at a brand you choose, based on measurements you provide and, optionally, sizes you already wear at other brands. <strong>Our recommendations are estimates, not guarantees.</strong> Actual fit depends on garment cut, fabric, manufacturing variance, and your body — and brands change their size charts over time. Use our confidence score and fit notes as guidance, and always check the retailer's own size guide and return policy before you buy.</p>
          <p>Fitseam is not affiliated with, sponsored by, or endorsed by any retailer or brand referenced on this site. Brand names and trademarks (including any brand shown in our size database) are the property of their respective owners and are used solely to identify which brand a recommendation relates to.</p>

          <h3>3. Who can use Fitseam</h3>
          <p>The Service isn't directed at children under 16, and we don't knowingly let anyone under that age submit a fit profile — consistent with our <button type="button" onClick={() => onNav('privacy')} className="fg-link-accent" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}>Privacy Policy</button>.</p>

          <h3>4. Your information and feedback</h3>
          <p>How we handle your measurements and messages is described in our Privacy Policy, which forms part of these Terms. By submitting fit-accuracy feedback, a contact message, or a brand inquiry, you confirm it's genuinely yours to share, and you give us permission to use it — including in aggregate, de-identified form — to operate and improve the Service.</p>

          <h3>5. Acceptable use</h3>
          <p>Please don't: scrape or reverse-engineer our brand size database for resale or republication; submit deliberately false measurements or feedback to disrupt other users' results; try to access data that isn't yours; or otherwise use the Service unlawfully or to harm it.</p>

          <h3>6. No cost, no account</h3>
          <p>The consumer Service is currently free and doesn't require an account. We don't charge individual users anything today — see our <button type="button" onClick={() => onNav('refunds')} className="fg-link-accent" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}>Refund Policy</button> for what that means. Brand partnerships are separate commercial arrangements governed by their own signed agreements, not by this page.</p>

          <h3>7. Intellectual property</h3>
          <p>The Fitseam name, logo, site design and copy, and the size-matching logic and database we've built belong to us (or are licensed to us). You may not copy, resell, or build derivative products from them without our written permission. This doesn't affect your ownership of the measurements or feedback you submit to us.</p>

          <h3>8. Disclaimers and limitation of liability</h3>
          <p>The Service is provided "as is" and "as available," without warranties of any kind — including as to accuracy, fitness for a particular purpose, or uninterrupted availability.</p>
          <p>To the fullest extent the law allows, Fitseam isn't liable for purchase decisions, financial loss, or dissatisfaction with how a garment fits, arising from reliance on a recommendation. Nothing in these Terms excludes or limits liability that can't lawfully be excluded — including any consumer-protection guarantees you hold under the mandatory law of your own country of residence, wherever that is.</p>

          <h3>9. Changes and termination</h3>
          <p>We may update the Service or these Terms, or stop offering the Service, at any time. We'll post the current version here with a "Last updated" date. Continuing to use the Service after a change means you accept the update.</p>

          <h3>10. Governing law</h3>
          <p>Because Fitseam is used by people worldwide, we don't tie these Terms to one country's courts. As a default — for anything these Terms don't otherwise resolve — we look to the law of Nigeria, where Fitseam currently operates, without regard to conflict-of-law rules. That default never overrides mandatory consumer-protection rights you hold under the law of your own country of residence.</p>

          <h3>11. Contact</h3>
          <p>Questions about these Terms: <strong>hello@fitseam.co</strong>.</p>
        </div>
      </Container>

      <Container style={{ paddingTop: 64, paddingBottom: 96 }} />
    </main>
  );
}

function CookiePage({ onNav }) {
  return (
    <main>
      <Container style={{ paddingTop: 96, paddingBottom: 32 }}>
        <p style={EYEBROW}>Cookie policy</p>
        <h1 style={{ ...H1, marginBottom: 24, maxWidth: 620 }}>No cookies.<br />Really.</h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)', margin: 0 }}>
          Last updated · 12 September 2026
        </p>
      </Container>

      <Container>
        <div className="fg-prose">
          <h3>Short answer</h3>
          <p>Fitseam doesn't use cookies — not for analytics, not for advertising, not for anything else.</p>

          <h3>What we do use</h3>
          <ul>
            <li><strong>Local storage, on your device.</strong> We keep your in-progress or completed fit profile in your browser's local storage so it's still there if you refresh the page or come back later on the same device. This never leaves your browser unless you complete a profile, in which case it's also sent to our backend as described in our <button type="button" onClick={() => onNav('privacy')} className="fg-link-accent" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}>Privacy Policy</button>.</li>
            <li><strong>Google Fonts.</strong> We load two typefaces from Google's font servers so the site displays correctly. That causes your browser to request them directly from Google, which may see your IP address as part of that request — we don't control what Google does with it.</li>
            <li><strong>Supabase, our backend host.</strong> Stores the fit profiles, feedback, and messages people submit, and keeps standard server access logs (IP address, timestamps) for security.</li>
          </ul>

          <h3>Do we need your consent for this?</h3>
          <p>Because we don't use cookies or any tracking, analytics, or advertising technology, and our local-storage use is strictly necessary to run the tool you're actively using, we don't show a cookie-consent banner. Rules like the EU/UK ePrivacy framework generally exempt storage used only to deliver the service you've asked for. If that ever changes — for example, if we add analytics — we'll add a consent banner before we do, not after.</p>

          <h3>Managing local storage</h3>
          <p>You can clear your saved fit profile at any time by clearing your browser's site data for fitseam.co, or by browsing in a private/incognito window.</p>

          <h3>Questions</h3>
          <p><strong>privacy@fitseam.co</strong></p>
        </div>
      </Container>

      <Container style={{ paddingTop: 64, paddingBottom: 96 }} />
    </main>
  );
}

function RefundPage({ onNav }) {
  return (
    <main>
      <Container style={{ paddingTop: 96, paddingBottom: 32 }}>
        <p style={EYEBROW}>Refund policy</p>
        <h1 style={{ ...H1, marginBottom: 24, maxWidth: 620 }}>Nothing to<br />refund — yet.</h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)', margin: 0 }}>
          Last updated · 12 September 2026
        </p>
      </Container>

      <Container>
        <div className="fg-prose">
          <h3>For individual users</h3>
          <p>The Fitseam sizing tool is currently free. We don't ask for payment, card details, or a purchase of any kind to use it — so there's nothing to refund. If we ever introduce a paid feature for individual users, we'll publish the specific refund terms for that feature here before it launches, and they won't apply retroactively to anything you've already used for free.</p>

          <h3>For brand partners</h3>
          <p>Pricing and payment terms for brand pilots and integrations are agreed individually with each partner brand in a separate signed agreement. Refunds, cancellations, and credits for those engagements are governed by that agreement, not by this page. If you're a brand partner with a billing question, use the contact details in your agreement or reach us through our <button type="button" onClick={() => onNav('contact')} className="fg-link-accent" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}>contact page</button>.</p>

          <h3>Questions</h3>
          <p><strong>hello@fitseam.co</strong></p>
        </div>
      </Container>

      <Container style={{ paddingTop: 64, paddingBottom: 96 }} />
    </main>
  );
}

function ContactForm() {
  const [state, setState] = useState({ name: '', email: '', topic: '', message: '' });
  const [sent, setSent] = useState(false);
  const upd = (k) => (e) => setState(s => ({ ...s, [k]: e.target.value }));
  const ready = state.name && state.email && state.topic && state.message;
  const submit = () => {
    insertRow('contact_messages', { ...state, kind: 'general' }, `fg:contact:${rid()}`);
    setSent(true);
  };
  if (sent) return (
    <div style={{ borderTop: `1px solid ${INK}`, paddingTop: 32 }}>
      <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 28, color: RUST, margin: '0 0 12px' }}>Thank you — we've got it.</p>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--color-text-secondary)', margin: 0, maxWidth: 480 }}>
        We answer in plain language and we answer fast. Expect to hear from us within a working day at the address you gave us.
      </p>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 560 }}>
      <div className="fg-anchor-row">
        <div>
          <label className="fg-label" htmlFor="contact-name">Your name</label>
          <input id="contact-name" className="fg-input" placeholder="e.g. Jordan Liu" value={state.name} onChange={upd('name')} />
        </div>
        <div>
          <label className="fg-label" htmlFor="contact-email">Email</label>
          <input id="contact-email" className="fg-input" type="email" placeholder="you@yourdomain.com" value={state.email} onChange={upd('email')} />
        </div>
      </div>
      <div>
        <label className="fg-label" htmlFor="contact-topic">What's this about?</label>
        <select id="contact-topic" className="fg-select" value={state.topic} onChange={upd('topic')}>
          <option value="">Select…</option>
          <option value="support">A bad recommendation or profile issue</option>
          <option value="brand">A brand you should add</option>
          <option value="press">Press / interview</option>
          <option value="partner">I work at a brand — partnership</option>
          <option value="other">Something else</option>
        </select>
      </div>
      <div>
        <label className="fg-label" htmlFor="contact-message">Your message</label>
        <textarea id="contact-message" className="fg-textarea" placeholder="Be specific. We'll be specific back." value={state.message} onChange={upd('message')} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
        <button onClick={submit} disabled={!ready} className="fg-btn-dark">Send →</button>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
          We use your email only to reply.
        </p>
      </div>
    </div>
  );
}

function ContactPage({ onNav }) {
  const label = { fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 500, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)', margin: '0 0 8px' };
  const title = { fontFamily: 'var(--font-display)', fontSize: 22, color: INK, margin: '0 0 6px' };
  return (
    <main>
      <Container style={{ paddingTop: 96, paddingBottom: 48 }}>
        <p style={EYEBROW}>Get in touch</p>
        <h1 style={{ ...H1, marginBottom: 24, maxWidth: 620 }}>Say something useful.<br />We'll do the same.</h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 18, lineHeight: 1.6, color: 'var(--color-text-secondary)', maxWidth: 520, margin: 0 }}>
          A bad recommendation. A brand we should add. A press question. A sizing complaint that needs to be heard. Pick the right inbox below or use the form.
        </p>
      </Container>

      <Container style={{ paddingBottom: 64 }}>
        <div className="fg-two-col" style={{ rowGap: 24 }}>
          <div style={{ borderTop: `1px solid ${INK}`, paddingTop: 20 }}>
            <p style={label}>Support</p>
            <p style={title}>A bad recommendation, a question about your profile.</p>
            <a href="mailto:hello@fitseam.co" className="fg-link-accent" style={{ fontFamily: 'var(--font-body)', fontSize: 15 }}>hello@fitseam.co →</a>
          </div>
          <div style={{ borderTop: `1px solid ${INK}`, paddingTop: 20 }}>
            <p style={label}>Privacy</p>
            <p style={title}>Access, correct, or delete your fit profile.</p>
            <a href="mailto:privacy@fitseam.co" className="fg-link-accent" style={{ fontFamily: 'var(--font-body)', fontSize: 15 }}>privacy@fitseam.co →</a>
          </div>
          <div style={{ borderTop: `1px solid ${INK}`, paddingTop: 20 }}>
            <p style={label}>Brands</p>
            <p style={title}>Partner with us. Or fix your size chart.</p>
            <button type="button" onClick={() => onNav('brands')} className="fg-link-accent"
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: 15 }}>
              For brands →
            </button>
          </div>
        </div>
      </Container>

      <Container style={{ paddingBottom: 96 }}>
        <div style={{ borderTop: `1px solid ${INK}`, paddingTop: 40 }}>
          <p style={SECTION_EYEBROW}>Or write to us here</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: INK, margin: '0 0 32px', letterSpacing: '-.01em' }}>Tell us what's on your mind.</h2>
          <ContactForm />
        </div>
      </Container>
    </main>
  );
}

function BrandForm() {
  const [state, setState] = useState({ brand: '', role: '', category: '', returns: '', name: '', email: '' });
  const [sent, setSent] = useState(false);
  const upd = (k) => (e) => setState(s => ({ ...s, [k]: e.target.value }));
  const ready = state.brand && state.role && state.category && state.email;
  const submit = () => {
    insertRow('brand_inquiries', state, `fg:brand:${rid()}`);
    setSent(true);
  };
  if (sent) return (
    <div style={{ borderTop: `1px solid ${INK}`, paddingTop: 32 }}>
      <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 28, color: RUST, margin: '0 0 12px' }}>Sent. Speak soon.</p>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--color-text-secondary)', margin: 0, maxWidth: 480 }}>
        Thank you. You'll hear back from the founder directly within two working days. No nurture sequence, no follow-up automation. One reply, from the person building this.
      </p>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640 }}>
      <div className="fg-anchor-row">
        <div>
          <label className="fg-label" htmlFor="brand-name">Brand name</label>
          <input id="brand-name" className="fg-input" placeholder="e.g. Reformation" value={state.brand} onChange={upd('brand')} />
        </div>
        <div>
          <label className="fg-label" htmlFor="brand-role">Your role</label>
          <select id="brand-role" className="fg-select" value={state.role} onChange={upd('role')}>
            <option value="">Select…</option>
            <option>Founder / CEO</option>
            <option>Head of E-commerce</option>
            <option>Head of Product / Design</option>
            <option>Head of Customer / Returns</option>
            <option>Other</option>
          </select>
        </div>
      </div>
      <div className="fg-anchor-row">
        <div>
          <label className="fg-label" htmlFor="brand-category">Primary category</label>
          <select id="brand-category" className="fg-select" value={state.category} onChange={upd('category')}>
            <option value="">Select…</option>
            <option>Denim</option>
            <option>Dresses</option>
            <option>Swimwear</option>
            <option>Multi-category womenswear</option>
            <option>Other</option>
          </select>
        </div>
        <div>
          <label className="fg-label" htmlFor="brand-returns">Size-related return rate</label>
          <select id="brand-returns" className="fg-select" value={state.returns} onChange={upd('returns')}>
            <option value="">Select…</option>
            <option>Under 10%</option>
            <option>10–20%</option>
            <option>20–30%</option>
            <option>Over 30%</option>
            <option>We don't track it</option>
          </select>
        </div>
      </div>
      <div className="fg-anchor-row">
        <div>
          <label className="fg-label" htmlFor="brand-contact-name">Your name</label>
          <input id="brand-contact-name" className="fg-input" placeholder="e.g. Sasha Patel" value={state.name} onChange={upd('name')} />
        </div>
        <div>
          <label className="fg-label" htmlFor="brand-contact-email">Work email</label>
          <input id="brand-contact-email" className="fg-input" type="email" placeholder="you@brand.com" value={state.email} onChange={upd('email')} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
        <button onClick={submit} disabled={!ready} className="fg-btn-dark">Request an audit →</button>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>
          No marketing follow-up. One reply, from a human.
        </p>
      </div>
    </div>
  );
}

function BrandsPage() {
  const stepRow = { display: 'flex', gap: 20, padding: '24px 0', borderTop: '1px solid var(--color-border-light)' };
  const stepNum = { fontFamily: 'var(--font-display)', fontSize: 28, color: RUST, lineHeight: 1, width: 52, flexShrink: 0 };
  const stepTitle = { fontFamily: 'var(--font-display)', fontSize: 22, color: INK, margin: '0 0 6px' };
  const stepDesc = { fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--color-text-secondary)', margin: 0 };
  const numLabel = { fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-text-muted)', margin: '12px 0 0' };
  return (
    <main>
      <Container style={{ paddingTop: 96, paddingBottom: 48 }}>
        <p style={EYEBROW}>For brands</p>
        <h1 style={{ ...H1, marginBottom: 32, maxWidth: 760 }}>Find out how your<br />clothes actually fit.</h1>
        <p style={LEAD}>
          Fitseam analyses your size chart against real body proportions and tells you, by product, where your grading is losing the customer — then recommends the right size to her at the moment she's deciding, so she stops returning.
        </p>
      </Container>

      <Container style={{ paddingBottom: 80 }}>
        <div className="fg-problem-grid">
          <div style={{ borderTop: `1px solid ${INK}`, paddingTop: 16 }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, lineHeight: 1.15, color: INK, margin: '0 0 10px' }}>Hips, not waist.</p>
            <p style={numLabel}>Jeans are sized by waist, but whether they fit is decided at the hip. We size by the measurement that determines fit — and flag the waist gap before she buys.</p>
          </div>
          <div style={{ borderTop: `1px solid ${INK}`, paddingTop: 16 }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, lineHeight: 1.15, color: INK, margin: '0 0 10px' }}>Two sizes, one dress.</p>
            <p style={numLabel}>Most women's bust and waist sit in different size brackets. We detect the conflict and tell her which way to size — and which styles to avoid.</p>
          </div>
          <div style={{ borderTop: `1px solid ${INK}`, paddingTop: 16 }}>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, lineHeight: 1.15, color: INK, margin: '0 0 10px' }}>The reason, not just the size.</p>
            <p style={numLabel}>Every recommendation ships with a plain-language fit note. She learns why. You learn where your grading misses.</p>
          </div>
        </div>
      </Container>

      {/* What you get */}
      <Container style={{ paddingBottom: 96 }}>
        <p style={SECTION_EYEBROW}>01 — What you get</p>
        <h2 style={{ ...H2, marginBottom: 16 }}>We're taking on three pilot brands.</h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 16, lineHeight: 1.6, color: 'var(--color-text-secondary)', margin: '0 0 32px', maxWidth: 560 }}>
          Fitseam is early-stage, and we're building our brand-side product with a small number of founding partners rather than around them. Here's what a pilot looks like:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {[
            ['a.', 'A fit audit of your top-returning products.', 'Send us your size chart and your highest-return SKUs. We map your grading against real body proportions and show you, product by product, where the fit conflict is — the waist gap, the bust/waist bracket split, the inseam miss.'],
            ['b.', 'A size recommendation on your product pages.', 'A lightweight widget: her size, our confidence, and the fit note she actually needs. One script tag. We work with you directly on integration — at this stage, you get the founder, not a support queue.'],
            ['c.', 'A before-and-after you can hold us to.', "We baseline your return rate on the piloted products before going live, and measure together at 60 days. If the needle doesn't move, you've lost nothing — the pilot is free."],
          ].map(([mark, title, body], i, arr) => (
            <div key={mark} style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: 20, padding: '24px 0', borderTop: '1px solid var(--color-border-light)', borderBottom: i === arr.length - 1 ? '1px solid var(--color-border-light)' : undefined }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: RUST, lineHeight: 1 }}>{mark}</span>
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: INK, margin: '0 0 6px' }}>{title}</p>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.6, color: 'var(--color-text-secondary)', margin: 0 }}>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>

      {/* How it works */}
      <Container style={{ paddingBottom: 96 }}>
        <p style={SECTION_EYEBROW}>02 — How it works</p>
        <h2 style={H2}>What a pilot looks like, week by week.</h2>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {[
            ['01', 'Send us your grading.', 'A spreadsheet, a tech pack, a PLM export. We ingest in whatever shape it arrives.'],
            ['02', 'We run your audit.', 'We map your grading against real body proportions and hand back the product-by-product fit report.'],
            ['03', 'Drop in the PDP widget.', 'One script tag. A modal flow that respects your visual system, QA-ed together on staging.'],
            ['04', 'Go live, measure together.', "We baseline before launch, then compare return rates on piloted products at 60 days. You see everything we see. No platform fee during the pilot — we're earning the case study."],
          ].map(([n, title, body], i, arr) => (
            <div key={n} style={{ ...stepRow, borderBottom: i === arr.length - 1 ? '1px solid var(--color-border-light)' : undefined }}>
              <span style={stepNum}>{n}</span>
              <div>
                <p style={stepTitle}>{title}</p>
                <p style={stepDesc}>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>

      {/* Onboarding form */}
      <Container style={{ paddingBottom: 96 }}>
        <div style={{ borderTop: `1px solid ${INK}`, paddingTop: 40 }}>
          <p style={SECTION_EYEBROW}>Onboard a brand</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: INK, margin: '0 0 16px', letterSpacing: '-.01em' }}>Tell us about your sizing.</h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.6, color: 'var(--color-text-secondary)', margin: '0 0 24px', maxWidth: 480 }}>
            Four questions, two minutes.
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.6, color: 'var(--color-text-secondary)', margin: '0 0 40px', maxWidth: 480 }}>
            Pilot terms are simple: free for founding partners, measured honestly, and priced only after we've proven the return impact together.
          </p>
          <BrandForm />
        </div>
      </Container>
    </main>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function FitseamV2() {
  const [page, setPage] = useState('home');
  const [profile, setProfile] = useState(null);
  const [count, setCount] = useState(() => local.readInt('fg:count', 0));

  useEffect(() => { window.scrollTo(0, 0); }, [page]);

  // Prefer the live remote count on mount; fall back to whatever we cached locally.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const remote = await fetchRemoteCount();
      if (!cancelled && remote != null) {
        setCount(remote);
        local.writeInt('fg:count', remote);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const onProfileComplete = (p) => {
    setProfile(p);
    setCount(c => { const n = c + 1; local.writeInt('fg:count', n); return n; });
    insertRow('profiles', {
      category: p.category,
      measurements: p.measurements,
      shape: p.shape || null,
      anchors: p.anchors,
      preference: p.preference,
      target_brand: p.targetBrand,
      height: p.height || null,
      result: p.result,
    }, `fg:profile:${rid()}`);
    setPage('result');
  };

  const nav = (target) => {
    if (target === 'form') { setPage('form'); return; }
    setPage(target);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-surface)', fontFamily: 'var(--font-body)' }}>
      <style>{GLOBAL_CSS}</style>
      <Header count={count} onNav={nav} />
      <div style={{ flex: 1 }}>
        {page === 'home'    && <Landing count={count} onStart={() => setPage('form')} />}
        {page === 'form'    && <FormFlow onExit={() => setPage('home')} onComplete={onProfileComplete} />}
        {page === 'result'  && profile && <ResultScreen profile={profile} onRestart={() => setPage('form')} />}
        {page === 'about'   && <AboutPage   onNav={nav} />}
        {page === 'privacy' && <PrivacyPage onNav={nav} />}
        {page === 'terms'   && <TermsPage   onNav={nav} />}
        {page === 'cookies' && <CookiePage  onNav={nav} />}
        {page === 'refunds' && <RefundPage  onNav={nav} />}
        {page === 'contact' && <ContactPage onNav={nav} />}
        {page === 'brands'  && <BrandsPage  onNav={nav} />}
      </div>
      <Footer onNav={nav} />
      <Tweaks />
    </div>
  );
}
