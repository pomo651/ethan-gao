#!/usr/bin/env python3
"""Site report as one HTML page: visitors, pages, sources, kit funnel, orders.

Usage: scripts/stats_report.py [DAYS]   (default 30)
Writes reports/stats.html (git-ignored: it contains buyers' emails) and opens it.
Reads the family-fridge Supabase project with the Supabase CLI (needs `supabase login`).
"""
import datetime
import html
import json
import pathlib
import subprocess
import sys

REF = "yvzsdncrpccxqbswemnt"
DAYS = next((int(a) for a in sys.argv[1:] if a.isdigit()), 30)
HERE = pathlib.Path(__file__).resolve().parent
OUT = pathlib.Path(next((a[6:] for a in sys.argv[1:] if a.startswith("--out=")), HERE.parent / "reports" / "stats.html"))
SINCE = f"now() - interval '{DAYS} days'"
TZ = "America/Edmonton"


def q(sql):
    r = subprocess.run(["supabase", "db", "query", "--linked", "--project-ref", REF, sql],
                       capture_output=True, text=True, check=True)
    return json.loads(r.stdout)["rows"]


def e(v):
    return "—" if v is None else html.escape(str(v))


def table(rows, cols, empty="No data yet."):
    if not rows:
        return f'<p class="meta">{empty}</p>'
    head = "".join(f"<th>{html.escape(label)}</th>" for _, label in cols)
    body = "".join("<tr>" + "".join(f"<td>{e(r[key])}</td>" for key, _ in cols) + "</tr>" for r in rows)
    return f"<table><tr>{head}</tr>{body}</table>"


def pct(a, b):
    return f"{100 * a / b:.1f}%" if b else "—"


totals = q(f"""select count(distinct visitor) as visitors, count(distinct session) as visits,
                      count(*) filter (where event='pageview') as page_views
               from site.events where created_at > {SINCE}""")[0]
funnel = q(f"""select count(distinct visitor) filter (where event='pageview') as visited,
                      count(distinct visitor) filter (where event='kit_buy_click') as clicked,
                      count(distinct visitor) filter (where event='checkout_details') as details,
                      count(distinct visitor) filter (where event='order_placed') as ordered
               from site.events where created_at > {SINCE}""")[0]
per_day = q(f"""select (created_at at time zone '{TZ}')::date as day, count(distinct visitor) as visitors,
                       count(*) filter (where event='pageview') as page_views
                from site.events where created_at > {SINCE} group by 1 order by 1 desc""")
pages = q(f"""select path, count(*) as views, count(distinct visitor) as visitors
              from site.events where event='pageview' and created_at > {SINCE} group by 1 order by 2 desc limit 15""")
sources = q(f"""select coalesce(substring(referrer from '^https?://([^/]+)'), '(direct / unknown)') as source,
                       count(distinct visitor) as visitors
                from site.events where event='pageview' and created_at > {SINCE} group by 1 order by 2 desc limit 10""")
clicks = q(f"""select path, count(*) as clicks, count(distinct visitor) as visitors
               from site.events where event='kit_buy_click' and created_at > {SINCE} group by 1 order by 2 desc""")
orders = q(f"""select id, to_char(created_at at time zone '{TZ}', 'YYYY-MM-DD HH24:MI') as placed, name, email, kit, paper,
                      emailed_at is not null as emailed
               from site.orders where created_at > {SINCE} order by created_at desc""")

steps = [("Visited the site", funnel["visited"]), ("Clicked “Get the kit”", funnel["clicked"]),
         ("Entered name + email", funnel["details"]), ("Placed the order", funnel["ordered"])]
top = max(funnel["visited"], 1)
funnel_rows = "".join(
    f"<tr><td>{i + 1}. {label}</td><td><strong>{n}</strong></td>"
    f"<td>{pct(n, steps[i - 1][1]) if i else '—'}</td><td>{pct(n, funnel['visited'])}</td>"
    f'<td><code>{"█" * round(24 * n / top) or "·"}</code></td></tr>'
    for i, (label, n) in enumerate(steps))
order_rows = "".join(
    f"<tr><td>#{o['id']}</td><td>{e(o['placed'])}</td><td>{e(o['name'])}</td><td>{e(o['email'])}</td>"
    f"<td>{e(o['kit'])}</td><td>{e(o['paper'])}</td><td>"
    + ('<span class="badge badge-done">SENT</span>' if o["emailed"] else '<span class="badge badge-progress">TO SEND</span>')
    + "</td></tr>" for o in orders)
orders_html = (f"<table><tr><th>#</th><th>Placed</th><th>Name</th><th>Email</th><th>Kit</th><th>Paper</th><th>Status</th></tr>{order_rows}</table>"
               if orders else '<p class="meta">No orders yet.</p>')
now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")

page = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ethan's Sketchbook — site stats</title>
  {(HERE / "report_style.html").read_text()}
