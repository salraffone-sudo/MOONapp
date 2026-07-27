# Night Sky Almanac

A personal moon-phase and sky-tonight dashboard. Moon and planet positions are
computed locally from real astronomical formulas (no API, always accurate).
ISS passes and near-earth asteroids are pulled live. Comets are a curated list
you update by hand a few times a year.

## Deploy (5 minutes)

1. **Push this folder to a GitHub repo.**
   ```
   cd moonapp
   git init && git add . && git commit -m "init"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Import into Vercel.**
   - Go to vercel.com → New Project → import the repo.
   - Framework preset: Next.js (auto-detected). No build config needed.

3. **Add one environment variable.**
   - Get a free instant key at https://api.nasa.gov (just an email address, no approval wait).
   - In Vercel: Project → Settings → Environment Variables → add `NASA_API_KEY`.
   - Redeploy after adding it (env vars only apply to new deployments).

4. **Done.** Vercel gives you a URL like `night-sky-almanac.vercel.app`. Add it
   to your phone's home screen (Safari/Chrome → Share → Add to Home Screen) for
   an app-like icon and full-screen launch.

## Local development

```
npm install
npm run dev
```
Visit http://localhost:3000. Geolocation requires HTTPS in most browsers except
on localhost, so local dev works fine without a cert.

## New: calendar, sky events, location/date override

- **Moon Calendar** — a month grid with a small accurate phase glyph per day.
  Tap any day to preview that date (updates the hero card, planets, and events
  below to a 9 PM local snapshot for that day).
- **Upcoming Sky Events** — full/new moons (flagged supermoon), the next
  lunar eclipse (with a local-visibility check), the next solar eclipse for
  your specific coordinates, outer-planet oppositions, and curated meteor
  shower peaks. All computed locally, no API. Lunar eclipses and oppositions
  are visible from the whole night side of Earth, so "nearby is fine" is
  actually how those events work — only solar eclipses are properly
  location-precise, which is what `SearchLocalSolarEclipse` is built for.
- **Location override** — "Change location" opens a panel to search any city
  (via Open-Meteo's free, no-key geocoding) or enter raw coordinates. Useful
  for checking the sky at a future trip destination. Picking a calendar day
  further out combines with this to preview "what will the sky look like in
  Chiang Mai in November," for example.

### About "notifications"

This is a page you visit, not a background push notification — true push
would need a service worker, a Vercel Cron job hitting your event logic daily,
and Web Push subscription keys. That's a real option if you want it, but it's
a meaningfully bigger build (and mobile Safari's push support has historically
been the weak link). What's here instead: an always-current "Upcoming Sky
Events" panel you'll see every time you open the app — closer to a standing
almanac than an alert. Say the word if you'd rather have the real thing.

## What's real-time vs. computed vs. curated

| Data | Source | Update frequency |
|---|---|---|
| Moon phase, illumination, rise/set, distance, supermoon flag | Computed locally via `astronomy-engine` | Live, every load |
| Traditional full moon names | Built-in Farmer's Almanac table | Static, correct year-round |
| Planet altitude/azimuth/visibility | Computed locally | Live, every load |
| ISS passes | Open Notify API (free, no key) | Live |
| Near-earth asteroids | NASA NeoWs API (free key) | Live, daily feed |
| Comets | `data/comets.json`, hand-curated | Manual — update from theskylive.com/comets |

## Known limitations

- **Comets and asteroids visible to the naked eye are genuinely rare.** Most
  nights the comet section will correctly show nothing bright enough to see —
  that's accurate, not broken.
- **Open Notify (ISS)** is a hobby-run free service and occasionally has
  downtime; the app fails soft and just shows "unavailable" rather than
  crashing.
- Planet "visible now" logic uses a simple sun-altitude threshold (civil
  twilight or darker) — it's a good rule of thumb, not a rigorous limiting-
  magnitude model for your specific sky conditions (light pollution, weather).
