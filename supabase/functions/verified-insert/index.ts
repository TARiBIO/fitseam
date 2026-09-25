// verified-insert — the only path by which the browser may write to Supabase.
//
// Flow: browser POSTs { table, row, turnstileToken } → this function verifies
// the token with Cloudflare server-side → inserts with the service-role key.
// The service-role key never leaves this function's environment.
//
// ⚠️ SECURITY NOTE ON THE SHAPE OF THIS FUNCTION
// The service role BYPASSES Row Level Security. A function that accepts an
// arbitrary `table` and an arbitrary `row` and inserts them with that key is a
// strictly WIDER hole than the `anon can insert` policies it replaces — a valid
// Turnstile token is cheap to obtain (solve the widget once on the real site,
// reuse the token within its 5-minute life), and it would then authorise writes
// to any table and any column in the database.
//
// So the table names and the column names are both allowlisted below, and
// anything not on the list is dropped. Keep ALLOWED in sync with schema.sql;
// adding a table here grants public write access to it.
//
// Required environment (set with `supabase secrets set`):
//   TURNSTILE_SECRET_KEY       from the Cloudflare Turnstile dashboard
//   SUPABASE_URL               injected automatically by Supabase
//   SUPABASE_SERVICE_ROLE_KEY  injected automatically by Supabase

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// table → columns the browser is permitted to supply. Mirrors schema.sql.
// `landing_stories` is deliberately absent: nothing in the client writes to it,
// so it gets no public endpoint.
const ALLOWED: Record<string, readonly string[]> = {
  profiles: ['category', 'measurements', 'shape', 'anchors', 'preference', 'target_brand', 'height', 'result'],
  feedback: ['accurate', 'category', 'target_brand', 'recommended', 'confidence'],
  contact_messages: ['name', 'email', 'topic', 'message', 'kind'],
  brand_inquiries: ['brand', 'role', 'category', 'returns', 'name', 'email'],
};

// Belt and braces alongside the CHECK constraints in schema.sql: reject
// oversized payloads before they reach the database at all.
const MAX_BODY_BYTES = 16 * 1024;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

async function verifyTurnstile(token: string, ip: string | null): Promise<boolean> {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY');
  if (!secret) {
    console.error('TURNSTILE_SECRET_KEY is not set — refusing to insert');
    return false;
  }
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);

  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, { method: 'POST', body: form });
    const out = await res.json();
    if (!out.success) console.warn('Turnstile rejected:', out['error-codes']);
    return out.success === true;
  } catch (e) {
    // Fail closed. A Cloudflare outage means no writes, not unverified writes.
    console.error('Turnstile verification threw:', e instanceof Error ? e.message : e);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'method not allowed' });

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return json(413, { error: 'payload too large' });

  let body: { table?: unknown; row?: unknown; turnstileToken?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { error: 'invalid json' });
  }

  const { table, row, turnstileToken } = body;

  if (typeof table !== 'string' || !Object.hasOwn(ALLOWED, table)) {
    return json(400, { error: 'unknown table' });
  }
  if (typeof row !== 'object' || row === null || Array.isArray(row)) {
    return json(400, { error: 'invalid row' });
  }
  if (typeof turnstileToken !== 'string' || turnstileToken.length < 1 || turnstileToken.length > 2048) {
    return json(400, { error: 'missing token' });
  }

  const ip = req.headers.get('CF-Connecting-IP') ?? req.headers.get('x-forwarded-for');
  if (!(await verifyTurnstile(turnstileToken, ip))) {
    return json(403, { error: 'verification failed' });
  }

  // Keep only allowlisted columns. Anything else — including id, created_at, or
  // a column from another table — is silently dropped rather than rejected, so
  // a probe learns nothing about the schema.
  const allowed = ALLOWED[table];
  const clean: Record<string, unknown> = {};
  for (const key of allowed) {
    if (Object.hasOwn(row as object, key)) clean[key] = (row as Record<string, unknown>)[key];
  }
  if (Object.keys(clean).length === 0) return json(400, { error: 'empty row' });

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    console.error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
    return json(500, { error: 'server misconfigured' });
  }

  const res = await fetch(`${url}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(clean),
  });

  if (!res.ok) {
    // Log the detail, return a generic message — PostgREST errors leak column
    // names and constraint definitions.
    console.error(`insert into ${table} failed:`, res.status, await res.text());
    return json(400, { error: 'insert rejected' });
  }

  return json(200, { ok: true });
});
