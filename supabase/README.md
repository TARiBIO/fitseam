# Supabase setup — verified writes

The browser has no write access to the database. All inserts go through the
`verified-insert` Edge Function, which checks a Cloudflare Turnstile token
server-side and then writes with the service-role key.

```
browser ──{table,row,turnstileToken}──▶ verified-insert ──▶ Cloudflare siteverify
                                             │
                                             └─ service-role insert ──▶ Postgres
```

## Order matters

Running the RLS lockdown before the function is live takes every form on the
site offline. Do these in order.

### 1. Get Turnstile keys — you must do this yourself

<https://dash.cloudflare.com> → Turnstile → Add site. Free. Choose the
**Managed** widget; it is invisible for most visitors.

You get a **site key** (public) and a **secret key** (private).

### 2. Client env

In `.env.local`:

```
REACT_APP_TURNSTILE_SITE_KEY=0x4AAAAAAA...
```

Leave it blank for local development — the widget is skipped entirely and writes
fall back to localStorage, the same way the app already degrades without
Supabase keys.

⚠️ Setting `REACT_APP_SUPABASE_*` **without** the Turnstile site key is the one
broken combination: writes go out with no token and `verified-insert` rejects
them. The app logs a warning at startup if it sees this.

### 3. Function secrets

```sh
supabase secrets set TURNSTILE_SECRET_KEY=0x4AAAAAAA...
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically — do
not set them, and never put either in `.env.local`.

### 4. Deploy

```sh
supabase functions deploy verified-insert
```

### 5. Confirm it works *before* locking down

Submit the contact form on the deployed site and check a row lands in
`contact_messages`.

Function logs live in the dashboard — the CLI has no `functions logs`
subcommand (checked against CLI 2.117.0):

<https://supabase.com/dashboard/project/_/functions/verified-insert/logs>

A rejected write logs `Turnstile rejected: [ ... ]` with Cloudflare's error
code. `invalid-input-secret` means `TURNSTILE_SECRET_KEY` is wrong or still a
placeholder; `invalid-input-response` means the token itself was bad.

### 6. Lock down RLS

Run the "RLS lockdown" section at the end of `schema.sql`. Verify:

```sql
select tablename, policyname from pg_policies where schemaname = 'public';
-- expect zero rows
```

Also run the "Abuse hardening" section above it if you have not already — the
length caps are what stop a single request inserting a multi-megabyte row.

## Why the function allowlists tables and columns

The service role **bypasses RLS**. A function that accepts any `table` and any
`row` and writes them with that key is a wider hole than the `anon can insert`
policies it replaces: a Turnstile token is cheap to obtain (solve the widget
once on the real site, reuse it within its ~5 minute life), and it would then
authorise writes to any table and column in the database.

So `ALLOWED` in `functions/verified-insert/index.ts` names every permitted table
and every permitted column, and anything else is dropped. **Adding a table there
grants public write access to it.** Keep it in sync with `schema.sql`.

## Turnstile tokens are single-use

Each form instance renders its own widget and gets its own token. This is why
the result page has a widget of its own: the wizard's token is spent on the
`profiles` insert, so the feedback buttons would otherwise have nothing valid to
send.

## Still not covered

- **Per-IP rate limiting.** Turnstile raises the cost per request but does not
  cap volume. RLS cannot see IPs; this needs logic in the Edge Function
  (e.g. a counter table keyed by hashed IP) or a proxy in front.
- **Retention.** Nothing purges old rows, so a flood is permanent until someone
  deletes it by hand.
