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
| `/game/` | The Blindfold Coin Puzzle (interactive) |
| `/about/` | Ethan & Dad |

## How things update

- **Videos.** `.github/workflows/deploy.yml` runs `scripts/update_videos.py` on every push and once a day, which pulls the channel's YouTube RSS feed into `data/videos.json` before deploying. New uploads appear on the site within a day without any manual step. The committed `data/videos.json` is only a fallback.
- **Painting video on a kit page.** Put the YouTube video ID in `data-video-id="..."` in `kits/shark-man/index.html`.

## Checkout (simulated)

Every "Get the kit" button opens a 4-step checkout: paper size → name + email → review (price shown) → "Thank you for supporting Ethan! This kit is free. We'll email it within 24 hours." No payment is ever taken and no card fields exist.

Orders are sent to `orderEndpoint` in `assets/js/config.js` as a JSON POST (`kit`, `paper`, `name`, `email`, `listedPrice`, `placedAt`).
**While `orderEndpoint` is empty, orders are not saved anywhere.** A Formspree form URL works as-is.

## Kit art

The Shark Man drawing in `assets/js/site.js` (`ART.shark`) is placeholder line art. Replace it with the real AI-generated kit pages (images in `assets/img/` work fine).

## Local preview

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```

`design/` holds the original design-directions page and is not deployed.

## Game stats (`/game/`)

Each player's tries and wins are kept in their browser (`localStorage`). "You beat X% of players" needs shared storage:
They live in the **family-fridge** Supabase project (ref `yvzsdncrpccxqbswemnt`), schema `coin_game`, applied from `supabase/migrations/20261106120000_coin_game_stats.sql` (not part of family-fridge's own migration history). The site calls `record_coin_attempt` using `gameStats` in `assets/js/config.js`.
X% = share of other players who haven't won yet or needed more tries for their first win.
