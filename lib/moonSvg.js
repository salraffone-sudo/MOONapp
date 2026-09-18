// Same geometry as components/MoonGlyph.js, duplicated deliberately: this
// runs server-side in a script/API route and has no React/DOM available.
export function moonDiscPath(k, waxing, r, cx, cy) {
  const sweep1 = waxing ? 1 : 0;
  const sweep2 = k >= 0.5 ? sweep1 : 1 - sweep1;
  const rx = Math.abs(1 - 2 * k) * r;
  return `M ${cx} ${cy - r} A ${r} ${r} 0 0 ${sweep1} ${cx} ${cy + r} A ${rx} ${r} 0 0 ${sweep2} ${cx} ${cy - r} Z`;
}

// Shared background + dark-limb circle for the home-screen icon: a square
// (so it reads as an app icon, not a floating circle) with the moon disc
// centered inside a maskable-safe zone (icon spec recommends keeping key
// content within the center ~80% so Android's shape masks don't clip it).
// The *lit* crescent is intentionally left off this base — the real NASA
// texture gets composited into that shape separately (see
// scripts/generate-icons.js) so the unlit limb still reads correctly behind it.
export function renderIconBaseSvg(size, r) {
  const cx = size / 2;
  const cy = size / 2;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="bg" cx="30%" cy="25%" r="90%">
      <stop offset="0%" stop-color="#1a2338"/>
      <stop offset="100%" stop-color="#0a0d16"/>
    </radialGradient>
    <radialGradient id="dark" cx="35%" cy="35%" r="75%">
      <stop offset="0%" stop-color="#2a3350"/>
      <stop offset="100%" stop-color="#161d30"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#dark)" stroke="#3a4568" stroke-width="${Math.max(1, size * 0.004)}"/>
</svg>`.trim();
}

// Original fully-synthetic version, kept as a reference/fallback: a flat
// gradient crescent with no photographic texture.
export function renderIconSvg(size, k, waxing) {
  const r = size * 0.34;
  const cx = size / 2;
  const cy = size / 2;
  const litPath = moonDiscPath(k, waxing, r, cx, cy);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="bg" cx="30%" cy="25%" r="90%">
      <stop offset="0%" stop-color="#1a2338"/>
      <stop offset="100%" stop-color="#0a0d16"/>
    </radialGradient>
    <radialGradient id="dark" cx="35%" cy="35%" r="75%">
      <stop offset="0%" stop-color="#2a3350"/>
      <stop offset="100%" stop-color="#161d30"/>
    </radialGradient>
    <radialGradient id="lit" cx="35%" cy="35%" r="75%">
      <stop offset="0%" stop-color="#fdf6e3"/>
      <stop offset="70%" stop-color="#f0dfa8"/>
      <stop offset="100%" stop-color="#d8bf7e"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#dark)" stroke="#3a4568" stroke-width="${Math.max(1, size * 0.004)}"/>
  <path d="${litPath}" fill="url(#lit)"/>
</svg>`.trim();
}
