-- Relay: today's wall of finished chains, and "how far did my chains get".
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run. Safe to run again.
-- Relay works without this (chains travel inside the links); this just adds the wall and progress tracking.

-- One row per link made: the whole chain as it stood right after that move
create table if not exists public.relay_links (
  id         bigserial primary key,
  day        int not null,
  root       text not null,
  sig        text not null,
  words      text[] not null,
  movers     text[] not null,
  hashes     text[] not null,
  done       boolean not null default false,
  created_at timestamptz not null default now(),
  unique (root, sig)
);
create index if not exists relay_links_day on public.relay_links (day, done);
create index if not exists relay_links_hashes on public.relay_links using gin (hashes);
alter table public.relay_links enable row level security;
revoke all on public.relay_links from anon, authenticated;

create or replace function public.relay_post(p_day int, p_root text, p_goal text, p_words text[], p_movers text[], p_hashes text[])
returns void language plpgsql security definer set search_path = public as $$
declare n int := coalesce(array_length(p_words, 1), 0); i int; k int; j int;
begin
  if p_day is null or p_day < 1 or p_day > 100000 or p_root !~ '^[a-z0-9]{6,12}$' or p_goal !~ '^[a-z]{4}$' then return; end if;
  if n < 2 or n > 60 or coalesce(array_length(p_movers, 1), 0) <> n - 1 or coalesce(array_length(p_hashes, 1), 0) <> n - 1 then return; end if;
  for i in 1..n loop
    if p_words[i] !~ '^[a-z]{4}$' then return; end if;
    if i > 1 then
      if p_movers[i - 1] !~ '^[A-Z]{3}$' or p_hashes[i - 1] !~ '^[a-z0-9]{6}$' then return; end if;
      k := 0;
      for j in 1..4 loop if substr(p_words[i], j, 1) <> substr(p_words[i - 1], j, 1) then k := k + 1; end if; end loop;
      if k <> 1 then return; end if;
    end if;
  end loop;
  insert into relay_links (day, root, sig, words, movers, hashes, done)
  values (p_day, p_root, array_to_string(p_words, '.') || '|' || array_to_string(p_movers, '.'), p_words, p_movers, p_hashes, p_words[n] = p_goal)
  on conflict (root, sig) do nothing;
  -- Keep it tidy: forget chains after 60 days
  if random() < 0.01 then delete from relay_links where created_at < now() - interval '60 days'; end if;
end $$;

-- Finished chains started on a day, shortest first
create or replace function public.relay_wall(p_day int)
returns table(words text[], movers text[], created_at timestamptz)
language sql security definer set search_path = public as $$
  select l.words, l.movers, l.created_at from relay_links l
  where l.day = p_day and l.done
  order by array_length(l.words, 1), l.created_at
  limit 25;
$$;

-- Counts for a day
create or replace function public.relay_today(p_day int)
returns json language sql security definer set search_path = public as $$
  select json_build_object(
    'chains', (select count(distinct root) from relay_links where day = p_day),
    'links',  (select count(*) from relay_links where day = p_day),
    'done',   (select count(distinct root) from relay_links where day = p_day and done));
$$;

-- For each chain you made a move in: the furthest any branch of it has gotten (finished ones first)
create or replace function public.relay_mine(p_hash text)
returns table(root text, day int, words text[], movers text[], done boolean)
language sql security definer set search_path = public as $$
  select distinct on (l.root) l.root, l.day, l.words, l.movers, l.done
  from relay_links l
  where p_hash = any(l.hashes) and l.created_at > now() - interval '14 days'
  order by l.root, l.done desc, array_length(l.words, 1) desc;
$$;

revoke execute on function public.relay_post(int, text, text, text[], text[], text[]), public.relay_wall(int), public.relay_today(int), public.relay_mine(text) from public;
grant execute on function public.relay_post(int, text, text, text[], text[], text[]), public.relay_wall(int), public.relay_today(int), public.relay_mine(text) to anon, authenticated;
