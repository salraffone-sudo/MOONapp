// Proxies NASA's Scientific Visualization Studio "Dial-A-Moon" API:
// https://svs.gsfc.nasa.gov/api/dialamoon/{ISO timestamp, UTC, no seconds}
// Returns a photorealistic rendered image of the Moon's actual appearance —
// phase, libration, and orientation — at a given hour. Frames are published
// hourly for the current year (and appear to be published somewhat ahead),
// so a request for a date outside that published range will fail; the
// frontend falls back to the synthetic SVG glyph when that happens.
//
// This is a real NASA tool exposed publicly, not a versioned/SLA-backed
// product API — no key is required, but there's no guarantee against rate
// limiting or schema changes, so we cache and fail soft.
export default async function handler(req, res) {
  const { time, lat } = req.query;
  if (!time) {
    return res.status(400).json({ error: "time query param required (ISO, e.g. 2026-09-16T21:00)" });
  }

  try {
    const upstream = await fetch(`https://svs.gsfc.nasa.gov/api/dialamoon/${time}`);
    if (!upstream.ok) throw new Error(`NASA SVS returned ${upstream.status}`);
    const data = await upstream.json();

    // The Moon's orientation as seen genuinely flips between hemispheres —
    // south-up for southern-hemisphere observers is the accurate view, not
    // a cosmetic choice.
    const isSouthern = parseFloat(lat) < 0;
    const chosen = isSouthern ? data.su_image : data.image;

    res.setHeader("Cache-Control", "public, max-age=1800");
    res.status(200).json({
      imageUrl: chosen?.url || null,
      subearthLat: data.subearth_lat,
      subearthLon: data.subearth_lon,
      posAngle: data.posangle,
      isSouthUp: isSouthern,
    });
  } catch (err) {
    res.status(200).json({ imageUrl: null, error: "moon imagery temporarily unavailable" });
  }
}
