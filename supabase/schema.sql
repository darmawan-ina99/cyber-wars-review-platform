-- ============================================================
-- CYBER WARS :: GOOGLE REVIEW PLATFORM — DATABASE SCHEMA
-- Target: Supabase (PostgreSQL)
-- ============================================================

-- 1) MAIN TABLE ------------------------------------------------
create table if not exists public.cards (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  card_slug          text not null unique,
  target_google_url  text not null,
  click_count        bigint not null default 0,
  is_active          boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint card_slug_format check (card_slug ~ '^[a-z0-9][a-z0-9-]{2,38}[a-z0-9]$')
);

create index if not exists cards_user_idx    on public.cards (user_id);
create index if not exists cards_slug_idx   on public.cards (card_slug);

-- 2) ROW LEVEL SECURITY ----------------------------------------
alter table public.cards enable row level security;

-- Owner full control over own rows
drop policy if exists "owner_all" on public.cards;
create policy "owner_all" on public.cards
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3) REDIRECT ENGINE (SECURITY DEFINER) -----------------------
-- Anonymous hit: increments counter and returns the target URL
-- in a single atomic statement. No table privileges granted to anon.
create or replace function public.register_hit(p_slug text)
returns text
language sql
security definer
set search_path = public
as $$
  update cards
     set click_count = click_count + 1,
         updated_at  = now()
   where card_slug = p_slug
     and is_active
  returning target_google_url;
$$;

revoke all on function public.register_hit(text) from public;
grant execute on function public.register_hit(text) to anon;

-- 4) AUTO-UPDATED_AT TRIGGER -----------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cards_touch on public.cards;
create trigger cards_touch before update on public.cards
  for each row execute function public.touch_updated_at();
