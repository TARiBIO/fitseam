-- Fitseam — Supabase schema
-- Paste this into the SQL editor in your Supabase project (SQL → New query).
-- Everything is designed for anonymous, unauthenticated writes from the client:
-- the anon role can INSERT into these tables but cannot SELECT any rows.
-- The public counter is served via an RPC that returns count(*) only.

-- ─── Tables ──────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id           uuid        primary key default gen_random_uuid(),
  created_at   timestamptz not null    default now(),
  category     text        not null,
  measurements jsonb       not null,
  shape        text,
  anchors      jsonb       not null,
  preference   text        not null,
  target_brand text        not null,
  height       text,
  result       jsonb       not null
);

create table if not exists public.feedback (
  id           uuid        primary key default gen_random_uuid(),
  created_at   timestamptz not null    default now(),
  accurate     boolean     not null,
  category     text        not null,
  target_brand text        not null,
  recommended  jsonb       not null,
  confidence   text        not null
);

create table if not exists public.landing_stories (
  id         uuid        primary key default gen_random_uuid(),
  created_at timestamptz not null    default now(),
  story      text        not null    check (char_length(story) between 1 and 1000)
);

-- Contact form (Get in touch page). Holds name + email, so treat rows here as
-- personal data under the privacy policy's "information you give us directly".
create table if not exists public.contact_messages (
  id         uuid        primary key default gen_random_uuid(),
  created_at timestamptz not null    default now(),
  name       text        not null,
  email      text        not null,
  topic      text        not null,
  message    text        not null,
  kind       text        not null default 'general'
);

-- Brand-partner onboarding form (For brands page). Also personal data (name + work email).
create table if not exists public.brand_inquiries (
  id         uuid        primary key default gen_random_uuid(),
  created_at timestamptz not null    default now(),
  brand      text        not null,
  role       text        not null,
  category   text        not null,
  returns    text,
  name       text        not null,
  email      text        not null
);

-- ─── Row Level Security ──────────────────────────────────────────────────────
-- Turn RLS on for every table, then grant only INSERT to the anon role.
-- No SELECT policy → anon cannot read any rows back (protects user submissions).

alter table public.profiles         enable row level security;
alter table public.feedback         enable row level security;
alter table public.landing_stories  enable row level security;
alter table public.contact_messages enable row level security;
alter table public.brand_inquiries  enable row level security;

drop policy if exists "anon can insert profiles" on public.profiles;
create policy "anon can insert profiles"
  on public.profiles for insert to anon
  with check (true);

drop policy if exists "anon can insert feedback" on public.feedback;
create policy "anon can insert feedback"
  on public.feedback for insert to anon
  with check (true);

drop policy if exists "anon can insert landing_stories" on public.landing_stories;
create policy "anon can insert landing_stories"
  on public.landing_stories for insert to anon
  with check (true);

drop policy if exists "anon can insert contact_messages" on public.contact_messages;
create policy "anon can insert contact_messages"
  on public.contact_messages for insert to anon
  with check (true);

drop policy if exists "anon can insert brand_inquiries" on public.brand_inquiries;
create policy "anon can insert brand_inquiries"
  on public.brand_inquiries for insert to anon
  with check (true);

-- ─── Abuse hardening ─────────────────────────────────────────────────────────
-- NOT YET APPLIED — run this against the project to take effect.
--
-- Every policy above is `with check (true)`, and the anon key ships in the
-- client bundle, so anyone can POST directly to the REST endpoint. The honeypot
-- and cooldown in the client are speed bumps for casual bots only; they are not
-- a security boundary and an attacker never sees them.
--
-- Length caps are the one real control available without new infrastructure:
-- Postgres enforces them no matter who is calling. Without these, a single
-- request can insert a multi-megabyte row into contact_messages.
--
-- Still missing after this, and worth doing before any real traffic:
--   • Per-IP rate limiting (Supabase edge function in front of these tables,
--     or pg_net/Cloudflare — RLS cannot see IPs).
--   • CAPTCHA or Turnstile on contact_messages and brand_inquiries.
--   • A scheduled job to purge unreviewed rows, so a flood is self-healing.

do $$
begin
  -- contact_messages
  if not exists (select 1 from pg_constraint where conname = 'contact_messages_len') then
    alter table public.contact_messages add constraint contact_messages_len check (
      char_length(name)    between 1 and 120  and
      char_length(email)   between 3 and 254  and
      char_length(topic)   between 1 and 40   and
      char_length(message) between 1 and 5000 and
      char_length(kind)    between 1 and 40
    );
  end if;

  -- brand_inquiries
  if not exists (select 1 from pg_constraint where conname = 'brand_inquiries_len') then
    alter table public.brand_inquiries add constraint brand_inquiries_len check (
      char_length(brand)    between 1 and 120 and
      char_length(role)     between 1 and 60  and
      char_length(category) between 1 and 60  and
      (returns is null or char_length(returns) <= 40) and
      char_length(name)     between 1 and 120 and
      char_length(email)    between 3 and 254
    );
  end if;

  -- feedback
  if not exists (select 1 from pg_constraint where conname = 'feedback_len') then
    alter table public.feedback add constraint feedback_len check (
      char_length(category)     between 1 and 40  and
      char_length(target_brand) between 1 and 120 and
      char_length(confidence)   between 1 and 40  and
      pg_column_size(recommended) <= 2048
    );
  end if;

  -- profiles: the jsonb columns are unbounded and this is the highest-volume
  -- endpoint, so cap payload size rather than individual fields.
  if not exists (select 1 from pg_constraint where conname = 'profiles_len') then
    alter table public.profiles add constraint profiles_len check (
      char_length(category)     between 1 and 40  and
      char_length(target_brand) between 1 and 120 and
      char_length(preference)   between 1 and 40  and
      (shape  is null or char_length(shape)  <= 40) and
      (height is null or char_length(height) <= 10) and
      pg_column_size(measurements) <= 2048 and
      pg_column_size(anchors)      <= 4096 and
      pg_column_size(result)       <= 8192
    );
  end if;
end $$;

-- ─── RLS lockdown ────────────────────────────────────────────────────────────
-- ⚠️ RUN THIS ONLY AFTER verified-insert IS DEPLOYED AND CONFIRMED WORKING.
-- It removes the browser's ability to write at all. If the Edge Function is not
-- live when this runs, every submission on the site silently fails.
--
-- After this, the anon role can do exactly two things: call get_size_count(),
-- and invoke the Edge Function. It has no insert rights and no select rights on
-- any table. Writes arrive only via verified-insert, which uses the service-role
-- key and bypasses RLS by design — which is why the table and column
-- allowlists inside that function are load-bearing. See its header comment.

drop policy if exists "anon can insert profiles"         on public.profiles;
drop policy if exists "anon can insert feedback"         on public.feedback;
drop policy if exists "anon can insert landing_stories"  on public.landing_stories;
drop policy if exists "anon can insert contact_messages" on public.contact_messages;
drop policy if exists "anon can insert brand_inquiries"  on public.brand_inquiries;

-- RLS stays enabled on all five. With no policies at all, the anon role is
-- denied by default — that is the intended end state, not an oversight.

-- Verify with:
--   select tablename, policyname from pg_policies where schemaname = 'public';
-- Expect zero rows.

-- ─── Public counter RPC ──────────────────────────────────────────────────────
-- Returns the total number of sizings without exposing any row content.
-- Called from the client with: supabase.rpc('get_size_count')

create or replace function public.get_size_count()
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*) from public.profiles;
$$;

grant execute on function public.get_size_count() to anon;
