// The fraction of a square NASA moon-image frame's half-width that the
// actual lunar disc occupies (the rest is the black space margin NASA's
// renders leave for framing). This is a reasoned estimate, not a
// pixel-measured constant — it's the same value implied by the hero photo's
// CSS zoom fix (scale(1.22) there means the disc filled roughly 1/1.22 of
// the frame before cropping). If that zoom ever gets tuned, update this to
// match — landmark dots in explore mode are positioned relative to this same
// disc radius, so the two should always move together.
export const MOON_DISC_FRACTION = 0.82;

/**
 * Converts a projected landmark position (x, y in [-1, 1], disc-radius
 * units, from lib/selenographic.js) into a CSS percentage position within
 * the square explore image element.
 */
export function discToImagePercent(x, y) {
  return {
    leftPct: 50 + x * MOON_DISC_FRACTION * 50,
    topPct: 50 + y * MOON_DISC_FRACTION * 50,
  };
}
