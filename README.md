# Ethan's Sketchbook

Website for Ethan's YouTube channel ([@eethangaoo](https://www.youtube.com/@eethangaoo)), run by Ethan and his dad.
Static HTML/CSS/JS with no build step, deployed to GitHub Pages.

## Pages

| Path | What |
|---|---|
| `/` | Home: intro, Paint Kit #1, latest videos, who makes this |
| `/videos/` | All videos, read from `data/videos.json` |
| `/kits/` | Paint-kit shop |
| `/kits/shark-man/` | Kit 001 page: demo, source cartoon, painting video slot, parent FAQ |
| `/game/` | Shark Man's Treasure Dive: the blindfold coin puzzle, kid-friendly (read-aloud, chests, pearls) |
| `/about/` | Ethan & Dad |

## How things update

- **Videos.** `.github/workflows/deploy.yml` runs `scripts/update_videos.py` on every push and once a day, which pulls the channel's YouTube RSS feed into `data/videos.json` before deploying. New uploads appear on the site within a day without any manual step. The committed `data/videos.json` is only a fallback.
- **Painting video on a kit page.** Put the YouTube video ID in `data-video-id="..."` in `kits/shark-man/index.html`.

## Checkout (simulated)

Every "Get the kit" button opens a 4-step checkout: paper size → name + email → review (price shown) → "Thank you for supporting Ethan! This kit is free. We'll email it within 24 hours." No payment is ever taken and no card fields exist.

"Complete order" saves the order (name, email, kit, paper size, listed price) to `site.orders` in Supabase via `site_place_order`. If saving fails, the buyer sees an error and can retry; the thank-you screen only shows once it is saved.
After emailing a kit, tick “Sent” on /admin/.

## Traffic and conversion

Every page load and checkout step is logged to `site.events` (Supabase) with an anonymous random id per browser. No cookies, no third-party tracker.

| Event | When |
|---|---|
| `pageview` | any page loads (with outside referrer, if any) |
| `kit_buy_click` | a "Get the kit" button is clicked |
| `checkout_details` | a valid name + email is entered (step 2 → review) |
| `order_placed` | the order is saved |

**See it at [/admin/](https://pomo651.github.io/ethan-gao/admin/)** (not linked from the site). It asks for a passphrase, which the database checks (`site_admin_report`); without it nothing loads. It shows yesterday, today, the funnel, traffic and orders, with a “Sent” tickbox per order. Opening it also stops counting that browser. Change the passphrase with `update site.admin_key set hash = extensions.crypt('NEW', extensions.gen_salt('bf'));` (migration `20261106140000_site_admin.sql`).

Offline alternatives: run `scripts/stats_report.py [DAYS]` (default 30) to build and open `reports/stats.html`: visitors, top pages, referrers, the kit funnel with conversion rates, and the order list. `reports/` is git-ignored because it lists buyers' emails. `scripts/stats.sh [DAYS]` prints the same numbers in the terminal. Both need the Supabase CLI logged in.
Open any page with `?notrack` once to stop counting your own browser (`?track` undoes it).

## Kit art

The Shark Man drawing in `assets/js/site.js` (`ART.shark`) is placeholder line art. Replace it with the real AI-generated kit pages (images in `assets/img/` work fine).

## Local preview

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

`design/` holds the original design-directions page and is not deployed.

## Game stats (`/game/`)

Each player's tries and wins are kept in their browser (`localStorage`). "You beat X% of players" needs shared storage:
They live in the **family-fridge** Supabase project (ref `yvzsdncrpccxqbswemnt`), schema `coin_game`, applied from `supabase/migrations/20261106120000_coin_game_stats.sql` (not part of family-fridge's own migration history). The site calls `record_coin_attempt` using `supabase` in `assets/js/config.js`.

Orders and traffic (schema `site`) are in the same project, from `supabase/migrations/20261106130000_site_orders_and_traffic.sql`. In both schemas the tables have RLS on and no policies, so the browser can only call the RPCs, never read the data.
X% = share of other players who haven't won yet or needed more tries for their first win.
