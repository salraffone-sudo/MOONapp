export default async function handler(req, res) {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: "lat and lon query params required" });
  }

  try {
    const url = `http://api.open-notify.org/iss-pass.json?lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lon)}&n=5`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Open Notify returned ${r.status}`);
    const data = await r.json();

    const passes = (data.response || []).map((p) => ({
      riseTime: new Date(p.risetime * 1000).toISOString(),
      durationSeconds: p.duration,
    }));

    res.status(200).json({ passes });
  } catch (err) {
    // Open Notify has spotty uptime — fail soft so the rest of the page still renders
    res.status(200).json({ passes: [], error: "ISS pass data temporarily unavailable" });
  }
}
