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
