-- Live messages, screen effects and power-ups for playsproutle.com
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Then set your admin passphrase with the last statement (change the text first!).
-- Safe to run again: it only replaces the functions and leaves your data alone.
-- Already ran an older version? Run the whole file again. If you leave the passphrase line as
-- CHANGE-ME, your current passphrase stays as it is.

create extension if not exists pgcrypto with schema extensions;

-- Every browser that opens the site (same random device ID the leaderboards use)
create table if not exists public.live_players (
  device     text primary key,
  initials   text,
  nick       text,
  game       text,
  first_seen timestamptz not null default now(),
  last_seen  timestamptz not null default now(),
  visits     int not null default 1
);

-- Messages, effects and power-ups waiting to be picked up
create table if not exists public.live_inbox (
  id           bigserial primary key,
  device       text not null,
  kind         text not null,
  payload      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  delivered_at timestamptz
);
create index if not exists live_inbox_waiting on public.live_inbox (device) where delivered_at is null;

-- Visits: one row per stretch of time someone is on the site (for the activity tracker)
create table if not exists public.live_sessions (
  id         bigserial primary key,
  device     text not null,
  started_at timestamptz not null default now(),
  ended_at   timestamptz not null default now(),
  games      text[] not null default '{}'
);
create index if not exists live_sessions_device on public.live_sessions (device, id desc);
create index if not exists live_sessions_started on public.live_sessions (started_at desc);
-- When the player last closed or switched away from the site (cleared on their next check-in)
alter table public.live_players add column if not exists left_at timestamptz;

-- One row: the hashed admin passphrase
create table if not exists public.live_admin (
  id       int primary key default 1 check (id = 1),
  key_hash text not null
);

-- Nobody reads or writes these tables directly. Everything goes through the functions below.
alter table public.live_players enable row level security;
alter table public.live_inbox   enable row level security;
alter table public.live_admin   enable row level security;
alter table public.live_sessions enable row level security;
revoke all on public.live_players, public.live_inbox, public.live_admin, public.live_sessions from anon, authenticated;

-- ---------- Players: check in, and pick up anything waiting ----------
create or replace function public.live_checkin(p_device text, p_initials text, p_game text)
returns table(id bigint, kind text, payload jsonb)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
begin
  if p_device is null or p_device !~ '^[a-z0-9]{16,40}$' then raise exception 'bad device'; end if;
  if p_initials is not null and p_initials !~ '^[A-Z]{3}$' then p_initials := null; end if;
  if p_game is null or p_game !~ '^[a-z0-9-]{1,30}$' then p_game := 'home'; end if;

  insert into live_players as lp (device, initials, game) values (p_device, p_initials, p_game)
  on conflict (device) do update set
    initials  = coalesce(excluded.initials, lp.initials),
    game      = excluded.game,
    visits    = lp.visits + case when lp.last_seen < now() - interval '30 minutes' then 1 else 0 end,
    last_seen = now();

  update live_players set left_at = null where device = p_device and left_at is not null;

  -- Visits: carry on the current one if they were here in the last 3 minutes, otherwise start a new one
  update live_sessions s set ended_at = now(),
    games = case when p_game = any(s.games) then s.games else s.games || p_game end
  where s.id = (select x.id from live_sessions x where x.device = p_device and x.ended_at > now() - interval '3 minutes' order by x.id desc limit 1);
  if not found then
    insert into live_sessions (device, games) values (p_device, array[p_game]);
  end if;

  -- Now and then, tidy up: delivered items after 30 days, undelivered ones after 7, visits after 30
  if random() < 0.02 then
    delete from live_inbox where (delivered_at is not null and delivered_at < now() - interval '30 days')
                              or (delivered_at is null and created_at < now() - interval '7 days');
    delete from live_sessions where ended_at < now() - interval '30 days';
  end if;

  return query
    update live_inbox i set delivered_at = now()
    where i.device = p_device and i.delivered_at is null and i.created_at > now() - interval '7 days'
    returning i.id, i.kind, i.payload;
end $$;

