-- Kit orders + traffic for the whole site. Lives next to coin_game in the family-fridge project.
-- The browser only calls site_track() and site_place_order(); the tables are not readable or
-- writable by anon (RLS on, no policies). Read them with scripts/stats.sh or the Supabase dashboard.
--
-- visitor = random id kept in the browser's localStorage (one per browser)
-- session = random id kept in sessionStorage (one per tab visit)

create schema if not exists site;

create table site.events (
  id         bigint generated always as identity primary key,
  visitor    uuid        not null,
  session    uuid        not null,
  event      text        not null check (event in ('pageview', 'kit_buy_click', 'checkout_details', 'order_placed')),
  path       text        not null,
  referrer   text,
  kit        text,
  created_at timestamptz not null default now()
);
create index on site.events (created_at);
create index on site.events (visitor, created_at);
alter table site.events enable row level security;  -- no policies: direct access denied

create table site.orders (
  id           bigint generated always as identity primary key,
  visitor      uuid        not null,
  kit          text        not null,
  paper        text        not null,
  name         text,
  email        text        not null,
  listed_price numeric(8,2),
  created_at   timestamptz not null default now(),
  emailed_at   timestamptz            -- set this when the kit has been sent
);
create index on site.orders (created_at);
alter table site.orders enable row level security;  -- no policies: direct access denied

create or replace function public.site_track(p_visitor uuid, p_session uuid, p_event text, p_path text, p_referrer text default null, p_kit text default null)
returns void
language plpgsql
security definer
set search_path = site, public
as $$
begin
  if p_event = 'order_placed' then raise exception 'use site_place_order'; end if;
  -- Basic abuse guard: at most 60 events per visitor per minute.
  if (select count(*) from events where visitor = p_visitor and created_at > now() - interval '1 minute') >= 60 then
    return;
  end if;
  insert into events (visitor, session, event, path, referrer, kit)
  values (p_visitor, p_session, p_event, left(coalesce(p_path, ''), 200), nullif(left(p_referrer, 300), ''), left(p_kit, 100));
end;
$$;

create or replace function public.site_place_order(p_visitor uuid, p_session uuid, p_path text, p_kit text, p_paper text, p_name text, p_email text, p_price numeric)
returns json
language plpgsql
security definer
set search_path = site, public
as $$
declare
  v_email text := lower(trim(p_email));
  v_id    bigint;
begin
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' or length(v_email) > 200 then
    raise exception 'bad email';
  end if;
  -- Basic abuse guard: at most 5 orders per visitor per 10 minutes.
  if (select count(*) from orders where visitor = p_visitor and created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'slow down';
  end if;
  insert into orders (visitor, kit, paper, name, email, listed_price)
  values (p_visitor, left(p_kit, 100), left(p_paper, 20), nullif(left(trim(p_name), 100), ''), v_email, p_price)
  returning id into v_id;
  insert into events (visitor, session, event, path, kit)
  values (p_visitor, p_session, 'order_placed', left(coalesce(p_path, ''), 200), left(p_kit, 100));
  return json_build_object('order', v_id);
end;
$$;

revoke all on function public.site_track(uuid, uuid, text, text, text, text) from public;
revoke all on function public.site_place_order(uuid, uuid, text, text, text, text, text, numeric) from public;
grant execute on function public.site_track(uuid, uuid, text, text, text, text) to anon;
grant execute on function public.site_place_order(uuid, uuid, text, text, text, text, text, numeric) to anon;
