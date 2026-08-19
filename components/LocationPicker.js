import { useState } from "react";

export default function LocationPicker({ onLocationChange, onUseMyLocation, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLon, setManualLon] = useState("");

  let debounceHandle = null;

  function handleQueryChange(value) {
    setQuery(value);
    clearTimeout(debounceHandle);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceHandle = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(value)}&count=5`
        );
        const data = await r.json();
        setResults(data.results || []);
      } catch (e) {
        setResults([]);
      }
      setSearching(false);
    }, 350);
  }

  function selectResult(r) {
    const label = [r.name, r.admin1, r.country].filter(Boolean).join(", ");
    onLocationChange({ lat: r.latitude, lon: r.longitude, label });
  }

  function submitManual() {
    const lat = parseFloat(manualLat);
    const lon = parseFloat(manualLon);
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return;
    onLocationChange({ lat, lon, label: "Custom coordinates" });
  }

  return (
    <div className="picker-overlay" onClick={onClose}>
      <div className="picker-panel" onClick={(e) => e.stopPropagation()}>
        <div className="picker-title">Check a different sky</div>

        <button
          className="btn-secondary"
          onClick={() => {
            onUseMyLocation();
            onClose();
          }}
        >
          Use my current location
        </button>

        <div className="picker-divider">or search a city</div>

        <input
          className="picker-input"
          placeholder="City name…"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
        />

        {searching && <p className="empty">Searching…</p>}

        {results.length > 0 && (
          <div className="picker-results">
            {results.map((r, i) => (
              <button key={i} className="picker-result" onClick={() => selectResult(r)}>
                {[r.name, r.admin1, r.country].filter(Boolean).join(", ")}
              </button>
            ))}
          </div>
        )}

        <div className="picker-divider">or enter coordinates</div>

        <div className="picker-manual-row">
          <input
            className="picker-input picker-input-small"
            placeholder="Latitude"
            value={manualLat}
            onChange={(e) => setManualLat(e.target.value)}
          />
          <input
            className="picker-input picker-input-small"
            placeholder="Longitude"
            value={manualLon}
            onChange={(e) => setManualLon(e.target.value)}
          />
        </div>
        <button className="btn-secondary" style={{ marginTop: 10 }} onClick={submitManual}>
          Set location
        </button>

        <button className="picker-close" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
