import * as Astronomy from "astronomy-engine";

// --- Traditional full moon names (Farmer's Almanac / Algonquin convention) ---
const FULL_MOON_NAMES = [
  { name: "Wolf Moon", month: 0, note: "Named for wolves howling in midwinter hunger, deep in the coldest nights of the year." },
  { name: "Snow Moon", month: 1, note: "For the heavy snows that typically fall this time of year in the Northern Hemisphere." },
  { name: "Worm Moon", month: 2, note: "As the ground thaws, earthworm casts reappear — a sign winter is loosening its grip." },
  { name: "Pink Moon", month: 3, note: "Named not for its color but for the early pink phlox that blooms in early spring." },
  { name: "Flower Moon", month: 4, note: "Flowers are abundant in May, giving this moon its name." },
  { name: "Strawberry Moon", month: 5, note: "Marks the short strawberry harvesting season in the northeastern US." },
  { name: "Buck Moon", month: 6, note: "Male deer begin growing new antlers around this time." },
  { name: "Sturgeon Moon", month: 7, note: "Named for the sturgeon in the Great Lakes and Lake Champlain, most easily caught this month." },
  { name: "Harvest Moon", month: 8, note: "The full moon nearest the autumn equinox — its early evening light once let farmers work late into the harvest." },
  { name: "Hunter's Moon", month: 9, note: "The first moon after Harvest Moon, when game is fattened and ready for the hunt." },
  { name: "Beaver Moon", month: 10, note: "Traditionally when beaver traps were set before swamps and rivers froze." },
  { name: "Cold Moon", month: 11, note: "The long, cold nights of early winter give this moon its name." },
];

const PHASE_NAMES = [
  { max: 1, name: "New Moon" },
  { max: 89, name: "Waxing Crescent" },
  { max: 91, name: "First Quarter" },
  { max: 179, name: "Waxing Gibbous" },
  { max: 181, name: "Full Moon" },
  { max: 269, name: "Waning Gibbous" },
  { max: 271, name: "Last Quarter" },
  { max: 359, name: "Waning Crescent" },
  { max: 360.1, name: "New Moon" },
];

// Moon distance thresholds (km) — rough supermoon/micromoon convention
const PERIGEE_THRESHOLD_KM = 361000;
const APOGEE_THRESHOLD_KM = 405000;
const AU_TO_KM = 149597870.7;

export function getMoonData(date, observer) {
  const phaseDeg = Astronomy.MoonPhase(date); // 0=new,90=first quarter,180=full,270=last quarter
  const illum = Astronomy.Illumination(Astronomy.Body.Moon, date);
  const distanceKm = illum.geo_dist * AU_TO_KM;

  // Map 0-360 degrees to an 8-name phase bucket, treating wax/wane symmetry
  let bucket = phaseDeg;
  const phaseEntry = PHASE_NAMES.find((p) => bucket <= p.max) || PHASE_NAMES[PHASE_NAMES.length - 1];
  const isWaxing = phaseDeg < 180;

  const now = date;
  const nextFull = Astronomy.SearchMoonQuarter(date); // gets next quarter event of any kind after date — we'll search forward for quarter==2 (full)
  let fullMoonEvent = nextFull;
  let guard = 0;
  while (fullMoonEvent.quarter !== 2 && guard < 6) {
    fullMoonEvent = Astronomy.NextMoonQuarter(fullMoonEvent);
    guard++;
  }
  const nextFullDate = fullMoonEvent.time.date;
  const traditionalName = FULL_MOON_NAMES.find((f) => f.month === nextFullDate.getMonth());

  const eq = Astronomy.Equator(Astronomy.Body.Moon, date, observer, true, true);
  const hor = Astronomy.Horizon(date, observer, eq.ra, eq.dec, "normal");

  let rise = null;
  let set = null;
  try {
    rise = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, 1, date, 2);
  } catch (e) {}
  try {
    set = Astronomy.SearchRiseSet(Astronomy.Body.Moon, observer, -1, date, 2);
  } catch (e) {}

  return {
    phaseDeg,
    phaseName: phaseEntry.name,
    isWaxing,
    illuminationPct: Math.round(illum.phase_fraction * 1000) / 10,
    distanceKm: Math.round(distanceKm),
    isSupermoon: distanceKm <= PERIGEE_THRESHOLD_KM,
    isMicromoon: distanceKm >= APOGEE_THRESHOLD_KM,
    magnitude: illum.mag,
    altitude: hor.altitude,
    azimuth: hor.azimuth,
    isUp: hor.altitude > 0,
    rise: rise ? rise.date : null,
    set: set ? set.date : null,
    nextFullDate,
    traditionalName: traditionalName ? traditionalName.name : null,
    traditionalNote: traditionalName ? traditionalName.note : null,
  };
}

const VISIBLE_PLANETS = [
  { body: "Mercury", name: "Mercury" },
  { body: "Venus", name: "Venus" },
  { body: "Mars", name: "Mars" },
  { body: "Jupiter", name: "Jupiter" },
  { body: "Saturn", name: "Saturn" },
  { body: "Uranus", name: "Uranus" },
  { body: "Neptune", name: "Neptune" },
];

export function getPlanetData(date, observer) {
  // Sun altitude tells us whether it's dark enough to matter
  const sunEq = Astronomy.Equator(Astronomy.Body.Sun, date, observer, true, true);
  const sunHor = Astronomy.Horizon(date, observer, sunEq.ra, sunEq.dec, "normal");
  const isDark = sunHor.altitude < -6; // civil twilight or darker

  return VISIBLE_PLANETS.map(({ body, name }) => {
    const bodyId = Astronomy.Body[body];
    const eq = Astronomy.Equator(bodyId, date, observer, true, true);
    const hor = Astronomy.Horizon(date, observer, eq.ra, eq.dec, "normal");
    const illum = Astronomy.Illumination(bodyId, date);

    let rise = null;
    try {
      rise = Astronomy.SearchRiseSet(bodyId, observer, 1, date, 2);
    } catch (e) {}
    let set = null;
    try {
      set = Astronomy.SearchRiseSet(bodyId, observer, -1, date, 2);
    } catch (e) {}

    return {
      name,
      altitude: hor.altitude,
      azimuth: hor.azimuth,
      magnitude: illum.mag,
      isUp: hor.altitude > 0,
      visibleNow: hor.altitude > 0 && isDark,
      rise: rise ? rise.date : null,
      set: set ? set.date : null,
    };
  }).sort((a, b) => a.magnitude - b.magnitude);
}

export function getObserver(lat, lon) {
  return new Astronomy.Observer(lat, lon, 0);
}

export function getSunData(date, observer) {
  let rise = null;
  let set = null;
  try {
    rise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, 1, date, 2);
  } catch (e) {}
  try {
    set = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, date, 2);
  } catch (e) {}
  return {
    rise: rise ? rise.date : null,
    set: set ? set.date : null,
  };
}
