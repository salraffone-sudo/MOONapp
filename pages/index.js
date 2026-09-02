import { useEffect, useState, useMemo } from "react";
import Head from "next/head";
import MoonGlyph from "../components/MoonGlyph";
import MoonCalendar from "../components/MoonCalendar";
import LocationPicker from "../components/LocationPicker";
import { getMoonData, getPlanetData, getSunData, getObserver } from "../lib/astro";
import { getSkyEvents } from "../lib/events";
import cometData from "../data/comets.json";

const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

function compass(az) {
  return COMPASS[Math.round(az / 22.5) % 16];
}

function fmtTime(date) {
  if (!date) return "—";
  return new Date(date).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function fmtDate(date, opts) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString([], opts || { month: "short", day: "numeric" });
}

function isToday(date) {
  return new Date(date).toDateString() === new Date().toDateString();
}

export default function Home() {
  const [status, setStatus] = useState("locating"); // locating | denied | ready
  const [location, setLocation] = useState(null); // { lat, lon, label, isLive }
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [calView, setCalView] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [pickerOpen, setPickerOpen] = useState(false);

  const [moon, setMoon] = useState(null);
  const [sun, setSun] = useState(null);
  const [planets, setPlanets] = useState([]);
  const [events, setEvents] = useState([]);
  const [iss, setIss] = useState({ passes: [] });
  const [neos, setNeos] = useState({ objects: [] });

  function requestGeolocation() {
    if (!navigator.geolocation) {
      setStatus("denied");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude, label: "Current location", isLive: true });
        setReferenceDate(new Date());
        setStatus("ready");
      },
      () => setStatus("denied"),
      { timeout: 10000 }
    );
  }

  useEffect(() => {
    requestGeolocation();
  }, []);

  // The moment used for "is it up right now" calculations. If we're looking at
  // today with the live location, use the real current time. Otherwise (a
  // future date, or an overridden location) use a 9pm local reference — a
  // reasonable stand-in for "check the evening sky."
  const momentForCalc = useMemo(() => {
    if (location?.isLive && isToday(referenceDate)) return new Date();
    const d = new Date(referenceDate);
    d.setHours(21, 0, 0, 0);
    return d;
  }, [location, referenceDate]);

  const isLiveSnapshot = location?.isLive && isToday(referenceDate);

  useEffect(() => {
    if (!location) return;
    const observer = getObserver(location.lat, location.lon);
    setMoon(getMoonData(momentForCalc, observer));
    setSun(getSunData(momentForCalc, observer));
    setPlanets(getPlanetData(momentForCalc, observer));
    setEvents(getSkyEvents(momentForCalc, observer, 60));

    fetch(`/api/iss?lat=${location.lat}&lon=${location.lon}`)
      .then((r) => r.json())
      .then(setIss)
      .catch(() => setIss({ passes: [], error: "unavailable" }));

    fetch(`/api/neos`)
      .then((r) => r.json())
      .then(setNeos)
      .catch(() => setNeos({ objects: [], error: "unavailable" }));
  }, [location, momentForCalc]);

  function handleSelectDay(date) {
    setReferenceDate(date);
  }

  function handleNavigateMonth(delta) {
    setCalView((v) => {
      let month = v.month + delta;
      let year = v.year;
      if (month < 0) {
        month = 11;
        year -= 1;
      } else if (month > 11) {
        month = 0;
        year += 1;
      }
      return { year, month };
    });
  }

  function handleLocationChange(loc) {
    setLocation({ ...loc, isLive: false });
    setStatus("ready");
  }

  function resetToLive() {
    requestGeolocation();
  }

  if (status === "locating") {
    return (
      <div className="wrap">
        <p className="status-line">Finding your sky…</p>
      </div>
    );
  }

  if (status === "denied" && !location) {
    return (
      <div className="wrap">
        <p className="status-line">
          Location access is needed to show what's above your horizon.
          <br />
          <button className="btn" onClick={requestGeolocation}>
            Try again
          </button>
          <br />
          <button className="link-btn" style={{ marginTop: 12 }} onClick={() => setPickerOpen(true)}>
            Or enter a location manually
          </button>
        </p>
        {pickerOpen && (
          <LocationPicker
            onLocationChange={handleLocationChange}
            onUseMyLocation={requestGeolocation}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>
    );
  }

  if (!moon) {
    return (
      <div className="wrap">
        <p className="status-line">Reading the sky…</p>
      </div>
    );
  }

  const k = moon.illuminationPct / 100;

  return (
    <div className="wrap">
      <Head>
        <title>Night Sky Almanac</title>
      </Head>

      <div className="header-row">
        <div>
          <p className="eyebrow">Tonight's Sky</p>
          <p className="location-line" style={{ marginBottom: 0 }}>
            {fmtDate(referenceDate, { weekday: "long", month: "long", day: "numeric" })} · {location.label} (
            {location.lat.toFixed(2)}°, {location.lon.toFixed(2)}°)
          </p>
        </div>
        <button className="link-btn" onClick={() => setPickerOpen(true)}>
          Change location
        </button>
      </div>

      {!isLiveSnapshot && (
        <div className="preview-banner">
          <span>
            Previewing {fmtDate(referenceDate, { month: "short", day: "numeric" })} at 9:00 PM local — not live
          </span>
          <button className="link-btn" onClick={resetToLive}>
            Back to now
          </button>
        </div>
      )}

      <section className="hero">
        <MoonGlyph k={k} waxing={moon.isWaxing} size={220} />
        <h1 className="moon-name">{moon.phaseName}</h1>
        <p className="moon-sub">{moon.illuminationPct}% illuminated</p>

        <div className="moon-facts-stack">
          <div className="facts-row facts-row-single">
            <div className="fact">
              <span className="fact-value">{Math.round(moon.distanceKm).toLocaleString()} km</span>
              <span className="fact-label">Distance</span>
            </div>
          </div>
          <div className="facts-row facts-row-pair">
            <div className="fact">
              <span className="fact-value">{fmtTime(sun?.set)}</span>
              <span className="fact-label">Sunset</span>
            </div>
            <div className="fact">
              <span className="fact-value">{fmtTime(sun?.rise)}</span>
              <span className="fact-label">Sunrise</span>
            </div>
          </div>
          <div className="facts-row facts-row-pair">
            <div className="fact">
              <span className="fact-value">{fmtTime(moon.rise)}</span>
              <span className="fact-label">Moonrise</span>
            </div>
            <div className="fact">
              <span className="fact-value">{fmtTime(moon.set)}</span>
              <span className="fact-label">Moonset</span>
            </div>
          </div>
        </div>

        {moon.isSupermoon && <span className="badge">Supermoon — near perigee</span>}
        {moon.isMicromoon && <span className="badge">Micromoon — near apogee</span>}

        {moon.traditionalName && (
          <p className="moon-note">
            Next full moon ({fmtDate(moon.nextFullDate)}) is the <strong>{moon.traditionalName}</strong> —{" "}
            {moon.traditionalNote}
          </p>
        )}
      </section>

      <section className="section">
        <div className="section-title">
          <span>Moon Calendar</span>
          <span>tap a day to preview</span>
        </div>
        <MoonCalendar
          year={calView.year}
          month={calView.month}
          selectedDay={referenceDate}
          onSelectDay={handleSelectDay}
          onNavigate={handleNavigateMonth}
        />
      </section>

      <section className="section">
        <div className="section-title">
          <span>Upcoming Sky Events</span>
          <span>next 60 days + notable eclipses</span>
        </div>
        <div className="card">
          {events.length > 0 ? (
            events.map((e, i) => (
              <div className="row" key={i}>
                <span className="event-date-badge">{fmtDate(e.date)}</span>
                <span className="name-col" style={{ flex: 1, textAlign: "left", marginLeft: 12 }}>
                  {e.type}
                  <br />
                  <span className="meta-col" style={{ textAlign: "left" }}>
                    {e.detail}
                  </span>
                </span>
              </div>
            ))
          ) : (
            <p className="empty">Nothing notable in the next 60 days.</p>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-title">
          <span>Planets</span>
          <span>
            {planets.filter((p) => p.visibleNow).length} visible {isLiveSnapshot ? "now" : "at 9 PM"}
          </span>
        </div>
        <div className="card">
          {planets.map((p) => (
            <div className="row" key={p.name}>
              <span className="name-col">
                {p.name}
                {p.visibleNow && <span className="tag tag-visible">up</span>}
              </span>
              <span className="meta-col">
                {p.isUp
                  ? `${Math.round(p.altitude)}° above ${compass(p.azimuth)} · mag ${p.magnitude.toFixed(1)}`
                  : `below horizon · rises ${fmtTime(p.rise)}`}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-title">
          <span>ISS Passes</span>
          <span>next 5</span>
        </div>
        <div className="card">
          {iss.passes && iss.passes.length > 0 ? (
            iss.passes.map((p, i) => (
              <div className="row" key={i}>
                <span className="name-col">{fmtDate(p.riseTime)}</span>
                <span className="meta-col">
                  {fmtTime(p.riseTime)} · visible {Math.round(p.durationSeconds / 60)} min
                </span>
              </div>
            ))
          ) : (
            <p className="empty">{iss.error || "No passes in range right now."}</p>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-title">
          <span>Near-Earth Objects</span>
          <span>closest approach today</span>
        </div>
        <div className="card">
          {neos.objects && neos.objects.length > 0 ? (
            neos.objects.map((o, i) => (
              <div className="row" key={i}>
                <span className="name-col">
                  {o.name}
                  {o.hazardous && <span className="tag tag-hazard">flagged</span>}
                </span>
                <span className="meta-col">
                  {o.missDistanceKm.toLocaleString()} km · ~{o.diameterMetersMax}m · {o.velocityKmS} km/s
                </span>
              </div>
            ))
          ) : (
            <p className="empty">{neos.error || "None catalogued for today."}</p>
          )}
        </div>
      </section>

      <section className="section">
        <div className="section-title">
          <span>Comets</span>
          <span>curated, updated periodically</span>
        </div>
        <div className="card">
          {cometData.comets.map((c, i) => (
            <div className="row" key={i}>
              <span className="name-col">{c.name}</span>
              <span className="meta-col">{c.status}</span>
            </div>
          ))}
        </div>
      </section>

      <p className="footer-note">
        Moon and planet positions computed locally from your coordinates — no external service, always
        current. Sky events (eclipses, oppositions, meteor showers) computed the same way, within a 60-day
        window plus the next eclipse regardless of distance. ISS passes via Open Notify. Near-earth objects
        via NASA NeoWs. Comet list is curated manually (last updated {cometData._updated}).
      </p>

      {pickerOpen && (
        <LocationPicker
          onLocationChange={handleLocationChange}
          onUseMyLocation={resetToLive}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