</head>
<body>
<div class="container">

  <header>
    <h1>Ethan's Sketchbook — site stats</h1>
    <div class="meta">pomo651.github.io/ethan-gao · last {DAYS} days · generated {now} ({TZ})</div>
    <div class="meta"><span class="badge badge-done">LIVE DATA</span> read straight from Supabase (family-fridge project, schema <code>site</code>)</div>
  </header>

  <div class="section">
    <h2>Headline numbers</h2>
    <table>
      <tr><th>Visitors</th><th>Visits</th><th>Page views</th><th>Clicked “Get the kit”</th><th>Orders</th><th>Visit → order</th><th>Click → order</th></tr>
      <tr><td><strong>{totals['visitors']}</strong></td><td>{totals['visits']}</td><td>{totals['page_views']}</td>
          <td>{funnel['clicked']}</td><td><strong>{funnel['ordered']}</strong></td>
          <td>{pct(funnel['ordered'], funnel['visited'])}</td><td>{pct(funnel['ordered'], funnel['clicked'])}</td></tr>
    </table>
    <p class="meta">Visitor = one browser. Visit = one browser tab session. Funnel counts unique visitors, so one person clicking “Get the kit” 5 times counts once.</p>
  </div>

  <div class="section">
    <h2>Kit funnel (conversion)</h2>
    <table>
      <tr><th>Step</th><th>Visitors</th><th>From previous step</th><th>From all visitors</th><th></th></tr>
      {funnel_rows}
    </table>
    <h3>Which button they clicked</h3>
    {table(clicks, [("path", "Page"), ("clicks", "Clicks"), ("visitors", "Visitors")], "No buy clicks yet.")}
  </div>

  <div class="section">
    <h2>Orders (emails to send)</h2>
    {orders_html}
    <div class="info-box">After you email a kit, mark it sent (or ask Claude to): <code>update site.orders set emailed_at = now() where id = N;</code></div>
  </div>

  <div class="section">
    <h2>Traffic</h2>
    <div class="grid-2">
      <div><h3>Visitors per day</h3>{table(per_day, [("day", "Day"), ("visitors", "Visitors"), ("page_views", "Page views")])}</div>
      <div><h3>Where they came from</h3>{table(sources, [("source", "Source"), ("visitors", "Visitors")])}</div>
    </div>
    <h3>Top pages</h3>
    {table(pages, [("path", "Page"), ("views", "Views"), ("visitors", "Visitors")])}
  </div>

  <div class="section">
    <h2>How it checks</h2>
    <div class="ascii-box">Visitor's browser                         Supabase (family-fridge)              You
─────────────────                         ────────────────────────              ───
first visit → random id saved in browser
any page loads      ──── pageview ─────▶  site.events  ┐
click “Get the kit” ──── kit_buy_click ─▶  site.events  │
valid name + email  ──── checkout_det. ▶ site.events  ├──▶ scripts/stats_report.py ──▶ this page
“Complete order”    ──── order ─────────▶  site.orders  │    (Supabase CLI, your login)
                         + order_placed ─▶ site.events  ┘
                     the browser can only SEND, never READ (RLS on, no policies)</div>
    <table>
      <tr><th>Recorded</th><th>When</th><th>What is stored</th></tr>
      <tr><td><code>pageview</code></td><td>any page loads</td><td>random browser id, page path, outside site it came from (e.g. youtube.com)</td></tr>
      <tr><td><code>kit_buy_click</code></td><td>a “Get the kit” button is clicked (home, kits list, or kit page)</td><td>id, page, kit name</td></tr>
      <tr><td><code>checkout_details</code></td><td>a valid email is entered and they move to the review step</td><td>id, page, kit name (no email here)</td></tr>
      <tr><td><code>order_placed</code></td><td>“Complete order” succeeds</td><td>the order: name, email, kit, paper size, listed price</td></tr>
    </table>
    <h3>What is not counted</h3>
    <ul class="scope-list scope-out">
      <li>Browsers you marked with <code>?notrack</code> (your own devices)</li>
      <li>Bots and anyone with JavaScript turned off</li>
      <li>The same person on phone + laptop shows as 2 visitors; clearing browser data makes a new visitor</li>
      <li>Orders placed before 2026-11-06 — they were never saved</li>
    </ul>
  </div>

  <div class="section">
    <h2>How to see results</h2>
    <table>
      <tr><th>Way</th><th>How</th><th>Best for</th></tr>
      <tr><td><strong>This page</strong></td><td><code>scripts/stats_report.py</code> (last 30 days) or <code>scripts/stats_report.py 7</code> — rebuilds and opens it</td><td>The full picture with fresh numbers</td></tr>
      <tr><td>Ask Claude</td><td>“show me Ethan site stats”</td><td>No terminal needed</td></tr>
      <tr><td>Terminal</td><td><code>scripts/stats.sh</code></td><td>Quick check, same numbers as text tables</td></tr>
      <tr><td>Supabase dashboard</td><td>supabase.com → family-fridge → Table Editor → schema <code>site</code> → <code>orders</code> / <code>events</code></td><td>Browsing raw rows</td></tr>
    </table>
    <div class="warn-box">This page lists buyers' names and emails. It is saved only on your computer (<code>reports/</code> is git-ignored and never deployed). Don't post it publicly.</div>
  </div>

  <footer>Ethan's Sketchbook · site stats · generated by <code>scripts/stats_report.py</code></footer>

</div>
</body>
</html>
"""
OUT.parent.mkdir(exist_ok=True)
OUT.write_text(page)
print(OUT)
if "--no-open" not in sys.argv:
    subprocess.run(["open", str(OUT)])
