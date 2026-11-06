#!/bin/bash
# Site report: visitors, page views, kit funnel, orders. Usage: scripts/stats.sh [DAYS]   (default 30)
# Reads the family-fridge Supabase project with the Supabase CLI (needs `supabase login`).
set -euo pipefail
DAYS=${1:-30}
REF=yvzsdncrpccxqbswemnt
q() { supabase db query --linked --project-ref "$REF" -o table "$1" 2>/dev/null; }
SINCE="now() - interval '$DAYS days'"

echo "== Traffic, last $DAYS days =="
q "select count(distinct visitor) as visitors, count(distinct session) as visits, count(*) filter (where event='pageview') as page_views
   from site.events where created_at > $SINCE"

echo "== Visitors per day =="
q "select (created_at at time zone 'America/Edmonton')::date as day, count(distinct visitor) as visitors, count(*) filter (where event='pageview') as page_views
   from site.events where created_at > $SINCE group by 1 order by 1 desc"

echo "== Top pages =="
q "select path, count(*) as views, count(distinct visitor) as visitors
   from site.events where event='pageview' and created_at > $SINCE group by 1 order by 2 desc limit 15"

echo "== Where visitors came from =="
q "select coalesce(substring(referrer from '^https?://([^/]+)'), '(direct / unknown)') as source, count(distinct visitor) as visitors
   from site.events where event='pageview' and created_at > $SINCE group by 1 order by 2 desc limit 10"

echo "== Kit funnel (unique visitors) =="
q "with f as (select count(distinct visitor) filter (where event='pageview') as visited,
                     count(distinct visitor) filter (where event='kit_buy_click') as clicked_buy,
                     count(distinct visitor) filter (where event='checkout_details') as entered_email,
                     count(distinct visitor) filter (where event='order_placed') as placed_order
              from site.events where created_at > $SINCE)
   select visited, clicked_buy, entered_email, placed_order,
          round(100.0 * clicked_buy / nullif(visited, 0), 1) as click_rate_pct,
          round(100.0 * placed_order / nullif(clicked_buy, 0), 1) as click_to_order_pct
   from f"

echo "== Buy clicks by page =="
q "select path, count(*) as clicks, count(distinct visitor) as visitors
   from site.events where event='kit_buy_click' and created_at > $SINCE group by 1 order by 2 desc"

echo "== Orders (newest first) =="
q "select id, (created_at at time zone 'America/Edmonton')::timestamp(0) as placed, name, email, kit, paper, emailed_at is not null as emailed
   from site.orders where created_at > $SINCE order by created_at desc"
