import * as satellite from "satellite.js";
import * as Astronomy from "astronomy-engine";

// --- Root cause (for the record) ---
// This route used to call Open Notify's `iss-pass.json` prediction endpoint.
// That endpoint has been discontinued (confirmed: returns HTTP 404). Open
// Notify's simple `iss-now.json` current-position endpoint still works, but
// pass *predictions* were removed some time ago. There is no drop-in
// replacement API, so passes are now computed here directly from orbital
// elements via SGP4 propagation (the standard method every real ISS tracker
// uses under the hood).

const AU_TO_KM = 149597870.7;
const EARTH_RADIUS_KM = 6378.137;
const ISS_NORAD_ID = 25544;
const TLE_URL = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${ISS_NORAD_ID}&FORMAT=TLE`;
const TLE_CACHE_MS = 6 * 60 * 60 * 1000; // 6h — TLEs are mean elements, don't need to be fetched more often, and Celestrak asks callers to cache

// Module-scope cache: persists across invocations on a warm serverless instance,
// refetched on cold start. Falls back to a stale cached TLE (rather than failing)
// if Celestrak is briefly unreachable.
let tleCache = null; // { line1, line2, fetchedAt }

async function getTle() {
  const now = Date.now();
  if (tleCache && now - tleCache.fetchedAt < TLE_CACHE_MS) return tleCache;

  try {
    const r = await fetch(TLE_URL);
    if (!r.ok) throw new Error(`Celestrak returned ${r.status}`);
    const text = (await r.text()).trim().split("\n").map((l) => l.trim());
    // Response is 3 lines: name, line1, line2 (FORMAT=TLE)
    const line1 = text.find((l) => l.startsWith("1 "));
    const line2 = text.find((l) => l.startsWith("2 "));
    if (!line1 || !line2) throw new Error("Unexpected TLE format from Celestrak");
    tleCache = { line1, line2, fetchedAt: now };
    return tleCache;
  } catch (err) {
    if (tleCache) return tleCache; // serve stale data over none
    throw err;
  }
}

// Cylindrical Earth-shadow model: is the satellite sunlit at this moment?
function isIlluminated(satEciKm, date) {
  const sunAu = Astronomy.GeoVector(Astronomy.Body.Sun, date, true); // geocentric, AU
  const sun = { x: sunAu.x * AU_TO_KM, y: sunAu.y * AU_TO_KM, z: sunAu.z * AU_TO_KM };
  const sunMag = Math.hypot(sun.x, sun.y, sun.z);
  const sunUnit = { x: sun.x / sunMag, y: sun.y / sunMag, z: sun.z / sunMag };

  const proj = satEciKm.x * sunUnit.x + satEciKm.y * sunUnit.y + satEciKm.z * sunUnit.z;
  if (proj > 0) return true; // on the sun-facing side of Earth's center

  const satMagSq = satEciKm.x ** 2 + satEciKm.y ** 2 + satEciKm.z ** 2;
  const perpSq = satMagSq - proj * proj;
  return perpSq > EARTH_RADIUS_KM ** 2;
}

function isObserverDark(observer, date) {
  const sunEq = Astronomy.Equator(Astronomy.Body.Sun, date, observer, true, true);
  const sunHor = Astronomy.Horizon(date, observer, sunEq.ra, sunEq.dec, "normal");
  return sunHor.altitude < -6; // civil twilight or darker — sky dark enough to spot it
}

// Walk forward in time, find every geometric pass (elevation crosses above
// then back below minElevationDeg), then keep only the ones a person could
// actually see: dark sky at the observer's location + station lit by the sun.
function findVisibleIssPasses(satrec, lat, lon, opts = {}) {
  const { days = 10, stepSeconds = 15, minElevationDeg = 10, maxPasses = 5 } = opts;
  const observerGd = {
    latitude: satellite.degreesToRadians(lat),
    longitude: satellite.degreesToRadians(lon),
    height: 0,
  };
  const observer = new Astronomy.Observer(lat, lon, 0);

  const startMs = Date.now();
  const endMs = startMs + days * 86400 * 1000;
  const stepMs = stepSeconds * 1000;

  const geometricPasses = [];
  let inPass = false;
  let riseTime = null;
  let maxElevDeg = -90;

  for (let t = startMs; t <= endMs; t += stepMs) {
    const date = new Date(t);
    const posVel = satellite.propagate(satrec, date);
    if (!posVel || !posVel.position) continue;

    const gmst = satellite.gstime(date);
    const ecf = satellite.eciToEcf(posVel.position, gmst);
    const look = satellite.ecfToLookAngles(observerGd, ecf);
    const elevDeg = satellite.radiansToDegrees(look.elevation);

    if (!inPass && elevDeg >= minElevationDeg) {
      inPass = true;
      riseTime = date;
      maxElevDeg = elevDeg;
    } else if (inPass) {
      maxElevDeg = Math.max(maxElevDeg, elevDeg);
      if (elevDeg < minElevationDeg) {
        geometricPasses.push({ riseTime, setTime: date, maxElevDeg });
        inPass = false;
        if (geometricPasses.length >= maxPasses * 6) break; // plenty of candidates to filter down
      }
    }
  }

  const visible = [];
  for (const pass of geometricPasses) {
    const midTime = new Date((pass.riseTime.getTime() + pass.setTime.getTime()) / 2);
    const midPosVel = satellite.propagate(satrec, midTime);
    if (!midPosVel || !midPosVel.position) continue;

    if (isObserverDark(observer, midTime) && isIlluminated(midPosVel.position, midTime)) {
      visible.push({
        riseTime: pass.riseTime.toISOString(),
        setTime: pass.setTime.toISOString(),
        durationSeconds: Math.round((pass.setTime - pass.riseTime) / 1000),
        maxElevationDeg: Math.round(pass.maxElevDeg),
      });
      if (visible.length >= maxPasses) break;
    }
  }
  return visible;
}

export default async function handler(req, res) {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: "lat and lon query params required" });
  }

  try {
    const { line1, line2 } = await getTle();
    const satrec = satellite.twoline2satrec(line1, line2);
    const passes = findVisibleIssPasses(satrec, parseFloat(lat), parseFloat(lon));
    res.status(200).json({ passes });
  } catch (err) {
    res.status(200).json({ passes: [], error: "ISS pass data temporarily unavailable" });
  }
}
