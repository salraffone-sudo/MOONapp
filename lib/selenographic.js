const DEG = Math.PI / 180;

/**
 * Projects a point on the Moon's surface (selenographic lat/lon, IAU
 * positive-east convention) onto the visible disc as rendered in a given
 * Dial-A-Moon frame.
 *
 * Standard sub-observer orthographic projection: the same technique used by
 * lunar cartography tools (e.g. LTVT) to place a surface feature correctly
 * given the current libration.
 *
 * @param {number} lat - feature latitude, degrees
 * @param {number} lon - feature longitude, degrees (positive east)
 * @param {number} subearthLat - sub-Earth point latitude, degrees (from the API)
 * @param {number} subearthLon - sub-Earth point longitude, degrees (from the API)
 * @param {number} posAngleDeg - position angle of the Moon's north pole, degrees (from the API)
 * @param {boolean} isSouthUp - true if displaying the south-up image variant
 * @returns {{x: number, y: number, visibility: number} | null} x/y in the
 *   range [-1, 1] relative to the disc's own radius (0,0 = center), or null
 *   if the point is on the far side and not visible in this frame.
 */
export function projectLandmark(lat, lon, subearthLat, subearthLon, posAngleDeg, isSouthUp) {
  const phi = lat * DEG;
  const lambda = lon * DEG;
  const phi0 = subearthLat * DEG;
  const lambda0 = subearthLon * DEG;
  const P = posAngleDeg * DEG;

  const dLambda = lambda - lambda0;
  const cosC =
    Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(dLambda);

  // Not visible if on or past the limb. A small positive threshold (rather
  // than exactly 0) avoids placing dots right at the grazing edge where
  // foreshortening makes them meaningless anyway.
  if (cosC < 0.03) return null;

  // Unrotated orthographic projection: x is east-positive, y is north-positive.
  const x = Math.cos(phi) * Math.sin(dLambda);
  const y = Math.sin(phi) * Math.cos(phi0) - Math.cos(phi) * Math.sin(phi0) * Math.cos(dLambda);

  // Rotate by the position angle — the Moon's north pole isn't straight up
  // in the sky except at specific moments; this accounts for that tilt.
  const xr = x * Math.cos(P) - y * Math.sin(P);
  const yr = x * Math.sin(P) + y * Math.cos(P);

  const flip = isSouthUp ? -1 : 1;

  return {
    x: flip * xr,
    y: -flip * yr, // screen y grows downward; sky y grows upward
    visibility: cosC,
  };
}

/** Projects every landmark and returns only those currently visible. */
export function projectVisibleLandmarks(landmarks, subearthLat, subearthLon, posAngleDeg, isSouthUp) {
  return landmarks
    .map((l) => {
      const p = projectLandmark(l.lat, l.lon, subearthLat, subearthLon, posAngleDeg, isSouthUp);
      return p ? { ...l, ...p } : null;
    })
    .filter(Boolean);
}
