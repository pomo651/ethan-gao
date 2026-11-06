-- /admin page: stats + orders behind a passphrase, checked here in the database.
-- The passphrase itself is never in this repo. Set or change it with:
--   update site.admin_key set hash = extensions.crypt('NEW PASSPHRASE', extensions.gen_salt('bf'));

drop function if exists public.site_admin_mark_emailed(text, bigint, boolean);
drop function if exists site.check_admin(text);

create table if not exists site.admin_key (
  id   int  primary key default 1 check (id = 1),
  hash text not null
);
alter table site.admin_key enable row level security;

create table if not exists site.admin_fails (created_at timestamptz not null default now());
alter table site.admin_fails enable row level security;

-- Returns null when the passphrase is right, otherwise the reason. Does not raise, so the
-- failed try is actually saved (an exception would roll the insert back).
create or replace function site.check_admin(p_key text)
returns text
language plpgsql
security definer
set search_path = site, extensions, public
as $$
begin
  -- Brute-force guard: after 20 wrong tries in 10 minutes, everyone waits.
  if (select count(*) from admin_fails where created_at > now() - interval '10 minutes') >= 20 then
    return 'Too many wrong tries. Wait 10 minutes.';
  end if;
  if not exists (select 1 from admin_key where hash = crypt(coalesce(p_key, ''), hash)) then
    insert into admin_fails default values;
    return 'Wrong passphrase.';
  end if;
  return null;
end;
$$;
revoke all on function site.check_admin(text) from public;

create or replace function public.site_admin_report(p_key text, p_days int default 30)
returns json
language plpgsql
security definer
set search_path = site, public
as $$
declare
  v_since timestamptz := now() - make_interval(days => greatest(1, least(p_days, 3650)));
  v_tz    text := 'America/Edmonton';
  v_err   text := check_admin(p_key);
begin
  if v_err is not null then return json_build_object('error', v_err); end if;
  return json_build_object(
    'days', p_days,
    'totals', (select json_build_object(
        'visitors', count(distinct visitor), 'visits', count(distinct session),
        'page_views', count(*) filter (where event = 'pageview'),
        'clicked', count(distinct visitor) filter (where event = 'kit_buy_click'),
        'details', count(distinct visitor) filter (where event = 'checkout_details'),
        'ordered', count(distinct visitor) filter (where event = 'order_placed'),
        'visited', count(distinct visitor) filter (where event = 'pageview'))
      from events where created_at > v_since),
    'per_day', (select coalesce(json_agg(d order by d.day desc), '[]') from (
        select (created_at at time zone v_tz)::date as day, count(distinct visitor) as visitors,
               count(*) filter (where event = 'pageview') as page_views,
               count(*) filter (where event = 'kit_buy_click') as buy_clicks,
               count(*) filter (where event = 'order_placed') as orders
        from events where created_at > v_since group by 1) d),
    'pages', (select coalesce(json_agg(p order by p.views desc), '[]') from (
        select path, count(*) as views, count(distinct visitor) as visitors
        from events where event = 'pageview' and created_at > v_since group by 1 order by 2 desc limit 15) p),
    'sources', (select coalesce(json_agg(s order by s.visitors desc), '[]') from (
        select coalesce(substring(referrer from '^https?://([^/]+)'), '(direct / unknown)') as source, count(distinct visitor) as visitors
        from events where event = 'pageview' and created_at > v_since group by 1 order by 2 desc limit 10) s),
    'clicks', (select coalesce(json_agg(c order by c.clicks desc), '[]') from (
        select path, count(*) as clicks, count(distinct visitor) as visitors
        from events where event = 'kit_buy_click' and created_at > v_since group by 1) c),
    'orders', (select coalesce(json_agg(o order by o.id desc), '[]') from (
        select id, to_char(created_at at time zone v_tz, 'YYYY-MM-DD HH24:MI') as placed, name, email, kit, paper,
               to_char(emailed_at at time zone v_tz, 'YYYY-MM-DD') as emailed
        from orders where created_at > v_since) o)
  );
end;
$$;

create or replace function public.site_admin_mark_emailed(p_key text, p_order bigint, p_sent boolean)
returns json
language plpgsql
security definer
set search_path = site, public
as $$
declare
  v_err text := check_admin(p_key);
begin
  if v_err is not null then return json_build_object('error', v_err); end if;
  update orders set emailed_at = case when p_sent then now() end where id = p_order;
  return json_build_object('ok', true);
end;
$$;

revoke all on function public.site_admin_report(text, int) from public;
revoke all on function public.site_admin_mark_emailed(text, bigint, boolean) from public;
grant execute on function public.site_admin_report(text, int) to anon;
grant execute on function public.site_admin_mark_emailed(text, bigint, boolean) to anon;