-- Players: "I'm leaving" (closed the tab, or switched to another app)
create or replace function public.live_bye(p_device text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_device is null or p_device !~ '^[a-z0-9]{16,40}$' then return; end if;
  update live_players set left_at = now() where device = p_device;
  update live_sessions s set ended_at = now()
  where s.id = (select x.id from live_sessions x where x.device = p_device and x.ended_at > now() - interval '3 minutes' order by x.id desc limit 1);
end $$;

-- ---------- Admin (every call needs the passphrase) ----------
create or replace function public.live_admin_ok(p_key text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare ok boolean;
begin
  select exists(select 1 from live_admin where key_hash = crypt(coalesce(p_key, ''), key_hash)) into ok;
  if not ok then perform pg_sleep(0.6); end if;   -- slows down guessing
  return ok;
end $$;

drop function if exists public.live_admin_players(text);
create or replace function public.live_admin_players(p_key text)
returns table(device text, initials text, nick text, game text, first_seen timestamptz, last_seen timestamptz, visits int, waiting int, left_at timestamptz, session_start timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not live_admin_ok(p_key) then raise exception 'bad key'; end if;
  return query
    select p.device, p.initials, p.nick, p.game, p.first_seen, p.last_seen, p.visits,
           (select count(*)::int from live_inbox i where i.device = p.device and i.delivered_at is null and i.created_at > now() - interval '7 days'),
           p.left_at,
           (select x.started_at from live_sessions x where x.device = p.device order by x.ended_at desc limit 1)
    from live_players p
    order by p.last_seen desc
    limit 300;
end $$;

create or replace function public.live_admin_send(p_key text, p_devices text[], p_kind text, p_payload jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare d text; n int := 0;
begin
  if not live_admin_ok(p_key) then raise exception 'bad key'; end if;
  if p_kind not in ('message', 'effect', 'power') then raise exception 'bad kind'; end if;
  if p_payload is null or length(p_payload::text) > 2000 then raise exception 'bad payload'; end if;
  if p_devices is null or cardinality(p_devices) = 0 or cardinality(p_devices) > 300 then raise exception 'bad devices'; end if;
  foreach d in array p_devices loop
    if d !~ '^[a-z0-9]{16,40}$' then continue; end if;
    insert into live_inbox (device, kind, payload) values (d, p_kind, p_payload);
    n := n + 1;
    -- Nudge the player's browser so it picks the item up right away.
    -- If realtime isn't available, the browser still finds it on its next check-in.
    begin
      perform realtime.send(jsonb_build_object('at', now()), 'ping', 'live:' || d, false);
    exception when others then null;
    end;
  end loop;
  return n;
end $$;

-- Activity: every visit in the last p_hours, newest first
create or replace function public.live_admin_sessions(p_key text, p_hours int)
returns table(id bigint, device text, started_at timestamptz, ended_at timestamptz, games text[], left_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not live_admin_ok(p_key) then raise exception 'bad key'; end if;
  return query
    select s.id, s.device, s.started_at, s.ended_at, s.games,
           case when s.id = (select x.id from live_sessions x where x.device = s.device order by x.ended_at desc limit 1) then p.left_at end
    from live_sessions s left join live_players p on p.device = s.device
    where s.ended_at > now() - make_interval(hours => least(greatest(coalesce(p_hours, 24), 1), 720))
    order by s.started_at desc
    limit 500;
end $$;

create or replace function public.live_admin_nick(p_key text, p_device text, p_nick text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not live_admin_ok(p_key) then raise exception 'bad key'; end if;
  update live_players set nick = nullif(left(trim(coalesce(p_nick, '')), 24), '') where device = p_device;
end $$;

create or replace function public.live_admin_forget(p_key text, p_device text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not live_admin_ok(p_key) then raise exception 'bad key'; end if;
  delete from live_inbox where device = p_device;
  delete from live_sessions where device = p_device;
  delete from live_players where device = p_device;
end $$;

-- Only these functions are callable from the site
revoke execute on function public.live_checkin(text, text, text), public.live_bye(text), public.live_admin_ok(text), public.live_admin_players(text),
  public.live_admin_sessions(text, int), public.live_admin_send(text, text[], text, jsonb), public.live_admin_nick(text, text, text), public.live_admin_forget(text, text) from public;
grant execute on function public.live_checkin(text, text, text), public.live_bye(text), public.live_admin_players(text),
  public.live_admin_sessions(text, int), public.live_admin_send(text, text[], text, jsonb), public.live_admin_nick(text, text, text), public.live_admin_forget(text, text) to anon, authenticated;

-- ---------- Set your admin passphrase ----------
-- Pick something long that nobody would guess (four or five random words works well), and change it here before running.
do $$
declare pass text := 'CHANGE-ME-to-a-long-secret-passphrase';   -- ← put your passphrase between the quotes
begin
  if pass like 'CHANGE-ME%' or length(pass) < 12 then
    raise notice 'Passphrase not set: edit the line above (at least 12 characters) and run this part again.';
  else
    insert into public.live_admin (id, key_hash) values (1, extensions.crypt(pass, extensions.gen_salt('bf')))
    on conflict (id) do update set key_hash = excluded.key_hash;
  end if;
end $$;
