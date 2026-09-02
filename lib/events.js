import * as Astronomy from "astronomy-engine";
import meteorData from "../data/meteorShowers.json";

const AU_TO_KM = 149597870.7;
const PERIGEE_THRESHOLD_KM = 361000;

function moonAltitudeAt(date, observer) {
  const eq = Astronomy.Equator(Astronomy.Body.Moon, date, observer, true, true);
  return Astronomy.Horizon(date, observer, eq.ra, eq.dec, "normal").altitude;
}

// Full/new moons within the lookahead window, flagged for supermoon status.
function upcomingMoonPhases(fromDate, lookaheadDays) {
  const results = [];
  let q = Astronomy.SearchMoonQuarter(fromDate);
  const cutoff = new Date(fromDate.getTime() + lookaheadDays * 86400000);

  let guard = 0;
  while (q.time.date <= cutoff && guard < 30) {
    if (q.quarter === 0 || q.quarter === 2) {
      const illum = Astronomy.Illumination(Astronomy.Body.Moon, q.time.date);
      const distKm = illum.geo_dist * AU_TO_KM;
      results.push({
        date: q.time.date,
        type: q.quarter === 2 ? "Full Moon" : "New Moon",
        detail: distKm <= PERIGEE_THRESHOLD_KM ? "Supermoon — near perigee" : null,
      });
    }
    q = Astronomy.NextMoonQuarter(q);
    guard++;
  }
  return results;
}

// Next lunar eclipse, with a plain-language local-visibility check (moon above
// horizon at peak — lunar eclipses don't need a precise location, just night).
// Returns null if the next non-penumbral eclipse falls outside the window.
function nextLunarEclipse(fromDate, observer, lookaheadDays) {
  let e = Astronomy.SearchLunarEclipse(fromDate);
  if (e.kind === "penumbral" || e.kind === "none") {
    let guard = 0;
    while ((e.kind === "penumbral" || e.kind === "none") && guard < 10) {
      e = Astronomy.NextLunarEclipse(e.peak.date);
      guard++;
    }
  }
  const cutoff = new Date(fromDate.getTime() + lookaheadDays * 86400000);
  if (e.peak.date > cutoff) return null;

  const altitude = moonAltitudeAt(e.peak.date, observer);
  return {
    date: e.peak.date,
    type: `${capitalize(e.kind)} Lunar Eclipse`,
    detail:
      altitude > 0
        ? "Moon will be above your horizon — visible if skies are clear"
        : "Moon below horizon at your location — not visible locally",
    kind: e.kind,
    visibleLocally: altitude > 0,
  };
}

// Next local solar eclipse — inherently location-specific, which is exactly
// right for this event type. Returns null if outside the window or if the
// obscuration is too small to be a meaningful sighting (a barely-grazing edge case).
function nextLocalSolarEclipse(fromDate, observer, lookaheadDays) {
  const e = Astronomy.SearchLocalSolarEclipse(fromDate, observer);
  const cutoff = new Date(fromDate.getTime() + lookaheadDays * 86400000);
  if (e.peak.time.date > cutoff) return null;
  if (e.obscuration < 0.03) return null;

  return {
    date: e.peak.time.date,
    type: `${capitalize(e.kind)} Solar Eclipse`,
    detail: `Sun ${Math.round(e.peak.altitude)}° above horizon at peak, ~${Math.round(e.obscuration * 100)}% obscured`,
    kind: e.kind,
    visibleLocally: true,
  };
}

// Outer-planet oppositions — best viewing night of the year for that planet,
// visible worldwide after dark, so location only matters for local horizon.
function upcomingOppositions(fromDate, lookaheadDays) {
  const bodies = ["Mars", "Jupiter", "Saturn", "Uranus", "Neptune"];
  const cutoff = new Date(fromDate.getTime() + lookaheadDays * 86400000);
  const results = [];
  for (const body of bodies) {
    try {
      const t = Astronomy.SearchRelativeLongitude(Astronomy.Body[body], 180, fromDate);
      if (t.date <= cutoff) {
        results.push({
          date: t.date,
          type: `${body} at Opposition`,
          detail: `${body}'s closest, brightest, best-viewing night of the year`,
        });
      }
    } catch (e) {
      // Mercury/Venus don't have oppositions (inner planets) — bodies list excludes them already.
    }
  }
  return results;
}

// Curated annual meteor showers — finds each shower's next occurrence (this
// year or next) and includes it if within the lookahead window.
function upcomingMeteorShowers(fromDate, lookaheadDays) {
  const cutoff = new Date(fromDate.getTime() + lookaheadDays * 86400000);
  const results = [];
  for (const s of meteorData.showers) {
    let peak = new Date(fromDate.getFullYear(), s.month - 1, s.day);
    if (peak < fromDate) {
      peak = new Date(fromDate.getFullYear() + 1, s.month - 1, s.day);
    }
    if (peak <= cutoff) {
      results.push({
        date: peak,
        type: `${s.name} Meteor Shower`,
        detail: `Peak night — up to ~${s.zhr}/hr under dark skies`,
      });
    }
  }
  return results;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Single, honest window applied uniformly to every event type — no more
// "next regardless of distance" exceptions that made the list look mis-sorted.
export function getSkyEvents(fromDate, observer, lookaheadDays = 365) {
  const lunar = nextLunarEclipse(fromDate, observer, lookaheadDays);
  const solar = nextLocalSolarEclipse(fromDate, observer, lookaheadDays);

  const events = [
    ...upcomingMoonPhases(fromDate, lookaheadDays),
    ...upcomingMeteorShowers(fromDate, lookaheadDays),
    ...(lunar ? [lunar] : []),
    ...(solar ? [solar] : []),
    ...upcomingOppositions(fromDate, lookaheadDays),
  ];

  return events.sort((a, b) => a.date - b.date);
}

// Near-term eclipse alert for the hero icon — only surfaces something within
// `withinDays` (default one week) AND only if it's actually visible locally.
export function getEclipseAlerts(fromDate, observer, withinDays = 7) {
  const lunar = nextLunarEclipse(fromDate, observer, withinDays);
  const solar = nextLocalSolarEclipse(fromDate, observer, withinDays);

  return {
    lunar: lunar && lunar.visibleLocally ? lunar : null,
    solar: solar && solar.visibleLocally ? solar : null,
  };
}
