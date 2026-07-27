export default async function handler(req, res) {
  const apiKey = process.env.NASA_API_KEY;
  if (!apiKey) {
    return res.status(200).json({
      objects: [],
      error: "NASA_API_KEY not set — add it in your Vercel project's Environment Variables.",
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  try {
    const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${apiKey}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`NASA API returned ${r.status}`);
    const data = await r.json();

    const objects = (data.near_earth_objects?.[today] || [])
      .map((o) => ({
        name: o.name.replace(/[()]/g, ""),
        hazardous: o.is_potentially_hazardous_asteroid,
        diameterMetersMax: Math.round(
          o.estimated_diameter.meters.estimated_diameter_max
        ),
        missDistanceKm: Math.round(
          parseFloat(o.close_approach_data[0]?.miss_distance?.kilometers || 0)
        ),
        velocityKmS: Math.round(
          parseFloat(
            o.close_approach_data[0]?.relative_velocity?.kilometers_per_second || 0
          ) * 10
        ) / 10,
        magnitude: o.absolute_magnitude_h,
      }))
      .sort((a, b) => a.missDistanceKm - b.missDistanceKm)
      .slice(0, 8);

    res.status(200).json({ objects });
  } catch (err) {
    res.status(200).json({ objects: [], error: "NEO data temporarily unavailable" });
  }
}
